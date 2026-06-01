import { KeywordTable, KeywordImport } from '@/components/keywords'

export default async function KeywordLibrary() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Keyword Library</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <KeywordImport />
        </div>
        <div className="lg:col-span-3">
          <KeywordTable keywords={[]} />
        </div>
      </div>
    </div>
  )
}
