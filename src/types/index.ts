import type {
  Lead,
  Keyword,
  EmailChecklist,
  Priority,
  EmailConfidence,
  LeadStatus,
  EmailType,
  ActivityLevel,
  LeadSource,
  KeywordCategory,
} from '@prisma/client'

// Re-export Prisma enums for use across the app
export type {
  Lead,
  Keyword,
  EmailChecklist,
  Priority,
  EmailConfidence,
  LeadStatus,
  EmailType,
  ActivityLevel,
  LeadSource,
  KeywordCategory,
}

// Lead with checklist relation
export type LeadWithChecklist = Lead & {
  emailChecklist: EmailChecklist | null
}

// Dashboard stats shape
export interface DashboardStats {
  totalLeads: number
  aPlus: number
  verifiedEmails: number
  unverifiedEmails: number
  byPriority: Record<Priority, number>
  byStatus: Record<LeadStatus, number>
  recentLeads: Lead[]
}

// Query generator output
export interface GeneratedQuery {
  platform: 'LinkedIn' | 'X/Twitter' | 'Google'
  query: string
  url: string
}

// CSV export row shape
export interface LeadExportRow {
  name: string
  linkedinUrl: string
  twitterUrl: string
  role: string
  company: string
  companyWebsite: string
  cryptoNiche: string
  beliefSignal: string
  activityLevel: string
  tags: string
  email: string
  emailSource: string
  emailConfidence: string
  emailVerified: string
  emailType: string
  priority: string
  status: string
  sourceFound: string
  notes: string
  createdAt: string
  updatedAt: string
}

// Human-readable label maps
export const PRIORITY_LABELS: Record<Priority, string> = {
  A_PLUS: 'A+',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
}

export const PRIORITY_DESCRIPTIONS: Record<Priority, string> = {
  A_PLUS: 'Founder/investor actively promoting blockchain or crypto',
  A: 'Strong crypto-native builder, educator, analyst, or community voice',
  B: 'Active crypto enthusiast, holder, trader, NFT collector, or DeFi user',
  C: 'Beginner-believer who holds crypto or supports blockchain but posts lightly',
  D: 'Weak or vague crypto interest with no visible activity',
}

export const EMAIL_CONFIDENCE_LABELS: Record<EmailConfidence, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  DO_NOT_CONTACT: 'Do Not Contact',
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  REVIEWED: 'Reviewed',
  EMAIL_FOUND: 'Email Found',
  EMAIL_VERIFIED: 'Email Verified',
  READY_TO_CONTACT: 'Ready to Contact',
  CONTACTED: 'Contacted',
  REPLIED: 'Replied',
  NOT_RELEVANT: 'Not Relevant',
  DO_NOT_CONTACT: 'Do Not Contact',
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  VERY_ACTIVE: 'Very Active',
  ACTIVE: 'Active',
  MODERATE: 'Moderate',
  LOW: 'Low',
  UNKNOWN: 'Unknown',
}

export const SOURCE_LABELS: Record<LeadSource, string> = {
  LINKEDIN:          'LinkedIn',
  X_TWITTER:         'X / Twitter',
  FARCASTER:         'Farcaster',
  LENS:              'Lens',
  DISCORD:           'Discord',
  TELEGRAM:          'Telegram',
  SUBSTACK:          'Substack',
  MIRROR:            'Mirror',
  MEDIUM:            'Medium',
  YOUTUBE:           'YouTube',
  PODCAST:           'Podcast',
  CRYPTO_EVENT:      'Crypto Event',
  VC_PORTFOLIO:      'VC Portfolio',
  DAO_FORUM:         'DAO Forum',
  GITHUB:            'GitHub',
  COMPANY_WEBSITE:   'Company Website',
  CRYPTO_NEWSLETTER: 'Crypto Newsletter',
  REDDIT:            'Reddit',       // ← NEW
  BITCOINTALK:       'Bitcointalk',  // ← NEW
  QUORA:             'Quora',        // ← NEW
  MANUAL:            'Manual',       // ← NEW
  OTHER:             'Other',
}

export const CATEGORY_LABELS: Record<KeywordCategory, string> = {
  IDENTITY:            'Identity',
  FOUNDER_INVESTOR:    'Founder / Investor',
  BUILDER_CONTRIBUTOR: 'Builder / Contributor',
  CONTENT_EDUCATION:   'Content / Education',
  BELIEF_PHILOSOPHY:   'Belief / Philosophy',
  RETAIL_HOLDER:       'Retail Holder',
  ECOSYSTEM:           'Ecosystem',
  NICHE:               'Niche',
  ACTIVITY_SIGNAL:     'Activity Signal',
  EMAIL_DISCOVERY:     'Email Discovery',
  EXCLUSION:           'Exclusion',
}

export const AVAILABLE_TAGS = [
  'Bitcoin', 'Ethereum', 'Solana', 'DeFi', 'RWA', 'DePIN', 'NFT', 'DAO',
  'Investor', 'Founder', 'Holder', 'Content Creator', 'Strong Mutual Potential',
  'Builder', 'Educator', 'Analyst', 'Community Lead',
]