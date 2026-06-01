'use client'

import { useState } from 'react'
import { Upload, Loader2, X } from 'lucide-react'
import { CATEGORY_LABELS } from '@/types'
import { KeywordCategory } from '@prisma/client'

interface KeywordImportProps {
  onImport: (keywords: { text: string; category: KeywordCategory }[]) => Promise<{ created: number; failed: number }>
  onClose: () => void
}

export function KeywordImport({ onImport, onClose }: KeywordImportProps) {
  const [text, setText]           = useState('')
  const [category, setCategory]   = useState<KeywordCategory>(KeywordCategory.IDENTITY)
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<{ created: number; failed: number } | null>(null)

  const handleImport = async () => {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(text => ({ text, category }))

    if (!lines.length) return

    setLoading(true)
    try {
      const r = await onImport(lines)
      setResult(r)
      setText('')
    } finally {
      setLoading(false)
    }
  }

  const lineCount = text.split('\n').filter(l => l.trim()).length

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bulk Import Keywords</h3>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Paste one keyword per line. All will be imported into the selected category.
      </p>

      {/* Category selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Category</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as KeywordCategory)}
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Textarea */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Keywords <span className="text-muted-foreground/60">({lineCount} lines)</span>
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          placeholder={"crypto native\nblockchain believer\nWeb3 builder\n..."}
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y font-mono"
        />
      </div>

      {result && (
        <div className="flex gap-3 text-xs">
          <span className="text-green-400">✓ {result.created} imported</span>
          {result.failed > 0 && <span className="text-muted-foreground">{result.failed} skipped (duplicates)</span>}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleImport}
          disabled={loading || !lineCount}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</>
            : <><Upload className="w-3.5 h-3.5" /> Import {lineCount > 0 ? lineCount : ''} Keywords</>
          }
        </button>
        <button onClick={onClose} className="px-4 py-2 bg-secondary text-foreground rounded-md text-sm hover:bg-secondary/80">
          Cancel
        </button>
      </div>
    </div>
  )
}