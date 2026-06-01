'use client'

import { useState } from 'react'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PRIORITY_LABELS, STATUS_LABELS, EMAIL_CONFIDENCE_LABELS,
  ACTIVITY_LABELS, SOURCE_LABELS,
} from '@/types'
import type { Priority, LeadStatus, EmailConfidence, ActivityLevel, LeadSource } from '@prisma/client'

export interface ActiveFilters {
  priority:        Priority[]
  status:          LeadStatus[]
  emailConfidence: EmailConfidence[]
  emailVerified:   boolean | null
  activityLevel:   ActivityLevel[]
  sourceFound:     LeadSource[]
}

interface LeadFiltersProps {
  filters:   ActiveFilters
  onChange:  (f: ActiveFilters) => void
  total:     number
}

function MultiSelect<T extends string>({
  label, options, selected, onToggle,
}: {
  label:    string
  options:  Record<T, string>
  selected: T[]
  onToggle: (v: T) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {(Object.entries(options) as [T, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => onToggle(value)}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium border transition-colors',
              selected.includes(value)
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function LeadFilters({ filters, onChange, total }: LeadFiltersProps) {
  const [open, setOpen] = useState(false)

  const activeCount = [
    filters.priority.length,
    filters.status.length,
    filters.emailConfidence.length,
    filters.emailVerified !== null ? 1 : 0,
    filters.activityLevel.length,
    filters.sourceFound.length,
  ].reduce((a, b) => a + b, 0)

  const toggle = <T extends string>(key: keyof ActiveFilters, value: T) => {
    const arr = filters[key] as T[]
    onChange({
      ...filters,
      [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
    })
  }

  const reset = () => onChange({
    priority: [], status: [], emailConfidence: [],
    emailVerified: null, activityLevel: [], sourceFound: [],
  })

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">Filters</span>
          {activeCount > 0 && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{total} result{total !== 1 ? 's' : ''}</span>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {/* Filter panel */}
      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MultiSelect
              label="Priority"
              options={PRIORITY_LABELS}
              selected={filters.priority}
              onToggle={v => toggle('priority', v)}
            />
            <MultiSelect
              label="Status"
              options={STATUS_LABELS}
              selected={filters.status}
              onToggle={v => toggle('status', v)}
            />
            <MultiSelect
              label="Email Confidence"
              options={EMAIL_CONFIDENCE_LABELS}
              selected={filters.emailConfidence}
              onToggle={v => toggle('emailConfidence', v)}
            />
            <MultiSelect
              label="Activity Level"
              options={ACTIVITY_LABELS}
              selected={filters.activityLevel}
              onToggle={v => toggle('activityLevel', v)}
            />
            <MultiSelect
              label="Source"
              options={SOURCE_LABELS}
              selected={filters.sourceFound}
              onToggle={v => toggle('sourceFound', v)}
            />

            {/* Email verified toggle */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Email Verified</p>
              <div className="flex gap-1.5">
                {[
                  { label: 'Any',   value: null  },
                  { label: 'Yes',   value: true  },
                  { label: 'No',    value: false },
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => onChange({ ...filters, emailVerified: opt.value })}
                    className={cn(
                      'px-3 py-0.5 rounded text-[10px] font-medium border transition-colors',
                      filters.emailVerified === opt.value
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeCount > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" /> Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}