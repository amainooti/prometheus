'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Loader2, UserPlus, CheckCircle, AlertTriangle,
  Mail, ExternalLink, RefreshCw, Zap, User, Globe,
  Twitter, ChevronDown, ChevronUp, MailSearch,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITY_LABELS, ACTIVITY_LABELS } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prospect {
  name:           string
  role:           string | null
  company:        string | null
  companyWebsite: string | null
  linkedinUrl:    string | null
  twitterUrl:     string | null
  farcasterUrl:   string | null
  email:          string | null
  emailSource:    string | null
  cryptoNiche:    string | null
  beliefSignal:   string | null
  activityLevel:  string
  tags:           string[]
  priority:       string
  priorityReason: string
  sourceFound:    string | null
  confidence:     'HIGH' | 'MEDIUM' | 'LOW'
  // lookup-only
  notes?:          string | null
  confidenceReason?: string
}

interface DiscoveryCriteria {
  niche:        string
  role:         string
  ecosystem:    string
  beliefSignal: string
  platform:     string
}

const PRIORITY_BADGE: Record<string, string> = {
  A_PLUS: 'badge-a-plus', A: 'badge-a', B: 'badge-b', C: 'badge-c', D: 'badge-d',
}
const CONFIDENCE_COLOR = {
  HIGH:   'text-green-400',
  MEDIUM: 'text-yellow-400',
  LOW:    'text-red-400',
}

const NICHES      = ['DeFi', 'Bitcoin', 'RWA', 'DePIN', 'NFT', 'DAO', 'GameFi', 'SocialFi', 'AI x Crypto', 'Stablecoins', 'Payments', 'ZK / Privacy', 'Modular Blockchain']
const ROLES       = ['Founder', 'Co-Founder', 'Investor', 'Angel Investor', 'Builder / Developer', 'Educator / Content Creator', 'Analyst / Researcher', 'Community Lead', 'DAO Contributor']
const ECOSYSTEMS  = ['Ethereum', 'Solana', 'Bitcoin', 'Base', 'Arbitrum', 'Optimism', 'Cosmos', 'Sui', 'Aptos', 'Polygon', 'Avalanche', 'TON']
const PLATFORMS   = ['X / Twitter', 'LinkedIn', 'Farcaster', 'Substack', 'GitHub', 'Mirror', 'Podcast']

// ─── ProspectCard ─────────────────────────────────────────────────────────────

