// src/app/api/scrape/followers/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { firstEmail, extractEmails, isHighProfile, sleep, parseEcosystem } from '@/lib/scrapperUtils'

const TWITTER_API_BASE = 'https://api.twitterapi.io'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TwitterUser {
  id:              string
  name:            string
  screen_name:     string
  description:     string
  location:        string
  url:             string
  followers_count: number
  following_count: number
  profile_bio?:    { description: string; entities?: any }
  entities?:       {
    url?:         { urls?: Array<{ expanded_url: string }> }
    description?: { urls?: Array<{ expanded_url: string }> }
  }
}

interface RawFollowerProfile {
  id:          string
  username:    string
  displayName: string
  bio:         string
  location:    string
  websiteUrl:  string | null
  email:       string | null
  emailSource: string | null
  twitterUrl:  string
  followers:   number
  tweetEmails: string[]
}

// ── Twitter API fetch ─────────────────────────────────────────────────────────

async function twitterFetch(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`${TWITTER_API_BASE}${path}`, {
    headers: { 'x-api-key': apiKey },
  })
  if (res.status === 429) throw new Error('Twitter API rate limited')
  if (!res.ok) throw new Error(`Twitter API ${res.status}`)
  return res.json()
}

// ── Get followers page ────────────────────────────────────────────────────────

async function getFollowersPage(
  username: string,
  cursor:   string | null,
  apiKey:   string,
): Promise<{ users: TwitterUser[]; hasNextPage: boolean; nextCursor: string | null }> {
  const params = new URLSearchParams({ userName: username, count: '200' })
  if (cursor) params.set('cursor', cursor)
  const data = await twitterFetch(`/twitter/user/followers?${params}`, apiKey)
  console.log('[followers] Raw API response keys:', Object.keys(data))
  const users = data.followers ?? data.users ?? data.data ?? []
  console.log(`[followers] Users in page: ${users.length}`)
  return {
    users,
    hasNextPage: data.has_next_page ?? false,
    nextCursor:  data.next_cursor ?? null,
  }
}

// ── Resolve expanded URL from user entities ───────────────────────────────────

function resolveUrl(user: TwitterUser): string | null {
  const urlEntries  = user.entities?.url?.urls ?? []
  if (urlEntries.length > 0) return urlEntries[0].expanded_url ?? null
  const descEntries = user.entities?.description?.urls ?? []
  if (descEntries.length > 0) return descEntries[0].expanded_url ?? null
  if (user.url && !user.url.includes('t.co')) return user.url
  return null
}

// ── Get bio text ──────────────────────────────────────────────────────────────

function getBioText(user: TwitterUser): string {
  return [user.description ?? '', user.profile_bio?.description ?? ''].join(' ').trim()
}

// ── Get emails from recent tweets ─────────────────────────────────────────────

async function getEmailsFromTweets(username: string, apiKey: string): Promise<string[]> {
  try {
    await sleep(400)
    const data   = await twitterFetch(`/twitter/user/last_tweets?userName=${encodeURIComponent(username)}&count=50`, apiKey)
    const tweets: any[] = data.tweets ?? []
    if (data.pin_tweet) tweets.unshift(data.pin_tweet)
    const allText = tweets.filter(Boolean).map((t: any) => t.text ?? '').join(' ')
    return extractEmails(allText)
  } catch {
    return []
  }
}

// ── Fetch linked website and scan for email ───────────────────────────────────

const SKIP_DOMAINS = [
  'twitter.com', 'x.com', 'instagram.com', 'facebook.com',
  'youtube.com', 'tiktok.com', 't.me', 'telegram.me',
  'discord.gg', 'discord.com', 'linktr.ee', 'bit.ly',
]

async function getEmailFromWebsite(url: string): Promise<string | null> {
  if (!url) return null
  if (SKIP_DOMAINS.some(d => url.includes(d))) return null
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
      signal:  AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const html  = await res.text()
    const email = firstEmail(html)
    if (email) return email
    // Try /contact subpage
    try {
      const base = new URL(url)
      const res2 = await fetch(`${base.origin}/contact`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
        signal:  AbortSignal.timeout(4000),
      })
      if (res2.ok) return firstEmail(await res2.text())
    } catch {}
    return null
  } catch {
    return null
  }
}

// ── Process a single follower ─────────────────────────────────────────────────

