'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2, ShieldAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Modal ────────────────────────────────────────────────────────────────────

function LogoutModal({
  onConfirm,
  onCancel,
  busy,
}: {
  onConfirm: () => void
  onCancel:  () => void
  busy:      boolean
}) {
  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* Top accent bar */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Sign out?</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">You'll need the password to get back in.</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={busy}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              disabled={busy}
              className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Signing out…</>
                : <><LogOut  className="w-3.5 h-3.5" /> Sign out</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────

export function LogoutButton({ className }: { className?: string }) {
  const router          = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'group flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg',
          'text-xs font-medium text-muted-foreground',
          'border border-transparent',
          'hover:bg-red-500/8 hover:border-red-500/15 hover:text-red-400',
          'transition-all duration-150',
          className,
        )}
      >
        <div className="w-6 h-6 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0 group-hover:bg-red-500/10 group-hover:border-red-500/20 transition-colors">
          <LogOut className="w-3 h-3" />
        </div>
        <span>Sign out</span>
      </button>

      {open && (
        <LogoutModal
          onConfirm={confirm}
          onCancel={() => !busy && setOpen(false)}
          busy={busy}
        />
      )}
    </>
  )
}