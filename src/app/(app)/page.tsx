// src/app/page.tsx (or dashboard/page.tsx)
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail, TrendingUp, Database, Percent, ExternalLink,
  Search, Users, Loader2, ArrowRight, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  totalLeads:         number
  totalWithEmail:     number
  emailsThisWeek:     number
  emailsThisMonth:    number
  emailHitRate:       number
  sourceBreakdown:    { source: string; count: number }[]
  ecosystemBreakdown: { ecosystem: string; count: number }[]
  recentLeads: {
    id:          string
    name:        string
    email:       string | null
    ecosystem:   string | null
    sourceFound: string | null
    twitterUrl:  string | null
    createdAt:   string
  }[]
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, iconColor, loading, accent }: {
  label:      string
  value:      string | number
  sub?:       string
  icon:       any
  iconColor:  string
  loading:    boolean
  accent?:    boolean
}) {
  return (
    <div className={cn(
      'bg-card border border-border rounded-lg p-4 space-y-2',
      accent && 'border-green-500/30 bg-green-500/5'
    )}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <Icon className={cn('w-4 h-4', iconColor)} />
      </div>
      {loading
        ? <div className="h-7 w-16 bg-secondary animate-pulse rounded" />
        : <p className={cn('text-2xl font-bold', accent && 'text-green-400')}>{value}</p>
      }
      {sub && !loading && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ─── Bar Chart Row ────────────────────────────────────────────────────────────

function BarRow({ label, count, max, color }: {
  label: string; count: number; max: number; color: string
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground truncate max-w-[140px]">{label}</span>
        <span className="font-medium tabular-nums">{count}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Source color map ─────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  'X / Twitter': 'bg-sky-500',
  'Reddit':      'bg-orange-500',
  'Bitcointalk': 'bg-yellow-500',
  'GitHub':      'bg-purple-500',
  'LinkedIn':    'bg-blue-500',
  'Farcaster':   'bg-violet-500',
  'Substack':    'bg-pink-500',
  'Manual':      'bg-teal-500',
  'Unknown':     'bg-slate-500',
}

// ─── Quick Launch ─────────────────────────────────────────────────────────────

function QuickLaunch() {
  const router = useRouter()

  const actions = [
    {
      label:    'Discover Prospects',
      sub:      'AI-powered search across forums, GitHub, Twitter',
      icon:     Search,
      color:    'text-primary',
      bg:       'bg-primary/10 border-primary/20 hover:bg-primary/20',
      href:     '/research',
    },
    {
      label:    'Scrape Twitter Followers',
      sub:      'Enter any account and extract follower emails',
      icon:     Users,
      color:    'text-sky-400',
      bg:       'bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20',
      href:     '/research?tab=lookup',
    },
  ]

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold">Quick Launch</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map(a => (
          <button key={a.label} onClick={() => router.push(a.href)}
            className={cn('flex items-center gap-3 p-3 rounded-lg border text-left transition-colors', a.bg)}>
            <a.icon className={cn('w-5 h-5 shrink-0', a.color)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{a.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">{a.sub}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const maxSource = Math.max(...(data?.sourceBreakdown?.map(s => s.count) ?? [1]))
  const maxEco    = Math.max(...(data?.ecosystemBreakdown?.map(e => e.count) ?? [1]))

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Email Collection Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track how many emails you're collecting and from where</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-md text-xs font-medium hover:bg-secondary/80 disabled:opacity-50">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Emails"
          value={data?.totalWithEmail ?? 0}
          sub={`of ${data?.totalLeads ?? 0} profiles saved`}
          icon={Mail} iconColor="text-green-400"
          loading={loading} accent
        />
        <StatCard
          label="Hit Rate"
          value={`${data?.emailHitRate ?? 0}%`}
          sub="profiles with email found"
          icon={Percent} iconColor="text-blue-400"
          loading={loading}
        />
        <StatCard
          label="Emails This Week"
          value={data?.emailsThisWeek ?? 0}
          sub="last 7 days"
          icon={TrendingUp} iconColor="text-primary"
          loading={loading}
        />
        <StatCard
          label="Emails This Month"
          value={data?.emailsThisMonth ?? 0}
          sub="last 30 days"
          icon={Database} iconColor="text-orange-400"
          loading={loading}
        />
      </div>

      {/* Quick launch */}
      <QuickLaunch />

      {/* Breakdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Source breakdown */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold">Emails by Source</h3>
          {loading
            ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-6 bg-secondary animate-pulse rounded" />)}</div>
            : data?.sourceBreakdown?.length
            ? <div className="space-y-3">
                {data?.sourceBreakdown?.map(s => (
                  <BarRow key={s.source} label={s.source} count={s.count} max={maxSource} color={SOURCE_COLORS[s.source] ?? 'bg-primary'} />
                ))}
              </div>
            : <p className="text-xs text-muted-foreground">No data yet — start scraping to see source breakdown</p>
          }
        </div>

        {/* Ecosystem breakdown */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold">Top Ecosystems</h3>
          {loading
            ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-6 bg-secondary animate-pulse rounded" />)}</div>
            : data?.ecosystemBreakdown?.length
            ? <div className="space-y-3">
                {data?.ecosystemBreakdown?.map(e => (
                  <BarRow key={e.ecosystem} label={e.ecosystem} count={e.count} max={maxEco} color="bg-primary" />
                ))}
              </div>
            : <p className="text-xs text-muted-foreground">No data yet — ecosystems will appear after you save leads</p>
          }
        </div>

      </div>

      {/* Recent emails collected */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold">Recently Collected Emails</h3>
        {loading
          ? <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-secondary animate-pulse rounded" />)}</div>
          : !data?.recentLeads?.length
          ? <p className="text-xs text-muted-foreground">No emails collected yet — run a scrape to get started</p>
          : <div className="divide-y divide-border">
              {data?.recentLeads?.map(lead => (
                <div key={lead.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{lead.name}</span>
                      {lead.ecosystem && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary shrink-0">
                          {lead.ecosystem}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-green-400 truncate">{lead.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.sourceFound && (
                      <span className="text-[10px] text-muted-foreground hidden sm:block">
                        {lead.sourceFound.replace('_', ' ')}
                      </span>
                    )}
                    {lead.twitterUrl && (
                      <a href={lead.twitterUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20">
                        𝕏
                      </a>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
        }
        {data && data.totalWithEmail > 6 && (
          <a href="/leads" className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all {data.totalWithEmail} emails <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

    </div>
  )
}