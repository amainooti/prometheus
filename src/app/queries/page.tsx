import { QueryBuilder } from '@/components/queries'

export default function SearchQueryGenerator() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Search Query Generator</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <QueryBuilder />
      </div>
    </div>
  )
}
