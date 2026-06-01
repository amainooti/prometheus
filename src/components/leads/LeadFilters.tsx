'use client'

interface LeadFiltersProps {
  onFilterChange?: (filters: Record<string, any>) => void
}

export default function LeadFilters({ onFilterChange }: LeadFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">Filters</h3>
      {/* Filter controls */}
    </div>
  )
}
