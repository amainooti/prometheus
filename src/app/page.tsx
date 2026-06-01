import { StatsCard, RecentLeads } from '@/components/dashboard'

export default async function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Total Leads" value="--" />
        <StatsCard title="This Week" value="--" />
        <StatsCard title="Qualified" value="--" />
        <StatsCard title="Converted" value="--" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RecentLeads leads={[]} />
        </div>
      </div>
    </div>
  )
}
