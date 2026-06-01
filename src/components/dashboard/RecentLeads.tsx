import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PRIORITY_LABELS, STATUS_LABELS } from '@/types'
import { cn } from '@/lib/utils'

interface RecentLead {
  id: string
  name: string
  role: string | null
  company: string | null
  priority: string
  status: string
  email: string | null
  emailVerified: boolean
  cryptoNiche: string | null
  createdAt: Date | string
}

interface RecentLeadsProps {
  leads: RecentLead[]
  loading?: boolean
}

const PRIORITY_CLASSES: Record<string, string> = {
  A_PLUS: 'badge-a-plus',
  A:      'badge-a',
  B:      'badge-b',
  C:      'badge-c',
  D:      'badge-d',
}

export function RecentLeads({ leads, loading }: RecentLeadsProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Recent Leads</h3>
        <Link
          href="/leads"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="h-4 w-32 bg-secondary animate-pulse rounded" />
              <div className="h-4 w-20 bg-secondary animate-pulse rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No leads yet. <Link href="/leads/new" className="text-primary hover:underline">Add your first lead →</Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {leads.map(lead => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
            >
              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[lead.role, lead.company].filter(Boolean).join(' · ') || lead.cryptoNiche || '—'}
                </p>
              </div>

              {/* Priority badge */}
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0', PRIORITY_CLASSES[lead.priority])}>
                {PRIORITY_LABELS[lead.priority as keyof typeof PRIORITY_LABELS]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}