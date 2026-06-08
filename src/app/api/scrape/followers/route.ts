// src/app/api/scrape/followers/route.ts
// Scrapes followers of a given Twitter account.
// For each follower: scans bio + recent tweets for emails.
// Runs Claude analysis to score and filter results.
//
// Requires: TWITTER_API_KEY in .env

import { NextRequest, NextResponse } from 'next/server'
import { firstEmail, extractEmails, isHighProfile, sleep } from '@/lib/scrapperUtils'

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
  entities?:       { url?: { urls?: Array<{ expanded_url: string }> } }
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
  tweetEmails: string[]  // emails found in their tweet content
}

// ── Twitter API fetch helper ──────────────────────────────────────────────────

async function twitterFetch(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`${TWITTER_API_BASE}${path}`, {
    headers: { 'x-api-key': apiKey },
  })
  if (res.status === 429) throw new Error('Twitter API rate limited')
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Twitter API ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

// ── Get followers page ────────────────────────────────────────────────────────

async function getFollowersPage(
  username: string,
  cursor:   string | null,
  apiKey:   string,
): Promise<{ users: TwitterUser[]; hasNextPage: boolean; nextCursor: string | null }> {
  const params = new URLSearchParams({ userName: username, count: '100' })
  if (cursor) params.set('cursor', cursor)

  const data = await twitterFetch(
    `/twitter/user/followers?${params}`,
    apiKey,
  )

  return {
    users:       data.followers ?? data.users ?? [],
    hasNextPage: data.has_next_page ?? false,
    nextCursor:  data.next_cursor ?? null,
  }
}

// ── Get recent tweets for a user and extract emails ───────────────────────────

async function getEmailsFromTweets(username: string, apiKey: string): Promise<string[]> {
  try {
    await sleep(300)
    const data = await twitterFetch(
      `/twitter/user/last_tweets?userName=${username}&count=20`,
      apiKey,
    )
    const tweets: any[] = data.tweets ?? data.pin_tweet ? [data.pin_tweet, ...(data.tweets ?? [])] : []
    const allText = tweets.map((t: any) => t.text ?? '').join(' ')
    return extractEmails(allText)
  } catch {
    return []
  }
}

// ── Resolve t.co URL to actual URL ────────────────────────────────────────────

function resolveUrl(user: TwitterUser): string | null {
  // Check entities for expanded URL
  const urls = user.entities?.url?.urls ?? []
  if (urls.length > 0) return urls[0].expanded_url ?? null
  // Fall back to raw url field
  if (user.url && !user.url.includes('t.co')) return user.url
  return null
}

// ── Fetch website page and scan for email ─────────────────────────────────────

async function getEmailFromWebsite(url: string): Promise<string | null> {
  if (!url) return null
  // Skip known non-email-bearing domains
  const skipDomains = ['twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'youtube.com', 'tiktok.com', 't.me']
  if (skipDomains.some(d => url.includes(d))) return null

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const html = await res.text()
    return firstEmail(html)
  } catch {
    return null
  }
}

// ── Process a single follower into a raw profile ──────────────────────────────

