'use client'

import { useState, useMemo } from 'react'
import { Copy, Check, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { generateEmailFormats, generateEmailSearchStrings } from '@/lib/email-formats'
import { cn } from '@/lib/utils'

interface EmailSearchHelperProps {
  name:    string
  company: string | null
  website: string | null
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      className={cn('p-1 rounded hover:bg-secondary transition-colors shrink-0', className)}
      title="Copy"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-400" />
        : <Copy  className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  )
}

export function EmailSearchHelper({ name, company, website }: EmailSearchHelperProps) {
  const [showFormats, setShowFormats] = useState(false)
  const [domain, setDomain]          = useState(() => {
    if (!website) return ''
    try { return new URL(website).hostname.replace('www.', '') } catch { return '' }
  })
  const [customDomain, setCustomDomain] = useState('')

  const activeDomain = customDomain.trim() || domain

  const nameParts  = name.trim().split(/\s+/)
  const firstName  = nameParts[0] ?? ''
  const lastName   = nameParts.slice(1).join(' ')

  const searchStrings = useMemo(
    () => generateEmailSearchStrings(name, company ?? ''),
    [name, company]
  )

  const emailFormats = useMemo(
    () => generateEmailFormats(firstName, lastName, activeDomain),
    [firstName, lastName, activeDomain]
  )

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Email Search Helper</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Use these to manually search for {firstName}'s email.
        </p>
      </div>

      {/* Search strings */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Google Search Strings
        </p>
        <div className="space-y-1.5">
          {searchStrings.map((q, i) => (
            <div key={i} className="flex items-center gap-2 bg-secondary rounded-md px-3 py-2">
              <p className="flex-1 text-xs font-mono text-foreground/90 break-all">{q}</p>
              <CopyButton text={q} />
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-secondary/80 shrink-0"
                title="Search Google"
              >
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Email format guesser */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowFormats(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-secondary/50 transition-colors"
        >
          <span className="font-medium text-sm">Email Format Guesser</span>
          {showFormats
            ? <ChevronUp   className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showFormats && (
          <div className="px-4 pb-4 space-y-3">
            {/* Domain input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Company Domain
              </label>
              <input
                type="text"
                value={customDomain || domain}
                onChange={e => setCustomDomain(e.target.value)}
                placeholder="example.com"
                className="w-full bg-secondary border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {!activeDomain ? (
              <p className="text-xs text-muted-foreground">Enter a domain above to see format guesses.</p>
            ) : emailFormats.length === 0 ? (
              <p className="text-xs text-muted-foreground">Could not generate formats — check name and domain.</p>
            ) : (
              <div className="space-y-1.5">
                {emailFormats.map((fmt, i) => (
                  <div key={i} className="flex items-center gap-2 bg-secondary rounded-md px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-foreground/90 truncate">{fmt.example}</p>
                      <p className={cn(
                        'text-[10px] mt-0.5',
                        fmt.popularity === 'Very Common' ? 'text-green-400'  :
                        fmt.popularity === 'Common'      ? 'text-yellow-400' :
                                                           'text-muted-foreground'
                      )}>
                        {fmt.popularity}
                      </p>
                    </div>
                    <CopyButton text={fmt.example} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}