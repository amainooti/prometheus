import { Suspense } from 'react'
import LeadsPageClient from './LeadsPageClient'

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-muted-foreground text-sm">Loading…</div>}>
      <LeadsPageClient />
    </Suspense>
  )
}