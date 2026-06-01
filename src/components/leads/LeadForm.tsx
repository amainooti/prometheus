'use client'

import { Lead } from '@/src/types'

interface LeadFormProps {
  lead?: Lead
  onSubmit?: (data: Partial<Lead>) => void
}

export default function LeadForm({ lead, onSubmit }: LeadFormProps) {
  return (
    <form className="space-y-4">
      {/* Form fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input type="email" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
      </div>
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
        Submit
      </button>
    </form>
  )
}
