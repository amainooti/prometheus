// ─── quora.ts ─────────────────────────────────────────────────────────────────
// Quora public page scraper using fetch + regex parsing.
// No browser needed — Quora serves enough data in the initial HTML
// for public question/answer pages to extract author info.
//
// No credentials needed. Rate-limit: 1 req/sec to stay safe.

import { RawProfile, firstEmail, sleep } from '@/lib/scrapperUtils'

// ── Search queries per ecosystem ──────────────────────────────────────────────
function buildQuoraQueries(ecosystem: string, beliefSignal: string, niches: string[]): string[] {
  const base = [
    `${ecosystem} cryptocurrency holding investing`,
    `${ecosystem} DeFi staking experience`,
    `${ecosystem} crypto community`,
  ]
  if (beliefSignal) base.unshift(`${ecosystem} ${beliefSignal}`)
  if (niches.length) base.push(`${ecosystem} ${niches[0]}`)
  return base.slice(0, 4)
}

// ── Fetch a Quora search results page ─────────────────────────────────────────
async function fetchQuoraSearch(query: string): Promise<string> {
  const encoded = encodeURIComponent(query)
  const url     = `https://www.quora.com/search?q=${encoded}&type=answer`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept':     'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!res.ok) throw new Error(`Quora fetch failed: ${res.status}`)
  return res.text()
}

// ── Fetch a Quora profile page ─────────────────────────────────────────────────
async function fetchQuoraProfile(profileUrl: string): Promise<string> {
  const res = await fetch(profileUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept':     'text/html',
    },
  })
  if (!res.ok) return ''
  return res.text()
}

// ── Parse author names + profile slugs from Quora HTML ───────────────────────
// Quora embeds structured data and og: tags we can use without a full DOM parser.
function parseQuoraAuthors(html: string): Array<{ name: string; slug: string }> {
  const results: Array<{ name: string; slug: string }> = []
  const seen = new Set<string>()

  // Match profile links like /profile/FirstName-LastName
  const profileRe = /href="\/profile\/([A-Za-z0-9\-]+)"/g
  let m: RegExpExecArray | null

  while ((m = profileRe.exec(html)) !== null) {
    const slug = m[1]
    // Filter out Quora system pages
    if (seen.has(slug)) continue
    if (['Quora', 'About', 'Careers', 'Press', 'Blog'].includes(slug)) continue
    seen.add(slug)

    // Try to get a display name from nearby text
    const displayName = slug.replace(/-\d+$/, '').replace(/-/g, ' ')
    results.push({ name: displayName, slug })
  }

  return results.slice(0, 30)
}

// ── Extract bio and email from a Quora profile page ───────────────────────────
function parseQuoraProfile(html: string): { bio: string; email: string | null } {
  // Try meta description first (most reliable)
  const metaMatch = html.match(/<meta name="description" content="([^"]+)"/)
  const bio       = metaMatch ? metaMatch[1] : ''

  // Look for email anywhere in the page
  const email = firstEmail(html)

  return { bio, email }
}

// ── Main export: scrape Quora for ecosystem-relevant answer authors ────────────
export async function scrapeQuora(params: {
  ecosystem:    string
  beliefSignal: string
  niches:       string[]
  maxProfiles?: number
}): Promise<RawProfile[]> {
  const { ecosystem, beliefSignal, niches, maxProfiles = 40 } = params
  const queries  = buildQuoraQueries(ecosystem, beliefSignal, niches)
  const seen     = new Set<string>()
  const profiles: RawProfile[] = []

  for (const query of queries) {
    if (profiles.length >= maxProfiles) break

    let html = ''
    try {
      html = await fetchQuoraSearch(query)
      await sleep(1200)
    } catch {
      continue
    }

    const authors = parseQuoraAuthors(html)

    for (const author of authors) {
      if (profiles.length >= maxProfiles) break
      if (seen.has(author.slug)) continue
      seen.add(author.slug)

      const profileUrl  = `https://www.quora.com/profile/${author.slug}`
      let bio   = ''
      let email: string | null = null

      try {
        const profileHtml = await fetchQuoraProfile(profileUrl)
        const parsed      = parseQuoraProfile(profileHtml)
        bio   = parsed.bio
        email = parsed.email
        await sleep(800)
      } catch {
        // Use what we have
      }

      profiles.push({
        source:      'quora',
        username:    author.slug,
        displayName: author.name,
        profileUrl,
        bio,
        websiteUrl:  null,
        email,
        emailSource: email ? 'Quora profile page' : null,
        postContent: `Answered questions about ${ecosystem} ${query}`,
        ecosystem,
      })
    }
  }

  return profiles
}