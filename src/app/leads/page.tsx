import Link from 'next/link'
import { LeadTable, LeadFilters } from '@/components/leads'

export default async function LeadCRM() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
        <Link
          href="/leads/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Lead
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <LeadFilters />
        </div>
        <div className="lg:col-span-3">
          <LeadTable leads={[]} />
        </div>
      </div>
    </div>
  )
}
