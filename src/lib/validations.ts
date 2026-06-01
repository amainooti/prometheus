import { z } from 'zod'

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  status: z.string().default('new'),
  notes: z.string().optional(),
})

export const updateLeadSchema = createLeadSchema.partial()

export const createKeywordSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required'),
  category: z.string().optional(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type CreateKeywordInput = z.infer<typeof createKeywordSchema>
