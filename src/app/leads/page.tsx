'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PlusCircle, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { LeadTable } from '@/components/leads/LeadTable'
import { LeadFilters, type ActiveFilters } from '@/components/leads/LeadFilters'
import type { Lead } from '@prisma/client'

const EMPTY_FILTERS: ActiveFilters = {
  priority:        [],
  status:          [],
  emailConfidence: [],
  emailVerified:   null,
  activityLevel:   [],
  sourceFound:     [],
}

export default function LeadsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [leads,   setLeads]   = useState<Lead[]>([])
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const [loading, setLoading] = useState(true)

  const [search,  setSearch]  = useState(searchParams.get('search') ?? '')
  const [page,    setPage]    = useState(1)
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()

    if (search)  params.set('search', search)
    params.set('page', String(page))
    params.set('limit', '50')

    filters.priority.forEach(v        => params.append('priority', v))
    filters.status.forEach(v          => params.append('status', v))
    filters.emailConfidence.forEach(v => params.append('emailConfidence', v))
    filters.activityLevel.forEach(v   => params.append('activityLevel', v))
    filters.sourceFound.forEach(v     => params.append('sourceFound', v))
    if (filters.emailVerified !== null) params.set('emailVerified', String(filters.emailVerified))

    const res  = await fetch(`/api/leads?${params}`)
    const data = await res.json()
    setLeads(data.leads ?? [])
    setTotal(data.total ?? 0)
    setPages(data.pages ?? 1)
    setLoading(false)
  }, [search, page, filters])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Reset to page 1 when filters/search change
  useEffect(() => { setPage(1) }, [search, filters])

  const handleExport = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    filters.priority.forEach(v        => params.append('priority', v))
    filters.status.forEach(v          => params.append('status', v))
    filters.emailConfidence.forEach(v => params.append('emailConfidence', v))
    window.open(`/api/leads/export?${params}`, '_blank')
  }

  return (
    <div className="space-y-4 max-w-full">

      {/* Top action bar */}
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
        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-md text-xs font-medium hover:bg-secondary/80"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <Link
            href="/leads/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <LeadFilters filters={filters} onChange={setFilters} total={total} />

      {/* Table */}
      <LeadTable leads={leads} loading={loading} />

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Page {page} of {pages} · {total} leads
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}