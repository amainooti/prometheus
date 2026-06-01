'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '@/types'
import type { LeadStatus } from '@prisma/client'

// Ordered workflow statuses (excluding terminal ones for the stepper)
const WORKFLOW: LeadStatus[] = [
  'NEW',
  'REVIEWED',
  'EMAIL_FOUND',
  'EMAIL_VERIFIED',
  'READY_TO_CONTACT',
  'CONTACTED',
  'REPLIED',
]

const TERMINAL: LeadStatus[] = ['NOT_RELEVANT', 'DO_NOT_CONTACT']

interface StatusStepperProps {
  leadId:   string
  current:  LeadStatus
  onChange: (status: LeadStatus) => void
}

export function StatusStepper({ leadId, current, onChange }: StatusStepperProps) {
  const [saving, setSaving] = useState(false)

  const isTerminal = TERMINAL.includes(current)
  const currentIdx = WORKFLOW.indexOf(current)

  const handleAdvance = async () => {
    if (isTerminal) return
    const nextIdx = currentIdx + 1
    if (nextIdx >= WORKFLOW.length) return
    await updateStatus(WORKFLOW[nextIdx])
  }

  const updateStatus = async (status: LeadStatus) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      })
      const updated = await res.json()
      onChange(updated.status)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Workflow Status</h3>
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>

      {/* Stepper — scrollable on mobile */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="flex items-center gap-0 min-w-max">
          {WORKFLOW.map((status, idx) => {
            const isDone    = !isTerminal && idx < currentIdx
            const isCurrent = !isTerminal && idx === currentIdx
            const isFuture  = isTerminal  || idx > currentIdx

            return (
              <div key={status} className="flex items-center">
                {/* Step */}
                <button
                  onClick={() => updateStatus(status)}
                  disabled={saving}
                  title={STATUS_LABELS[status]}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-1 rounded transition-colors group',
                    !saving && 'hover:bg-secondary/80'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors border-2',
                    isDone    && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'bg-primary/20 border-primary text-primary',
                    isFuture  && 'bg-secondary border-border text-muted-foreground',
                  )}>
                    {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span className={cn(
                    'text-[9px] whitespace-nowrap font-medium',
                    isCurrent ? 'text-primary' : isDone ? 'text-muted-foreground' : 'text-muted-foreground/50'
                  )}>
                    {STATUS_LABELS[status].replace('Ready to Contact', 'Ready')}
                  </span>
                </button>

                {/* Connector line */}
                {idx < WORKFLOW.length - 1 && (
                  <div className={cn(
                    'h-0.5 w-4 mx-0.5',
                    idx < currentIdx && !isTerminal ? 'bg-primary' : 'bg-border'
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Terminal statuses + advance button */}
      <div className="flex flex-wrap items-center gap-2">
        {!isTerminal && currentIdx < WORKFLOW.length - 1 && (
          <button
            onClick={handleAdvance}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Check   className="w-3 h-3" />}
            Mark as {STATUS_LABELS[WORKFLOW[currentIdx + 1]]}
          </button>
        )}

        {TERMINAL.map(status => (
          <button
            key={status}
            onClick={() => updateStatus(status)}
            disabled={saving}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
              current === status
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-secondary border-border text-muted-foreground hover:border-red-400/30 hover:text-red-400'
            )}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  )
}