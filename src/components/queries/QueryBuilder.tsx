'use client'

import { useEffect, useState, useCallback } from 'react'
import { Copy, ExternalLink, Check, RefreshCw, Loader2, Zap } from 'lucide-react'
import { generateQueries, QUERY_TEMPLATES, type QueryBuilderOptions } from '@/lib/query-generator'
import type { GeneratedQuery } from '@/types'
import { cn } from '@/lib/utils'

const PLATFORM_COLORS: Record<string, string> = {
  'LinkedIn':  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'X/Twitter': 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  'Google':    'text-green-400 bg-green-400/10 border-green-400/20',
}

const PLATFORM_ICONS: Record<string, string> = {
  'LinkedIn':  'in',
  'X/Twitter': '𝕏',
  'Google':    'G',
}

interface KeywordOptions {
  FOUNDER_INVESTOR?: string[]
  IDENTITY?: string[]
  BELIEF_PHILOSOPHY?: string[]
  ECOSYSTEM?: string[]
  NICHE?: string[]
  EXCLUSION?: string[]
  [key: string]: string[] | undefined
}

function SelectField({
  label, value, onChange, options, placeholder, allowCustom,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  allowCustom?: boolean
}) {
  const [custom, setCustom] = useState(false)

  if (custom || (allowCustom && !options.includes(value) && value)) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">{label}</label>
          <button
            onClick={() => { setCustom(false); onChange('') }}
            className="text-[10px] text-primary hover:underline"
          >
            ← Dropdown
          </button>
        </div>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Custom ${label.toLowerCase()}…`}
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {allowCustom && (
          <button onClick={() => setCustom(true)} className="text-[10px] text-primary hover:underline">
            Custom →
          </button>
        )}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">{placeholder ?? `— Any —`}</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function QueryCard({ query }: { query: GeneratedQuery }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(query.query)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', PLATFORM_COLORS[query.platform])}>
      {/* Header */}
      <div className={cn('flex items-center justify-between px-3 py-2 border-b', PLATFORM_COLORS[query.platform])}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold w-5 h-5 rounded flex items-center justify-center bg-current/10">
            {PLATFORM_ICONS[query.platform]}
          </span>
          <span className="text-xs font-semibold">{query.platform}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-white/10 transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <a
            href={query.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </a>
        </div>
      </div>

      {/* Query string */}
      <div className="px-3 py-3">
        <p className="text-xs font-mono break-all leading-relaxed opacity-90">{query.query}</p>
      </div>
    </div>
  )
}

export function QueryBuilder() {
  const [opts, setOpts] = useState<QueryBuilderOptions>({
    targetCategory: '',
    niche: '',
    beliefKeyword: '',
    ecosystem: '',
    exclusions: [],
    customKeyword: '',
  })
  const [kwOptions, setKwOptions]   = useState<KeywordOptions>({})
  const [queries, setQueries]       = useState<GeneratedQuery[]>([])
  const [loadingOpts, setLoadingOpts] = useState(true)
  const [exclusionInput, setExclusionInput] = useState('')

  useEffect(() => {
    fetch('/api/queries/options')
      .then(r => r.json())
      .then(data => { setKwOptions(data); setLoadingOpts(false) })
  }, [])

  const generate = useCallback(() => {
    const results = generateQueries(opts)
    setQueries(results)
  }, [opts])

  useEffect(() => {
    if (opts.targetCategory || opts.niche || opts.beliefKeyword || opts.ecosystem || opts.customKeyword) {
      generate()
    }
  }, [opts, generate])

  const set = (key: keyof QueryBuilderOptions) => (value: string) =>
    setOpts(prev => ({ ...prev, [key]: value }))

  const addExclusion = () => {
    const v = exclusionInput.trim()
    if (!v || opts.exclusions.includes(v)) return
    setOpts(prev => ({ ...prev, exclusions: [...prev.exclusions, v] }))
    setExclusionInput('')
  }

  const removeExclusion = (e: string) =>
    setOpts(prev => ({ ...prev, exclusions: prev.exclusions.filter(x => x !== e) }))

  const applyTemplate = (idx: number) => {
    const t = QUERY_TEMPLATES[idx]
    setOpts(t.opts)
    setExclusionInput('')
  }

  const reset = () => {
    setOpts({ targetCategory: '', niche: '', beliefKeyword: '', ecosystem: '', exclusions: [], customKeyword: '' })
    setQueries([])
    setExclusionInput('')
  }

  const hasAnyInput = opts.targetCategory || opts.niche || opts.beliefKeyword || opts.ecosystem || opts.customKeyword

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Templates */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Templates</p>
        <div className="flex flex-wrap gap-2">
          {QUERY_TEMPLATES.map((t, i) => (
            <button
              key={t.label}
              onClick={() => applyTemplate(i)}
              className="px-3 py-1.5 bg-secondary border border-border rounded-full text-xs font-medium hover:bg-secondary/80 hover:border-primary/40 transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── LEFT: Builder ── */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Build Query
            </h3>
            <button
              onClick={reset}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          </div>

          {loadingOpts ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 bg-secondary animate-pulse rounded-md" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <SelectField
                label="Target Category"
                value={opts.targetCategory}
                onChange={set('targetCategory')}
                options={[
                  ...(kwOptions.IDENTITY ?? []),
                  ...(kwOptions.FOUNDER_INVESTOR ?? []),
                  ...(kwOptions.BUILDER_CONTRIBUTOR ?? []),
                  ...(kwOptions.CONTENT_EDUCATION ?? []),
                ]}
                placeholder="— Any category —"
                allowCustom
              />
              <SelectField
                label="Niche"
                value={opts.niche}
                onChange={set('niche')}
                options={kwOptions.NICHE ?? []}
                placeholder="— Any niche —"
                allowCustom
              />
              <SelectField
                label="Belief / Signal Keyword"
                value={opts.beliefKeyword}
                onChange={set('beliefKeyword')}
                options={[
                  ...(kwOptions.BELIEF_PHILOSOPHY ?? []),
                  ...(kwOptions.ACTIVITY_SIGNAL ?? []),
                ]}
                placeholder="— Any belief —"
                allowCustom
              />
              <SelectField
                label="Ecosystem"
                value={opts.ecosystem}
                onChange={set('ecosystem')}
                options={kwOptions.ECOSYSTEM ?? []}
                placeholder="— Any ecosystem —"
                allowCustom
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Custom Keyword</label>
                <input
                  type="text"
                  value={opts.customKeyword ?? ''}
                  onChange={e => set('customKeyword')(e.target.value)}
                  placeholder="Add any extra keyword…"
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Exclusions */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Exclude Terms</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={exclusionInput}
                    onChange={e => setExclusionInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addExclusion()}
                    placeholder="e.g. recruiter…"
                    className="flex-1 min-w-0 bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={addExclusion}
                    className="px-3 py-2 bg-secondary border border-border rounded-md text-sm hover:bg-secondary/80 shrink-0"
                  >
                    Add
                  </button>
                </div>
                {/* Pre-built exclusion chips from keyword library */}
                <div className="flex flex-wrap gap-1.5">
                  {(kwOptions.EXCLUSION ?? []).slice(0, 8).map(e => (
                    <button
                      key={e}
                      onClick={() => {
                        if (!opts.exclusions.includes(e))
                          setOpts(prev => ({ ...prev, exclusions: [...prev.exclusions, e] }))
                      }}
                      disabled={opts.exclusions.includes(e)}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] border transition-colors',
                        opts.exclusions.includes(e)
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-secondary border-border text-muted-foreground hover:border-red-400/40 hover:text-red-400'
                      )}
                    >
                      -{e}
                    </button>
                  ))}
                </div>
                {/* Active exclusion tags */}
                {opts.exclusions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {opts.exclusions.map(e => (
                      <span
                        key={e}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]"
                      >
                        -{e}
                        <button onClick={() => removeExclusion(e)} className="hover:text-red-300">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Output ── */}
        <div className="space-y-3">
          {!hasAnyInput ? (
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2 min-h-[200px]">
              <Zap className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Select options on the left or pick a template to generate search queries.</p>
            </div>
          ) : queries.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Generated Queries</p>
                <button
                  onClick={generate}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <RefreshCw className="w-3 h-3" /> Regenerate
                </button>
              </div>
              {queries.map(q => (
                <QueryCard key={q.platform} query={q} />
              ))}
              <p className="text-[10px] text-muted-foreground pt-1">
                Click "Open" to run the search manually in your browser. Results are never fetched automatically.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}