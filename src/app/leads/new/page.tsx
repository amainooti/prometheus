import { LeadForm } from '@/components/leads/LeadForm'

export default function NewLeadPage() {
  return (
    <div className="max-w-2xl">
      <LeadForm mode="create" />
    </div>
  )
}