async function processFollower(user: TwitterUser, apiKey: string): Promise<RawFollowerProfile> {
  const bio        = getBioText(user)
  const websiteUrl = resolveUrl(user)

  let email:       string | null = firstEmail(bio)
  let emailSource: string | null = email ? 'Twitter bio' : null

  const tweetEmails: string[] = []
  if (!email) {
    const fromTweets = await getEmailsFromTweets(user.screen_name, apiKey)
    tweetEmails.push(...fromTweets)
    if (fromTweets.length > 0) {
      email       = fromTweets[0]
      emailSource = 'Tweet content'
    }
  }

  if (!email && websiteUrl) {
    const fromSite = await getEmailFromWebsite(websiteUrl)
    if (fromSite) {
      email       = fromSite
      emailSource = `Linked website (${websiteUrl})`
    }
  }

  return {
    id:          user.id,
    username:    user.screen_name,
    displayName: user.name,
    bio,
    location:    user.location ?? '',
    websiteUrl,
    email,
    emailSource,
    twitterUrl:  `https://twitter.com/${user.screen_name}`,
    followers:   user.followers_count ?? 0,
    tweetEmails,
  }
}

// ── Claude analysis ───────────────────────────────────────────────────────────

function extractText(data: any): string {
  return (data?.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text?.trim())
    .filter(Boolean)
    .pop() ?? ''
}

function parseJSON(raw: string): any {
  const fence = raw.match(/```json\s*([\s\S]*?)```/)
  if (fence) { try { return JSON.parse(fence[1].trim()) } catch {} }
  const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const arr = clean.match(/\[[\s\S]*\]/)
  if (arr) { try { return JSON.parse(arr[0]) } catch {} }
  throw new Error('No valid JSON')
}

async function analyzeFollowers(
  profiles: RawFollowerProfile[],
  ecoMeta:  ReturnType<typeof parseEcosystem>,
  apiKey:   string,
): Promise<any[]> {
  if (!profiles.length) return []

  const BATCH = 10
  const results: any[] = []

  const { displayName, isTicker, ticker, tickerClean } = ecoMeta

  const convictionSignals = isTicker
    ? `holding, staking, accumulating, mentions of "${ticker}" or "${tickerClean}", maxi, believer, DeFi usage`
    : `staking, holding, DeFi usage, maxi, believer, accumulating`

  const ecosystemDesc = isTicker
    ? `${ticker} token community (also known as "${tickerClean}")`
    : displayName

  for (let i = 0; i < profiles.length; i += BATCH) {
    const profileBatch = profiles.slice(i, i + BATCH)

    const prompt = [
      `You are analyzing real Twitter followers of a ${ecosystemDesc} account.`,
      `Convert these into CRM prospects. Each is a real scraped person.`,
      ``,
      `Rules:`,
      `- Use the email already found — do NOT change or invent one`,
      `- If no email, set email to null`,
      `- Infer role from bio (holder, trader, developer, community member, investor, etc.)`,
      `- Score conviction from: ${convictionSignals}`,
      `- Priority A = strong conviction signals + email found`,
      `- Priority B = some conviction signals OR email found`,
      `- Priority C = weak signals, include only if genuinely crypto-native`,
      `- SKIP obvious bots, token promo accounts with no human identity, empty accounts`,
      `- confidence HIGH if email found, MEDIUM if strong bio, LOW otherwise`,
      ``,
      `Return ONLY a raw JSON array. No text. Start with [ end with ].`,
      `Schema per item:`,
      `{"name":"","role":"","company":null,"companyWebsite":null,"linkedinUrl":null,"twitterUrl":"","farcasterUrl":null,"redditUrl":null,"quoraUrl":null,"truthSocialUrl":null,"email":null,"emailSource":null,"cryptoNiche":"","ecosystem":"${displayName}","beliefSignal":"","activityLevel":"ACTIVE","tags":[],"priority":"B","priorityReason":"","sourceFound":"X_TWITTER","confidence":"MEDIUM"}`,
      ``,
      `Profiles:`,
      JSON.stringify(profileBatch, null, 2),
    ].join('\n')

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5',
          max_tokens: 4000,
          messages:   [{ role: 'user', content: prompt }],
        }),
      })

      if (res.ok) {
        const data   = await res.json()
        const text   = extractText(data)
        const parsed = parseJSON(text)
        results.push(...(Array.isArray(parsed) ? parsed : [parsed]))
      }
    } catch (e: any) {
      console.warn('[followers] Claude batch failed:', e.message)
    }

    if (i + BATCH < profiles.length) await sleep(600)
  }

  const pOrder: Record<string, number> = { A: 0, B: 1, C: 2 }
  const cOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

  return results.sort((a, b) => {
    const ae = a.email ? 0 : 1
    const be = b.email ? 0 : 1
    if (ae !== be) return ae - be
    const pd = (pOrder[a.priority] ?? 9) - (pOrder[b.priority] ?? 9)
    if (pd !== 0) return pd
    return (cOrder[a.confidence] ?? 9) - (cOrder[b.confidence] ?? 9)
  })
}

