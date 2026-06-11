'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Loader2, UserPlus, CheckCircle, AlertTriangle,
  Mail, ExternalLink, RefreshCw, Zap, User, Globe,
  ChevronDown, ChevronUp, MailSearch, Download, SaveAll, Tag, Users,
  MailPlus, Plus, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITY_LABELS } from '@/types'
import { getScanOptions, formatScanOption, FALLBACK_SCAN_OPTIONS } from '@/lib/follower-scan-option'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prospect {
  name:              string
  role:              string | null
  company:           string | null
  companyWebsite:    string | null
  linkedinUrl:       string | null
  twitterUrl:        string | null
  farcasterUrl:      string | null
  redditUrl:         string | null
  quoraUrl:          string | null
  truthSocialUrl:    string | null
  email:             string | null
  emailSource:       string | null
  cryptoNiche:       string | null
  ecosystem:         string | null
  beliefSignal:      string | null
  activityLevel:     string
  tags:              string[]
  priority:          string
  priorityReason:    string
  sourceFound:       string | null
  confidence:        'HIGH' | 'MEDIUM' | 'LOW'
  notes?:            string | null
  confidenceReason?: string
}

interface DiscoveryCriteria {
  niches:       string[]
  roles:        string[]
  ecosystems:   string[]
  platforms:    string[]
  beliefSignal: string
}

interface SavedKeyword {
  id:       string
  text:     string
  category: string
  enabled:  boolean
}

interface ScrapeProgress {
  stage:   string
  detail?: string
  current: number
  total:   number
  label:   string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<string, string> = {
  A_PLUS: 'badge-a-plus', A: 'badge-a', B: 'badge-b', C: 'badge-c', D: 'badge-d',
}
const CONFIDENCE_COLOR = {
  HIGH:   'text-green-400',
  MEDIUM: 'text-yellow-400',
  LOW:    'text-red-400',
}
const ECOSYSTEM_COLOR: Record<string, string> = {
  Ethereum:  'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  Solana:    'bg-violet-500/10 border-violet-500/20 text-violet-400',
  Bitcoin:   'bg-orange-500/10 border-orange-500/20 text-orange-400',
  Base:      'bg-blue-500/10  border-blue-500/20  text-blue-400',
  Arbitrum:  'bg-sky-500/10   border-sky-500/20   text-sky-400',
  Optimism:  'bg-red-500/10   border-red-500/20   text-red-400',
  Cosmos:    'bg-purple-500/10 border-purple-500/20 text-purple-400',
  Sui:       'bg-cyan-500/10  border-cyan-500/20  text-cyan-400',
  Aptos:     'bg-teal-500/10  border-teal-500/20  text-teal-400',
  Polygon:   'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400',
  Avalanche: 'bg-red-600/10  border-red-600/20   text-red-500',
  TON:       'bg-blue-600/10  border-blue-600/20  text-blue-500',
}
const ecosystemBadgeClass = (eco: string) =>
  ECOSYSTEM_COLOR[eco] ?? 'bg-amber-500/10 border-amber-500/20 text-amber-400'

const NICHES            = ['DeFi', 'Bitcoin', 'RWA', 'DePIN', 'NFT', 'DAO', 'GameFi', 'SocialFi', 'AI x Crypto', 'Stablecoins', 'Payments', 'ZK / Privacy', 'Modular Blockchain']
const ROLES             = ['Founder', 'Co-Founder', 'Investor', 'Angel Investor', 'Builder / Developer', 'Educator / Content Creator', 'Analyst / Researcher', 'Community Lead', 'DAO Contributor']
const PRESET_ECOSYSTEMS = ['Ethereum', 'Solana', 'Bitcoin', 'Base', 'Arbitrum', 'Optimism', 'Cosmos', 'Sui', 'Aptos', 'Polygon', 'Avalanche', 'TON']
const PLATFORMS         = ['X / Twitter', 'LinkedIn', 'Farcaster', 'Substack', 'GitHub', 'Mirror', 'Podcast', 'Reddit', 'Quora', 'Truth Social']

const ECOSYSTEM_ACCOUNTS: Record<string, string[]> = {
  Ethereum:  ['ethereum', 'ethfoundation', 'VitalikButerin'],
  Solana:    ['solana', 'solana_foundation', 'JupiterExchange'],
  Bitcoin:   ['Bitcoin', 'bitcoinmagazine', 'saylor'],
  Base:      ['base', 'jessepollak'],
  Arbitrum:  ['arbitrum', 'ArbitrumDAO'],
  Optimism:  ['Optimism', 'OptimismGov'],
  Cosmos:    ['cosmos', 'cosmosnetwork'],
  Sui:       ['SuiNetwork', 'SuiFoundation'],
  Aptos:     ['AptosLabs', 'Aptos'],
  Polygon:   ['0xPolygon', 'PolygonDAO'],
  Avalanche: ['avalancheavax', 'AvaLabs'],
  TON:       ['ton_blockchain', 'toncoin'],
}

// ─── Dedup helper ─────────────────────────────────────────────────────────────

async function checkDuplicates(prospects: Prospect[]): Promise<Set<number>> {
  try {
    const res = await fetch('/api/leads/dedup', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        names:  prospects.map(p => p.name),
        emails: prospects.map(p => p.email ?? ''),
      }),
    })
    if (!res.ok) return new Set()
    const { names, emails } = await res.json()
    const nameSet  = new Set<string>(names)
    const emailSet = new Set<string>(emails)
    const dupes    = new Set<number>()
    prospects.forEach((p, i) => {
      if (nameSet.has(p.name.toLowerCase().trim()))         dupes.add(i)
      if (p.email && emailSet.has(p.email.toLowerCase()))  dupes.add(i)
    })
    return dupes
  } catch {
    return new Set()
  }
}

