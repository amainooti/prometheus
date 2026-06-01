'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  BookOpen,
  Search,
  Users,
  PlusCircle,
  X,
  Menu,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',          label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/keywords',  label: 'Keywords',         icon: BookOpen        },
  { href: '/queries',   label: 'Query Generator',  icon: Search          },
  { href: '/leads',     label: 'Leads',            icon: Users           },
  { href: '/leads/new', label: 'Add Lead',         icon: PlusCircle      },
]

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

// Desktop sidebar (hidden on mobile)
export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-56 xl:w-64 border-r border-border bg-card shrink-0">
      <SidebarHeader />
      <NavLinks />
      <SidebarFooter />
    </aside>
  )
}

// Mobile hamburger + drawer (used in TopBar)
export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border">
          <Logo />
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <NavLinks onClose={() => setOpen(false)} />
        <SidebarFooter />
      </div>
    </>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
        <Zap className="w-4 h-4 text-primary" />
      </div>
      <span className="font-semibold text-sm tracking-tight">CryptoLeads</span>
    </div>
  )
}

function SidebarHeader() {
  return (
    <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
      <Logo />
    </div>
  )
}

function SidebarFooter() {
  return (
    <div className="px-4 py-3 border-t border-border shrink-0">
      <p className="text-[10px] text-muted-foreground">
        Manual research only · No scraping
      </p>
    </div>
  )
}