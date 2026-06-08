// ─── src/app/api/scrape/route.ts ──────────────────────────────────────────────
// Main scrape endpoint. Replaces /api/research for the discover flow.
// Called by ResearchPanel.tsx handleDiscover when mode === 'discover'.
//
// Flow:
//   1. Run Reddit, Quora, Bitcointalk scrapers in parallel
//   2. Merge + deduplicate raw profiles
//   3. Send to Claude for analysis, enrichment, and email hunting
//   4. Return structured prospects to the frontend
//
// Falls back to the AI-only research route if scraping yields nothing.

import { NextRequest, NextResponse } from 'next/server'
import { scrapeReddit }      from './reddit'
import { scrapeQuora }       from './quora'
import { scrapeBitcointalk } from './bitcointalk'
import { analyzeProfiles }   from './analyze'
import { RawProfile }        from '@/lib/scrapperUtils'

// ── Dedup raw profiles by profileUrl ─────────────────────────────────────────
function deduplicateRaw(profiles: RawProfile[]): RawProfile[] {
  const seen = new Set<string>()
  return profiles.filter(p => {
    if (seen.has(p.profileUrl)) return false
    seen.add(p.profileUrl)
    return true
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, criteria, query } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured in .env' },
        { status: 500 },
      )
    }

    // ── LOOKUP MODE — delegate to AI-only research route ─────────────────────
    // Lookup is a single-person deep-research task; scraping doesn't apply.
    if (mode === 'lookup') {
      const res  = await fetch(`${req.nextUrl.origin}/api/research`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'lookup', query }),
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    }

    // ── DISCOVER MODE ─────────────────────────────────────────────────────────
    if (mode === 'discover') {
      const { niches = [], roles = [], ecosystems = [], platforms = [], beliefSignal = '' } = criteria ?? {}
      const ecosystem = ecosystems[0] ?? 'Bitcoin'

      const scraperParams = {
        ecosystem,
        beliefSignal,
        niches,
        roles,
      }

      // ── Step 1: Run all scrapers in parallel ──────────────────────────────
      console.log(`[scrape] Starting scrape for ecosystem: ${ecosystem}`)

      const [redditResult, quoraResult, bitcointalkResult] = await Promise.allSettled([
        scrapeReddit({      ...scraperParams, maxProfiles: 60 }),
        scrapeQuora({       ...scraperParams, maxProfiles: 40 }),
        scrapeBitcointalk({ ...scraperParams, maxProfiles: 40 }),
      ])

      const rawProfiles: RawProfile[] = []

      if (redditResult.status === 'fulfilled') {
        console.log(`[scrape] Reddit: ${redditResult.value.length} profiles`)
        rawProfiles.push(...redditResult.value)
      } else {
        console.warn('[scrape] Reddit failed:', redditResult.reason?.message)
      }

      if (quoraResult.status === 'fulfilled') {
        console.log(`[scrape] Quora: ${quoraResult.value.length} profiles`)
        rawProfiles.push(...quoraResult.value)
      } else {
        console.warn('[scrape] Quora failed:', quoraResult.reason?.message)
      }

      if (bitcointalkResult.status === 'fulfilled') {
        console.log(`[scrape] Bitcointalk: ${bitcointalkResult.value.length} profiles`)
        rawProfiles.push(...bitcointalkResult.value)
      } else {
        console.warn('[scrape] Bitcointalk failed:', bitcointalkResult.reason?.message)
      }

      console.log(`[scrape] Total raw profiles before dedup: ${rawProfiles.length}`)

      // ── Step 2: Deduplicate ───────────────────────────────────────────────
      const unique = deduplicateRaw(rawProfiles)
      console.log(`[scrape] After dedup: ${unique.length} profiles`)

      // ── Step 3: If scraping yielded nothing, fall back to AI-only ─────────
      if (unique.length === 0) {
        console.log('[scrape] No scraped profiles, falling back to AI research')
        const res  = await fetch(`${req.nextUrl.origin}/api/research`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ mode: 'discover', criteria }),
        })
        const data = await res.json()
        return NextResponse.json({ ...data, source: 'ai-fallback' }, { status: res.status })
      }

      // ── Step 4: Claude analysis ───────────────────────────────────────────
      console.log(`[scrape] Sending ${unique.length} profiles to Claude for analysis`)
      const prospects = await analyzeProfiles(unique, ecosystem, apiKey)
      console.log(`[scrape] Claude returned ${prospects.length} qualified prospects`)

      // ── Step 5: If Claude filtered everything, also fall back ─────────────
      if (prospects.length === 0) {
        console.log('[scrape] Claude filtered all profiles, falling back to AI research')
        const res  = await fetch(`${req.nextUrl.origin}/api/research`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ mode: 'discover', criteria }),
        })
        const data = await res.json()
        return NextResponse.json({ ...data, source: 'ai-fallback' }, { status: res.status })
      }

      return NextResponse.json({
        results: prospects,
        source:  'scraped',
        meta: {
          totalScraped:  rawProfiles.length,
          afterDedup:    unique.length,
          afterAnalysis: prospects.length,
          sources: {
            reddit:      redditResult.status      === 'fulfilled' ? redditResult.value.length      : 0,
            quora:       quoraResult.status        === 'fulfilled' ? quoraResult.value.length        : 0,
            bitcointalk: bitcointalkResult.status  === 'fulfilled' ? bitcointalkResult.value.length  : 0,
          },
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid mode — must be discover or lookup' },
      { status: 400 },
    )

  } catch (error: any) {
    console.error('[scrape] Route error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Scrape failed' },
      { status: 500 },
    )
  }
}