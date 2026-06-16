// ─── reddit.ts ────────────────────────────────────────────────────────────────
// Calls the VPS scraper service via SSE stream.
// Profiles arrive one by one as the VPS finds them — no timeout issues.
//
// Required env vars (.env.local + Vercel):
//   REDDIT_SCRAPER_URL    = http://153.75.91.144:8000
//   REDDIT_SCRAPER_SECRET = your secret

import { RawProfile } from '@/lib/scrapperUtils'

export async function scrapeReddit(params: {
  ecosystem:    string
  beliefSignal: string
  niches:       string[]
  roles:        string[]
  maxProfiles?: number
}): Promise<RawProfile[]>  {
  const url    = process.env.REDDIT_SCRAPER_URL?.replace(/\/$/, '')
  const secret = process.env.REDDIT_SCRAPER_SECRET

  if (!url || !secret) {
    throw new Error('REDDIT_SCRAPER_URL and REDDIT_SCRAPER_SECRET must be set in .env.local')
  }

  const endpoint = `${url}/scrape/reddit/stream`
  console.log(`[reddit] Connecting to SSE stream: ${endpoint}`)

  const res = await fetch(endpoint, {
    method:  'POST',
    headers: {
      'Content-Type':     'application/json',
      'X-Scraper-Secret': secret,
    },
    body: JSON.stringify({
      ecosystem:    params.ecosystem,
      beliefSignal: params.beliefSignal,
      niches:       params.niches,
      roles:        params.roles,
      maxProfiles:  params.maxProfiles ?? 60,
    }),
    signal: AbortSignal.timeout(15 * 60 * 1000), // 15 min hard ceiling
  })

  if (res.status === 401) {
    throw new Error('[reddit] VPS rejected request — check REDDIT_SCRAPER_SECRET')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[reddit] VPS returned ${res.status}: ${body}`)
  }
  if (!res.body) {
    throw new Error('[reddit] No response body from VPS stream')
  }

  const profiles: RawProfile[] = []
  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let   buffer  = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed === 'event: done') continue
        if (trimmed.startsWith('data: ')) {
          const raw = trimmed.slice(6)
          try {
            const parsed = JSON.parse(raw)
            if ('total' in parsed) {
              console.log(`[reddit] Stream complete — ${parsed.total} profiles in ${parsed.elapsed}s`)
              break
            }
            profiles.push(parsed as RawProfile)
            console.log(`[reddit] Received profile ${profiles.length}: ${parsed.username}`)
          } catch {
            // malformed line — skip
          }
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }

  console.log(`[reddit] Total collected: ${profiles.length}`)
  return profiles
}