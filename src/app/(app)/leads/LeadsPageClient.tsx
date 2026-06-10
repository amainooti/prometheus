'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { PlusCircle, Download, Search, ChevronLeft, ChevronRight, Upload, ChevronDown, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { LeadTable } from '@/components/leads/LeadTable'
import { LeadFilters, type ActiveFilters } from '@/components/leads/LeadFilters'
import { LeadImport } from '@/components/leads/LeadsImport'
import { cn } from '@/lib/utils'
import type { Lead } from '@prisma/client'

const EMPTY_FILTERS: ActiveFilters = {
  priority:        [],
  status:          [],
  emailConfidence: [],
  emailVerified:   null,
  activityLevel:   [],
  sourceFound:     [],
  ecosystems:      [],
}

const ECOSYSTEM_COLOR: Record<string, string> = {
  Ethereum:  'text-indigo-400',
  Solana:    'text-violet-400',
  Bitcoin:   'text-orange-400',
  Base:      'text-blue-400',
  Arbitrum:  'text-sky-400',
  Optimism:  'text-red-400',
  Cosmos:    'text-purple-400',
  Sui:       'text-cyan-400',
  Aptos:     'text-teal-400',
  Polygon:   'text-fuchsia-400',
  Avalanche: 'text-red-500',
  TON:       'text-blue-500',
}

export default function LeadsPageClient() {
  const searchParams = useSearchParams()
  const [leads,        setLeads]        = useState<Lead[]>([])
  const [total,        setTotal]        = useState(0)
  const [pages,        setPages]        = useState(1)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState(searchParams.get('search') ?? '')
  const [page,         setPage]         = useState(1)
  const [filters,      setFilters]      = useState<ActiveFilters>(EMPTY_FILTERS)
  const [showImport,   setShowImport]   = useState(false)
  const [ecoDropdown,  setEcoDropdown]  = useState(false)
  const [ecosystems,   setEcosystems]   = useState<{ ecosystem: string; count: number }[]>([])
  const [ecoLoading,   setEcoLoading]   = useState(false)
  const dropdownRef                     = useRef<HTMLDivElement>(null)

  // Fetch distinct ecosystems that actually exist in the DB
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

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setEcoDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buildParams = useCallback((extraPage?: number) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', String(extraPage ?? page))
    params.set('limit', '50')
    filters.priority.forEach(v        => params.append('priority', v))
    filters.status.forEach(v          => params.append('status', v))
    filters.emailConfidence.forEach(v => params.append('emailConfidence', v))
    filters.activityLevel.forEach(v   => params.append('activityLevel', v))
    filters.sourceFound.forEach(v     => params.append('sourceFound', v))
    filters.ecosystems.forEach(v      => params.append('ecosystem', v))
    if (filters.emailVerified !== null) params.set('emailVerified', String(filters.emailVerified))
    return params
  }, [search, page, filters])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/leads?${buildParams()}`)
    const data = await res.json()
    setLeads(data.leads ?? [])
    setTotal(data.total ?? 0)
    setPages(data.pages ?? 1)
    setLoading(false)
  }, [buildParams])

  useEffect(() => { fetchLeads() }, [fetchLeads])
  useEffect(() => { setPage(1) }, [search, filters])

  const handleExport = () => {
    const params = buildParams()
    params.delete('page')
    params.delete('limit')
    window.open(`/api/leads/export?${params}`, '_blank')
    setEcoDropdown(false)
  }

  const handleExportEcosystem = (eco: string) => {
    const params = new URLSearchParams()
    params.append('ecosystem', eco)
    window.open(`/api/leads/export?${params}`, '_blank')
    setEcoDropdown(false)
  }

  const handleExportAll = () => {
    window.open('/api/leads/export', '_blank')
    setEcoDropdown(false)
  }

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full bg-secondary border border-border rounded-md pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2 ml-auto flex-wrap">
          <button
            onClick={() => setShowImport(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-md text-xs font-medium hover:bg-secondary/80"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>

          {/* Export dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setEcoDropdown(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-md text-xs font-medium hover:bg-secondary/80"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
              <ChevronDown className={cn('w-3 h-3 transition-transform', ecoDropdown && 'rotate-180')} />
            </button>

            {ecoDropdown && (
              <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-card border border-border rounded-lg shadow-xl overflow-hidden">

                {/* Current view / all */}
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Export</p>
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    Filtered results
                    <span className="ml-auto text-[10px] text-muted-foreground">{total}</span>
                  </button>
                  <button
                    onClick={handleExportAll}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    All leads
                  </button>
                </div>

                {/* Per-ecosystem — from DB */}
                <div className="px-3 py-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">By ecosystem</p>
                  {ecoLoading ? (
                    <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                    </div>
                  ) : ecosystems.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground px-2 py-1">No ecosystems found</p>
                  ) : (
                    <div className="space-y-0.5 max-h-64 overflow-y-auto">
                      {ecosystems.map(({ ecosystem: eco, count }) => (
                        <button
                          key={eco}
                          onClick={() => handleExportEcosystem(eco)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-secondary transition-colors text-left group"
                        >
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full bg-current shrink-0',
                            ECOSYSTEM_COLOR[eco] ?? 'text-amber-400'
                          )} />
                          <span className={cn('font-medium', ECOSYSTEM_COLOR[eco] ?? 'text-amber-400')}>
                            {eco}
                          </span>
                          <span className="ml-auto text-[10px] text-muted-foreground">{count}</span>
                          <Download className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/leads/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </Link>
        </div>
      </div>

      {showImport && (
        <LeadImport
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); fetchLeads() }}
        />
      )}

      <LeadFilters filters={filters} onChange={setFilters} total={total} />
      <LeadTable leads={leads} loading={loading} />

      {pages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">Page {page} of {pages} · {total} leads</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}