// ─── Shared prospect → lead payload ──────────────────────────────────────────

function prospectToLead(p: Prospect) {
  return {
    name: p.name, role: p.role ?? '', company: p.company ?? '',
    companyWebsite: p.companyWebsite ?? '', linkedinUrl: p.linkedinUrl ?? '',
    twitterUrl: p.twitterUrl ?? '', email: p.email ?? '',
    emailSource: p.emailSource ?? '', cryptoNiche: p.cryptoNiche ?? '',
    ecosystem: p.ecosystem ?? '', beliefSignal: p.beliefSignal ?? '',
    activityLevel: p.activityLevel ?? 'UNKNOWN', tags: p.tags ?? [],
    priority: p.priority ?? 'C', status: 'NEW',
    sourceFound: p.sourceFound ?? undefined, notes: p.notes ?? '',
    emailVerified: false, emailType: 'UNKNOWN',
  }
}

// ─── MultiSelectPills ─────────────────────────────────────────────────────────

function MultiSelectPills({ label, options, selected, onToggle }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
        {selected.length > 0 && (
          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">{selected.length} selected</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o} type="button" onClick={() => onToggle(o)}
            className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
              selected.includes(o)
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/20'
            )}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── EcosystemInput ───────────────────────────────────────────────────────────

function EcosystemInput({ label, selected, onToggle, singleValue, onSingleChange, mode = 'multi' }: {
  label: string; selected: string[]; onToggle: (v: string) => void
  singleValue?: string; onSingleChange?: (v: string) => void; mode?: 'multi' | 'single'
}) {
  const [draft, setDraft] = useState('')
  const commit = (val: string) => {
    const trimmed = val.trim(); if (!trimmed) return
    if (mode === 'multi') onToggle(trimmed); else onSingleChange?.(trimmed)
    setDraft('')
  }
  const customSelected = mode === 'multi'
    ? selected.filter(s => !PRESET_ECOSYSTEMS.includes(s))
    : (singleValue && !PRESET_ECOSYSTEMS.includes(singleValue) ? [singleValue] : [])
  const activeCount = mode === 'multi' ? selected.length : (singleValue ? 1 : 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
        {activeCount > 0 && (
          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">
            {mode === 'multi' ? `${activeCount} selected` : singleValue}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_ECOSYSTEMS.map(eco => {
          const isActive = mode === 'multi' ? selected.includes(eco) : singleValue === eco
          return (
            <button key={eco} type="button"
              onClick={() => mode === 'multi' ? onToggle(eco) : onSingleChange?.(isActive ? '' : eco)}
              className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                isActive
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/20'
              )}>
              {eco}
            </button>
          )
        })}
        {customSelected.map(eco => (
          <button key={eco} type="button"
            onClick={() => mode === 'multi' ? onToggle(eco) : onSingleChange?.('')}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20 transition-colors">
            {eco} ×
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="text" value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(draft) } }}
          placeholder="Ecosystem name or ticker — e.g. $WLFI, $PEPE, $BRETT…"
          className="flex-1 bg-secondary border border-border rounded-md px-3 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {draft.trim() && (
          <button type="button" onClick={() => commit(draft)}
            className="shrink-0 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors">
            Add ↵
          </button>
        )}
      </div>
    </div>
  )
}

// ─── SavedKeywordPills ────────────────────────────────────────────────────────

