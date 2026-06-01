'use client'

interface EmailSearchHelperProps {
  company: string
}

export default function EmailSearchHelper({ company }: EmailSearchHelperProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Email Search Helper</h3>
      <div className="space-y-3">
        {/* Search helper content */}
      </div>
    </div>
  )
}
