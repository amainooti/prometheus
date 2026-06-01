'use client'

import { useEffect, useState } from 'react'
import { Users, Star, Mail, Send } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { DistributionBar } from '@/components/dashboard/DistributionBar'
import { RecentLeads } from '@/components/dashboard/RecentLeads'

interface DashboardData {
  totalLeads: number
  aPlus: number
  verifiedEmails: number
  readyToContact: number
  byPriority: { priority: string; _count: { priority: number } }[]
  byStatus: { status: string; _count: { status: number } }[]
  recentLeads: {
    id: string
    name: string
    role: string | null
    company: string | null
    priority: string
    status: string
    email: string | null
    emailVerified: boolean
    cryptoNiche: string | null
    createdAt: string
  }[]
}

const PRIORITY_SEGMENTS = [
  { key: 'A_PLUS', label: 'A+',  colorClass: 'bg-orange-500' },
  { key: 'A',      label: 'A',   colorClass: 'bg-yellow-500' },
  { key: 'B',      label: 'B',   colorClass: 'bg-blue-500'   },
  { key: 'C',      label: 'C',   colorClass: 'bg-slate-500'  },
  { key: 'D',      label: 'D',   colorClass: 'bg-red-700'    },
]

const STATUS_SEGMENTS = [
  { key: 'NEW',              label: 'New',            colorClass: 'bg-blue-500'   },
  { key: 'REVIEWED',         label: 'Reviewed',       colorClass: 'bg-purple-500' },
  { key: 'EMAIL_FOUND',      label: 'Email Found',    colorClass: 'bg-cyan-500'   },
  { key: 'EMAIL_VERIFIED',   label: 'Verified',       colorClass: 'bg-teal-500'   },
  { key: 'READY_TO_CONTACT', label: 'Ready',          colorClass: 'bg-green-500'  },
  { key: 'CONTACTED',        label: 'Contacted',      colorClass: 'bg-orange-500' },
  { key: 'REPLIED',          label: 'Replied',        colorClass: 'bg-lime-500'   },
  { key: 'NOT_RELEVANT',     label: 'Not Relevant',   colorClass: 'bg-slate-600'  },
  { key: 'DO_NOT_CONTACT',   label: 'Do Not Contact', colorClass: 'bg-red-700'    },
]

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const prioritySegments = PRIORITY_SEGMENTS.map(s => ({
    label: s.label,
    colorClass: s.colorClass,
    count: data?.byPriority?.find(r => r.priority === s.key)?._count.priority ?? 0,
  }))

  const statusSegments = STATUS_SEGMENTS.map(s => ({
    label: s.label,
    colorClass: s.colorClass,
    count: data?.byStatus?.find(r => r.status === s.key)?._count.status ?? 0,
  }))

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard label="Total Leads"      value={data?.totalLeads ?? 0}      icon={Users} iconColor="text-blue-400"   loading={loading} />
        <StatsCard label="A+ Leads"         value={data?.aPlus ?? 0}           icon={Star}  iconColor="text-orange-400" loading={loading} />
        <StatsCard label="Verified Emails"  value={data?.verifiedEmails ?? 0}  icon={Mail}  iconColor="text-green-400"  loading={loading} />
        <StatsCard label="Ready to Contact" value={data?.readyToContact ?? 0}  icon={Send}  iconColor="text-primary"    loading={loading} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold">By Priority</h3>
          <DistributionBar segments={prioritySegments} total={data?.totalLeads ?? 0} loading={loading} />
        </div>
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold">By Status</h3>
          <DistributionBar segments={statusSegments} total={data?.totalLeads ?? 0} loading={loading} />
        </div>
      </div>

      <RecentLeads leads={data?.recentLeads ?? []} loading={loading} />
    </div>
  )
}