function SavedKeywordPills({ keywords, activeKeywords, onToggle }: {
  keywords: SavedKeyword[]; activeKeywords: string[]; onToggle: (text: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? keywords : keywords.slice(0, 12)
  const hasMore = keywords.length > 12

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Tag className="w-3 h-3 text-muted-foreground" />
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Saved Keywords</label>
        {activeKeywords.length > 0 && (
          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">{activeKeywords.length} active</span>
        )}
        <a href="/keywords" className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">manage</a>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(kw => (
          <button key={kw.id} type="button" onClick={() => onToggle(kw.text)}
            className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
              activeKeywords.includes(kw.text)
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-amber-500/20'
            )}>
            {kw.text}
          </button>
        ))}
        {hasMore && (
          <button type="button" onClick={() => setExpanded(v => !v)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
            {expanded ? '− show less' : `+ ${keywords.length - 12} more`}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── ProspectCard ─────────────────────────────────────────────────────────────

function ProspectCard({ prospect, index, alreadySaved, onSave }: {
  prospect: Prospect; index?: number; alreadySaved?: boolean; onSave: (p: Prospect, index?: number) => Promise<void>
}) {
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(alreadySaved ?? false)
  const [expanded, setExpanded] = useState(false)

  // Sync if parent marks it saved after dedup
  useEffect(() => { if (alreadySaved) setSaved(true) }, [alreadySaved])

  const handle = async () => {
    if (saved) return; setSaving(true)
    await onSave(prospect, index); setSaved(true); setSaving(false)
  }

  return (
    <div className={cn('bg-card border border-border rounded-lg overflow-hidden transition-all', saved && 'border-green-500/30 bg-green-500/5')}>
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{prospect.name}</span>
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', PRIORITY_BADGE[prospect.priority] ?? 'badge-c')}>
              {PRIORITY_LABELS[prospect.priority as keyof typeof PRIORITY_LABELS] ?? prospect.priority}
            </span>
            <span className={cn('text-[10px] font-medium', CONFIDENCE_COLOR[prospect.confidence])}>{prospect.confidence} conf.</span>
            {prospect.ecosystem && (
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', ecosystemBadgeClass(prospect.ecosystem))}>
                {prospect.ecosystem}
              </span>
            )}
            {saved && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
                In CRM
              </span>
            )}
          </div>
          {(prospect.role || prospect.company) && (
            <p className="text-xs text-muted-foreground truncate">{[prospect.role, prospect.company].filter(Boolean).join(' · ')}</p>
          )}
          {prospect.email ? (
            <div className="flex items-center gap-1.5 mt-1">
              <Mail className="w-3 h-3 text-green-400 shrink-0" />
              <span className="text-xs text-green-400 font-medium break-all">{prospect.email}</span>
              {prospect.emailSource && <span className="text-[10px] text-muted-foreground">({prospect.emailSource})</span>}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <MailSearch className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              <span className="text-[11px] text-muted-foreground/50">No public email found</span>
            </div>
          )}
        </div>
        <button onClick={handle} disabled={saving || saved}
          className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium shrink-0 transition-colors',
            saved
              ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
          )}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <CheckCircle className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
          <span>{saved ? 'Saved' : 'Add'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
        {prospect.cryptoNiche && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium">{prospect.cryptoNiche}</span>
        )}
        {prospect.twitterUrl && (
          <a href={prospect.twitterUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20">
            𝕏 <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
        {prospect.linkedinUrl && (
          <a href={prospect.linkedinUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20">
            in <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
        {prospect.farcasterUrl && (
          <a href={prospect.farcasterUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20">
            ⌀ <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
        {prospect.companyWebsite && (
          <a href={prospect.companyWebsite} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground hover:text-foreground">
            <Globe className="w-2.5 h-2.5" /> site <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
        <button onClick={() => setExpanded(v => !v)} className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground">
          {expanded ? <><ChevronUp className="w-3 h-3" /> less</> : <><ChevronDown className="w-3 h-3" /> more</>}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {prospect.beliefSignal && <p className="text-xs text-muted-foreground italic">"{prospect.beliefSignal}"</p>}
          <p className="text-[11px] text-muted-foreground">{prospect.priorityReason}</p>
          {prospect.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {prospect.tags.map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">{t}</span>
              ))}
            </div>
          )}
          {prospect.notes && <p className="text-[11px] text-muted-foreground">{prospect.notes}</p>}
          {prospect.confidenceReason && (
            <p className={cn('text-[11px]', CONFIDENCE_COLOR[prospect.confidence])}>
              {prospect.confidence} confidence — {prospect.confidenceReason}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── AddWithEmailButton ───────────────────────────────────────────────────────

interface AddWithEmailResult { added: number; duplicates: number }

function AddWithEmailButton({ prospects, savedIndexes, onComplete }: {
  prospects:    Prospect[]
  savedIndexes: Set<number>
  onComplete:   (newIndexes: Set<number>, result: AddWithEmailResult) => void
}) {
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<AddWithEmailResult | null>(null)

  const withEmail      = prospects.filter(p => p.email)
  const unsavedEmails  = withEmail.filter((p, _) => !savedIndexes.has(prospects.indexOf(p)))
  const allEmailsSaved = withEmail.length > 0 && unsavedEmails.length === 0

  const handle = async () => {
    if (!unsavedEmails.length || loading) return
    setLoading(true); setResult(null)

    let added = 0, duplicates = 0
    const newIndexes = new Set(savedIndexes)

    for (let i = 0; i < prospects.length; i++) {
      const p = prospects[i]
      if (!p.email) continue
      if (savedIndexes.has(i)) { duplicates++; continue }
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prospectToLead(p)),
      })
      if (res.status === 201) { added++; newIndexes.add(i) }
      else if (res.status === 409) { duplicates++; newIndexes.add(i) }
    }

    const stats: AddWithEmailResult = { added, duplicates }
    setResult(stats); onComplete(newIndexes, stats); setLoading(false)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={handle} disabled={loading || withEmail.length === 0 || allEmailsSaved}
        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
          allEmailsSaved
            ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
            : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
        )}>
        {loading
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
          : allEmailsSaved
          ? <><CheckCircle className="w-3.5 h-3.5" /> All emails saved</>
          : <><MailPlus className="w-3.5 h-3.5" /> Add {unsavedEmails.length} with Email</>}
      </button>
      {result && !loading && (
        <span className="text-[11px] text-muted-foreground">
          {result.added > 0 && <span className="text-green-400 font-medium">{result.added} added</span>}
          {result.added > 0 && result.duplicates > 0 && <span> · </span>}
          {result.duplicates > 0 && <span>{result.duplicates} already in CRM</span>}
        </span>
      )}
    </div>
  )
}

// ─── ProspectResultsBlock ─────────────────────────────────────────────────────

function ProspectResultsBlock({
  prospects, savedIndexes, savingAll, saveAllResult,
  onSaveAll, onExportCSV, onSaveOne, onResearch, researchLabel, onSavedIndexesChange,
}: {
  prospects:    Prospect[]
  savedIndexes: Set<number>
  savingAll:    boolean
  saveAllResult: { created: number; skipped: number } | null
  onSaveAll:    () => void
  onExportCSV:  () => void
  onSaveOne:    (p: Prospect, i?: number) => Promise<void>
  onResearch?:  () => void
  researchLabel?: string
  onSavedIndexesChange: (indexes: Set<number>) => void
}) {
  const withEmail     = prospects.filter(p => p.email).length
  const withoutEmail  = prospects.length - withEmail
  const alreadyInCRM  = savedIndexes.size
  const newProspects  = prospects.length - alreadyInCRM

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">
            {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} found
          </p>
          <div className="flex items-center gap-2 text-[11px] flex-wrap">
            <span className="flex items-center gap-1 text-green-400 font-medium">
              <Mail className="w-3 h-3" /> {withEmail} with email
            </span>
            {withoutEmail > 0 && <span className="text-muted-foreground">· {withoutEmail} without</span>}
            {alreadyInCRM > 0 && (
              <span className="text-muted-foreground">
                · <span className="text-amber-400">{alreadyInCRM} already in CRM</span>
              </span>
            )}
            {newProspects > 0 && alreadyInCRM > 0 && (
              <span className="text-muted-foreground">· {newProspects} new</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-md text-xs font-medium hover:bg-secondary/80">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={onSaveAll} disabled={savingAll || savedIndexes.size === prospects.length}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
            {savingAll
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              : savedIndexes.size === prospects.length
              ? <><CheckCircle className="w-3.5 h-3.5" /> All Saved</>
              : <><SaveAll className="w-3.5 h-3.5" /> Save All {prospects.length - savedIndexes.size}</>}
          </button>
          {onResearch && (
            <button onClick={onResearch} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-3 h-3" /> {researchLabel ?? 'Search again'}
            </button>
          )}
        </div>
      </div>

      {/* Add with email button */}
      <AddWithEmailButton
        prospects={prospects}
        savedIndexes={savedIndexes}
        onComplete={(newIndexes, _) => onSavedIndexesChange(newIndexes)}
      />

      {saveAllResult && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span className="text-green-400 font-medium">{saveAllResult.created} saved to CRM</span>
          {saveAllResult.skipped > 0 && <span className="text-muted-foreground">· {saveAllResult.skipped} skipped (already in CRM)</span>}
        </div>
      )}

      {prospects.map((p, i) => (
        <ProspectCard
          key={`${p.name}-${i}`}
          prospect={p}
          index={i}
          alreadySaved={savedIndexes.has(i)}
          onSave={onSaveOne}
        />
      ))}
    </div>
  )
}

// ─── ScrapeProgressBar ────────────────────────────────────────────────────────

function ScrapeProgressBar({ username, progress }: { username: string; progress: ScrapeProgress }) {
  const pct = progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0

  const stages    = ['Fetching', 'Filtering', 'Scanning', 'Analysing']
  const stageKeys = ['Fetch', 'Filter', 'Scan', 'Analys']
  const activeStage = stageKeys.findIndex(k =>
    progress.stage.toLowerCase().startsWith(k.toLowerCase())
  )

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 shrink-0">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-secondary" />
            <circle
              cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeDasharray={`${2 * Math.PI * 13}`}
              strokeDashoffset={`${2 * Math.PI * 13 * (1 - pct / 100)}`}
              strokeLinecap="round"
              className="text-sky-400 transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-sky-400">{pct}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">Scraping @{username}</p>
          <p className="text-xs text-muted-foreground truncate">{progress.label}</p>
        </div>
      </div>

      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-1">
        {[
          { label: 'Fetch',   icon: '📥' },
          { label: 'Filter',  icon: '🔍' },
          { label: 'Scan',    icon: '✉️' },
          { label: 'Analyse', icon: '🤖' },
        ].map((s, i) => {
          const done   = i < activeStage
          const active = i === activeStage
          return (
            <div key={s.label} className={cn(
              'flex flex-col items-center gap-1 py-2 px-1 rounded-md text-center transition-colors',
              done   ? 'bg-sky-500/10 border border-sky-500/20' :
              active ? 'bg-sky-500/5  border border-sky-500/10' :
                       'bg-secondary/50 border border-transparent',
            )}>
              <span className="text-sm">{s.icon}</span>
              <span className={cn('text-[10px] font-medium', done || active ? 'text-sky-400' : 'text-muted-foreground/50')}>
                {done ? '✓' : s.label}
              </span>
            </div>
          )
        })}
      </div>

      {progress.detail && (
        <p className="text-[11px] text-muted-foreground text-center">{progress.detail}</p>
      )}
    </div>
  )
}

// ─── AddManualModal ───────────────────────────────────────────────────────────

function AddManualModal({ form, saving, done, onChange, onSave, onClose }: {
  form:     { name: string; email: string; ecosystem: string; twitterUrl: string; notes: string }
  saving:   boolean
  done:     boolean
  onChange: (field: string, value: string) => void
  onSave:   () => void
  onClose:  () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Add Profile Manually</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {[
            { field: 'name',       label: 'Name *',             type: 'text',  placeholder: 'e.g. John Smith' },
            { field: 'email',      label: 'Email *',            type: 'email', placeholder: 'e.g. john@gmail.com' },
            { field: 'ecosystem',  label: 'Ecosystem / Ticker', type: 'text',  placeholder: 'e.g. Solana, $PEPE' },
            { field: 'twitterUrl', label: 'Twitter / X URL',    type: 'text',  placeholder: 'e.g. https://twitter.com/username' },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field} className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
              <input
                type={type} value={(form as any)[field]} onChange={e => onChange(field, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
            <textarea
              value={form.notes} onChange={e => onChange('notes', e.target.value)}
              placeholder="Any context about this person…" rows={2}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button
            onClick={onSave} disabled={saving || !form.name.trim() || !form.email.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              : done ? <><CheckCircle className="w-3.5 h-3.5" /> Saved!</>
              : <><UserPlus className="w-3.5 h-3.5" /> Save to CRM</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ResearchPanel() {
  const router = useRouter()
  const [tab, setTab] = useState<'discover' | 'lookup'>('discover')

  // Manual add
  const [showManual,   setShowManual]   = useState(false)
  const [manualSaving, setManualSaving] = useState(false)
  const [manualDone,   setManualDone]   = useState(false)
  const [manualForm,   setManualForm]   = useState({ name: '', email: '', ecosystem: '', twitterUrl: '', notes: '' })

  // Discover
  const [criteria,      setCriteria]      = useState<DiscoveryCriteria>({ niches: [], roles: [], ecosystems: [], platforms: [], beliefSignal: '' })
  const [prospects,     setProspects]     = useState<Prospect[]>([])
  const [discovering,   setDiscovering]   = useState(false)
  const [discoverError, setDiscoverError] = useState('')
  const [savedIndexes,  setSavedIndexes]  = useState<Set<number>>(new Set())
  const [savingAll,     setSavingAll]     = useState(false)
  const [saveAllResult, setSaveAllResult] = useState<{ created: number; skipped: number } | null>(null)

  // Keywords
  const [savedKeywords,   setSavedKeywords]   = useState<SavedKeyword[]>([])
  const [activeKeywords,  setActiveKeywords]  = useState<string[]>([])
  const [keywordsLoading, setKeywordsLoading] = useState(false)

  // Lookup
  const [lookupQuery,  setLookupQuery]  = useState('')
  const [lookupResult, setLookupResult] = useState<Prospect | null>(null)
  const [looking,      setLooking]      = useState(false)
  const [lookupError,  setLookupError]  = useState('')

  // Follower scraper
  const [followerUsername,    setFollowerUsername]    = useState('')
  const [followerEcosystem,   setFollowerEcosystem]   = useState('Solana')
  const [followerMaxCount,    setFollowerMaxCount]    = useState<number>(FALLBACK_SCAN_OPTIONS[1])
  const [followerCount,       setFollowerCount]       = useState<number | null>(null)
  const [followerCountStatus, setFollowerCountStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [followerProspects,   setFollowerProspects]   = useState<Prospect[]>([])
  const [followerScraping,    setFollowerScraping]    = useState(false)
  const [followerError,       setFollowerError]       = useState('')
  const [followerSavedIdx,    setFollowerSavedIdx]    = useState<Set<number>>(new Set())
  const [followerSavingAll,   setFollowerSavingAll]   = useState(false)
  const [followerSaveResult,  setFollowerSaveResult]  = useState<{ created: number; skipped: number } | null>(null)
  const [followerMeta,        setFollowerMeta]        = useState<any>(null)
  // Cursor returned by the last scrape — passed as startCursor on "Scrape next page"
  const [followerNextCursor,  setFollowerNextCursor]  = useState<string | null>(null)
  const [scrapeProgress,      setScrapeProgress]      = useState<ScrapeProgress>({
    stage: '', detail: '', current: 0, total: 0, label: '',
  })

  // Load keywords
  useEffect(() => {
    const load = async () => {
      setKeywordsLoading(true)
      try {
        const res  = await fetch('/api/keywords?enabled=true')
        const data = await res.json()
        setSavedKeywords(Array.isArray(data) ? data : data.keywords ?? [])
      } catch {} finally { setKeywordsLoading(false) }
    }
    load()
  }, [])

  // Debounced follower count fetch
  useEffect(() => {
    const clean = followerUsername.replace('@', '').trim()
    if (!clean) {
      setFollowerCount(null)
      setFollowerCountStatus('idle')
      return
    }
    setFollowerCountStatus('loading')
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/scrape/followers/count?username=${encodeURIComponent(clean)}`)
        const data = await res.json()
        if (res.ok && typeof data.followersCount === 'number') {
          setFollowerCount(data.followersCount)
          setFollowerCountStatus('ok')
          // Clamp selection to available options
          const opts = getScanOptions(data.followersCount)
          if (!opts.includes(followerMaxCount)) {
            const best = opts.filter(o => o <= followerMaxCount).pop() ?? opts[opts.length - 1]
            setFollowerMaxCount(best)
          }
        } else {
          setFollowerCount(null)
          setFollowerCountStatus('error')
        }
      } catch {
        setFollowerCount(null)
        setFollowerCountStatus('error')
      }
    }, 600)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followerUsername])

  // Derived scan options
  const scanOptions =
    followerCountStatus === 'ok' && followerCount !== null
      ? getScanOptions(followerCount)
      : [...FALLBACK_SCAN_OPTIONS]

  const toggleKeyword = (text: string) => {
    setActiveKeywords(prev => {
      const isActive = prev.includes(text)
      const next     = isActive ? prev.filter(k => k !== text) : [...prev, text]
      setCriteria(c => {
        const savedTexts = new Set(savedKeywords.map(kw => kw.text))
        const freeform   = c.beliefSignal.split(',').map(s => s.trim()).filter(s => s && !savedTexts.has(s))
        return { ...c, beliefSignal: [...freeform, ...next].join(', ') }
      })
      return next
    })
  }

  const toggle = (key: keyof Omit<DiscoveryCriteria, 'beliefSignal'>) => (value: string) =>
    setCriteria(prev => {
      const arr = prev[key] as string[]
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })

  const hasAnyCriteria =
    criteria.niches.length > 0 || criteria.roles.length > 0 ||
    criteria.ecosystems.length > 0 || criteria.platforms.length > 0 ||
    criteria.beliefSignal.trim() !== ''

  const exportCSV = (list: Prospect[], filename: string) => {
    const headers = ['name','role','company','companyWebsite','linkedinUrl','twitterUrl','farcasterUrl','redditUrl','quoraUrl','truthSocialUrl','email','emailSource','cryptoNiche','ecosystem','beliefSignal','activityLevel','tags','priority','priorityReason','sourceFound','confidence']
    const escape  = (v: any) => { if (v == null) return ''; const s = Array.isArray(v) ? v.join('; ') : String(v); return `"${s.replace(/"/g, '""')}"` }
    const rows    = [headers.join(','), ...list.map(p => headers.map(h => escape((p as any)[h])).join(','))]
    const blob    = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Discover ───────────────────────────────────────────────────────────────

  const handleDiscover = async () => {
    if (!hasAnyCriteria) return
    setDiscovering(true); setDiscoverError(''); setProspects([])
    setSavedIndexes(new Set()); setSaveAllResult(null)
    try {
      const res  = await fetch('/api/scrape', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ mode: 'discover', criteria }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setDiscoverError(data.error ?? 'Search failed'); return }
      const results = data.results ?? []
      const dupes   = await checkDuplicates(results)
      setProspects(results)
      setSavedIndexes(dupes)
    } catch { setDiscoverError('Network error') }
    finally   { setDiscovering(false) }
  }

  const handleSaveAll = async () => {
    if (!prospects.length) return
    setSavingAll(true); setSaveAllResult(null)
    let created = 0, skipped = 0
    const newSaved = new Set(savedIndexes)
    for (let i = 0; i < prospects.length; i++) {
      if (savedIndexes.has(i)) { skipped++; continue }
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospectToLead(prospects[i])),
      })
      if (res.status === 201) { created++; newSaved.add(i) } else skipped++
    }
    setSavedIndexes(newSaved); setSaveAllResult({ created, skipped }); setSavingAll(false)
  }

  const saveAsLead = async (p: Prospect, index?: number) => {
    const res = await fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prospectToLead(p)),
    })
    if (res.ok) {
      const lead = await res.json()
      if (tab === 'lookup') { setTimeout(() => router.push(`/leads/${lead.id}`), 800) }
      else if (index !== undefined) setSavedIndexes(prev => new Set([...prev, index]))
    }
  }

  // ── Lookup ─────────────────────────────────────────────────────────────────

  const handleLookup = async () => {
    if (!lookupQuery.trim()) return
    setLooking(true); setLookupError(''); setLookupResult(null)
    try {
      const res  = await fetch('/api/scrape', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'lookup', query: lookupQuery }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setLookupError(data.error ?? 'Lookup failed'); return }
      setLookupResult(data.result)
    } catch { setLookupError('Network error') }
    finally   { setLooking(false) }
  }

  // ── Follower scrape — SSE ──────────────────────────────────────────────────
  // startCursor=null → fresh scrape from page 1
  // startCursor=<cursor> → continue from where last scrape left off

  const handleFollowerScrape = async (startCursor: string | null = null) => {
    if (!followerUsername.trim()) return
    const isContinuation = startCursor !== null

    setFollowerScraping(true); setFollowerError('')
    // On fresh scrape clear everything; on continuation keep existing results visible until done
    if (!isContinuation) {
      setFollowerProspects([])
      setFollowerSavedIdx(new Set())
      setFollowerSaveResult(null)
      setFollowerMeta(null)
      setFollowerNextCursor(null)
    }
    setScrapeProgress({ stage: 'Starting…', detail: '', current: 0, total: 0, label: 'Connecting…' })

    try {
      const res = await fetch('/api/scrape/followers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          username:     followerUsername.replace('@', '').trim(),
          ecosystem:    followerEcosystem,
          maxFollowers: followerMaxCount,
          startCursor,
        }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        setFollowerError(data.error ?? 'Scrape failed')
        setFollowerScraping(false)
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      let   currentStage = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer      = lines.pop() ?? ''

        for (const line of lines) {
          const dataLine = line.trim()
          if (!dataLine.startsWith('data: ')) continue
          try {
            const event = JSON.parse(dataLine.slice(6))

            if (event.type === 'stage') {
              currentStage = event.stage
              setScrapeProgress(p => ({ ...p, stage: event.stage, detail: event.detail ?? '' }))
            } else if (event.type === 'progress') {
              setScrapeProgress({
                stage:   currentStage,
                detail:  '',
                current: event.current,
                total:   event.total,
                label:   event.label,
              })
            } else if (event.type === 'done') {
              const newResults = event.results ?? []
              const newDupes   = await checkDuplicates(newResults)

              if (isContinuation) {
                // Append and offset the dupe indexes by the size of the existing list
                setFollowerProspects(prev => {
                  const offset     = prev.length
                  const offsetDupes = new Set([...newDupes].map(i => i + offset))
                  setFollowerSavedIdx(existing => new Set([...existing, ...offsetDupes]))
                  return [...prev, ...newResults]
                })
              } else {
                setFollowerProspects(newResults)
                setFollowerSavedIdx(newDupes)
              }

              setFollowerNextCursor(event.meta?.nextCursor ?? null)
              setFollowerMeta(event.meta ?? null)
              setFollowerScraping(false)
            } else if (event.type === 'error') {
              setFollowerError(event.message)
              setFollowerScraping(false)
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setFollowerError(e.message ?? 'Network error')
      setFollowerScraping(false)
    }
  }

  const handleFollowerSaveAll = async () => {
    if (!followerProspects.length) return
    setFollowerSavingAll(true); setFollowerSaveResult(null)
    let created = 0, skipped = 0
    const newSaved = new Set(followerSavedIdx)
    for (let i = 0; i < followerProspects.length; i++) {
      if (followerSavedIdx.has(i)) { skipped++; continue }
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospectToLead(followerProspects[i])),
      })
      if (res.status === 201) { created++; newSaved.add(i) } else skipped++
    }
    setFollowerSavedIdx(newSaved); setFollowerSaveResult({ created, skipped }); setFollowerSavingAll(false)
  }

  const saveFollowerLead = async (p: Prospect, index?: number) => {
    const res = await fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prospectToLead(p)),
    })
    if (res.ok && index !== undefined) setFollowerSavedIdx(prev => new Set([...prev, index]))
  }

  const clearAll = () => {
    setCriteria({ niches: [], roles: [], ecosystems: [], platforms: [], beliefSignal: '' })
    setActiveKeywords([])
  }

  const handleManualSave = async () => {
    if (!manualForm.name.trim() || !manualForm.email.trim()) return
    setManualSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: manualForm.name.trim(), email: manualForm.email.trim(),
          ecosystem: manualForm.ecosystem.trim(), twitterUrl: manualForm.twitterUrl.trim(),
          notes: manualForm.notes.trim(), role: '', company: '',
          activityLevel: 'UNKNOWN', tags: [], priority: 'B', status: 'NEW',
          sourceFound: 'MANUAL', emailVerified: false, emailType: 'UNKNOWN',
        }),
      })
      if (res.ok) {
        setManualDone(true)
        setTimeout(() => {
          setShowManual(false); setManualDone(false)
          setManualForm({ name: '', email: '', ecosystem: '', twitterUrl: '', notes: '' })
        }, 1200)
      }
    } finally { setManualSaving(false) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-3xl">

      {showManual && (
        <AddManualModal
          form={manualForm} saving={manualSaving} done={manualDone}
          onChange={(field, value) => setManualForm(prev => ({ ...prev, [field]: value }))}
          onSave={handleManualSave}
          onClose={() => { setShowManual(false); setManualForm({ name: '', email: '', ecosystem: '', twitterUrl: '', notes: '' }) }}
        />
      )}

      {/* Tabs + manual add */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-secondary/50 border border-border rounded-lg p-1">
          {([
            { id: 'discover', label: 'Discover Prospects',  icon: Search },
            { id: 'lookup',   label: 'Look Up / Followers', icon: User   },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                tab === id ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
              )}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowManual(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-md text-xs font-medium hover:bg-secondary/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Manually
        </button>
      </div>

      {/* ── DISCOVER TAB ── */}
      {tab === 'discover' && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Describe the type of person you want to find</p>
              </div>
              {hasAnyCriteria && <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground">Clear all</button>}
            </div>

            <MultiSelectPills label="Niche — select one or more"             options={NICHES}    selected={criteria.niches}    onToggle={toggle('niches')}    />
            <MultiSelectPills label="Role — select one or more"              options={ROLES}     selected={criteria.roles}     onToggle={toggle('roles')}     />
            <EcosystemInput   label="Ecosystem — select or type any"         selected={criteria.ecosystems} onToggle={toggle('ecosystems')} mode="multi" />
            <MultiSelectPills label="Find on — select one or more platforms" options={PLATFORMS} selected={criteria.platforms} onToggle={toggle('platforms')} />

            {keywordsLoading && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading saved keywords…
              </div>
            )}
            {!keywordsLoading && savedKeywords.length > 0 && (
              <SavedKeywordPills keywords={savedKeywords} activeKeywords={activeKeywords} onToggle={toggleKeyword} />
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Belief / Signal Keyword <span className="normal-case font-normal">(optional)</span>
              </label>
              <input type="text" value={criteria.beliefSignal}
                onChange={e => setCriteria(prev => ({ ...prev, beliefSignal: e.target.value }))}
                placeholder="e.g. financial sovereignty, building on-chain, DeFi summer…"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              {activeKeywords.length > 0 && (
                <p className="text-[10px] text-amber-400/70">{activeKeywords.length} saved keyword{activeKeywords.length !== 1 ? 's' : ''} active</p>
              )}
            </div>

            <button onClick={handleDiscover} disabled={discovering || !hasAnyCriteria}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 w-full sm:w-auto justify-center">
              {discovering ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching the web…</> : <><Search className="w-4 h-4" /> Find Prospects</>}
            </button>
          </div>

          {discoverError && (
            <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">{discoverError}</p>
            </div>
          )}

          {discovering && (
            <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium">Searching across the web…</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scanning {criteria.platforms.length > 0 ? criteria.platforms.join(', ') : 'X, Reddit, forums, and more'}
                </p>
              </div>
            </div>
          )}

          {prospects.length > 0 && !discovering && (
            <ProspectResultsBlock
              prospects={prospects} savedIndexes={savedIndexes}
              savingAll={savingAll} saveAllResult={saveAllResult}
              onSaveAll={handleSaveAll}
              onExportCSV={() => exportCSV(prospects, `prospects-${new Date().toISOString().slice(0,10)}.csv`)}
              onSaveOne={saveAsLead} onResearch={handleDiscover} researchLabel="Search again"
              onSavedIndexesChange={setSavedIndexes}
            />
          )}
        </div>
      )}

      {/* ── LOOKUP + FOLLOWERS TAB ── */}
      {tab === 'lookup' && (
        <div className="space-y-6">

          {/* Look Up */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Look Up a Person</h3>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Enter a name, LinkedIn URL, X handle, or any identifier</p>
              <div className="flex gap-2">
                <input type="text" value={lookupQuery} onChange={e => setLookupQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLookup()}
                  placeholder="e.g. Stani Kulechov, https://x.com/hasufl…"
                  className="flex-1 min-w-0 bg-secondary border border-border rounded-md px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={looking} />
                <button onClick={handleLookup} disabled={looking || !lookupQuery.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shrink-0">
                  {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span className="hidden sm:inline">{looking ? 'Searching…' : 'Look Up'}</span>
                </button>
              </div>
            </div>
            {lookupError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-400">{lookupError}</p>
              </div>
            )}
            {looking && (
              <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm font-medium">Researching…</p>
              </div>
            )}
            {lookupResult && !looking && <ProspectCard prospect={lookupResult} onSave={saveAsLead} />}
          </div>

          <div className="border-t border-border" />

          {/* Scrape Followers */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Scrape Twitter Followers</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-medium">X / Twitter</span>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Enter a Twitter account — we'll paginate through their followers, scan bios and tweets for emails, and surface qualified prospects.
              </p>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Twitter Username</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">@</span>
                  <input type="text" value={followerUsername}
                    onChange={e => setFollowerUsername(e.target.value.replace('@', ''))}
                    onKeyDown={e => e.key === 'Enter' && handleFollowerScrape()}
                    placeholder="solana_foundation"
                    className="flex-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    disabled={followerScraping} />
                  {followerCountStatus === 'loading' && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                      <Loader2 className="w-3 h-3 animate-spin" /> checking…
                    </span>
                  )}
                  {followerCountStatus === 'ok' && followerCount !== null && (
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {followerCount.toLocaleString()} followers
                    </span>
                  )}
                  {followerCountStatus === 'error' && (
                    <span className="text-[11px] text-red-400/70 shrink-0">couldn't fetch count</span>
                  )}
                </div>

                {ECOSYSTEM_ACCOUNTS[followerEcosystem] && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground shrink-0">Suggestions:</span>
                    {ECOSYSTEM_ACCOUNTS[followerEcosystem].map(acc => (
                      <button key={acc} type="button" onClick={() => setFollowerUsername(acc)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                        @{acc}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ecosystem */}
              <EcosystemInput
                label="Ecosystem tag for results"
                selected={[]} onToggle={() => {}}
                singleValue={followerEcosystem}
                onSingleChange={v => setFollowerEcosystem(v || 'Crypto')}
                mode="single"
              />

              {/* Max followers */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Max Followers to Scan
                  {followerCountStatus === 'error' && (
                    <span className="ml-1 normal-case font-normal text-muted-foreground/60">(using defaults — count unavailable)</span>
                  )}
                </label>
                <select
                  value={followerMaxCount}
                  onChange={e => setFollowerMaxCount(Number(e.target.value))}
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {scanOptions.map(n => (
                    <option key={n} value={n}>{formatScanOption(n)}</option>
                  ))}
                </select>
              </div>

              <button onClick={() => handleFollowerScrape()} disabled={followerScraping || !followerUsername.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-md text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 w-full sm:w-auto justify-center">
                {followerScraping
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Scraping…</>
                  : <><Users className="w-4 h-4" /> Scrape @{followerUsername || 'username'} Followers</>}
              </button>

              <p className="text-[10px] text-muted-foreground">
                Cost: ~$0.018 per 100 followers scanned (twitterapi.io) + Claude analysis.
              </p>
            </div>

            {followerError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-400">{followerError}</p>
              </div>
            )}

            {followerScraping && (
              <ScrapeProgressBar username={followerUsername} progress={scrapeProgress} />
            )}

            {followerMeta && !followerScraping && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground bg-secondary/50 border border-border rounded-lg px-4 py-3">
                  <span>📥 <strong className="text-foreground">{followerMeta.followersScraped}</strong> scraped</span>
                  <span>🔍 <strong className="text-foreground">{followerMeta.candidatesFound}</strong> candidates</span>
                  <span>✉️ <strong className="text-green-400">{followerMeta.withEmail}</strong> with email</span>
                  <span>✅ <strong className="text-foreground">{followerMeta.finalProspects}</strong> qualified</span>
                  {followerMeta.isContinuation && (
                    <span className="text-sky-400">· continued from previous page</span>
                  )}
                </div>
                {followerNextCursor && (
                  <button
                    onClick={() => handleFollowerScrape(followerNextCursor)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-md text-xs font-medium hover:bg-sky-500/20 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Scrape next {followerMaxCount.toLocaleString()} followers (page 2+)
                  </button>
                )}
              </div>
            )}

            {followerProspects.length > 0 && !followerScraping && (
              <ProspectResultsBlock
                prospects={followerProspects} savedIndexes={followerSavedIdx}
                savingAll={followerSavingAll} saveAllResult={followerSaveResult}
                onSaveAll={handleFollowerSaveAll}
                onExportCSV={() => exportCSV(followerProspects, `followers-${followerUsername}-${new Date().toISOString().slice(0,10)}.csv`)}
                onSaveOne={saveFollowerLead} onResearch={() => handleFollowerScrape(null)} researchLabel="Fresh scrape"
                onSavedIndexesChange={setFollowerSavedIdx}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}