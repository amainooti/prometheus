import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { mode, query, criteria } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    // ── DISCOVERY MODE — find strangers matching criteria ──────────────────
    if (mode === 'discover') {
      const { niche, role, ecosystem, beliefSignal, platform } = criteria ?? {}

      const systemPrompt = `You are a crypto-native lead prospecting agent with access to web search. Your job is to find REAL, specific individuals who match a given profile — people the user has never heard of and could not find themselves without hours of manual research.

Search across X/Twitter, LinkedIn, Farcaster, personal websites, Substack, Mirror, GitHub, DAO forums, podcast guest lists, crypto conference speaker lists, and any other public source.

For each person you find, also attempt to find their publicly listed email by checking:
- Their Twitter/X bio or pinned tweet
- Their LinkedIn contact info or website link
- Their personal website contact or about page
- Their Substack, Mirror, or newsletter footer
- Their GitHub profile
- Their company website team or contact page
- Google search: "[name]" "[company]" email contact

Return ONLY a valid JSON array of up to 10 real people. No preamble, no markdown, no explanation.

Each object must match this shape exactly:
{
  "name": "Full Name",
  "role": "Their actual role or title",
  "company": "Company, project, or protocol",
  "companyWebsite": "https://... or null",
  "linkedinUrl": "https://linkedin.com/in/... or null",
  "twitterUrl": "https://x.com/... or null",
  "farcasterUrl": "https://warpcast.com/... or null",
  "email": "publicly listed email or null",
  "emailSource": "where the email was found or null",
  "cryptoNiche": "their primary focus e.g. DeFi, RWA, Bitcoin, NFT",
  "beliefSignal": "a real quote or phrase from their public bio/posts",
  "activityLevel": "VERY_ACTIVE | ACTIVE | MODERATE | LOW | UNKNOWN",
  "tags": ["Founder", "DeFi", "Ethereum"],
  "priority": "A_PLUS | A | B | C | D",
  "priorityReason": "Why this person matches the search criteria",
  "sourceFound": "X_TWITTER | LINKEDIN | FARCASTER | GITHUB | SUBSTACK | MIRROR | PODCAST | CRYPTO_EVENT | OTHER",
  "confidence": "HIGH | MEDIUM | LOW"
}

Priority rules:
- A+: Founder or investor actively and publicly promoting blockchain/crypto/Web3
- A: Strong crypto-native builder, educator, analyst, or prominent community voice
- B: Active holder, DeFi user, NFT collector with clear public presence
- C: Holds crypto or supports blockchain but posts lightly
- D: Weak or vague interest

Only return people you actually found through search. Do not invent anyone. If you find fewer than 10 real matches, return fewer — quality over quantity.`

      const searchDescription = [
        role        && `Role: ${role}`,
        niche       && `Niche: ${niche}`,
        ecosystem   && `Ecosystem: ${ecosystem}`,
        beliefSignal && `Belief signal: ${beliefSignal}`,
        platform    && `Prefer finding them on: ${platform}`,
      ].filter(Boolean).join('\n')

      const userMessage = `Find real crypto-native individuals matching this profile. Search broadly across all public platforms and also try to find their publicly listed emails:\n\n${searchDescription}\n\nReturn up to 10 real people as a JSON array.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 4000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          system:   systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        return NextResponse.json({ error: 'AI search failed', detail: err }, { status: 500 })
      }

      const data = await response.json()
      const text = data.content
        ?.filter((b: any) => b.type === 'text')
        ?.map((b: any) => b.text)
        ?.join('')
        ?.trim()

      if (!text) return NextResponse.json({ error: 'No response from AI' }, { status: 500 })

      try {
        const clean   = text.replace(/```json|```/g, '').trim()
        const results = JSON.parse(clean)
        return NextResponse.json({ results: Array.isArray(results) ? results : [results] })
      } catch {
        return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 500 })
      }
    }

    // ── LOOKUP MODE — research a specific known person ─────────────────────
    if (mode === 'lookup') {
      const systemPrompt = `You are a crypto-native lead research assistant with web search. Given a person's name, URL, or handle, find all publicly available information about them — and importantly, search hard for any publicly listed email address.

To find their email, check:
- Twitter/X bio, pinned tweet, and linked website
- LinkedIn about section and contact info
- Their personal website contact/about page
- Company website team or contact page
- Substack, Mirror, or newsletter pages
- GitHub profile
- Google: "[name]" "[company]" email

Respond with ONLY a valid JSON object — no preamble, no markdown.

{
  "name": "Full Name",
  "role": "Job title or role",
  "company": "Company or project",
  "companyWebsite": "https://... or null",
  "linkedinUrl": "https://linkedin.com/in/... or null",
  "twitterUrl": "https://x.com/... or null",
  "email": "publicly listed email or null",
  "emailSource": "where the email was found or null",
  "cryptoNiche": "primary crypto focus",
  "beliefSignal": "key quote or phrase from their public bio/posts",
  "activityLevel": "VERY_ACTIVE | ACTIVE | MODERATE | LOW | UNKNOWN",
  "tags": ["tag1", "tag2"],
  "priority": "A_PLUS | A | B | C | D",
  "priorityReason": "1-2 sentence explanation",
  "sourceFound": "LINKEDIN | X_TWITTER | GITHUB | COMPANY_WEBSITE | OTHER",
  "notes": "Any other relevant public context",
  "confidence": "HIGH | MEDIUM | LOW",
  "confidenceReason": "Why you are or are not confident in this data"
}`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 2000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          system:   systemPrompt,
          messages: [{ role: 'user', content: `Research this person and find their email if publicly listed: ${query}` }],
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        return NextResponse.json({ error: 'AI lookup failed', detail: err }, { status: 500 })
      }

      const data = await response.json()
      const text = data.content
        ?.filter((b: any) => b.type === 'text')
        ?.map((b: any) => b.text)
        ?.join('')
        ?.trim()

      if (!text) return NextResponse.json({ error: 'No response from AI' }, { status: 500 })

      try {
        const clean  = text.replace(/```json|```/g, '').trim()
        const result = JSON.parse(clean)
        return NextResponse.json({ result })
      } catch {
        return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (error) {
    console.error('Research API error:', error)
    return NextResponse.json({ error: 'Research failed' }, { status: 500 })
  }
}