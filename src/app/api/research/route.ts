import { NextRequest, NextResponse } from 'next/server'

// ── Shared: extract final text from Claude response ──────────────────────────
// When web search is used, Claude returns multiple content blocks.
// We want the LAST text block which contains the final JSON answer.
function extractText(data: any): string {
  const blocks = data?.content ?? []
  console.log('Response blocks:', JSON.stringify(blocks.map((b: any) => ({ type: b.type, text: b.text?.slice(0, 100) }))))

  const textBlocks = blocks
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text?.trim())
    .filter(Boolean)

  // Take the last text block — that's always the final answer after tool use
  return textBlocks[textBlocks.length - 1] ?? ''
}

// ── Shared: parse JSON robustly ───────────────────────────────────────────────
function parseJSON(raw: string): any {
  // Strip markdown fences
  let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  // Try direct parse first
  try { return JSON.parse(clean) } catch {}

  // Try extracting first [...] or {...} block
  const arrMatch = clean.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]) } catch {}
  }
  const objMatch = clean.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) } catch {}
  }

  throw new Error('No valid JSON found in response')
}

// ── Shared: build Anthropic request ──────────────────────────────────────────
async function callClaude(apiKey: string, system: string, userMessage: string, maxTokens = 2000) {
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

  if (!response.ok) {
    const err = await response.text()
    console.error('Anthropic API error:', response.status, err)
    throw new Error(`Anthropic API ${response.status}: ${err}`)
  }

  return response.json()
}

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

      const systemPrompt = `You are a crypto lead prospecting agent. Find REAL individuals matching the given profile using web search. Also search for their public email (Twitter bio, personal site, GitHub, company site).

Respond with ONLY a raw JSON array — no markdown, no explanation. Up to 8 people:
[{"name":"","role":"","company":"","companyWebsite":null,"linkedinUrl":null,"twitterUrl":null,"farcasterUrl":null,"email":null,"emailSource":null,"cryptoNiche":"","beliefSignal":"","activityLevel":"ACTIVE","tags":[],"priority":"A","priorityReason":"","sourceFound":"X_TWITTER","confidence":"HIGH"}]`

      const parts = [
        role        && `Role: ${role}`,
        niche       && `Niche: ${niche}`,
        ecosystem   && `Ecosystem: ${ecosystem}`,
        platform    && `Preferred platforms: ${platform}`,
        beliefSignal && `Belief signal: ${beliefSignal}`,
      ].filter(Boolean).join('\n')

      const userMessage = `Find real crypto-native people matching this profile. Also search for their emails. Return ONLY a JSON array:\n\n${parts}`

      const data = await callClaude(apiKey, systemPrompt, userMessage, 2000)
      const text = extractText(data)

      console.log('Raw AI text (first 500):', text.slice(0, 500))

      if (!text) {
        return NextResponse.json({ error: 'No text response from AI', raw: data }, { status: 500 })
      }

      try {
        const results = parseJSON(text)
        return NextResponse.json({ results: Array.isArray(results) ? results : [results] })
      } catch (e: any) {
        console.error('JSON parse failed:', e.message, '\nRaw text:', text.slice(0, 1000))
        return NextResponse.json({ error: 'Could not parse AI response', raw: text.slice(0, 500) }, { status: 500 })
      }
    }

    // ── LOOKUP MODE ───────────────────────────────────────────────────────────
    if (mode === 'lookup') {
      const systemPrompt = `You are a crypto research assistant. Research the given person using web search. Also find their public email (check Twitter bio, personal site, GitHub, company site).

Respond with ONLY a raw JSON object — no markdown, no explanation:
{"name":"","role":"","company":"","companyWebsite":null,"linkedinUrl":null,"twitterUrl":null,"email":null,"emailSource":null,"cryptoNiche":"","beliefSignal":"","activityLevel":"ACTIVE","tags":[],"priority":"A","priorityReason":"","sourceFound":"X_TWITTER","notes":"","confidence":"HIGH","confidenceReason":""}`

      const data = await callClaude(apiKey, systemPrompt, `Research this person and find their email: ${query}`, 2000)
      const text = extractText(data)

      console.log('Lookup raw text (first 500):', text.slice(0, 500))

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