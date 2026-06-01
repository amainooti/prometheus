import { cn } from '@/lib/utils'

interface Segment {
  label: string
  count: number
  colorClass: string
}

interface DistributionBarProps {
  segments: Segment[]
  total: number
  loading?: boolean
}

export function DistributionBar({ segments, total, loading }: DistributionBarProps) {
  if (loading) {
    return <div className="h-3 w-full bg-secondary animate-pulse rounded-full" />
  }

  if (total === 0) {
    return (
      <div className="h-3 w-full bg-secondary rounded-full" />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full rounded-full overflow-hidden gap-px">
        {segments.map(seg => {
          const pct = total > 0 ? (seg.count / total) * 100 : 0
          if (pct === 0) return null
          return (
            <div
              key={seg.label}
              className={cn('h-full transition-all', seg.colorClass)}
              style={{ width: `${pct}%` }}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', seg.colorClass)} />
            <span className="text-xs text-muted-foreground">{seg.label}</span>
            <span className="text-xs font-medium text-foreground">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}