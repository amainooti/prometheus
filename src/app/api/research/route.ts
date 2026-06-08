import { NextRequest, NextResponse } from 'next/server'

// ── Shared: extract final text from Claude response ───────────────────────────
function extractText(data: any): string {
  const blocks = data?.content ?? []
  const textBlocks = blocks
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text?.trim())
    .filter(Boolean)
  return textBlocks[textBlocks.length - 1] ?? ''
}

// ── Shared: parse JSON robustly ───────────────────────────────────────────────
function parseJSON(raw: string): any {
  const fenceMatch = raw.match(/```json\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch {}
  }
  let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const arrMatch = clean.match(/\[[\s\S]*\]/)
  if (arrMatch) { try { return JSON.parse(arrMatch[0]) } catch {} }
  const objMatch = clean.match(/\{[\s\S]*\}/)
  if (objMatch) { try { return JSON.parse(objMatch[0]) } catch {} }
  throw new Error('No valid JSON found in response')
}

// ── Deduplicate by name (case-insensitive) ────────────────────────────────────
function deduplicateByName(leads: any[]): any[] {
  const seen = new Set<string>()
  return leads.filter(p => {
    const key = (p.name ?? '').toLowerCase().trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Shared: build Anthropic request with retry ────────────────────────────────
async function callClaude(
  apiKey: string,
  system: string,
  userMessage: string,
  maxTokens = 4000,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':    'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5',
        max_tokens: maxTokens,
        tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
        system,
        messages:   [{ role: 'user', content: userMessage }],
      }),
    })

    if (response.status === 429) {
      const wait = Math.pow(2, attempt) * 2000
      console.log(`Rate limited, retrying in ${wait}ms...`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic API error:', response.status, err)
      throw new Error(`Anthropic API ${response.status}: ${err}`)
    }

    return response.json()
  }
  throw new Error('Rate limit exceeded after 3 retries. Please wait a moment and try again.')
}

// ── JSON schema template ──────────────────────────────────────────────────────
const PROSPECT_SCHEMA = `[{
  "name": "",
  "role": "",
  "company": "",
  "companyWebsite": null,
  "linkedinUrl": null,
  "twitterUrl": null,
  "farcasterUrl": null,
  "redditUrl": null,
  "quoraUrl": null,
  "truthSocialUrl": null,
  "forumUrl": null,
  "forumSource": null,
  "email": null,
  "emailSource": null,
  "cryptoNiche": "",
  "ecosystem": "",
  "beliefSignal": "",
  "activityLevel": "ACTIVE",
  "tags": [],
  "priority": "A",
  "priorityReason": "",
  "sourceFound": "X_TWITTER",
  "confidence": "HIGH"
}]`

// ── Ecosystem detector: infer the most specific ecosystem from bio/activity ───
function inferEcosystem(lead: any, searchedEcosystem: string): string {
  // The searched ecosystem is the default. Claude may have returned a different
  // one in the `ecosystem` field — respect that override if it's a non-empty,
  // meaningful value that differs from the generic fallback.
  const aiEcosystem = (lead.ecosystem ?? '').trim()
  if (aiEcosystem && aiEcosystem.toLowerCase() !== 'unknown') {
    return aiEcosystem
  }
  return searchedEcosystem
}

const SHARED_INSTRUCTIONS = `
ECOSYSTEM TAGGING RULES:
- Each person MUST have an "ecosystem" field set to their PRIMARY crypto ecosystem (e.g. "Solana", "Ethereum", "Bitcoin", "Avalanche", "Sui", "Base", "TON", etc.)
- Default to the ecosystem specified in the search criteria UNLESS you find clear evidence the person is primarily active in a different ecosystem
- A "maxi" or ecosystem loyalist should have that ecosystem listed even if they touch others
- If someone is genuinely multi-chain, list their most active ecosystem

EMAIL HUNTING RULES — this is the most important part:
- Every person MUST have a public email address. If you cannot find a public email, DO NOT include that person — skip them and find someone else who has one.
- Search: [name] + "email" site:twitter.com OR site:github.com OR site:linkedin.com
- Check GitHub profile bio and README files for email
- Check Twitter/X bio explicitly for @ or email strings
- Check their personal website /contact page
- Check Substack or Mirror author pages for contact info
- Check Bitcointalk profile signature lines which often contain emails
- Only include people where you have FOUND a real public email — not guessed
- If a batch of 10 candidates only yields 4 with emails, return only those 4. Do NOT pad with no-email leads.

CRITICAL: Return ONLY a raw JSON array. No text before or after. No explanation. No preamble. Start with [ and end with ].`

export async function POST(req: NextRequest) {
  try {
    const { mode, query, criteria } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured in .env' },
        { status: 500 },
      )
    }

    // ── DISCOVERY MODE ────────────────────────────────────────────────────────
    if (mode === 'discover') {
      const { niches, roles, ecosystems, platforms, beliefSignal } = criteria ?? {}

      const niche     = (niches     ?? []).join(', ')
      const role      = (roles      ?? []).join(', ')
      // Primary ecosystem for tagging — use the first one if multiple provided
      const primaryEcosystem = (ecosystems ?? [])[0] ?? 'Crypto'
      const ecosystem = (ecosystems ?? []).join(', ')
      const platform  = (platforms  ?? []).join(', ')

      const parts = [
        role         && `Role: ${role}`,
        niche        && `Niche: ${niche}`,
        ecosystem    && `Ecosystem: ${ecosystem}`,
        platform     && `Preferred platforms: ${platform}`,
        beliefSignal && `Belief signal / keywords: ${beliefSignal}`,
      ].filter(Boolean).join('\n')

      // ── 8 parallel searches across different sources / angles ─────────────
      // Each search targets a different source pool and returns up to 10 leads.
      // All must have public emails.

      const systemPrompt = (source: string) =>
        `You are an expert crypto lead prospecting agent. Find REAL crypto-native people or believers who have PUBLIC email addresses and are specifically active in the ${primaryEcosystem} ecosystem. Focus on ${source}.

Profile to match:
${parts}

${SHARED_INSTRUCTIONS}

Schema (return up to 10 per search — ONLY include people with a confirmed public email):
${PROSPECT_SCHEMA}`

      const searches = [
        // 1 — GitHub (highest email hit rate)
        callClaude(
          apiKey,
          systemPrompt(`GitHub profiles with ${primaryEcosystem} repos and email in bio or README`),
          `Find ${primaryEcosystem}-native people with PUBLIC emails on GitHub. Check profile bio, pinned repos, and README files. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 2 — Substack + Mirror newsletter authors
        callClaude(
          apiKey,
          systemPrompt(`Substack ${primaryEcosystem} newsletter authors and Mirror.xyz writers`),
          `Find ${primaryEcosystem} ecosystem newsletter authors with PUBLIC emails on Substack author pages and Mirror.xyz profiles. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 3 — Bitcointalk / ecosystem-specific forums
        callClaude(
          apiKey,
          systemPrompt(`Bitcointalk.org members and ${primaryEcosystem}-specific forum contributors (e.g. solana forums, ethereum magicians, commonwealth DAO)`),
          `Find ${primaryEcosystem} believers with PUBLIC emails from Bitcointalk signatures, Ethereum Magicians, Commonwealth DAO governance, or ${primaryEcosystem} forums. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 4 — Twitter/X bios with email
        callClaude(
          apiKey,
          systemPrompt(`Twitter/X ${primaryEcosystem} accounts with email address visible in their bio`),
          `Find ${primaryEcosystem}-native people whose Twitter/X bio explicitly contains a public email address. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 5 — Reddit crypto profiles with linked personal sites
        callClaude(
          apiKey,
          systemPrompt(`Reddit contributors in r/${primaryEcosystem.toLowerCase()}, r/solana, r/ethereum, r/bitcoin, r/defi, r/CryptoCurrency who have linked personal sites or emails`),
          `Find ${primaryEcosystem} believers with PUBLIC emails from Reddit profiles (check linked personal sites in profile), focusing on top contributors in ${primaryEcosystem} subreddits. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 6 — Farcaster + Warpcast + Lens
        callClaude(
          apiKey,
          systemPrompt(`Farcaster/Warpcast users and Lens Protocol profiles in the ${primaryEcosystem} ecosystem`),
          `Find ${primaryEcosystem}-native people with PUBLIC emails from Farcaster profiles, Warpcast bios, and Lens Protocol author pages. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 7 — Personal blogs + dev.to + Hashnode
        callClaude(
          apiKey,
          systemPrompt(`Personal crypto blogs, dev.to crypto writers, and Hashnode blockchain developers focused on ${primaryEcosystem}`),
          `Find ${primaryEcosystem} ecosystem developers and writers with PUBLIC emails on their personal blogs, dev.to profiles, and Hashnode author pages. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 8 — LinkedIn + Gitcoin grant applicants + hackathon profiles
        callClaude(
          apiKey,
          systemPrompt(`LinkedIn crypto professionals in the ${primaryEcosystem} space with public contact info, and Gitcoin grant applicants or hackathon participants`),
          `Find ${primaryEcosystem}-native professionals with PUBLIC emails from LinkedIn profiles with visible contact, Gitcoin grant pages, and crypto hackathon participant profiles. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),
      ]

      const settled = await Promise.allSettled(searches)

      const allResults: any[] = []
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          const text = extractText(result.value)
          if (text) {
            try {
              const parsed = parseJSON(text)
              const arr = Array.isArray(parsed) ? parsed : [parsed]
              allResults.push(...arr)
            } catch (e: any) {
              console.warn('Skipping failed parse from one search:', e.message)
            }
          }
        } else {
          console.warn('One search failed:', result.reason)
        }
      }

      // 1. Deduplicate by name
      const unique = deduplicateByName(allResults)

      // 2. Hard filter — email required (no email = dropped entirely)
      const withEmail = unique.filter(
        p => p.email && p.email.trim() !== '' && p.email.trim().toLowerCase() !== 'null',
      )

      // 3. Apply ecosystem tagging: searched ecosystem as default, AI override respected
      const tagged = withEmail.map(lead => ({
        ...lead,
        ecosystem: inferEcosystem(lead, primaryEcosystem),
      }))

      // 4. Sort: priority A first, then HIGH confidence first within each tier
      const priorityOrder: Record<string, number> = { A: 0, B: 1, C: 2 }
      const confidenceOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      tagged.sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 9
        const pb = priorityOrder[b.priority] ?? 9
        if (pa !== pb) return pa - pb
        const ca = confidenceOrder[a.confidence] ?? 9
        const cb = confidenceOrder[b.confidence] ?? 9
        return ca - cb
      })

      return NextResponse.json({ results: tagged })
    }

    // ── LOOKUP MODE ───────────────────────────────────────────────────────────
    if (mode === 'lookup') {
      const systemPrompt = `You are an expert crypto researcher. Research the given person thoroughly using web search. Find everything publicly available.

Research strategy:
1. Search their name + crypto/blockchain to confirm their involvement and primary ecosystem
2. Find all their social profiles (Twitter/X, LinkedIn, Farcaster, GitHub, Reddit)
3. Search their name + "email" OR "contact" to find public contact info
4. Check their GitHub profile bio and pinned repos for email
5. Check their Twitter/X bio explicitly for email strings
6. Check their personal website /contact page
7. Check Substack, Mirror, or personal blog author pages
8. Find their primary crypto ecosystem, niche, recent activity, and belief signals from public posts

CRITICAL: Return ONLY a raw JSON object. No text before or after. No explanation. Start with { and end with }:
{
  "name": "",
  "role": "",
  "company": "",
  "companyWebsite": null,
  "linkedinUrl": null,
  "twitterUrl": null,
  "farcasterUrl": null,
  "redditUrl": null,
  "quoraUrl": null,
  "email": null,
  "emailSource": null,
  "cryptoNiche": "",
  "ecosystem": "",
  "beliefSignal": "",
  "activityLevel": "ACTIVE",
  "tags": [],
  "priority": "A",
  "priorityReason": "",
  "sourceFound": "X_TWITTER",
  "notes": "",
  "confidence": "HIGH",
  "confidenceReason": ""
}`

      const data = await callClaude(
        apiKey,
        systemPrompt,
        `Thoroughly research this person and find all their public info, primary ecosystem, and email: ${query}`,
        4000,
      )
      const text = extractText(data)

      if (!text) {
        return NextResponse.json({ error: 'No text response from AI' }, { status: 500 })
      }

      try {
        const result = parseJSON(text)
        return NextResponse.json({ result })
      } catch (e: any) {
        console.error('JSON parse failed:', e.message, '\nRaw:', text.slice(0, 1000))
        return NextResponse.json(
          { error: 'Could not parse AI response', raw: text.slice(0, 500) },
          { status: 500 },
        )
      }
    }

    return NextResponse.json(
      { error: 'Invalid mode — must be discover or lookup' },
      { status: 400 },
    )
  } catch (error: any) {
    console.error('Research route error:', error)
    return NextResponse.json({ error: error.message ?? 'Research failed' }, { status: 500 })
  }
}