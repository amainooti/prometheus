import type { Metadata } from 'next'
import { Sidebar } from '@/components/layout'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Crypto Lead CRM',
  description: 'Lead management system for crypto businesses',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
