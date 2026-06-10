'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react'
import Papa from 'papaparse'
import { cn } from '@/lib/utils'

interface ImportResult {
  created: number
  skipped: number
  errors:  string[]
}

interface LeadImportProps {
  onClose:   () => void
  onSuccess: (count: number) => void
}

const EXPECTED_COLUMNS = [
  'name', 'role', 'company', 'linkedinUrl', 'twitterUrl',
  'email', 'emailConfidence', 'priority', 'status',
  'cryptoNiche', 'ecosystem', 'notes',
]

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
const ecoClass = (eco: string) =>
  ECOSYSTEM_COLOR[eco] ?? 'bg-amber-500/10 border-amber-500/20 text-amber-400'

export function LeadImport({ onClose, onSuccess }: LeadImportProps) {
  const fileRef                     = useRef<HTMLInputElement>(null)
  const [rows,     setRows]         = useState<Record<string, string>[]>([])
  const [headers,  setHeaders]      = useState<string[]>([])
  const [fileName, setFileName]     = useState('')
  const [loading,  setLoading]      = useState(false)
  const [result,   setResult]       = useState<ImportResult | null>(null)

  // Derive the unique ecosystems in the uploaded file for preview
  const ecosystemsInFile = Array.from(
    new Set(rows.map(r => r['ecosystem'] ?? r['Ecosystem'] ?? '').filter(Boolean))
  ).slice(0, 8)

  const handleFile = (file: File) => {
    setFileName(file.name)
    setResult(null)
    Papa.parse<Record<string, string>>(file, {
      header:          true,
      skipEmptyLines:  true,
      transformHeader: (h: string) => h.trim(),
      complete: ({ data, meta }) => {
        setHeaders(meta.fields ?? [])
        setRows(data)
      },
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leads/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rows }),
      })
      const data: ImportResult = await res.json()
      setResult(data)
      if (data.created > 0) onSuccess(data.created)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setRows([]); setHeaders([]); setFileName(''); setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Import Leads from CSV</h3>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* Expected columns hint */}
        <div className="bg-secondary/60 rounded-lg p-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Expected CSV Columns</p>
          <div className="flex flex-wrap gap-1.5">
            {EXPECTED_COLUMNS.map(col => (
              <span
                key={col}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-mono border',
                  col === 'ecosystem'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-secondary border-border text-muted-foreground'
                )}
              >
                {col}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Only <span className="font-semibold text-foreground">name</span> is required.{' '}
            <span className="text-amber-400 font-medium">ecosystem</span> values like{' '}
            <span className="font-mono">Solana</span>, <span className="font-mono">Ethereum</span>,{' '}
            <span className="font-mono">Bitcoin</span> will be preserved and shown on the dashboard.
          </p>
        </div>

        {/* Drop zone */}
        {!rows.length && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-secondary/30 transition-colors"
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Drop CSV file here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && !result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">· {rows.length} rows</span>
              </div>
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
                Change file
              </button>
            </div>

            {/* Ecosystem preview — show if the file has ecosystem values */}
            {ecosystemsInFile.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Ecosystems detected in file
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ecosystemsInFile.map(eco => (
                    <span key={eco} className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10px] font-semibold border',
                      ecoClass(eco)
                    )}>
                      {eco}
                    </span>
                  ))}
                  {Array.from(new Set(rows.map(r => r['ecosystem'] ?? r['Ecosystem'] ?? '').filter(Boolean))).length > 8 && (
                    <span className="text-[10px] text-muted-foreground px-2 py-0.5">
                      +{Array.from(new Set(rows.map(r => r['ecosystem'] ?? r['Ecosystem'] ?? '').filter(Boolean))).length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Column match indicator */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Detected Columns</p>
              <div className="flex flex-wrap gap-1.5">
                {headers.map(h => {
                  const matched = EXPECTED_COLUMNS.some(c => c.toLowerCase() === h.toLowerCase())
                  const isEco   = h.toLowerCase() === 'ecosystem'
                  return (
                    <span key={h} className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-mono border',
                      isEco
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : matched
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-secondary border-border text-muted-foreground'
                    )}>
                      {h}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {headers.slice(0, 6).map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                    {headers.length > 6 && <th className="px-3 py-2 text-muted-foreground">+{headers.length - 6} more</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 4).map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {headers.slice(0, 6).map(h => {
                        const isEco = h.toLowerCase() === 'ecosystem'
                        const val   = row[h] ?? '—'
                        return (
                          <td key={h} className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">
                            {isEco && val !== '—'
                              ? <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-semibold border', ecoClass(val))}>{val}</span>
                              : val
                            }
                          </td>
                        )
                      })}
                      {headers.length > 6 && <td className="px-3 py-2 text-muted-foreground">…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 4 && (
                <p className="text-[10px] text-muted-foreground text-center py-2">
                  …and {rows.length - 4} more rows
                </p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</>
                : <><Upload className="w-3.5 h-3.5" /> Import {rows.length} Leads</>}
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <div className={cn(
              'flex items-start gap-3 p-3 rounded-lg border',
              result.created > 0
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-secondary border-border'
            )}>
              {result.created > 0
                ? <CheckCircle  className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />}
              <div className="text-sm space-y-0.5">
                <p className="font-medium">{result.created} lead{result.created !== 1 ? 's' : ''} imported</p>
                {result.skipped > 0 && <p className="text-xs text-muted-foreground">{result.skipped} skipped (duplicates or errors)</p>}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Errors</p>
                {result.errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-[11px] text-red-400">{e}</p>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                Done
              </button>
              <button onClick={reset} className="px-4 py-2 bg-secondary text-foreground rounded-md text-sm font-medium hover:bg-secondary/80">
                Import Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}