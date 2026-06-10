'use client'

import { useState, useEffect } from 'react'
import { SlidersHorizontal, X, ChevronDown, Loader2 } from 'lucide-react'
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
  ecosystems:      string[]
}

interface LeadFiltersProps {
  filters:   ActiveFilters
  onChange:  (f: ActiveFilters) => void
  total:     number
}

const ECOSYSTEM_COLOR: Record<string, string> = {
  Ethereum:  'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  Solana:    'bg-violet-500/10 border-violet-500/30 text-violet-400',
  Bitcoin:   'bg-orange-500/10 border-orange-500/30 text-orange-400',
  Base:      'bg-blue-500/10  border-blue-500/30  text-blue-400',
  Arbitrum:  'bg-sky-500/10   border-sky-500/30   text-sky-400',
  Optimism:  'bg-red-500/10   border-red-500/30   text-red-400',
  Cosmos:    'bg-purple-500/10 border-purple-500/30 text-purple-400',
  Sui:       'bg-cyan-500/10  border-cyan-500/30  text-cyan-400',
  Aptos:     'bg-teal-500/10  border-teal-500/30  text-teal-400',
  Polygon:   'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400',
  Avalanche: 'bg-red-600/10  border-red-600/30   text-red-500',
  TON:       'bg-blue-600/10  border-blue-600/30  text-blue-500',
}
const ecoClass = (eco: string) =>
  ECOSYSTEM_COLOR[eco] ?? 'bg-amber-500/10 border-amber-500/30 text-amber-400'

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
  const [open,       setOpen]       = useState(false)
  const [ecosystems, setEcosystems] = useState<{ ecosystem: string; count: number }[]>([])
  const [ecoLoading, setEcoLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setEcoLoading(true)
      try {
        const res  = await fetch('/api/leads/ecosystem')
        const data = await res.json()
        setEcosystems(Array.isArray(data) ? data : [])
      } catch {
        setEcosystems([])
      } finally {
        setEcoLoading(false)
      }
    }
    load()
  }, [])

  const activeCount = [
    filters.priority.length,
    filters.status.length,
    filters.emailConfidence.length,
    filters.emailVerified !== null ? 1 : 0,
    filters.activityLevel.length,
    filters.sourceFound.length,
    filters.ecosystems.length,
  ].reduce((a, b) => a + b, 0)

  const toggle = <T extends string>(key: keyof ActiveFilters, value: T) => {
    const arr = filters[key] as T[]
    onChange({
      ...filters,
      [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
    })
  }

  const toggleEcosystem = (eco: string) => {
    const current = filters.ecosystems
    onChange({
      ...filters,
      ecosystems: current.includes(eco) ? current.filter(e => e !== eco) : [...current, eco],
    })
  }

  const reset = () => onChange({
    priority: [], status: [], emailConfidence: [],
    emailVerified: null, activityLevel: [], sourceFound: [], ecosystems: [],
  })

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
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
          {filters.ecosystems.length > 0 && (
            <div className="flex items-center gap-1">
              {filters.ecosystems.slice(0, 3).map(eco => (
                <span key={eco} className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', ecoClass(eco))}>
                  {eco}
                </span>
              ))}
              {filters.ecosystems.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{filters.ecosystems.length - 3}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{total} result{total !== 1 ? 's' : ''}</span>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4">

          {/* Ecosystem filter — from DB */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Ecosystem</p>
              {filters.ecosystems.length > 0 && (
                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                  {filters.ecosystems.length} selected
                </span>
              )}
            </div>
            {ecoLoading ? (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading ecosystems…
              </div>
            ) : ecosystems.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No ecosystems found in your leads yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {ecosystems.map(({ ecosystem: eco, count }) => (
                  <button
                    key={eco}
                    onClick={() => toggleEcosystem(eco)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                      filters.ecosystems.includes(eco)
                        ? ecoClass(eco)
                        : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/20'
                    )}
                  >
                    {eco}
                    <span className="ml-1 opacity-60">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

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