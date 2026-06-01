import { cn } from '@/lib/utils'
import { STATUS_LABELS, PRIORITY_LABELS, EMAIL_CONFIDENCE_LABELS } from '@/types'
import type { LeadStatus, Priority, EmailConfidence } from '@prisma/client'

const STATUS_CLASS: Record<LeadStatus, string> = {
  NEW:              'badge-new',
  REVIEWED:         'badge-reviewed',
  EMAIL_FOUND:      'badge-email-found',
  EMAIL_VERIFIED:   'badge-email-verified',
  READY_TO_CONTACT: 'badge-ready',
  CONTACTED:        'badge-contacted',
  REPLIED:          'badge-replied',
  NOT_RELEVANT:     'badge-not-relevant',
  DO_NOT_CONTACT:   'badge-do-not-contact',
}

const PRIORITY_CLASS: Record<Priority, string> = {
  A_PLUS: 'badge-a-plus',
  A:      'badge-a',
  B:      'badge-b',
  C:      'badge-c',
  D:      'badge-d',
}

const CONFIDENCE_CLASS: Record<EmailConfidence, string> = {
  HIGH:           'badge-high',
  MEDIUM:         'badge-medium',
  LOW:            'badge-low',
  DO_NOT_CONTACT: 'badge-dnc',
}

interface BadgeProps { className?: string }

export function StatusBadge({ status, className }: { status: LeadStatus } & BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap', STATUS_CLASS[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function PriorityBadge({ priority, className }: { priority: Priority } & BadgeProps) {
  return (
    <span className={cn('inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold', PRIORITY_CLASS[priority], className)}>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

export function ConfidenceBadge({ confidence, className }: { confidence: EmailConfidence } & BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap', CONFIDENCE_CLASS[confidence], className)}>
      {EMAIL_CONFIDENCE_LABELS[confidence]}
    </span>
  )
}