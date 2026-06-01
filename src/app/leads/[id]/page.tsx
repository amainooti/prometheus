import { EmailDiscoveryChecklist, EmailSearchHelper, LeadForm } from '@/src/components/leads'

export default async function LeadDetail({ params }: { params: { id: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Lead Details</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Lead</h2>
            <LeadForm />
          </div>
        </div>

        <div className="space-y-6">
          <EmailDiscoveryChecklist leadId={params.id} />
          <EmailSearchHelper company="" />
        </div>
      </div>
    </div>
  )
}
