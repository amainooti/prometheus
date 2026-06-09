import { z } from 'zod'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const PrioritySchema        = z.enum(['A_PLUS', 'A', 'B', 'C', 'D'])
export const EmailConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW', 'DO_NOT_CONTACT'])
export const LeadStatusSchema      = z.enum([
  'NEW', 'REVIEWED', 'EMAIL_FOUND', 'EMAIL_VERIFIED',
  'READY_TO_CONTACT', 'CONTACTED', 'REPLIED', 'NOT_RELEVANT', 'DO_NOT_CONTACT',
])
export const EmailTypeSchema       = z.enum(['PERSONAL', 'COMPANY', 'UNKNOWN'])
export const ActivityLevelSchema   = z.enum(['VERY_ACTIVE', 'ACTIVE', 'MODERATE', 'LOW', 'UNKNOWN'])
export const LeadSourceSchema      = z.enum([
  'LINKEDIN', 'X_TWITTER', 'FARCASTER', 'LENS', 'DISCORD', 'TELEGRAM',
  'SUBSTACK', 'MIRROR', 'MEDIUM', 'YOUTUBE', 'PODCAST', 'CRYPTO_EVENT',
  'VC_PORTFOLIO', 'DAO_FORUM', 'GITHUB', 'COMPANY_WEBSITE', 'CRYPTO_NEWSLETTER',
  'REDDIT', 'BITCOINTALK', 'QUORA', 'MANUAL', 'OTHER',
])
export const KeywordCategorySchema = z.enum([
  'IDENTITY', 'FOUNDER_INVESTOR', 'BUILDER_CONTRIBUTOR', 'CONTENT_EDUCATION',
  'BELIEF_PHILOSOPHY', 'RETAIL_HOLDER', 'ECOSYSTEM', 'NICHE',
  'ACTIVITY_SIGNAL', 'EMAIL_DISCOVERY', 'EXCLUSION',
])

// ─── Lead ────────────────────────────────────────────────────────────────────

export const LeadFormSchema = z.object({
  name:            z.string().min(1, 'Name is required').max(200),
  linkedinUrl:     z.string().url('Must be a valid URL').optional().or(z.literal('')),
  twitterUrl:      z.string().url('Must be a valid URL').optional().or(z.literal('')),
  role:            z.string().max(200).optional().or(z.literal('')),
  company:         z.string().max(200).optional().or(z.literal('')),
  companyWebsite:  z.string().url('Must be a valid URL').optional().or(z.literal('')),
  cryptoNiche:     z.string().max(200).optional().or(z.literal('')),
  ecosystem:       z.string().max(200).optional().or(z.literal('')), // ← NEW
  beliefSignal:    z.string().max(500).optional().or(z.literal('')),
  activityLevel:   ActivityLevelSchema.default('UNKNOWN'),
  tags:            z.array(z.string()).default([]),
  email:           z.string().email('Must be a valid email').optional().or(z.literal('')),
  emailSource:     z.string().max(200).optional().or(z.literal('')),
  emailConfidence: EmailConfidenceSchema.optional(),
  emailVerified:   z.boolean().default(false),
  emailType:       EmailTypeSchema.default('UNKNOWN'),
  priority:        PrioritySchema.default('C'),
  status:          LeadStatusSchema.default('NEW'),
  sourceFound:     LeadSourceSchema.optional(),
  notes:           z.string().max(5000).optional().or(z.literal('')),
})

export type LeadFormValues = z.infer<typeof LeadFormSchema>

// ─── Keyword ─────────────────────────────────────────────────────────────────

export const KeywordSchema = z.object({
  text:     z.string().min(1, 'Keyword text is required').max(200),
  category: KeywordCategorySchema,
  enabled:  z.boolean().default(true),
})

export type KeywordFormValues = z.infer<typeof KeywordSchema>

// ─── Filters ─────────────────────────────────────────────────────────────────

export const LeadFiltersSchema = z.object({
  search:          z.string().optional(),
  priority:        z.array(PrioritySchema).optional(),
  status:          z.array(LeadStatusSchema).optional(),
  emailConfidence: z.array(EmailConfidenceSchema).optional(),
  emailVerified:   z.boolean().optional(),
  activityLevel:   z.array(ActivityLevelSchema).optional(),
  sourceFound:     z.array(LeadSourceSchema).optional(),
  cryptoNiche:     z.string().optional(),
  ecosystem:       z.string().optional(), // ← NEW
  tags:            z.array(z.string()).optional(),
  dateFrom:        z.string().optional(),
  dateTo:          z.string().optional(),
})

export type LeadFilters = z.infer<typeof LeadFiltersSchema>