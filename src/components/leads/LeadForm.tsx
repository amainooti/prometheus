'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { LeadFormSchema, type LeadFormValues } from '@/lib/validations'
import { checkDuplicate } from '@/lib/duplicate-detection'
import {
  PRIORITY_LABELS, PRIORITY_DESCRIPTIONS,
  STATUS_LABELS, EMAIL_CONFIDENCE_LABELS,
  ACTIVITY_LABELS, SOURCE_LABELS, AVAILABLE_TAGS,
} from '@/types'
import { cn } from '@/lib/utils'

// ── Reusable field components ─────────────────────────────────────────────────

function Field({ label, error, required, children, hint }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode; hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  )
}

const inputCls = 'w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'
const selectCls = inputCls

// ── Main form ─────────────────────────────────────────────────────────────────

interface LeadFormProps {
  defaultValues?: Partial<LeadFormValues>
  leadId?: string
  mode?: 'create' | 'edit'
}

export function LeadForm({ defaultValues, leadId, mode = 'create' }: LeadFormProps) {
  const router  = useRouter()
  const [submitting, setSubmitting]     = useState(false)
  const [submitError, setSubmitError]   = useState('')
  const [duplicate, setDuplicate]       = useState<{ id: string; name: string; company: string | null } | null>(null)
  const [checkingDupe, setCheckingDupe] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<LeadFormValues>({
    resolver: zodResolver(LeadFormSchema),
    defaultValues: {
      priority:      'C',
      status:        'NEW',
      activityLevel: 'UNKNOWN',
      emailType:     'UNKNOWN',
      emailVerified: false,
      tags:          [],
      ...defaultValues,
    },
  })

  const watchName    = watch('name')
  const watchCompany = watch('company')
  const watchTags    = watch('tags') ?? []

  // Debounced duplicate check
  useEffect(() => {
    if (mode === 'edit' || !watchName) { setDuplicate(null); return }
    const t = setTimeout(async () => {
      setCheckingDupe(true)
      const result = await checkDuplicate(watchName, watchCompany ?? '')
      setDuplicate(result.isDuplicate && result.existingId !== leadId
        ? { id: result.existingId!, name: result.existingName!, company: result.existingCompany ?? null }
        : null
      )
      setCheckingDupe(false)
    }, 600)
    return () => clearTimeout(t)
  }, [watchName, watchCompany, mode, leadId])

  const toggleTag = useCallback((tag: string) => {
    setValue('tags',
      watchTags.includes(tag)
        ? watchTags.filter(t => t !== tag)
        : [...watchTags, tag],
      { shouldDirty: true }
    )
  }, [watchTags, setValue])

  const onSubmit = async (data: LeadFormValues) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const url    = mode === 'edit' ? `/api/leads/${leadId}` : '/api/leads'
      const method = mode === 'edit' ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.status === 409) {
        const { duplicate: dupe } = await res.json()
        setDuplicate(dupe)
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        const err = await res.json()
        setSubmitError(err.error?.message ?? 'Something went wrong')
        setSubmitting(false)
        return
      }

      const lead = await res.json()
      router.push(`/leads/${lead.id}`)
    } catch {
      setSubmitError('Network error — please try again')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">

      {/* Duplicate warning */}
      {duplicate && (
        <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-yellow-400 font-medium text-xs">Possible duplicate</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              "{duplicate.name}"{duplicate.company ? ` at ${duplicate.company}` : ''} already exists.
            </p>
            <Link href={`/leads/${duplicate.id}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
              View existing lead <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Section: Basic Info ── */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
          Basic Info
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Full Name" required error={errors.name?.message}>
              <div className="relative">
                <input {...register('name')} placeholder="e.g. Vitalik Buterin" className={inputCls} />
                {checkingDupe && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            </Field>
          </div>
          <Field label="Role / Title" error={errors.role?.message}>
            <input {...register('role')} placeholder="e.g. Founder & CEO" className={inputCls} />
          </Field>
          <Field label="Company" error={errors.company?.message}>
            <input {...register('company')} placeholder="e.g. Ethereum Foundation" className={inputCls} />
          </Field>
          <Field label="LinkedIn URL" error={errors.linkedinUrl?.message}>
            <input {...register('linkedinUrl')} placeholder="https://linkedin.com/in/…" className={inputCls} />
          </Field>
          <Field label="X / Twitter URL" error={errors.twitterUrl?.message}>
            <input {...register('twitterUrl')} placeholder="https://x.com/…" className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Company Website" error={errors.companyWebsite?.message}>
              <input {...register('companyWebsite')} placeholder="https://…" className={inputCls} />
            </Field>
          </div>
        </div>
      </section>

      {/* ── Section: Crypto Profile ── */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
          Crypto Profile
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Crypto Niche" error={errors.cryptoNiche?.message}>
            <input {...register('cryptoNiche')} placeholder="e.g. DeFi, RWA, NFT…" className={inputCls} />
          </Field>
          <Field label="Activity Level" error={errors.activityLevel?.message}>
            <select {...register('activityLevel')} className={selectCls}>
              {Object.entries(ACTIVITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Belief / Signal" error={errors.beliefSignal?.message}
              hint="Key phrase from their bio or posts that signals crypto conviction">
              <input {...register('beliefSignal')} placeholder="e.g. 'building the future of finance'" className={inputCls} />
            </Field>
          </div>

          {/* Tags */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                    watchTags.includes(tag)
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Email ── */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
          Email
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email Address" error={errors.email?.message}>
            <input {...register('email')} type="email" placeholder="name@example.com" className={inputCls} />
          </Field>
          <Field label="Email Source" error={errors.emailSource?.message}>
            <input {...register('emailSource')} placeholder="e.g. LinkedIn bio, Apollo…" className={inputCls} />
          </Field>
          <Field label="Email Confidence" error={errors.emailConfidence?.message}>
            <select {...register('emailConfidence')} className={selectCls}>
              <option value="">— Select confidence —</option>
              {Object.entries(EMAIL_CONFIDENCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Email Type" error={errors.emailType?.message}>
            <select {...register('emailType')} className={selectCls}>
              <option value="UNKNOWN">Unknown</option>
              <option value="PERSONAL">Personal</option>
              <option value="COMPANY">Company</option>
            </select>
          </Field>
          <div className="sm:col-span-2 flex items-center gap-3">
            <input
              {...register('emailVerified')}
              type="checkbox"
              id="emailVerified"
              className="w-4 h-4 rounded border-border bg-secondary accent-primary"
            />
            <label htmlFor="emailVerified" className="text-sm text-foreground cursor-pointer">
              Email has been verified
            </label>
          </div>
        </div>
      </section>

      {/* ── Section: Scoring & Source ── */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
          Scoring & Source
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Priority</label>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.entries(PRIORITY_LABELS) as [string, string][]).map(([value, label]) => {
                const current = watch('priority')
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('priority', value as any)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 p-2.5 rounded-lg border text-left transition-colors',
                      current === value
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border bg-secondary hover:border-primary/30'
                    )}
                  >
                    <span className={cn(
                      'text-xs font-bold',
                      current === value ? 'text-primary' : 'text-foreground'
                    )}>{label}</span>
                    <span className="text-[9px] text-muted-foreground leading-tight hidden sm:block">
                      {PRIORITY_DESCRIPTIONS[value as keyof typeof PRIORITY_DESCRIPTIONS].slice(0, 40)}…
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <Field label="Status" error={errors.status?.message}>
            <select {...register('status')} className={selectCls}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Found Via" error={errors.sourceFound?.message}>
            <select {...register('sourceFound')} className={selectCls}>
              <option value="">— Select source —</option>
              {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* ── Section: Notes ── */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
          Notes
        </h3>
        <Field label="Notes" error={errors.notes?.message}>
          <textarea
            {...register('notes')}
            rows={4}
            placeholder="Any additional context, observations, or research notes…"
            className={cn(inputCls, 'resize-y')}
          />
        </Field>
      </section>

      {/* Submit */}
      {submitError && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {submitError}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {mode === 'edit' ? 'Save Changes' : 'Add Lead'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 bg-secondary text-foreground rounded-md text-sm font-medium hover:bg-secondary/80"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}