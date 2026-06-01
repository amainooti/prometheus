'use client'

import { Lead } from '@/types'

interface RecentLeadsProps {
  leads: Lead[]
}

export default function RecentLeads({ leads }: RecentLeadsProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {/* Recent leads list */}
      </div>
    </div>
  )
}
