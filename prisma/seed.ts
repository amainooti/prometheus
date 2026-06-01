import { PrismaClient, KeywordCategory } from '@prisma/client'

const prisma = new PrismaClient()

const keywords: { text: string; category: KeywordCategory }[] = [
  // ── IDENTITY ────────────────────────────────────────────────────────────────
  ...([
    'crypto native', 'blockchain believer', 'Web3 believer', 'Web3 builder',
    'crypto enthusiast', 'blockchain advocate', 'digital asset believer',
    'Bitcoin believer', 'Ethereum believer', 'Solana believer', 'crypto investor',
    'digital asset investor', 'long-term crypto investor', 'retail crypto investor',
    'HODLer', 'token holder', 'DeFi user', 'NFT collector', 'DAO contributor',
    'crypto community member', 'Web3 curious', 'crypto learner', 'crypto supporter',
    'blockchain supporter', 'crypto adopter', 'early crypto adopter', 'on-chain user',
    'wallet user', 'self-custody advocate', 'decentralization advocate',
    'open finance believer', 'future of money believer', 'internet money believer',
  ].map(t => ({ text: t, category: KeywordCategory.IDENTITY }))),

  // ── FOUNDER / INVESTOR ───────────────────────────────────────────────────────
  ...([
    'founder', 'co-founder', 'crypto founder', 'Web3 founder', 'DeFi founder',
    'NFT founder', 'DAO founder', 'protocol founder', 'blockchain founder',
    'startup founder', 'angel investor', 'crypto angel investor', 'Web3 investor',
    'crypto investor', 'digital asset investor', 'venture partner', 'VC partner',
    'investment partner', 'crypto fund', 'Web3 fund', 'early-stage investor',
    'seed investor', 'token investor', 'ecosystem investor', 'strategic investor',
    'venture builder', 'startup operator', 'builder investor', 'operator investor',
  ].map(t => ({ text: t, category: KeywordCategory.FOUNDER_INVESTOR }))),

  // ── BUILDER / CONTRIBUTOR ────────────────────────────────────────────────────
  ...([
    'Web3 builder', 'protocol contributor', 'DAO contributor', 'ecosystem builder',
    'community builder', 'smart contract developer', 'Solidity developer',
    'Rust developer', 'Move developer', 'blockchain developer', 'protocol engineer',
    'core contributor', 'governance contributor', 'open-source contributor',
    'DeFi builder', 'NFT builder', 'wallet builder', 'infrastructure builder',
    'developer relations', 'DevRel', 'ecosystem lead', 'growth lead',
    'community lead', 'protocol growth', 'ecosystem growth', 'partnerships lead',
    'Web3 product manager', 'crypto product manager',
  ].map(t => ({ text: t, category: KeywordCategory.BUILDER_CONTRIBUTOR }))),

  // ── CONTENT / EDUCATION ──────────────────────────────────────────────────────
  ...([
    'crypto educator', 'blockchain educator', 'Web3 educator', 'crypto content creator',
    'Web3 content creator', 'crypto podcaster', 'Web3 podcaster', 'crypto newsletter',
    'Web3 newsletter', 'crypto writer', 'Web3 writer', 'crypto analyst',
    'on-chain analyst', 'DeFi analyst', 'tokenomics analyst', 'market analyst',
    'crypto researcher', 'DeFi researcher', 'blockchain researcher',
    'crypto commentator', 'crypto thought leader', 'crypto influencer',
    'Web3 influencer', 'crypto YouTuber', 'crypto blogger', 'crypto journalist',
    'digital asset analyst',
  ].map(t => ({ text: t, category: KeywordCategory.CONTENT_EDUCATION }))),

  // ── BELIEF / PHILOSOPHY ──────────────────────────────────────────────────────
  ...([
    'decentralization', 'permissionless', 'trustless', 'self-custody',
    'financial sovereignty', 'open finance', 'ownership economy', 'future of money',
    'future of finance', 'internet money', 'banking the unbanked',
    'peer-to-peer finance', 'digital ownership', 'community ownership',
    'tokenized economy', 'on-chain economy', 'creator economy',
    'sovereign individual', 'censorship resistant', 'freedom money', 'hard money',
    'sound money', 'digital scarcity', 'public goods', 'coordination',
    'network states', 'credible neutrality', 'open internet', 'user-owned internet',
    'read write own', 'decentralized internet',
  ].map(t => ({ text: t, category: KeywordCategory.BELIEF_PHILOSOPHY }))),

  // ── RETAIL HOLDER ────────────────────────────────────────────────────────────
  ...([
    'HODL', 'HODLing', 'holding Bitcoin', 'holding Ethereum', 'holding crypto',
    'long-term holder', 'long-term crypto', 'diamond hands', 'crypto portfolio',
    'Bitcoin portfolio', 'Ethereum portfolio', 'altcoin portfolio',
    'bullish on crypto', 'bullish on Bitcoin', 'bullish on Ethereum',
    'bullish on Web3', 'buying Bitcoin', 'buying Ethereum', 'buying crypto',
    'DCA', 'dollar cost average', 'stacking sats', 'stack sats', 'Bitcoin stacker',
    'ETH holder', 'BTC holder', 'crypto savings', 'digital asset portfolio',
    'passive crypto investor', 'crypto journey', 'learning crypto', 'learning Web3',
    'crypto beginner', 'crypto adoption', 'crypto community',
  ].map(t => ({ text: t, category: KeywordCategory.RETAIL_HOLDER }))),

  // ── ECOSYSTEM ────────────────────────────────────────────────────────────────
  ...([
    'Bitcoin', 'BTC', 'Ethereum', 'ETH', 'Solana', 'SOL', 'Base', 'Arbitrum',
    'Optimism', 'Polygon', 'Avalanche', 'Cosmos', 'Polkadot', 'Near', 'NEAR',
    'Sui', 'Aptos', 'BNB Chain', 'Cardano', 'Algorand', 'Starknet', 'zkSync',
    'Linea', 'Mantle', 'Celestia', 'Monad', 'Berachain', 'Injective', 'Sei',
    'Ton', 'TON', 'Tron', 'Tezos', 'Hedera', 'Flow', 'Internet Computer', 'ICP',
    'EigenLayer', 'Babylon', 'Chainlink', 'Filecoin', 'Arweave',
  ].map(t => ({ text: t, category: KeywordCategory.ECOSYSTEM }))),

  // ── NICHE ────────────────────────────────────────────────────────────────────
  ...([
    'DeFi', 'CeFi', 'NFT', 'NFTs', 'DAO', 'DAOs', 'RWA', 'real-world assets',
    'tokenization', 'asset tokenization', 'stablecoins', 'payments',
    'crypto payments', 'cross-border payments', 'remittances', 'wallets',
    'self-custody wallets', 'hardware wallets', 'custody', 'crypto custody',
    'exchanges', 'DEX', 'CEX', 'staking', 'restaking', 'liquid staking',
    'yield farming', 'liquidity', 'AMM', 'perpetuals', 'derivatives',
    'prediction markets', 'lending', 'borrowing', 'money markets', 'GameFi',
    'SocialFi', 'DePIN', 'AI x Crypto', 'crypto AI', 'ZK', 'zero knowledge',
    'privacy', 'privacy coins', 'identity', 'DID', 'decentralized identity',
    'oracles', 'bridges', 'interoperability', 'modular blockchain',
    'data availability', 'rollups', 'Layer 1', 'Layer 2', 'L1', 'L2', 'L3',
    'MEV', 'security', 'audits', 'smart contract audit', 'on-chain analytics',
    'blockchain analytics', 'NFT marketplace', 'metaverse', 'token gating',
    'creator tokens', 'fan tokens', 'memecoins', 'Bitcoin Ordinals', 'BRC-20',
    'Runes',
  ].map(t => ({ text: t, category: KeywordCategory.NICHE }))),

  // ── ACTIVITY SIGNAL ──────────────────────────────────────────────────────────
  ...([
    'posts about crypto', 'shares crypto content', 'writes about blockchain',
    'talks about Bitcoin', 'talks about Ethereum', 'promotes Web3',
    'promotes decentralization', 'educates about crypto', 'builds in public',
    'active in Web3', 'active in crypto community', 'attends crypto events',
    'speaks at crypto conferences', 'invests in crypto startups',
    'advises Web3 startups', 'runs a crypto newsletter', 'hosts crypto spaces',
    'hosts Web3 spaces', 'participates in DAOs', 'contributes to governance',
    'votes on proposals', 'supports crypto adoption', 'onboards users to Web3',
    'building the future of finance', 'building on-chain', 'building in crypto',
    'building in Web3', 'come build with us', 'gm', 'wagmi', 'probably nothing',
    'few understand', 'on-chain is the new online',
  ].map(t => ({ text: t, category: KeywordCategory.ACTIVITY_SIGNAL }))),

  // ── EMAIL DISCOVERY ──────────────────────────────────────────────────────────
  ...([
    'email', 'contact', 'contact me', 'reach me', 'DM me', 'website',
    'personal website', 'portfolio', 'newsletter', 'Substack', 'Mirror',
    'Linktree', 'Beacons', 'Carrd', 'company website', 'team page', 'about page',
    'press page', 'media kit', 'partnerships', 'community', 'investor relations',
    'founder bio',
  ].map(t => ({ text: t, category: KeywordCategory.EMAIL_DISCOVERY }))),

  // ── EXCLUSION ────────────────────────────────────────────────────────────────
  ...([
    'recruiter', 'recruitment', 'talent acquisition', 'talent partner', 'HR',
    'human resources', 'hiring', 'jobs', 'job poster', 'staffing', 'recruiting',
    'career coach', 'resume', 'CV', 'sourcer', 'technical recruiter',
    'people operations', 'people ops', 'employment agency', 'job board',
    'headhunter',
  ].map(t => ({ text: t, category: KeywordCategory.EXCLUSION }))),
]

async function main() {
  console.log('🌱 Seeding keyword library...')

  // Upsert all keywords (safe to re-run)
  let created = 0
  let skipped = 0

  for (const kw of keywords) {
    try {
      await prisma.keyword.upsert({
        where: { text_category: { text: kw.text, category: kw.category } },
        update: {},
        create: { text: kw.text, category: kw.category, enabled: true },
      })
      created++
    } catch {
      skipped++
    }
  }

  console.log(`✅ Done — ${created} keywords seeded, ${skipped} skipped`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())