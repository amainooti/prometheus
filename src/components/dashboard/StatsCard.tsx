import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  iconColor?: string
  trend?: string
  loading?: boolean
}

export function StatsCard({ label, value, icon: Icon, iconColor = 'text-primary', trend, loading }: StatsCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={cn('w-7 h-7 rounded-md flex items-center justify-center bg-secondary', iconColor)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-secondary animate-pulse rounded" />
      ) : (
        <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
      )}
      {trend && (
        <p className="text-xs text-muted-foreground">{trend}</p>
      )}
    </div>
  )
}