async function processFollower(
  user:   TwitterUser,
  apiKey: string,
): Promise<RawFollowerProfile> {
  const bio        = [user.description, user.profile_bio?.description].filter(Boolean).join(' ')
  const websiteUrl = resolveUrl(user)

  // 1. Email from bio
  let email:       string | null = firstEmail(bio)
  let emailSource: string | null = email ? 'Twitter bio' : null

  // 2. Email from recent tweets
  const tweetEmails: string[] = []
  if (!email) {
    const fromTweets = await getEmailsFromTweets(user.screen_name, apiKey)
    tweetEmails.push(...fromTweets)
    if (fromTweets.length > 0) {
      email       = fromTweets[0]
      emailSource = 'Tweet content'
    }
  }

  // 3. Email from linked website
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

// ── Claude analysis: convert raw profiles → CRM prospects ────────────────────

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
  profiles:  RawFollowerProfile[],
  ecosystem: string,
  apiKey:    string,
): Promise<any[]> {
  if (!profiles.length) return []

  const BATCH = 10
  const results: any[] = []

  for (let i = 0; i < profiles.length; i += BATCH) {
    const batch = profiles.slice(i, i + BATCH)

    const prompt = `You are analyzing real Twitter followers of a ${ecosystem} ecosystem account.
Convert these profiles into CRM prospects. Each profile is a real person scraped from Twitter.

For each profile:
1. Use the email already found if present — do NOT change it
2. If no email, note that in emailSource as null
3. Infer their role from bio (holder, trader, developer, community member, etc.)
4. Score conviction level from bio signals (staking, holding, DeFi, maxi, believer, etc.)
5. Assign priority: A (strong signals + email), B (some signals), C (weak signals)
6. Set confidence: HIGH if email found, MEDIUM if strong bio signals, LOW otherwise
7. Filter out: bots, spam accounts, project promotional accounts with no real person behind them

SKIP anyone who appears to be:
- A bot or automated account
- A token/project promotional account with no human identity
- Someone with zero bio and zero engagement signals

Return ONLY a raw JSON array. No text. Start with [ end with ].

Schema:
[{
  "name": "",
  "role": "",
  "company": null,
  "companyWebsite": null,
  "linkedinUrl": null,
  "twitterUrl": "",
  "farcasterUrl": null,
  "redditUrl": null,
  "quoraUrl": null,
  "truthSocialUrl": null,
  "email": null,
  "emailSource": null,
  "cryptoNiche": "",
  "ecosystem": "${ecosystem}",
  "beliefSignal": "",
  "activityLevel": "ACTIVE",
  "tags": [],
  "priority": "B",
  "priorityReason": "",
  "sourceFound": "X_TWITTER",
  "confidence": "MEDIUM"
}]

Profiles to analyze:
${JSON.stringify(batch, null, 2)}`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5',
          max_tokens: 4000,
          messages:   [{ role: 'user', content: prompt }],
        }),
      })

      if (res.ok) {
        const data  = await res.json()
        const text  = extractText(data)
        const parsed = parseJSON(text)
        results.push(...(Array.isArray(parsed) ? parsed : [parsed]))
      }
    } catch (e: any) {
      console.warn(`[followers] Claude batch ${i} failed:`, e.message)
    }

    if (i + BATCH < profiles.length) await sleep(800)
  }

  // Sort: email first, then priority, then confidence
  const pOrder = { A: 0, B: 1, C: 2 }
  const cOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  return results.sort((a, b) => {
    // Email leads first
    const ae = a.email ? 0 : 1
    const be = b.email ? 0 : 1
    if (ae !== be) return ae - be
    const pd = (pOrder[a.priority as keyof typeof pOrder] ?? 9) - (pOrder[b.priority as keyof typeof pOrder] ?? 9)
    if (pd !== 0) return pd
    return (cOrder[a.confidence as keyof typeof cOrder] ?? 9) - (cOrder[b.confidence as keyof typeof cOrder] ?? 9)
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

    console.log(`[followers] Scraping followers of @${username} (max: ${maxFollowers})`)

    // ── Step 1: Paginate through followers ────────────────────────────────────
    const allUsers:  TwitterUser[] = []
    let cursor:      string | null  = null
    let pageCount    = 0
    const maxPages   = Math.ceil(maxFollowers / 100)

    while (pageCount < maxPages) {
      try {
        const page = await getFollowersPage(username, cursor, twitterKey)
        allUsers.push(...page.users)
        console.log(`[followers] Page ${pageCount + 1}: +${page.users.length} followers (total: ${allUsers.length})`)

        if (!page.hasNextPage || !page.nextCursor) break
        cursor = page.nextCursor
        pageCount++
        await sleep(600)
      } catch (e: any) {
        console.warn(`[followers] Pagination stopped at page ${pageCount}:`, e.message)
        break
      }
    }

    console.log(`[followers] Total followers fetched: ${allUsers.length}`)

    if (allUsers.length === 0) {
      return NextResponse.json({ error: `No followers found for @${username}. Check the username is correct.` }, { status: 404 })
    }

    // ── Step 2: Filter out high-profile / bots before processing ─────────────
    const candidates = allUsers.filter(u => {
      if (isHighProfile(u.description ?? '', u.followers_count)) return false
      if (!u.description && !u.url) return false // no bio, no site — likely bot/empty
      return true
    })

    console.log(`[followers] After pre-filter: ${candidates.length} candidates`)

    // ── Step 3: Process each candidate (bio + tweets + website) ──────────────
    const rawProfiles: RawFollowerProfile[] = []
    const CONCURRENCY = 5

    for (let i = 0; i < candidates.length; i += CONCURRENCY) {
      const chunk   = candidates.slice(i, i + CONCURRENCY)
      const settled = await Promise.allSettled(
        chunk.map(u => processFollower(u, twitterKey))
      )
      for (const r of settled) {
        if (r.status === 'fulfilled') rawProfiles.push(r.value)
      }
      await sleep(500)
    }

    console.log(`[followers] Processed ${rawProfiles.length} profiles`)
    console.log(`[followers] With email: ${rawProfiles.filter(p => p.email).length}`)

    // ── Step 4: Claude analysis ───────────────────────────────────────────────
    const prospects = await analyzeFollowers(rawProfiles, ecosystem, process.env.ANTHROPIC_API_KEY!)

    console.log(`[followers] Final prospects: ${prospects.length}`)

    return NextResponse.json({
      results: prospects,
      meta: {
        targetAccount:    username,
        ecosystem,
        followersScraped: allUsers.length,
        candidatesFound:  candidates.length,
        withEmail:        rawProfiles.filter(p => p.email).length,
        finalProspects:   prospects.length,
      },
    })

  } catch (error: any) {
    console.error('[followers] Route error:', error)
    return NextResponse.json({ error: error.message ?? 'Follower scrape failed' }, { status: 500 })
  }
}