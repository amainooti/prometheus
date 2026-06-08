'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Loader2, UserPlus, CheckCircle, AlertTriangle,
  Mail, ExternalLink, RefreshCw, Zap, User, Globe,
  ChevronDown, ChevronUp, MailSearch, Download, SaveAll, Tag, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITY_LABELS } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prospect {
  name:             string
  role:             string | null
  company:          string | null
  companyWebsite:   string | null
  linkedinUrl:      string | null
  twitterUrl:       string | null
  farcasterUrl:     string | null
  redditUrl:        string | null
  quoraUrl:         string | null
  truthSocialUrl:   string | null
  email:            string | null
  emailSource:      string | null
  cryptoNiche:      string | null
  ecosystem:        string | null
  beliefSignal:     string | null
  activityLevel:    string
  tags:             string[]
  priority:         string
  priorityReason:   string
  sourceFound:      string | null
  confidence:       'HIGH' | 'MEDIUM' | 'LOW'
  notes?:           string | null
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

const NICHES           = ['DeFi', 'Bitcoin', 'RWA', 'DePIN', 'NFT', 'DAO', 'GameFi', 'SocialFi', 'AI x Crypto', 'Stablecoins', 'Payments', 'ZK / Privacy', 'Modular Blockchain']
const ROLES            = ['Founder', 'Co-Founder', 'Investor', 'Angel Investor', 'Builder / Developer', 'Educator / Content Creator', 'Analyst / Researcher', 'Community Lead', 'DAO Contributor']
const PRESET_ECOSYSTEMS = ['Ethereum', 'Solana', 'Bitcoin', 'Base', 'Arbitrum', 'Optimism', 'Cosmos', 'Sui', 'Aptos', 'Polygon', 'Avalanche', 'TON']
const PLATFORMS        = ['X / Twitter', 'LinkedIn', 'Farcaster', 'Substack', 'GitHub', 'Mirror', 'Podcast', 'Reddit', 'Quora', 'Truth Social']

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
// Preset pills + free-text for any custom ecosystem (memes, new chains, etc.)
// mode='multi'  → used in Discover (multiple ecosystems)
// mode='single' → used in Follower scraper (one ecosystem tag)

function EcosystemInput({ label, selected, onToggle, singleValue, onSingleChange, mode = 'multi' }: {
  label:          string
  selected:       string[]
  onToggle:       (v: string) => void
  singleValue?:   string
  onSingleChange?: (v: string) => void
  mode?:          'multi' | 'single'
}) {
  const [draft, setDraft] = useState('')

  const commit = (val: string) => {
    const trimmed = val.trim()
    if (!trimmed) return
    if (mode === 'multi') onToggle(trimmed)
    else onSingleChange?.(trimmed)
    setDraft('')
  }

  // Custom ecosystems = anything selected that isn't in the preset list
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

      {/* Preset pills */}
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

        {/* Custom ecosystem tags — shown as amber removable pills */}
        {customSelected.map(eco => (
          <button key={eco} type="button"
            onClick={() => mode === 'multi' ? onToggle(eco) : onSingleChange?.('')}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20 transition-colors">
            {eco} ×
          </button>
        ))}
      </div>

      {/* Free-text input for custom ecosystems */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(draft) } }}
          placeholder="Ecosystem name or ticker — e.g. $WLFI, $PEPE, $BRETT, worldlibertyfi, HypeEVM…"
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

  const handle = async () => {
    if (saved) return
    setSaving(true)
    await onSave(prospect, index)
    setSaved(true)
    setSaving(false)
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
            saved ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
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

// ─── ProspectResultsBlock ─────────────────────────────────────────────────────

function ProspectResultsBlock({ prospects, savedIndexes, savingAll, saveAllResult, onSaveAll, onExportCSV, onSaveOne, onResearch, researchLabel }: {
  prospects:     Prospect[]
  savedIndexes:  Set<number>
  savingAll:     boolean
  saveAllResult: { created: number; skipped: number } | null
  onSaveAll:     () => void
  onExportCSV:   () => void
  onSaveOne:     (p: Prospect, i?: number) => Promise<void>
  onResearch?:   () => void
  researchLabel?: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-semibold">
          {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} found
          {savedIndexes.size > 0 && <span className="text-xs text-muted-foreground ml-2">· {savedIndexes.size} saved</span>}
        </p>
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
              : <><SaveAll className="w-3.5 h-3.5" /> Save All {prospects.length - savedIndexes.size} to CRM</>}
          </button>
          {onResearch && (
            <button onClick={onResearch} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-3 h-3" /> {researchLabel ?? 'Search again'}
            </button>
          )}
        </div>
      </div>

      {saveAllResult && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span className="text-green-400 font-medium">{saveAllResult.created} saved to CRM</span>
          {saveAllResult.skipped > 0 && <span className="text-muted-foreground">· {saveAllResult.skipped} skipped</span>}
        </div>
      )}

      {prospects.map((p, i) => (
        <ProspectCard key={`${p.name}-${i}`} prospect={p} index={i} alreadySaved={savedIndexes.has(i)} onSave={onSaveOne} />
      ))}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ResearchPanel() {
  const router = useRouter()
  const [tab, setTab] = useState<'discover' | 'lookup'>('discover')

  // Discover state
  const [criteria, setCriteria] = useState<DiscoveryCriteria>({ niches: [], roles: [], ecosystems: [], platforms: [], beliefSignal: '' })
  const [prospects,     setProspects]     = useState<Prospect[]>([])
  const [discovering,   setDiscovering]   = useState(false)
  const [discoverError, setDiscoverError] = useState('')
  const [savedIndexes,  setSavedIndexes]  = useState<Set<number>>(new Set())
  const [savingAll,     setSavingAll]     = useState(false)
  const [saveAllResult, setSaveAllResult] = useState<{ created: number; skipped: number } | null>(null)

  // Saved keywords state
  const [savedKeywords,   setSavedKeywords]   = useState<SavedKeyword[]>([])
  const [activeKeywords,  setActiveKeywords]  = useState<string[]>([])
  const [keywordsLoading, setKeywordsLoading] = useState(false)

  // Lookup state
  const [lookupQuery,  setLookupQuery]  = useState('')
  const [lookupResult, setLookupResult] = useState<Prospect | null>(null)
  const [looking,      setLooking]      = useState(false)
  const [lookupError,  setLookupError]  = useState('')
  const [lookupSaved,  setLookupSaved]  = useState(false)

  // Follower scraper state
  const [followerUsername,   setFollowerUsername]   = useState('')
  const [followerEcosystem,  setFollowerEcosystem]  = useState('Solana')
  const [followerMaxCount,   setFollowerMaxCount]   = useState(200)
  const [followerProspects,  setFollowerProspects]  = useState<Prospect[]>([])
  const [followerScraping,   setFollowerScraping]   = useState(false)
  const [followerError,      setFollowerError]      = useState('')
  const [followerSavedIdx,   setFollowerSavedIdx]   = useState<Set<number>>(new Set())
  const [followerSavingAll,  setFollowerSavingAll]  = useState(false)
  const [followerSaveResult, setFollowerSaveResult] = useState<{ created: number; skipped: number } | null>(null)
  const [followerMeta,       setFollowerMeta]       = useState<any>(null)

  // Fetch enabled keywords on mount
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

  // Keyword toggle — appends to beliefSignal
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

  // Shared: prospect → lead payload
  const prospectToLead = (p: Prospect) => ({
    name: p.name, role: p.role ?? '', company: p.company ?? '',
    companyWebsite: p.companyWebsite ?? '', linkedinUrl: p.linkedinUrl ?? '',
    twitterUrl: p.twitterUrl ?? '', email: p.email ?? '',
    emailSource: p.emailSource ?? '', cryptoNiche: p.cryptoNiche ?? '',
    ecosystem: p.ecosystem ?? '', beliefSignal: p.beliefSignal ?? '',
    activityLevel: p.activityLevel ?? 'UNKNOWN', tags: p.tags ?? [],
    priority: p.priority ?? 'C', status: 'NEW',
    sourceFound: p.sourceFound ?? undefined, notes: p.notes ?? '',
    emailVerified: false, emailType: 'UNKNOWN',
  })

  // Shared: export CSV
  const exportCSV = (list: Prospect[], filename: string) => {
    const headers = ['name','role','company','companyWebsite','linkedinUrl','twitterUrl','farcasterUrl','redditUrl','quoraUrl','truthSocialUrl','email','emailSource','cryptoNiche','ecosystem','beliefSignal','activityLevel','tags','priority','priorityReason','sourceFound','confidence']
    const escape  = (v: any) => { if (v == null) return ''; const s = Array.isArray(v) ? v.join('; ') : String(v); return `"${s.replace(/"/g, '""')}"` }
    const rows    = [headers.join(','), ...list.map(p => headers.map(h => escape((p as any)[h])).join(','))]
    const blob    = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  // Discover
  const handleDiscover = async () => {
    if (!hasAnyCriteria) return
    setDiscovering(true); setDiscoverError(''); setProspects([])
    setSavedIndexes(new Set()); setSaveAllResult(null)
    try {
      const res  = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'discover', criteria }) })
      const data = await res.json()
      if (!res.ok || data.error) { setDiscoverError(data.error ?? 'Search failed'); return }
      setProspects(data.results ?? [])
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
      const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prospectToLead(prospects[i])) })
      if (res.status === 201) { created++; newSaved.add(i) } else skipped++
    }
    setSavedIndexes(newSaved); setSaveAllResult({ created, skipped }); setSavingAll(false)
  }

  const saveAsLead = async (p: Prospect, index?: number) => {
    const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prospectToLead(p)) })
    if (res.ok) {
      const lead = await res.json()
      if (tab === 'lookup') { setLookupSaved(true); setTimeout(() => router.push(`/leads/${lead.id}`), 800) }
      else if (index !== undefined) setSavedIndexes(prev => new Set([...prev, index]))
    }
  }

  // Lookup
  const handleLookup = async () => {
    if (!lookupQuery.trim()) return
    setLooking(true); setLookupError(''); setLookupResult(null); setLookupSaved(false)
    try {
      const res  = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'lookup', query: lookupQuery }) })
      const data = await res.json()
      if (!res.ok || data.error) { setLookupError(data.error ?? 'Lookup failed'); return }
      setLookupResult(data.result)
    } catch { setLookupError('Network error') }
    finally   { setLooking(false) }
  }

  // Follower scrape
  const handleFollowerScrape = async () => {
    if (!followerUsername.trim()) return
    setFollowerScraping(true); setFollowerError(''); setFollowerProspects([])
    setFollowerSavedIdx(new Set()); setFollowerSaveResult(null); setFollowerMeta(null)
    try {
      const res  = await fetch('/api/scrape/followers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: followerUsername.replace('@', '').trim(), ecosystem: followerEcosystem, maxFollowers: followerMaxCount }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setFollowerError(data.error ?? 'Scrape failed'); return }
      setFollowerProspects(data.results ?? [])
      setFollowerMeta(data.meta ?? null)
    } catch { setFollowerError('Network error') }
    finally   { setFollowerScraping(false) }
  }

  const handleFollowerSaveAll = async () => {
    if (!followerProspects.length) return
    setFollowerSavingAll(true); setFollowerSaveResult(null)
    let created = 0, skipped = 0
    const newSaved = new Set(followerSavedIdx)
    for (let i = 0; i < followerProspects.length; i++) {
      if (followerSavedIdx.has(i)) { skipped++; continue }
      const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prospectToLead(followerProspects[i])) })
      if (res.status === 201) { created++; newSaved.add(i) } else skipped++
    }
    setFollowerSavedIdx(newSaved); setFollowerSaveResult({ created, skipped }); setFollowerSavingAll(false)
  }

  const saveFollowerLead = async (p: Prospect, index?: number) => {
    const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prospectToLead(p)) })
    if (res.ok && index !== undefined) setFollowerSavedIdx(prev => new Set([...prev, index]))
  }

  const clearAll = () => { setCriteria({ niches: [], roles: [], ecosystems: [], platforms: [], beliefSignal: '' }); setActiveKeywords([]) }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 border border-border rounded-lg p-1 w-fit">
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

            {/* Ecosystem — preset pills + free text */}
            <EcosystemInput
              label="Ecosystem — select or type any"
              selected={criteria.ecosystems}
              onToggle={toggle('ecosystems')}
              mode="multi"
            />

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
                Belief / Signal Keyword <span className="normal-case font-normal">(optional — type freely or pick from Saved Keywords above)</span>
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
                  Scanning {criteria.platforms.length > 0 ? criteria.platforms.join(', ') : 'X, Reddit, forums, and more'} — hunting for public emails
                </p>
              </div>
            </div>
          )}

          {prospects.length > 0 && !discovering && (
            <ProspectResultsBlock
              prospects={prospects} savedIndexes={savedIndexes} savingAll={savingAll} saveAllResult={saveAllResult}
              onSaveAll={handleSaveAll}
              onExportCSV={() => exportCSV(prospects, `prospects-${new Date().toISOString().slice(0,10)}.csv`)}
              onSaveOne={saveAsLead} onResearch={handleDiscover} researchLabel="Search again"
            />
          )}
        </div>
      )}

      {/* ── LOOKUP + FOLLOWERS TAB ── */}
      {tab === 'lookup' && (
        <div className="space-y-6">

          {/* Look Up a Person */}
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
                  placeholder="e.g. Stani Kulechov, https://x.com/hasufl, linkedin.com/in/…"
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

              {/* Username input */}
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
                </div>
                {/* Suggestions based on selected ecosystem */}
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

              {/* Ecosystem — free text for follower scraper */}
              <EcosystemInput
                label="Ecosystem tag for results"
                selected={[]}
                onToggle={() => {}}
                singleValue={followerEcosystem}
                onSingleChange={v => setFollowerEcosystem(v || 'Crypto')}
                mode="single"
              />

              {/* Max followers */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Max Followers to Scan</label>
                <select value={followerMaxCount} onChange={e => setFollowerMaxCount(Number(e.target.value))}
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value={100}>100 followers</option>
                  <option value={200}>200 followers</option>
                  <option value={500}>500 followers</option>
                  <option value={1000}>1,000 followers</option>
                </select>
              </div>

              <button onClick={handleFollowerScrape} disabled={followerScraping || !followerUsername.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-md text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 w-full sm:w-auto justify-center">
                {followerScraping
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Scraping followers…</>
                  : <><Users className="w-4 h-4" /> Scrape @{followerUsername || 'username'} Followers</>}
              </button>

              <p className="text-[10px] text-muted-foreground">
                Cost: ~$0.018 per 100 followers scanned (twitterapi.io) + Claude analysis. 200 followers ≈ $0.04 total.
              </p>
            </div>

            {followerError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-400">{followerError}</p>
              </div>
            )}

            {followerScraping && (
              <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                <div className="text-center">
                  <p className="text-sm font-medium">Scraping @{followerUsername} followers…</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fetching up to {followerMaxCount} followers → scanning bios + tweets for emails → Claude analysis
                  </p>
                </div>
              </div>
            )}

            {followerMeta && !followerScraping && (
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground bg-secondary/50 border border-border rounded-lg px-4 py-3">
                <span>📥 <strong className="text-foreground">{followerMeta.followersScraped}</strong> scraped</span>
                <span>🔍 <strong className="text-foreground">{followerMeta.candidatesFound}</strong> candidates</span>
                <span>✉️ <strong className="text-green-400">{followerMeta.withEmail}</strong> with email</span>
                <span>✅ <strong className="text-foreground">{followerMeta.finalProspects}</strong> qualified</span>
              </div>
            )}

            {followerProspects.length > 0 && !followerScraping && (
              <ProspectResultsBlock
                prospects={followerProspects} savedIndexes={followerSavedIdx} savingAll={followerSavingAll} saveAllResult={followerSaveResult}
                onSaveAll={handleFollowerSaveAll}
                onExportCSV={() => exportCSV(followerProspects, `followers-${followerUsername}-${new Date().toISOString().slice(0,10)}.csv`)}
                onSaveOne={saveFollowerLead}
                onResearch={handleFollowerScrape} researchLabel="Scrape again"
              />
            )}
          </div>

        </div>
      )}
    </div>
  )
}