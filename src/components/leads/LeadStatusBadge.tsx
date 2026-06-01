'use client'

import { LeadStatus } from '@/types'

interface LeadStatusBadgeProps {
  status: LeadStatus
}

const statusColors: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-green-100 text-green-800',
  converted: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>{status}</span>
}