// ── Main route ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { username, ecosystem = 'Crypto', maxFollowers = 200 } = await req.json()

    if (!username?.trim()) {
      return NextResponse.json({ error: 'username is required' }, { status: 400 })
    }

    const twitterKey = process.env.TWITTER_API_KEY
    if (!twitterKey) {
      return NextResponse.json({ error: 'TWITTER_API_KEY not set in .env' }, { status: 500 })
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set in .env' }, { status: 500 })
    }

    const ecoMeta = parseEcosystem(ecosystem)
    console.log(`[followers] Scraping @${username}, ecosystem: ${ecoMeta.displayName}, ticker: ${ecoMeta.isTicker}`)

    // Step 1: Paginate followers
    const allUsers:  TwitterUser[] = []
    let cursor:      string | null  = null
    let pageCount    = 0
    const maxPages   = Math.ceil(maxFollowers / 200)

    while (pageCount < maxPages) {
      try {
        const page = await getFollowersPage(username, cursor, twitterKey)
        allUsers.push(...page.users)
        console.log(`[followers] Page ${pageCount + 1}: +${page.users.length} (total: ${allUsers.length})`)
        if (!page.hasNextPage || !page.nextCursor) break
        cursor = page.nextCursor
        pageCount++
        await sleep(500)
      } catch (e: any) {
        console.warn('[followers] Pagination stopped:', e.message)
        break
      }
    }

    if (allUsers.length === 0) {
      return NextResponse.json(
        { error: `No followers found for @${username}. Check the username is correct.` },
        { status: 404 },
      )
    }

    // Step 2: Pre-filter — only drop completely empty accounts (no bio AND no url)
    // We don't filter by follower count here — Claude handles high-profile exclusion
    // This is important for large accounts like cz_binance whose followers include
    // many legitimate mid-size accounts that would be wrongly excluded by a 10K cap
    const candidates = allUsers.filter(u => {
      const bio = getBioText(u)
      const url = resolveUrl(u)
      // Keep anyone with ANY signal — bio text OR a linked URL
      return bio.length > 3 || url !== null
    })

    console.log(`[followers] After pre-filter: ${candidates.length} candidates`)

    // Step 3: Process candidates in concurrent chunks of 5
    const rawProfiles: RawFollowerProfile[] = []
    const CONCURRENCY = 5

    for (let i = 0; i < candidates.length; i += CONCURRENCY) {
      const chunk   = candidates.slice(i, i + CONCURRENCY)
      const settled = await Promise.allSettled(chunk.map(u => processFollower(u, twitterKey)))
      for (const r of settled) {
        if (r.status === 'fulfilled') rawProfiles.push(r.value)
      }
      await sleep(400)
    }

    const withEmail = rawProfiles.filter(p => p.email)
    console.log(`[followers] Processed ${rawProfiles.length} profiles, ${withEmail.length} with email`)

    // Step 4: Claude analysis
    const prospects = await analyzeFollowers(rawProfiles, ecoMeta, anthropicKey)
    console.log(`[followers] Final prospects: ${prospects.length}`)

    return NextResponse.json({
      results: prospects,
      meta: {
        targetAccount:    username,
        ecosystem:        ecoMeta.displayName,
        followersScraped: allUsers.length,
        candidatesFound:  candidates.length,
        withEmail:        withEmail.length,
        finalProspects:   prospects.length,
      },
    })

  } catch (error: any) {
    console.error('[followers] Route error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Follower scrape failed' },
      { status: 500 },
    )
  }
}