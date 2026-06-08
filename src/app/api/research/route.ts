import { NextRequest, NextResponse } from 'next/server'
import { parseEcosystem } from '@/lib/scrapperUtils'

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

// ── Ecosystem inference ───────────────────────────────────────────────────────
function inferEcosystem(lead: any, searchedEcosystem: string): string {
  const aiEcosystem = (lead.ecosystem ?? '').trim()
  if (aiEcosystem && aiEcosystem.toLowerCase() !== 'unknown') return aiEcosystem
  return searchedEcosystem
}

// ── WHO TO EXCLUDE (injected into every discover prompt) ─────────────────────
const EXCLUSION_RULES = `
WHO TO EXCLUDE — never return these types:
- Founders, co-founders, CEOs, CTOs, or C-suite executives of any crypto project or company
- Protocol leads, core developers, or anyone officially employed by a blockchain foundation (e.g. Ethereum Foundation, Solana Foundation, Bitcoin Core)
- VCs, fund managers, or partners at investment firms
- Journalists, analysts, or researchers at major crypto media (CoinDesk, The Block, Decrypt, Bankless)
- Anyone with more than 10,000 Twitter/X followers
- Anyone whose primary identity is "thought leader", "influencer", or "KOL"
- Well-known public figures in crypto (e.g. Vitalik Buterin, CZ, SBF, Anatoly Yakovenko, etc.)
- Anyone whose email would be a corporate/foundation domain (e.g. @ethereum.org, @solana.com, @bitcoin.org)

WHO TO TARGET INSTEAD — the long tail of genuine believers:
- Regular retail holders who mention holding, staking, or accumulating a specific ecosystem's token in their bio or posts
- Small community voices: active in forums, subreddits, Discord, or Telegram but under 5K–10K followers
- DeFi users who mention using protocols (lending, swapping, yield farming) in a specific ecosystem
- People whose GitHub shows personal wallet tools, scripts, or on-chain experiments — not protocol dev
- Forum members who post about their own holdings, staking rewards, or on-chain activity
- Substack or blog writers with small audiences (under 2K subscribers) who document their own crypto journey
- Reddit contributors who post about their own portfolio, staking, or ecosystem participation
- People who mention wallet addresses, ENS names, or on-chain activity in their bio

HOLDER / BELIEF SIGNALS to look for in bios and posts:
- "holding X", "staking X", "accumulating X", "diamond hands", "bought the dip"
- "X maxi", "X believer", "X native", "X ecosystem"
- Mentions of DeFi protocols they personally use (Aave, Uniswap, Jupiter, etc.)
- ENS names, .sol names, or other ecosystem domain names in their profile
- Personal on-chain activity mentions (yield, rewards, bridging, LP positions)
- Small personal blogs or newsletters documenting their crypto journey`

// ── EMAIL RULES (shared) ──────────────────────────────────────────────────────
const EMAIL_RULES = `
EMAIL HUNTING RULES — most important:
- Every person MUST have a confirmed public email. No email = skip that person entirely.
- Search: [name] + "email" site:github.com OR site:twitter.com OR site:linkedin.com
- Check GitHub profile bio and README files for email
- Check Twitter/X bio for email strings
- Check their personal website /contact page
- Check Substack or blog author pages
- Do NOT include corporate/foundation emails (@ethereum.org, @solana.com etc.)
- Only real, personal public emails count

CRITICAL: Return ONLY a raw JSON array. No text before or after. Start with [ and end with ].`

