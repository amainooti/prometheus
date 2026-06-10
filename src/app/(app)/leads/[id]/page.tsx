'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Trash2, ExternalLink,
  Mail, MailCheck, Loader2, AlertTriangle,
} from 'lucide-react'
import { StatusStepper } from '@/components/leads/StatusStepper'
import { EmailDiscoveryChecklist } from '@/components/leads/EmailDiscoveryChecklist'
import { EmailSearchHelper } from '@/components/leads/EmailSearchHelper'
import { PriorityBadge, ConfidenceBadge } from '@/components/leads/LeadStatusBadge'
import { LeadForm } from '@/components/leads/LeadForm'
import { cn } from '@/lib/utils'
import { ACTIVITY_LABELS, SOURCE_LABELS } from '@/types'
import type { Lead, EmailChecklist, LeadStatus } from '@prisma/client'

type LeadWithChecklist = Lead & { emailChecklist: EmailChecklist | null }

function InfoRow({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-border last:border-0">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide sm:w-32 shrink-0 mt-0.5">
        {label}
      </span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1 break-all">
          {value} <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      ) : (
        <span className="text-sm text-foreground break-words">{value}</span>
      )}
    </div>
  )
}

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [lead,      setLead]      = useState<LeadWithChecklist | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    fetch(`/api/leads/${params.id}`)
      .then(r => r.json())
      .then(data => { setLead(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.id])

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    await fetch(`/api/leads/${params.id}`, { method: 'DELETE' })
    router.push('/leads')
  }

  const handleStatusChange = (status: LeadStatus) => {
    setLead(prev => prev ? { ...prev, status } : prev)
  }

  const handleChecklistUpdate = (updated: Partial<EmailChecklist>) => {
    setLead(prev => prev ? { ...prev, emailChecklist: { ...prev.emailChecklist, ...updated } as EmailChecklist } : prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Lead not found.</p>
        <Link href="/leads" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to Leads</Link>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="max-w-2xl space-y-4">
        <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Cancel Edit
        </button>
        <LeadForm
          mode="edit"
          leadId={lead.id}
          defaultValues={{
            name:            lead.name,
            linkedinUrl:     lead.linkedinUrl    ?? '',
            twitterUrl:      lead.twitterUrl     ?? '',
            role:            lead.role            ?? '',
            company:         lead.company         ?? '',
            companyWebsite:  lead.companyWebsite  ?? '',
            cryptoNiche:     lead.cryptoNiche     ?? '',
            beliefSignal:    lead.beliefSignal    ?? '',
            activityLevel:   lead.activityLevel,
            tags:            lead.tags,
            email:           lead.email           ?? '',
            emailSource:     lead.emailSource     ?? '',
            emailConfidence: lead.emailConfidence ?? undefined,
            emailVerified:   lead.emailVerified,
            emailType:       lead.emailType,
            priority:        lead.priority,
            status:          lead.status,
            sourceFound:     lead.sourceFound     ?? undefined,
            notes:           lead.notes           ?? '',
          }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-5">

      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/leads" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Leads
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-md text-xs font-medium hover:bg-secondary/80"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
              confirmDel
                ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
                : 'bg-secondary border-border text-muted-foreground hover:border-red-400/30 hover:text-red-400'
            )}
          >
            {deleting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2  className="w-3.5 h-3.5" />}
            {confirmDel ? 'Confirm Delete' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Hero row */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground">{lead.name}</h2>
            {(lead.role || lead.company) && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {[lead.role, lead.company].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <PriorityBadge priority={lead.priority} className="text-sm w-9 h-7" />
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2">
          {lead.linkedinUrl && (
            <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-md text-xs hover:bg-blue-500/20">
              LinkedIn <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {lead.twitterUrl && (
            <a href={lead.twitterUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-md text-xs hover:bg-sky-500/20">
              X / Twitter <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {lead.companyWebsite && (
            <a href={lead.companyWebsite} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border text-muted-foreground rounded-md text-xs hover:text-foreground">
              Website <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Tags */}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lead.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Status stepper */}
          <StatusStepper
            leadId={lead.id}
            current={lead.status}
            onChange={handleStatusChange}
          />

          {/* Lead details */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">Lead Details</h3>
            <div>
              <InfoRow label="Crypto Niche"    value={lead.cryptoNiche} />
              <InfoRow label="Belief Signal"   value={lead.beliefSignal} />
              <InfoRow label="Activity Level"  value={lead.activityLevel ? ACTIVITY_LABELS[lead.activityLevel] : null} />
              <InfoRow label="Source Found"    value={lead.sourceFound ? SOURCE_LABELS[lead.sourceFound] : null} />
              <InfoRow label="Added"           value={new Date(lead.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
              <InfoRow label="Last Updated"    value={new Date(lead.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
            </div>
          </div>

          {/* Email info */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">Email</h3>
            {lead.email ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {lead.emailVerified
                    ? <MailCheck className="w-4 h-4 text-green-400 shrink-0" />
                    : <Mail      className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="text-sm font-medium break-all">{lead.email}</span>
                  {lead.emailConfidence && <ConfidenceBadge confidence={lead.emailConfidence} />}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {lead.emailType   && <p>Type: {lead.emailType.charAt(0) + lead.emailType.slice(1).toLowerCase()}</p>}
                  {lead.emailSource && <p>Source: {lead.emailSource}</p>}
                  <p>{lead.emailVerified ? '✓ Verified' : '✗ Not yet verified'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No email found yet.</p>
            )}
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">Notes</h3>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-5">
          <EmailDiscoveryChecklist
            leadId={lead.id}
            checklist={lead.emailChecklist}
            onUpdate={handleChecklistUpdate}
          />
          <EmailSearchHelper
            name={lead.name}
            company={lead.company}
            website={lead.companyWebsite}
          />
        </div>
      </div>
    </div>
  )
}