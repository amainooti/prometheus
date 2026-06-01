'use client'

interface EmailDiscoveryChecklistProps {
  leadId: string
}

export default function EmailDiscoveryChecklist({ leadId }: EmailDiscoveryChecklistProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Email Discovery Checklist</h3>
      <div className="space-y-3">
        {/* Checklist items */}
      </div>
    </div>
  )
}