function ProspectCard({ prospect, onSave }: { prospect: Prospect; onSave: (p: Prospect) => Promise<void> }) {
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handle = async () => {
    setSaving(true)
    await onSave(prospect)
    setSaved(true)
    setSaving(false)
  }

  return (
    <div className={cn(
      'bg-card border border-border rounded-lg overflow-hidden transition-all',
      saved && 'border-green-500/30 bg-green-500/5'
    )}>
      {/* Top row */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{prospect.name}</span>
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', PRIORITY_BADGE[prospect.priority] ?? 'badge-c')}>
              {PRIORITY_LABELS[prospect.priority as keyof typeof PRIORITY_LABELS] ?? prospect.priority}
            </span>
            <span className={cn('text-[10px] font-medium', CONFIDENCE_COLOR[prospect.confidence])}>
              {prospect.confidence} conf.
            </span>
          </div>
          {(prospect.role || prospect.company) && (
            <p className="text-xs text-muted-foreground truncate">
              {[prospect.role, prospect.company].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Email — highlighted if found */}
          {prospect.email ? (
            <div className="flex items-center gap-1.5 mt-1">
              <Mail className="w-3 h-3 text-green-400 shrink-0" />
              <span className="text-xs text-green-400 font-medium break-all">{prospect.email}</span>
              {prospect.emailSource && (
                <span className="text-[10px] text-muted-foreground">({prospect.emailSource})</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <MailSearch className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              <span className="text-[11px] text-muted-foreground/50">No public email found</span>
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handle}
          disabled={saving || saved}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium shrink-0 transition-colors',
            saved
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
          )}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> :
           saved  ? <CheckCircle className="w-3 h-3" /> :
                    <UserPlus className="w-3 h-3" />}
          <span>{saved ? 'Saved' : 'Add'}</span>
        </button>
      </div>

      {/* Quick links + niche */}
      <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
        {prospect.cryptoNiche && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium">
            {prospect.cryptoNiche}
          </span>
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

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> less</> : <><ChevronDown className="w-3 h-3" /> more</>}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {prospect.beliefSignal && (
            <p className="text-xs text-muted-foreground italic">"{prospect.beliefSignal}"</p>
          )}
          <p className="text-[11px] text-muted-foreground">{prospect.priorityReason}</p>
          {prospect.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {prospect.tags.map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ResearchPanel() {
  const router  = useRouter()
  const [tab,   setTab]   = useState<'discover' | 'lookup'>('discover')

  // Discovery state
  const [criteria, setCriteria] = useState<DiscoveryCriteria>({
    niche: '', role: '', ecosystem: '', beliefSignal: '', platform: '',
  })
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [discoverError, setDiscoverError] = useState('')

  // Lookup state
  const [lookupQuery,  setLookupQuery]  = useState('')
  const [lookupResult, setLookupResult] = useState<Prospect | null>(null)
  const [looking,      setLooking]      = useState(false)
  const [lookupError,  setLookupError]  = useState('')
  const [lookupSaved,  setLookupSaved]  = useState(false)

  const set = (key: keyof DiscoveryCriteria) => (v: string) =>
    setCriteria(prev => ({ ...prev, [key]: v }))

  const hasAnyCriteria = Object.values(criteria).some(v => v.trim())

  // ── Discover ────────────────────────────────────────────────────────────────

  const handleDiscover = async () => {
    if (!hasAnyCriteria) return
    setDiscovering(true)
    setDiscoverError('')
    setProspects([])
    try {
      const res  = await fetch('/api/research', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'discover', criteria }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setDiscoverError(data.error ?? 'Search failed'); return }
      setProspects(data.results ?? [])
    } catch { setDiscoverError('Network error') }
    finally   { setDiscovering(false) }
  }

  // ── Lookup ──────────────────────────────────────────────────────────────────

  const handleLookup = async () => {
    if (!lookupQuery.trim()) return
    setLooking(true)
    setLookupError('')
    setLookupResult(null)
    setLookupSaved(false)
    try {
      const res  = await fetch('/api/research', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'lookup', query: lookupQuery }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setLookupError(data.error ?? 'Lookup failed'); return }
      setLookupResult(data.result)
    } catch { setLookupError('Network error') }
    finally   { setLooking(false) }
  }

  // ── Save as lead (shared) ────────────────────────────────────────────────────

  const saveAsLead = async (p: Prospect) => {
    const res = await fetch('/api/leads', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:           p.name,
        role:           p.role           ?? '',
        company:        p.company        ?? '',
        companyWebsite: p.companyWebsite ?? '',
        linkedinUrl:    p.linkedinUrl    ?? '',
        twitterUrl:     p.twitterUrl     ?? '',
        email:          p.email          ?? '',
        emailSource:    p.emailSource    ?? '',
        cryptoNiche:    p.cryptoNiche    ?? '',
        beliefSignal:   p.beliefSignal   ?? '',
        activityLevel:  p.activityLevel  ?? 'UNKNOWN',
        tags:           p.tags           ?? [],
        priority:       p.priority       ?? 'C',
        status:         'NEW',
        sourceFound:    p.sourceFound    ?? undefined,
        notes:          p.notes          ?? '',
        emailVerified:  false,
        emailType:      'UNKNOWN',
      }),
    })
    if (res.ok) {
      const lead = await res.json()
      // For lookup mode, redirect. For discover, just mark saved inline.
      if (tab === 'lookup') {
        setLookupSaved(true)
        setTimeout(() => router.push(`/leads/${lead.id}`), 800)
      }
    }
  }

  const SelectPill = ({ label, options, value, onChange }: {
    label: string; options: string[]; value: string; onChange: (v: string) => void
  }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(value === o ? '' : o)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
              value === o
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/20'
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 border border-border rounded-lg p-1 w-fit">
        {([
          { id: 'discover', label: 'Discover Prospects', icon: Search },
          { id: 'lookup',   label: 'Look Up a Person',   icon: User   },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              tab === id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── DISCOVER TAB ── */}
      {tab === 'discover' && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Describe the type of person you want to find</p>
            </div>

            <SelectPill label="Niche"      options={NICHES}     value={criteria.niche}        onChange={set('niche')}        />
            <SelectPill label="Role"       options={ROLES}      value={criteria.role}         onChange={set('role')}         />
            <SelectPill label="Ecosystem"  options={ECOSYSTEMS} value={criteria.ecosystem}    onChange={set('ecosystem')}    />
            <SelectPill label="Find on"    options={PLATFORMS}  value={criteria.platform}     onChange={set('platform')}     />

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Belief / Signal Keyword <span className="normal-case font-normal">(optional — e.g. "decentralization", "sound money")</span>
              </label>
              <input
                type="text"
                value={criteria.beliefSignal}
                onChange={e => set('beliefSignal')(e.target.value)}
                placeholder="e.g. financial sovereignty, building on-chain, DeFi summer…"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              onClick={handleDiscover}
              disabled={discovering || !hasAnyCriteria}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 w-full sm:w-auto justify-center"
            >
              {discovering
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching the web…</>
                : <><Search  className="w-4 h-4" /> Find Prospects</>}
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
                  Scanning X, LinkedIn, Farcaster, newsletters, podcasts, DAO forums and more. Also looking for public emails.
                </p>
              </div>
            </div>
          )}

          {prospects.length > 0 && !discovering && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{prospects.length} prospect{prospects.length !== 1 ? 's' : ''} found</p>
                <button
                  onClick={handleDiscover}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <RefreshCw className="w-3 h-3" /> Search again
                </button>
              </div>
              {prospects.map((p, i) => (
                <ProspectCard key={`${p.name}-${i}`} prospect={p} onSave={saveAsLead} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LOOKUP TAB ── */}
      {tab === 'lookup' && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Enter a name, LinkedIn URL, X handle, or any identifier</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={lookupQuery}
                onChange={e => setLookupQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                placeholder="e.g. Stani Kulechov, https://x.com/hasufl, linkedin.com/in/…"
                className="flex-1 min-w-0 bg-secondary border border-border rounded-md px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={looking}
              />
              <button
                onClick={handleLookup}
                disabled={looking || !lookupQuery.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shrink-0"
              >
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
              <div className="text-center">
                <p className="text-sm font-medium">Researching…</p>
                <p className="text-xs text-muted-foreground mt-1">Searching web, social profiles, and public sources for their email</p>
              </div>
            </div>
          )}

          {lookupResult && !looking && (
            <ProspectCard
              prospect={lookupResult}
              onSave={async (p) => {
                await saveAsLead(p)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}