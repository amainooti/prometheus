import { NextRequest, NextResponse } from 'next/server'

// ── Shared: extract final text from Claude response ──────────────────────────
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
async function callClaude(apiKey: string, system: string, userMessage: string, maxTokens = 4000) {
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
const PROSPECT_SCHEMA = `[{"name":"","role":"","company":"","companyWebsite":null,"linkedinUrl":null,"twitterUrl":null,"farcasterUrl":null,"redditUrl":null,"quoraUrl":null,"truthSocialUrl":null,"forumUrl":null,"forumSource":null,"email":null,"emailSource":null,"cryptoNiche":"","beliefSignal":"","activityLevel":"ACTIVE","tags":[],"priority":"A","priorityReason":"","sourceFound":"X_TWITTER","confidence":"HIGH"}]`

const SHARED_INSTRUCTIONS = `
EMAIL HUNTING RULES — this is the most important part:
- Every person MUST have a public email address. If you cannot find a public email, skip that person and find someone else who has one.
- Search: [name] + "email" site:twitter.com OR site:github.com OR site:linkedin.com
- Check GitHub profile bio and README files for email
- Check Twitter/X bio explicitly for @ or email strings
- Check their personal website /contact page
- Check Substack or Mirror author pages for contact info
- Check Bitcointalk profile signature lines which often contain emails
- Only include people where you have FOUND a real public email — not guessed

CRITICAL: Return ONLY a raw JSON array. No text before or after. No explanation. No preamble. Start with [ and end with ].`

export async function POST(req: NextRequest) {
  try {
    const { mode, query, criteria } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured in .env' }, { status: 500 })
    }

    // ── DISCOVERY MODE ────────────────────────────────────────────────────────
    if (mode === 'discover') {
      const { niches, roles, ecosystems, platforms, beliefSignal } = criteria ?? {}

      const niche     = (niches     ?? []).join(', ')
      const role      = (roles      ?? []).join(', ')
      const ecosystem = (ecosystems ?? []).join(', ')
      const platform  = (platforms  ?? []).join(', ')

      const parts = [
        role         && `Role: ${role}`,
        niche        && `Niche: ${niche}`,
        ecosystem    && `Ecosystem: ${ecosystem}`,
        platform     && `Preferred platforms: ${platform}`,
        beliefSignal && `Belief signal / keywords: ${beliefSignal}`,
      ].filter(Boolean).join('\n')

      // ── Four parallel searches targeting different sources ─────────────────
      const systemPrompt = (source: string) => `You are an expert crypto lead prospecting agent. Find REAL crypto-native people or believers who have PUBLIC email addresses. Focus on ${source}.

Profile to match:
${parts}

${SHARED_INSTRUCTIONS}
Schema (return up to 5 per search):
${PROSPECT_SCHEMA}`

      const searches = [
        // Search 1: GitHub + Substack + personal blogs (highest email hit rate)
        callClaude(apiKey, systemPrompt('GitHub profiles with crypto repos, Substack crypto newsletter authors, Mirror.xyz authors, and personal crypto blogs'),
          `Find crypto-native people with PUBLIC emails on GitHub (check profile bio and repos), Substack crypto newsletters, and Mirror.xyz. Profile: ${parts}. Return JSON array only.`, 4000),

        // Search 2: Forums (Bitcointalk, Ethereum Magicians, Commonwealth)
        callClaude(apiKey, systemPrompt('Bitcointalk.org forum members, Ethereum Magicians forum contributors, Commonwealth.im DAO participants, and Gitcoin grant applicants'),
          `Find crypto believers with PUBLIC emails from Bitcointalk profiles/signatures, Ethereum Magicians, Commonwealth DAO governance, and Gitcoin grant pages. Profile: ${parts}. Return JSON array only.`, 4000),

        // Search 3: Twitter/X + LinkedIn
        callClaude(apiKey, systemPrompt('X/Twitter crypto accounts with email in bio, and LinkedIn crypto professionals with public contact info'),
          `Find crypto-native people with PUBLIC emails visible in their Twitter/X bio or LinkedIn profile. Profile: ${parts}. Return JSON array only.`, 4000),

        // Search 4: Reddit + Farcaster + Quora
        callClaude(apiKey, systemPrompt('Reddit crypto subreddit contributors (r/ethereum, r/bitcoin, r/defi, r/CryptoCurrency), Farcaster/Warpcast users, and Quora crypto answerers who have linked personal sites or emails'),
          `Find crypto believers with PUBLIC emails from Reddit (check linked personal sites in profiles), Farcaster profiles, and Quora crypto contributors. Profile: ${parts}. Return JSON array only.`, 4000),
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

      // Deduplicate, then filter to only keep leads with emails
      const unique = deduplicateByName(allResults)
      const withEmail = unique.filter(p => p.email && p.email.trim() !== '')
      const withoutEmail = unique.filter(p => !p.email || p.email.trim() === '')

      // Return email leads first, then the rest
      const sorted = [...withEmail, ...withoutEmail]

      return NextResponse.json({ results: sorted })
    }

    // ── LOOKUP MODE ───────────────────────────────────────────────────────────
    if (mode === 'lookup') {
      const systemPrompt = `You are an expert crypto researcher. Research the given person thoroughly using web search. Find everything publicly available.

Research strategy:
1. Search their name + crypto/blockchain to confirm their involvement
2. Find all their social profiles (Twitter/X, LinkedIn, Farcaster, GitHub, Reddit, Farcaster)
3. Search their name + "email" OR "contact" to find public contact info
4. Check their GitHub profile bio and pinned repos for email
5. Check their Twitter/X bio explicitly for email strings
6. Check their personal website /contact page
7. Check Substack, Mirror, or personal blog author pages
8. Find their crypto niche, recent activity, and belief signals from public posts

CRITICAL: Return ONLY a raw JSON object. No text before or after. No explanation. Start with { and end with }:
{"name":"","role":"","company":"","companyWebsite":null,"linkedinUrl":null,"twitterUrl":null,"farcasterUrl":null,"redditUrl":null,"quoraUrl":null,"email":null,"emailSource":null,"cryptoNiche":"","beliefSignal":"","activityLevel":"ACTIVE","tags":[],"priority":"A","priorityReason":"","sourceFound":"X_TWITTER","notes":"","confidence":"HIGH","confidenceReason":""}`

      const data = await callClaude(apiKey, systemPrompt, `Thoroughly research this person and find all their public info and email: ${query}`, 4000)
      const text = extractText(data)

      if (!text) {
        return NextResponse.json({ error: 'No text response from AI' }, { status: 500 })
      }

      try {
        const result = parseJSON(text)
        return NextResponse.json({ result })
      } catch (e: any) {
        console.error('JSON parse failed:', e.message, '\nRaw:', text.slice(0, 1000))
        return NextResponse.json({ error: 'Could not parse AI response', raw: text.slice(0, 500) }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid mode — must be discover or lookup' }, { status: 400 })

  } catch (error: any) {
    console.error('Research route error:', error)
    return NextResponse.json({ error: error.message ?? 'Research failed' }, { status: 500 })
  }
}