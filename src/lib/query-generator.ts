import type { GeneratedQuery } from '@/types'

export interface QueryBuilderOptions {
  targetCategory: string   // e.g. "Founder / Investor"
  niche: string            // e.g. "DeFi"
  beliefKeyword: string    // e.g. "decentralization"
  ecosystem: string        // e.g. "Ethereum"
  exclusions: string[]     // e.g. ["recruiter", "hiring"]
  customKeyword?: string   // free-text addition
}

function buildExclusionString(exclusions: string[]): string {
  return exclusions.map(e => `-"${e}"`).join(' ')
}

export function generateQueries(opts: QueryBuilderOptions): GeneratedQuery[] {
  const { targetCategory, niche, beliefKeyword, ecosystem, exclusions, customKeyword } = opts

  const excStr = buildExclusionString(exclusions)
  const nicheStr = niche ? `"${niche}"` : ''
  const beliefStr = beliefKeyword ? `"${beliefKeyword}"` : ''
  const ecoStr = ecosystem ? `"${ecosystem}"` : ''
  const categoryStr = targetCategory ? `"${targetCategory}"` : ''
  const customStr = customKeyword ? `"${customKeyword}"` : ''

  const coreParts = [categoryStr, nicheStr, beliefStr, ecoStr, customStr]
    .filter(Boolean)
    .join(' ')

  const queries: GeneratedQuery[] = []

  // ── LinkedIn X-ray (Google site:linkedin.com) ──────────────────────────────
  const linkedinBase = `site:linkedin.com/in ${coreParts}`
  const linkedinFull = [linkedinBase, excStr].filter(Boolean).join(' ')

  queries.push({
    platform: 'LinkedIn',
    query: linkedinFull,
    url: `https://www.google.com/search?q=${encodeURIComponent(linkedinFull)}`,
  })

  // ── X / Twitter ───────────────────────────────────────────────────────────
  const twitterParts = [nicheStr, beliefStr, ecoStr, customStr].filter(Boolean).join(' OR ')
  const twitterQuery = twitterParts
    ? `(${twitterParts}) ${excStr}`.trim()
    : excStr

  queries.push({
    platform: 'X/Twitter',
    query: twitterQuery,
    url: `https://twitter.com/search?q=${encodeURIComponent(twitterQuery)}&f=user`,
  })

  // ── Google broad ──────────────────────────────────────────────────────────
  const googleQuery = [coreParts, 'email', excStr].filter(Boolean).join(' ')

  queries.push({
    platform: 'Google',
    query: googleQuery,
    url: `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`,
  })

  return queries
}

// ── Pre-built popular query templates ─────────────────────────────────────────

export interface QueryTemplate {
  label: string
  description: string
  opts: QueryBuilderOptions
}

export const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    label: 'DeFi Founders on LinkedIn',
    description: 'Founders building in DeFi protocols',
    opts: {
      targetCategory: 'founder',
      niche: 'DeFi',
      beliefKeyword: 'decentralization',
      ecosystem: 'Ethereum',
      exclusions: ['recruiter', 'hiring', 'staffing'],
    },
  },
  {
    label: 'Bitcoin HODLers on X',
    description: 'Long-term Bitcoin believers with public presence',
    opts: {
      targetCategory: '',
      niche: 'Bitcoin',
      beliefKeyword: 'sound money',
      ecosystem: 'Bitcoin',
      exclusions: ['recruiter', 'hiring'],
    },
  },
  {
    label: 'Web3 Investors',
    description: 'Angel investors and VCs focused on crypto',
    opts: {
      targetCategory: 'crypto investor',
      niche: 'Web3',
      beliefKeyword: 'ownership economy',
      ecosystem: '',
      exclusions: ['recruiter', 'hiring', 'staffing', 'HR'],
    },
  },
  {
    label: 'Solana Builders',
    description: 'Developers and founders building on Solana',
    opts: {
      targetCategory: 'Web3 builder',
      niche: 'DeFi',
      beliefKeyword: '',
      ecosystem: 'Solana',
      exclusions: ['recruiter', 'hiring'],
    },
  },
  {
    label: 'RWA / Tokenization Leaders',
    description: 'Professionals focused on real-world asset tokenization',
    opts: {
      targetCategory: 'founder',
      niche: 'RWA',
      beliefKeyword: 'tokenization',
      ecosystem: '',
      exclusions: ['recruiter', 'hiring', 'staffing'],
    },
  },
  {
    label: 'Crypto Content Creators',
    description: 'Educators, analysts, and newsletter writers',
    opts: {
      targetCategory: 'crypto educator',
      niche: '',
      beliefKeyword: 'crypto native',
      ecosystem: '',
      exclusions: ['recruiter', 'hiring'],
    },
  },
]