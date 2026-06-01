import { LeadForm } from '@/components/leads'

export default function AddLead() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Add New Lead</h1>

      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6">
          <LeadForm />
        </div>
      </div>
    </div>
  )
}
