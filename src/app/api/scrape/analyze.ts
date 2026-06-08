// ─── analyze.ts ───────────────────────────────────────────────────────────────
// Claude Haiku analysis layer.
// Takes a batch of raw scraped profiles and returns structured CRM prospects.
// Claude's job here is NOT to find people — the scrapers already did that.
// Claude's job is to:
//   1. Score each profile for holder/believer conviction
//   2. Hunt for emails in linked websites, GitHub, etc.
//   3. Filter out high-profile / irrelevant accounts
//   4. Assign priority, confidence, tags, and belief signal summary
//   5. Return the final structured prospect shape

import { RawProfile, normalizeProfile } from '@/lib/scrapperUtils'

// ── Extract text blocks from Claude response ──────────────────────────────────
function extractText(data: any): string {
  const blocks = data?.content ?? []
  return blocks
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text?.trim())
    .filter(Boolean)
    .pop() ?? ''
}

// ── Parse JSON robustly ───────────────────────────────────────────────────────
function parseJSON(raw: string): any {
  const fence = raw.match(/```json\s*([\s\S]*?)```/)
  if (fence) { try { return JSON.parse(fence[1].trim()) } catch {} }
  const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const arr = clean.match(/\[[\s\S]*\]/)
  if (arr) { try { return JSON.parse(arr[0]) } catch {} }
  const obj = clean.match(/\{[\s\S]*\}/)
  if (obj) { try { return JSON.parse(obj[0]) } catch {} }
  throw new Error('No valid JSON in response')
}

// ── Batch size: analyze N profiles per Claude call ────────────────────────────
const BATCH_SIZE = 8

// ── Build the analysis prompt for a batch of profiles ────────────────────────
function buildAnalysisPrompt(profiles: ReturnType<typeof normalizeProfile>[], ecosystem: string): string {
  const profilesJson = JSON.stringify(profiles, null, 2)

  return `You are analyzing real scraped user profiles from Reddit, Quora, and Bitcointalk forums.
Your job is to filter and enrich these profiles into CRM-ready crypto prospects.

Target ecosystem: ${ecosystem}

For each profile:
1. Determine if this is a genuine retail holder / community member (KEEP) or a high-profile/famous person (SKIP)
2. If they have a websiteUrl, search it for an email address
3. If they mention GitHub, search their GitHub bio/README for an email
4. Score their conviction level based on bio + post content
5. Assign priority (A/B/C), confidence (HIGH/MEDIUM/LOW), and tags

SKIP profiles where:
- They appear to be founders, CEOs, protocol leads, or foundation employees
- They have >10K followers
- Their bio is empty and post content shows no crypto conviction

KEEP profiles where:
- Bio or posts mention holding, staking, accumulating, DeFi usage, wallet activity
- They show ecosystem loyalty or "maxi" signals
- They are clearly retail/community level

For email: use what the scraper found, OR search their websiteUrl/GitHub link if present.
If no email can be found, set email to null — do NOT invent one.

Return ONLY a raw JSON array. No text before or after. Start with [ end with ].

Output schema for each kept profile:
[{
  "name": "",
  "role": "Community Member",
  "company": null,
  "companyWebsite": null,
  "linkedinUrl": null,
  "twitterUrl": null,
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
  "sourceFound": "REDDIT",
  "confidence": "MEDIUM"
}]

Raw profiles to analyze:
${profilesJson}`
}

// ── Call Claude Haiku with web search enabled ─────────────────────────────────
async function callClaude(apiKey: string, prompt: string): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':    'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5',
        max_tokens: 4000,
        tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (res.status === 429) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 2000))
      continue
    }
    if (!res.ok) throw new Error(`Claude API ${res.status}`)
    return res.json()
  }
  throw new Error('Claude rate limit exceeded after retries')
}

// ── Deduplicate by name ───────────────────────────────────────────────────────
function deduplicateByName(leads: any[]): any[] {
  const seen = new Set<string>()
  return leads.filter(p => {
    const key = (p.name ?? '').toLowerCase().trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Main export: analyze a batch of raw profiles ─────────────────────────────
export async function analyzeProfiles(
  rawProfiles: RawProfile[],
  ecosystem: string,
  apiKey: string,
): Promise<any[]> {
  if (!rawProfiles.length) return []

  // Normalize all profiles first
  const normalized = rawProfiles
    .map(normalizeProfile)
    .filter(p => !p.highProfile) // pre-filter obvious high-profile before sending to Claude

  if (!normalized.length) return []

  // Split into batches
  const batches: typeof normalized[] = []
  for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
    batches.push(normalized.slice(i, i + BATCH_SIZE))
  }

  // Analyze batches in parallel (max 4 concurrent to avoid rate limits)
  const results: any[] = []
  const CONCURRENCY = 4

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const chunk   = batches.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      chunk.map(async batch => {
        const prompt = buildAnalysisPrompt(batch, ecosystem)
        const data   = await callClaude(apiKey, prompt)
        const text   = extractText(data)
        if (!text) return []
        try {
          const parsed = parseJSON(text)
          return Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          return []
        }
      })
    )
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(...r.value)
    }
    // Small pause between concurrent batches
    if (i + CONCURRENCY < batches.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // Final dedup + sort
  const unique = deduplicateByName(results)
  const priorityOrder:   Record<string, number> = { A: 0, B: 1, C: 2 }
  const confidenceOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

  return unique.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 9
    const pb = priorityOrder[b.priority] ?? 9
    if (pa !== pb) return pa - pb
    return (confidenceOrder[a.confidence] ?? 9) - (confidenceOrder[b.confidence] ?? 9)
  })
}