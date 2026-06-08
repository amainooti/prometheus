// ─── reddit.ts ────────────────────────────────────────────────────────────────
// Reddit OAuth2 API client. Searches ecosystem-relevant subreddits,
// pulls post/comment authors, then fetches their public profile data.
// Completely free — requires a Reddit app credential (2 min setup).
//
// Setup: https://www.reddit.com/prefs/apps → "create another app" → script type
// Add to .env:
//   REDDIT_CLIENT_ID=your_client_id
//   REDDIT_CLIENT_SECRET=your_client_secret

import { RawProfile, firstEmail, sleep } from '@/lib/scrapperUtils'

// ── Subreddit map per ecosystem ───────────────────────────────────────────────
const ECOSYSTEM_SUBREDDITS: Record<string, string[]> = {
  Bitcoin:   ['Bitcoin', 'btc', 'BitcoinBeginners', 'CryptoTechnology'],
  Ethereum:  ['ethereum', 'ethfinance', 'ethdev', 'defi'],
  Solana:    ['solana', 'SolanaGamers', 'solanaNFT'],
  Base:      ['Base', 'basechain', 'defi'],
  Arbitrum:  ['Arbitrum', 'defi'],
  Optimism:  ['optimismCollective', 'defi'],
  Cosmos:    ['cosmosnetwork', 'cosmosDB'],
  Sui:       ['SuiNetwork', 'sui_crypto'],
  Aptos:     ['Aptos'],
  Polygon:   ['0xPolygon', 'maticnetwork'],
  Avalanche: ['Avax', 'Avalanche'],
  TON:       ['Toncoin', 'TONcrypto'],
  // Fallback for any unknown ecosystem
  default:   ['CryptoCurrency', 'CryptoMarkets', 'defi', 'crypto_com'],
}

// ── Reddit OAuth token (cached in memory for the process lifetime) ────────────
let _token: string | null = null
let _tokenExpiry = 0

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token

  const clientId     = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in .env')
  }

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization:  `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':   'CryptoLeadsCRM/1.0',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status}`)
  const data = await res.json()
  _token       = data.access_token
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return _token!
}

// ── Authenticated Reddit fetch ────────────────────────────────────────────────
async function redditFetch(path: string): Promise<any> {
  const token = await getToken()
  const res = await fetch(`https://oauth.reddit.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent':  'CryptoLeadsCRM/1.0',
    },
  })
  if (res.status === 429) throw new Error('Reddit rate limited')
  if (!res.ok) throw new Error(`Reddit API error: ${res.status}`)
  return res.json()
}

// ── Fetch a user's public profile ─────────────────────────────────────────────
async function fetchUserProfile(username: string): Promise<{
  bio: string
  websiteUrl: string | null
  followerCount: number
} | null> {
  try {
    await sleep(300) // be polite
    const data = await redditFetch(`/user/${username}/about.json`)
    const subreddit = data?.data?.subreddit
    const bio       = subreddit?.public_description ?? ''
    // Reddit doesn't expose personal websites directly in the API,
    // but the public_description often contains them or emails.
    return {
      bio,
      websiteUrl:    null,
      followerCount: subreddit?.subscribers ?? 0,
    }
  } catch {
    return null
  }
}

// ── Search a subreddit for posts matching a query ─────────────────────────────
async function searchSubreddit(
  subreddit: string,
  query: string,
  limit = 25,
): Promise<Array<{ author: string; title: string; selftext: string; url: string }>> {
  try {
    const params = new URLSearchParams({
      q:    query,
      sort: 'relevance',
      t:    'year',
      limit: String(limit),
    })
    const data = await redditFetch(`/r/${subreddit}/search.json?${params}`)
    return (data?.data?.children ?? []).map((c: any) => ({
      author:   c.data.author,
      title:    c.data.title,
      selftext: c.data.selftext ?? '',
      url:      `https://reddit.com${c.data.permalink}`,
    }))
  } catch {
    return []
  }
}

// ── Main export: scrape Reddit for profiles matching ecosystem + criteria ──────
export async function scrapeReddit(params: {
  ecosystem:    string
  beliefSignal: string
  niches:       string[]
  roles:        string[]
  maxProfiles?: number
}): Promise<RawProfile[]> {
  const { ecosystem, beliefSignal, niches, roles, maxProfiles = 60 } = params

  const subreddits = ECOSYSTEM_SUBREDDITS[ecosystem] ?? ECOSYSTEM_SUBREDDITS.default

  // Build search queries from criteria
  const queries = [
    beliefSignal || `${ecosystem} holder`,
    niches.length  ? `${niches[0]} ${ecosystem}`       : `${ecosystem} staking`,
    roles.length   ? `${roles[0].toLowerCase()} ${ecosystem}` : `${ecosystem} community`,
    `${ecosystem} buy dip`,
    `${ecosystem} portfolio`,
  ].slice(0, 3) // max 3 queries to stay within rate limits

  const seen    = new Set<string>()
  const profiles: RawProfile[] = []

  for (const subreddit of subreddits.slice(0, 3)) {
    for (const query of queries) {
      if (profiles.length >= maxProfiles) break

      const posts = await searchSubreddit(subreddit, query, 20)
      await sleep(500)

      for (const post of posts) {
        if (profiles.length >= maxProfiles) break
        if (!post.author || post.author === '[deleted]' || seen.has(post.author)) continue
        seen.add(post.author)

        const userInfo = await fetchUserProfile(post.author)
        if (!userInfo) continue

        // Extract any email visible in bio
        const emailInBio = firstEmail(userInfo.bio)

        profiles.push({
          source:        'reddit',
          username:      post.author,
          displayName:   post.author,
          profileUrl:    `https://reddit.com/u/${post.author}`,
          bio:           userInfo.bio,
          websiteUrl:    userInfo.websiteUrl,
          email:         emailInBio,
          emailSource:   emailInBio ? 'Reddit profile bio' : null,
          postContent:   `${post.title} — ${post.selftext}`.slice(0, 500),
          ecosystem,
          followerCount: userInfo.followerCount,
        })
      }

      await sleep(800) // rate limit between queries
    }
  }

  return profiles
}