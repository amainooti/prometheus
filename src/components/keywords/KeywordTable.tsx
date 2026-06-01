'use client'

import { Keyword } from '@/types'

interface KeywordTableProps {
  keywords: Keyword[]
}

export default function KeywordTable({ keywords }: KeywordTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {/* Table rows */}
        </tbody>
      </table>
    </div>
  )
}
