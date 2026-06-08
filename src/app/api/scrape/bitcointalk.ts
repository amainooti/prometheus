// ─── bitcointalk.ts ───────────────────────────────────────────────────────────
// Bitcointalk.org forum scraper.
// Bitcointalk is static HTML — no JS rendering needed, no auth required.
// Members frequently put email addresses in their profile signatures.
// This is the HIGHEST email yield source of the three.
//
// No credentials needed. Rate-limit: 1 req/1.5s to stay safe.

import { RawProfile, firstEmail, sleep } from '@/lib/scrapperUtils'

// ── Board IDs for ecosystem-relevant Bitcointalk sections ────────────────────
// https://bitcointalk.org/index.php?board=X
const ECOSYSTEM_BOARDS: Record<string, number[]> = {
  Bitcoin:   [1, 7, 14],    // Bitcoin Discussion, Technical, Mining
  Ethereum:  [159, 238],    // Altcoin Discussion, Ethereum
  Solana:    [238, 67],     // Altcoin Discussion, Speculation
  default:   [238, 67, 14], // Altcoin Discussion, Speculation, Mining
}

const BT_BASE = 'https://bitcointalk.org'

// ── Fetch a Bitcointalk page ──────────────────────────────────────────────────
async function btFetch(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept':     'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`Bitcointalk fetch ${res.status}: ${url}`)
  return res.text()
}

// ── Parse thread links from a board page ─────────────────────────────────────
function parseThreadLinks(html: string): string[] {
  const links: string[] = []
  // Match topic links
  const re = /href="(https:\/\/bitcointalk\.org\/index\.php\?topic=\d+\.\d+)"/g
  let m: RegExpExecArray | null
  const seen = new Set<string>()
  while ((m = re.exec(html)) !== null) {
    const url = m[1].split('#')[0] // strip anchor
    if (!seen.has(url)) { seen.add(url); links.push(url) }
  }
  return links.slice(0, 10)
}

// ── Parse post authors from a thread page ────────────────────────────────────
function parsePostAuthors(html: string): Array<{ username: string; profileId: string }> {
  const results: Array<{ username: string; profileId: string }> = []
  const seen = new Set<string>()

  // Bitcointalk profile links look like: index.php?action=profile;u=12345
  const re = /href="https:\/\/bitcointalk\.org\/index\.php\?action=profile;u=(\d+)"[^>]*>([^<]+)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const profileId = m[1]
    const username  = m[2].trim()
    if (seen.has(profileId) || username === 'View Profile') continue
    seen.add(profileId)
    results.push({ username, profileId })
  }
  return results.slice(0, 20)
}

// ── Fetch and parse a Bitcointalk member profile ──────────────────────────────
async function fetchMemberProfile(profileId: string): Promise<{
  bio:       string
  email:     string | null
  website:   string | null
  signature: string
}> {
  const url  = `${BT_BASE}/index.php?action=profile;u=${profileId}`
  const html = await btFetch(url)

  // Extract signature block (most likely place for email)
  const sigMatch = html.match(/class="signature"[^>]*>([\s\S]*?)<\/div>/i)
  const signature = sigMatch ? sigMatch[1].replace(/<[^>]+>/g, ' ').trim() : ''

  // Extract website
  const webMatch  = html.match(/Website[^<]*<\/td>[^<]*<td[^>]*><a[^>]*href="([^"]+)"/)
  const website   = webMatch ? webMatch[1] : null

  // Look for email in: signature, full page
  const emailInSig  = firstEmail(signature)
  const emailInPage = firstEmail(html)
  const email       = emailInSig ?? emailInPage

  // Extract "Additional info" / about field
  const aboutMatch = html.match(/Name[^<]*<\/td>[^<]*<td[^>]*>([^<]+)</)
  const bio        = aboutMatch ? aboutMatch[1].trim() : ''

  return { bio, email, website, signature }
}

// ── Search Bitcointalk using their built-in search ────────────────────────────
async function searchBitcointalk(query: string, boardId: number): Promise<string> {
  const params = new URLSearchParams({
    action:        'search2',
    search:        query,
    searchtype:    '1',
    boards:        String(boardId),
    sort:          'rel',
    showResults:   'messages',
  })
  return btFetch(`${BT_BASE}/index.php?${params}`)
}

// ── Main export: scrape Bitcointalk for ecosystem members ─────────────────────
export async function scrapeBitcointalk(params: {
  ecosystem:    string
  beliefSignal: string
  niches:       string[]
  maxProfiles?: number
}): Promise<RawProfile[]> {
  const { ecosystem, beliefSignal, niches, maxProfiles = 40 } = params

  const boardIds = ECOSYSTEM_BOARDS[ecosystem] ?? ECOSYSTEM_BOARDS.default
  const queries  = [
    beliefSignal || `${ecosystem} holder`,
    `${ecosystem} staking investing`,
    niches.length ? `${ecosystem} ${niches[0]}` : `${ecosystem} community`,
  ]

  const seen     = new Set<string>()
  const profiles: RawProfile[] = []

  for (const boardId of boardIds.slice(0, 2)) {
    for (const query of queries.slice(0, 2)) {
      if (profiles.length >= maxProfiles) break

      let searchHtml = ''
      try {
        searchHtml = await searchBitcointalk(query, boardId)
        await sleep(1500)
      } catch { continue }

      // Get thread links from search results
      const threadLinks = parseThreadLinks(searchHtml)

      for (const threadUrl of threadLinks.slice(0, 3)) {
        if (profiles.length >= maxProfiles) break

        let threadHtml = ''
        try {
          threadHtml = await btFetch(threadUrl)
          await sleep(1500)
        } catch { continue }

        const authors = parsePostAuthors(threadHtml)

        for (const author of authors) {
          if (profiles.length >= maxProfiles) break
          if (seen.has(author.profileId)) continue
          seen.add(author.profileId)

          let profileData = { bio: '', email: null as string | null, website: null as string | null, signature: '' }
          try {
            profileData = await fetchMemberProfile(author.profileId)
            await sleep(1500)
          } catch { continue }

          const profileUrl = `${BT_BASE}/index.php?action=profile;u=${author.profileId}`

          profiles.push({
            source:      'bitcointalk',
            username:    author.username,
            displayName: author.username,
            profileUrl,
            bio:         `${profileData.bio} ${profileData.signature}`.trim(),
            websiteUrl:  profileData.website,
            email:       profileData.email,
            emailSource: profileData.email
              ? profileData.signature.includes(profileData.email)
                ? 'Bitcointalk profile signature'
                : 'Bitcointalk profile page'
              : null,
            postContent: `Active in ${ecosystem} forum discussion: ${query}`,
            ecosystem,
          })
        }
      }
    }
  }

  return profiles
}