'use client'

import { usePathname } from 'next/navigation'
import { MobileSidebar } from './Sidebar'

const TITLES: Record<string, string> = {
  '/':           'Dashboard',
  '/research':   'AI Research',
  '/keywords':   'Keyword Library',
  '/queries':    'Query Generator',
  '/leads':      'Leads',
  '/leads/new':  'Add Lead',
}

export function TopBar() {
  const pathname = usePathname()
  const title =
    TITLES[pathname] ??
    (pathname.startsWith('/leads/') ? 'Lead Detail' : 'CryptoLeads')

  return (
    <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-4 shrink-0">
      <MobileSidebar />
      <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
          AI-assisted research
        </span>
      </div>
    </header>
  )
}