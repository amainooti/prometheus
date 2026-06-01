'use client'

import { useState } from 'react'
import { CheckSquare, Square, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmailChecklist } from '@prisma/client'

const CHECKLIST_ITEMS: { key: keyof Omit<EmailChecklist, 'id' | 'leadId' | 'updatedAt'>; label: string; hint: string }[] = [
  { key: 'checkedLinkedinLinks',   label: 'Checked LinkedIn contact/website links', hint: 'Look in About section and featured links' },
  { key: 'checkedTwitterBio',      label: 'Checked X / Twitter bio',                hint: 'Bio, pinned tweet, and link in profile' },
  { key: 'checkedPersonalWebsite', label: 'Checked personal website',               hint: 'Look for contact or about page' },
  { key: 'checkedCompanyWebsite',  label: 'Checked company website',                hint: 'About, team, or contact pages' },
  { key: 'checkedTeamPage',        label: 'Checked team / founders page',           hint: 'Individual bios often include emails' },
  { key: 'checkedContactPage',     label: 'Checked contact / press page',           hint: 'Media kits and press pages often have direct emails' },
  { key: 'checkedSubstack',        label: 'Checked Substack / Mirror / newsletter', hint: 'Authors sometimes list emails in footer or about' },
  { key: 'checkedLinktree',        label: 'Checked Linktree / Beacons / Carrd',     hint: 'Link aggregators often include email or contact' },
  { key: 'usedDiscoveryTool',      label: 'Used email discovery tool',              hint: 'e.g. Apollo, Hunter.io, Clearbit, Snov.io' },
  { key: 'verifiedEmail',          label: 'Verified email deliverability',          hint: 'e.g. NeverBounce, ZeroBounce, or sent test' },
]

interface EmailDiscoveryChecklistProps {
  leadId:    string
  checklist: Partial<EmailChecklist> | null
  onUpdate:  (updated: Partial<EmailChecklist>) => void
}

export function EmailDiscoveryChecklist({ leadId, checklist, onUpdate }: EmailDiscoveryChecklistProps) {
  const [saving, setSaving] = useState<string | null>(null)

  const getValue = (key: string): boolean =>
    (checklist as any)?.[key] ?? false

  const completedCount = CHECKLIST_ITEMS.filter(item => getValue(item.key)).length

  const handleToggle = async (key: string, current: boolean) => {
    setSaving(key)
    const update = { [key]: !current }

    try {
      const res = await fetch(`/api/leads/${leadId}/checklist`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(update),
      })
      const updated = await res.json()
      onUpdate(updated)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Email Discovery Checklist</h3>
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full',
          completedCount === CHECKLIST_ITEMS.length
            ? 'bg-green-500/20 text-green-400'
            : 'bg-secondary text-muted-foreground'
        )}>
          {completedCount}/{CHECKLIST_ITEMS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%` }}
        />
      </div>

      {/* Items */}
      <div className="divide-y divide-border">
        {CHECKLIST_ITEMS.map(({ key, label, hint }) => {
          const checked  = getValue(key)
          const isSaving = saving === key

          return (
            <button
              key={key}
              onClick={() => handleToggle(key, checked)}
              disabled={isSaving}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors disabled:opacity-60"
            >
              <div className="mt-0.5 shrink-0">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : checked ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', checked ? 'line-through text-muted-foreground' : 'text-foreground')}>
                  {label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}