// ─── scraperUtils.ts ─────────────────────────────────────────────────────────
// Shared utilities for email extraction and raw profile normalization
// used by all scraper modules (Reddit, Quora, Bitcointalk).

// ── Email regex ───────────────────────────────────────────────────────────────
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// Domains we never want — foundation/corporate emails
const BLOCKED_DOMAINS = [
  'ethereum.org', 'solana.com', 'bitcoin.org', 'bitcoinfoundation.org',
  'consensys.net', 'paradigm.xyz', 'a16z.com', 'coinbase.com',
  'binance.com', 'kraken.com', 'chainalysis.com', 'example.com',
  'sentry.io', 'noreply', 'no-reply',
]

export function extractEmails(text: string): string[] {
  const raw = text.match(EMAIL_RE) ?? []
  return raw.filter(e => {
    const domain = e.split('@')[1]?.toLowerCase() ?? ''
    return !BLOCKED_DOMAINS.some(d => domain.includes(d))
  })
}

export function firstEmail(text: string): string | null {
  return extractEmails(text)[0] ?? null
}

// ── Holder / belief signal detector ──────────────────────────────────────────
const HOLDER_SIGNALS = [
  'holding', 'hodl', 'staking', 'accumulating', 'bought the dip', 'buying dips',
  'diamond hands', 'maxi', 'believer', 'native', 'not selling', 'long term',
  'defi', 'yield', 'farming', 'lp position', 'liquidity', 'ens', '.eth', '.sol',
  'wallet', 'on-chain', 'onchain', 'self custody', 'ledger', 'cold wallet',
  'staked', 'validator', 'delegating', 'aave', 'uniswap', 'jupiter', 'compound',
  'crypto investor', 'crypto enthusiast', 'crypto native', 'web3 native',
]

export function detectBeliefSignals(text: string): string[] {
  const lower = text.toLowerCase()
  return HOLDER_SIGNALS.filter(s => lower.includes(s))
}

export function hasHolderSignal(text: string): boolean {
  return detectBeliefSignals(text).length > 0
}

// ── High-profile exclusion ────────────────────────────────────────────────────
const HIGH_PROFILE_KEYWORDS = [
  'founder', 'co-founder', 'ceo', 'cto', 'chief', 'protocol lead',
  'core developer', 'ethereum foundation', 'solana foundation',
  'bitcoin core', 'vitalik', 'vc partner', 'managing partner',
  'general partner', 'investment partner', 'coindesk', 'the block',
  'decrypt media', 'bankless', 'unchained',
]

export function isHighProfile(bio: string, followerCount?: number): boolean {
  if (followerCount && followerCount > 10000) return true
  const lower = bio.toLowerCase()
  return HIGH_PROFILE_KEYWORDS.some(k => lower.includes(k))
}

// ── Raw profile shape returned by all scrapers ────────────────────────────────
export interface RawProfile {
  source:        'reddit' | 'quora' | 'bitcointalk'
  username:      string
  displayName:   string
  profileUrl:    string
  bio:           string
  websiteUrl:    string | null
  email:         string | null
  emailSource:   string | null
  postContent:   string   // the post/comment text that surfaced them
  ecosystem:     string   // which ecosystem search found them under
  followerCount?: number
}

// ── Normalize a raw profile into a CRM-ready prospect shape ──────────────────
// Claude will further enrich this, but this gives it clean input.
export function normalizeProfile(raw: RawProfile) {
  const signals = detectBeliefSignals(`${raw.bio} ${raw.postContent}`)
  return {
    source:       raw.source,
    username:     raw.username,
    displayName:  raw.displayName,
    profileUrl:   raw.profileUrl,
    bio:          raw.bio,
    websiteUrl:   raw.websiteUrl,
    email:        raw.email,
    emailSource:  raw.emailSource,
    postSnippet:  raw.postContent.slice(0, 300),
    ecosystem:    raw.ecosystem,
    beliefSignals: signals,
    hasEmail:     !!raw.email,
    highProfile:  isHighProfile(raw.bio, raw.followerCount),
  }
}

// ── Sleep helper for rate limiting ────────────────────────────────────────────
export function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}