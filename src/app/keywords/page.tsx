'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, Upload, Search } from 'lucide-react'
import { KeywordTable } from '@/components/keywords/KeywordTable'
import { KeywordImport } from '@/components/keywords/KeywordImport'
import { CATEGORY_LABELS } from '@/types'
import { cn } from '@/lib/utils'
import { KeywordCategory } from '@prisma/client'

interface Keyword {
  id: string
  text: string
  category: KeywordCategory
  enabled: boolean
}

const ALL_CATEGORIES: (KeywordCategory | 'ALL')[] = [
  'ALL',
  ...Object.keys(CATEGORY_LABELS) as KeywordCategory[],
]

export default function KeywordsPage() {
  const [keywords, setKeywords]       = useState<Keyword[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeCategory, setActiveCategory] = useState<KeywordCategory | 'ALL'>('ALL')
  const [search, setSearch]           = useState('')
  const [showImport, setShowImport]   = useState(false)

 const fetchKeywords = useCallback(async () => {
  setLoading(true)

  try {
    const params = new URLSearchParams()
    if (activeCategory !== 'ALL') params.set('category', activeCategory)

    const res = await fetch(`/api/keywords?${params}`)
    const data = await res.json()

    if (Array.isArray(data)) {
      setKeywords(data)
    } else if (Array.isArray(data.keywords)) {
      setKeywords(data.keywords)
    } else {
      console.error('Invalid keywords response:', data)
      setKeywords([])
    }
  } catch (error) {
    console.error('Failed to fetch keywords:', error)
    setKeywords([])
  } finally {
    setLoading(false)
  }
}, [activeCategory])

  useEffect(() => { fetchKeywords() }, [fetchKeywords])

  const filtered = keywords?.filter(kw =>
    kw.text.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/keywords/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    setKeywords(prev => prev.map(kw => kw.id === id ? { ...kw, enabled } : kw))
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/keywords/${id}`, { method: 'DELETE' })
    setKeywords(prev => prev.filter(kw => kw.id !== id))
  }

  const handleAdd = async (text: string, category: KeywordCategory) => {
    const res = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, category, enabled: true }),
    })
    const created = await res.json()
    if (created.id) {
      setKeywords(prev => [created, ...prev])
    }
  }

  const handleBulkImport = async (items: { text: string; category: KeywordCategory }[]) => {
    const res = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    })
    const result = await res.json()
    await fetchKeywords()
    return result
  }

  const handleExport = (format: 'csv' | 'json') => {
    const params = new URLSearchParams({ format })
    if (activeCategory !== 'ALL') params.set('category', activeCategory)
    window.open(`/api/keywords/export?${params}`, '_blank')
  }

  const counts = ALL_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = cat === 'ALL'
      ? keywords.length
      : keywords.filter(k => k.category === cat).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4 max-w-4xl">

      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} keyword{filtered.length !== 1 ? 's' : ''}
          {activeCategory !== 'ALL' ? ` in ${CATEGORY_LABELS[activeCategory as KeywordCategory]}` : ' total'}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowImport(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-md text-xs font-medium hover:bg-secondary/80"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Import</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-md text-xs font-medium hover:bg-secondary/80"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-md text-xs font-medium hover:bg-secondary/80"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Bulk import panel */}
      {showImport && (
        <KeywordImport
          onImport={handleBulkImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search keywords…"
          className="w-full bg-secondary border border-border rounded-md pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Category tabs — horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 min-w-max pb-1">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                activeCategory === cat
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              {cat === 'ALL' ? 'All' : CATEGORY_LABELS[cat as KeywordCategory]}
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                activeCategory === cat ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
              )}>
                {counts[cat] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <KeywordTable
        keywords={filtered}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onAdd={handleAdd}
        activeCategory={activeCategory}
        loading={loading}
      />
    </div>
  )
}