// ── ECOSYSTEM RULES (shared) ──────────────────────────────────────────────────
const ECOSYSTEM_RULES = `
ECOSYSTEM TAGGING:
- Set "ecosystem" to the person's PRIMARY ecosystem (e.g. "Solana", "Ethereum", "Bitcoin")
- Default to the searched ecosystem unless you find clear evidence of a different primary one
- Maxis and loyalists should always have that ecosystem listed`

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

      const niche            = (niches     ?? []).join(', ')
      const role             = (roles      ?? []).join(', ')
      const rawEcosystem    = (ecosystems ?? [])[0] ?? 'Crypto'
      const ecoMeta         = parseEcosystem(rawEcosystem)
      const primaryEcosystem = ecoMeta.displayName
      const ecoSearchLabel  = ecoMeta.searchLabel
      // For tickers, add both $TICKER and plain TICKER to search terms
      const ecoSearchTerms  = ecoMeta.isTicker
        ? [ecoMeta.ticker, ecoMeta.tickerClean, rawEcosystem].join(' OR ')
        : primaryEcosystem
      const ecosystem        = (ecosystems ?? []).join(', ')
      const platform         = (platforms  ?? []).join(', ')

      const parts = [
        role         && `Role: ${role}`,
        niche        && `Niche: ${niche}`,
        ecosystem    && `Ecosystem: ${ecosystem}`,
        platform     && `Preferred platforms: ${platform}`,
        beliefSignal && `Belief signal / keywords: ${beliefSignal}`,
      ].filter(Boolean).join('\n')

      // ── System prompt factory ─────────────────────────────────────────────
      const systemPrompt = (sourceDesc: string) => `You are a crypto lead researcher specialising in finding RETAIL HOLDERS and SMALL COMMUNITY VOICES — NOT celebrities, founders, or influencers. You focus on ${sourceDesc}.

Target ecosystem: ${primaryEcosystem}
Profile to match:
${parts}

${EXCLUSION_RULES}

${ECOSYSTEM_RULES}

${EMAIL_RULES}

Schema (return up to 10 per search — ONLY include people with a confirmed personal public email):
${PROSPECT_SCHEMA}`

      // ── 8 parallel searches, each angled at a different long-tail source ──
      const searches = [
        // 1 — GitHub: personal wallet tools, scripts, DeFi experiments
        callClaude(
          apiKey,
          systemPrompt(`GitHub users with personal ${primaryEcosystem} wallet scripts, staking tools, or DeFi automation repos — NOT core protocol contributors`),
          `Find regular ${primaryEcosystem} ${ecoMeta.isTicker ? "(ticker: " + ecoMeta.ticker + ")" : ""} holders on GitHub who have built personal wallet tools, staking dashboards, or on-chain scripts for their own use. Search for "${ecoSearchTerms}" in GitHub bio/repos. Look for email in profile bio or README. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 2 — Substack/Mirror: small personal crypto journey blogs
        callClaude(
          apiKey,
          systemPrompt(`Substack and Mirror authors with under 2,000 subscribers who document their personal ${primaryEcosystem} holdings, staking, or DeFi journey`),
          `Find small Substack or Mirror writers (under 2K subscribers) who write about their personal ${primaryEcosystem} crypto journey — holding, staking, yield farming, buying dips. Look for personal email on author page. Exclude major media writers and thought leaders. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 3 — Reddit: active contributors in ecosystem subreddits
        callClaude(
          apiKey,
          systemPrompt(`Reddit contributors in r/${primaryEcosystem.toLowerCase()}, r/ethfinance, r/solana, r/bitcoin, r/defi, r/CryptoCurrency who discuss their own holdings and have linked personal sites with emails`),
          `Find Reddit users who actively post about their own ${primaryEcosystem} holdings, staking rewards, or DeFi activity. Must have a linked personal site or email visible. Exclude moderators with large followings. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 4 — Twitter/X: small accounts with holder signals in bio
        callClaude(
          apiKey,
          systemPrompt(`Twitter/X accounts under 5,000 followers whose bio mentions holding, staking, or being a ${primaryEcosystem} maxi/believer — and who have a public email in their bio`),
          `Find Twitter/X users with under 5K followers whose bio explicitly contains: "${ecoSearchTerms} holder", "${primaryEcosystem} maxi", "staking", "DeFi", ticker mention "${ecoMeta.isTicker ? ecoMeta.ticker : primaryEcosystem}" — AND a public email address. Exclude anyone with a blue checkmark or large following. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 5 — Forums: Bitcointalk, Ethereum Magicians, Commonwealth
        callClaude(
          apiKey,
          systemPrompt(`Bitcointalk members, Ethereum Magicians participants, and Commonwealth DAO voters who discuss personal holdings and have emails in their profile signatures`),
          `Find forum members on Bitcointalk, Ethereum Magicians, or Commonwealth who post about personal ${primaryEcosystem} holdings, staking, or governance participation. Check profile signatures for email. Exclude project founders and VC-backed figures. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 6 — Farcaster/Lens: small accounts with on-chain bio signals
        callClaude(
          apiKey,
          systemPrompt(`Farcaster/Warpcast and Lens Protocol users with small followings who show ${primaryEcosystem} holder or DeFi user signals in their bio`),
          `Find Farcaster or Lens users with small followings whose bio mentions ${primaryEcosystem} holdings, staking, wallet addresses, or DeFi activity. Look for public email in linked profile or personal site. Exclude well-known crypto personalities. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 7 — Personal blogs / dev.to / Hashnode: crypto journey writers
        callClaude(
          apiKey,
          systemPrompt(`Personal blogs, dev.to posts, and Hashnode articles by everyday ${primaryEcosystem} users documenting their own DeFi experiences, staking setups, or portfolio strategies`),
          `Find personal blog authors, dev.to writers, or Hashnode contributors who write about their own ${primaryEcosystem} DeFi experience, staking setup, or holding strategy — not tutorials for others. Must have public email on their author/contact page. Profile: ${parts}. Return JSON array only, max 10.`,
          4000,
        ),

        // 8 — LinkedIn: non-executive professionals who hold crypto
        callClaude(
          apiKey,
          systemPrompt(`LinkedIn professionals (NOT executives or founders) whose profile mentions ${primaryEcosystem} holdings, crypto investing, or DeFi participation as a personal interest alongside their day job`),
          `Find LinkedIn users who are NOT founders, C-suite, or VCs, but mention ${primaryEcosystem} or crypto holding/investing as a personal interest in their profile summary or activity. Must have a visible public email or contact info. Profile: ${parts}. Return JSON array only, max 10.`,
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

      // 1. Deduplicate
      const unique = deduplicateByName(allResults)

      // 2. Hard filter: email required + exclude obvious high-profile domains
      const HIGH_PROFILE_DOMAINS = [
        'ethereum.org', 'solana.com', 'bitcoin.org', 'bitcoinfoundation.org',
        'consensys.net', 'paradigm.xyz', 'a16z.com', 'coinbase.com',
        'binance.com', 'kraken.com', 'chainalysis.com',
      ]
      const withEmail = unique.filter(p => {
        const email = (p.email ?? '').trim().toLowerCase()
        if (!email || email === 'null') return false
        const domain = email.split('@')[1] ?? ''
        return !HIGH_PROFILE_DOMAINS.some(d => domain.endsWith(d))
      })

      // 3. Ecosystem tagging
      const tagged = withEmail.map(lead => ({
        ...lead,
        ecosystem: inferEcosystem(lead, primaryEcosystem),
      }))

      // 4. Sort: A first, HIGH confidence first within tier
      const priorityOrder: Record<string, number> = { A: 0, B: 1, C: 2 }
      const confidenceOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      tagged.sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 9
        const pb = priorityOrder[b.priority] ?? 9
        if (pa !== pb) return pa - pb
        return (confidenceOrder[a.confidence] ?? 9) - (confidenceOrder[b.confidence] ?? 9)
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
8. Find their primary crypto ecosystem, niche, recent activity, and belief signals

CRITICAL: Return ONLY a raw JSON object. No text before or after. Start with { and end with }:
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