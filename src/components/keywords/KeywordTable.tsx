'use client'

import { useState } from 'react'
import { Trash2, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/types'
import { KeywordCategory } from '@prisma/client'

interface Keyword {
  id: string
  text: string
  category: KeywordCategory
  enabled: boolean
}

interface KeywordTableProps {
  keywords: Keyword[]
  onToggle: (id: string, enabled: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAdd: (text: string, category: KeywordCategory) => Promise<void>
  activeCategory: KeywordCategory | 'ALL'
  loading?: boolean
}

export function KeywordTable({ keywords, onToggle, onDelete, onAdd, activeCategory, loading }: KeywordTableProps) {
  const [newText, setNewText]     = useState('')
  const [adding, setAdding]       = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAdd = async () => {
    const text = newText.trim()
    if (!text) return
    const cat = activeCategory === 'ALL' ? KeywordCategory.IDENTITY : activeCategory
    setAdding(true)
    try {
      await onAdd(text, cat)
      setNewText('')
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    setTogglingId(id)
    try { await onToggle(id, !current) }
    finally { setTogglingId(null) }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try { await onDelete(id) }
    finally { setDeletingId(null) }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-secondary animate-pulse rounded-md" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Inline add */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={`Add keyword${activeCategory !== 'ALL' ? ` to ${CATEGORY_LABELS[activeCategory as KeywordCategory]}` : ''}…`}
          className="flex-1 min-w-0 bg-secondary border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newText.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shrink-0"
        >
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Table */}
      {keywords.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No keywords in this category yet.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_180px_80px_40px] gap-3 px-4 py-2 bg-secondary/50 text-xs text-muted-foreground font-medium uppercase tracking-wide border-b border-border">
            <span>Keyword</span>
            <span>Category</span>
            <span className="text-center">Enabled</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {keywords.map(kw => (
              <div
                key={kw.id}
                className={cn(
                  'grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_180px_80px_40px] gap-3 items-center px-4 py-2.5 text-sm transition-colors',
                  !kw.enabled && 'opacity-40'
                )}
              >
                {/* Text */}
                <span className="font-medium truncate">{kw.text}</span>

                {/* Category — hidden on mobile */}
                <span className="hidden sm:block text-xs text-muted-foreground truncate">
                  {CATEGORY_LABELS[kw.category]}
                </span>

                {/* Toggle */}
                <div className="hidden sm:flex justify-center">
                  <button
                    onClick={() => handleToggle(kw.id, kw.enabled)}
                    disabled={togglingId === kw.id}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
                      kw.enabled ? 'bg-primary' : 'bg-secondary',
                      togglingId === kw.id && 'opacity-50'
                    )}
                    role="switch"
                    aria-checked={kw.enabled}
                  >
                    <span
                      className={cn(
                        'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform',
                        kw.enabled ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                {/* Mobile: toggle + delete grouped */}
                <div className="flex sm:hidden items-center gap-2">
                  <button
                    onClick={() => handleToggle(kw.id, kw.enabled)}
                    disabled={togglingId === kw.id}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                      kw.enabled ? 'bg-primary' : 'bg-secondary',
                    )}
                  >
                    <span className={cn('block h-4 w-4 rounded-full bg-white shadow transition-transform', kw.enabled ? 'translate-x-4' : 'translate-x-0')} />
                  </button>
                  <button
                    onClick={() => handleDelete(kw.id)}
                    disabled={deletingId === kw.id}
                    className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    {deletingId === kw.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Desktop delete */}
                <button
                  onClick={() => handleDelete(kw.id)}
                  disabled={deletingId === kw.id}
                  className="hidden sm:flex p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  {deletingId === kw.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}