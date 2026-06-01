// Type definitions for the application

export interface Lead {
  id: string
  name: string
  email: string
  company?: string
  status: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Keyword {
  id: string
  keyword: string
  category?: string
  createdAt: Date
  updatedAt: Date
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected'
