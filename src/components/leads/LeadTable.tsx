'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Mail, MailCheck } from 'lucide-react'
import { StatusBadge, PriorityBadge, ConfidenceBadge } from './LeadStatusBadge'
import { cn } from '@/lib/utils'
import type { Lead } from '@prisma/client'

interface LeadTableProps {
  leads:   Lead[]
  loading: boolean
}

export function LeadTable({ leads, loading }: LeadTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo<ColumnDef<Lead>[]>(() => [
    {
      accessorKey: 'priority',
      header: 'P',
      size: 44,
      cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <Link
          href={`/leads/${row.original.id}`}
          className="font-medium text-foreground hover:text-primary transition-colors truncate block max-w-[160px]"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'role_company',
      header: 'Role / Company',
      cell: ({ row }) => {
        const { role, company } = row.original
        return (
          <div className="min-w-0">
            {role    && <p className="text-xs truncate max-w-[140px]">{role}</p>}
            {company && <p className="text-xs text-muted-foreground truncate max-w-[140px]">{company}</p>}
            {!role && !company && <span className="text-muted-foreground/40 text-xs">—</span>}
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const { email, emailVerified, emailConfidence } = row.original
        if (!email) return <span className="text-muted-foreground/40 text-xs">—</span>
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            {emailVerified
              ? <MailCheck className="w-3.5 h-3.5 text-green-400 shrink-0" />
              : <Mail      className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <span className="text-xs truncate max-w-[140px]">{email}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'emailConfidence',
      header: 'Confidence',
      cell: ({ row }) => row.original.emailConfidence
        ? <ConfidenceBadge confidence={row.original.emailConfidence} />
        : <span className="text-muted-foreground/40 text-xs">—</span>,
    },
    {
      id: 'links',
      header: 'Links',
      cell: ({ row }) => {
        const { linkedinUrl, twitterUrl } = row.original
        return (
          <div className="flex items-center gap-1.5">
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 flex items-center gap-0.5">
                in <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {twitterUrl && (
              <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 flex items-center gap-0.5">
                𝕏 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {!linkedinUrl && !twitterUrl && <span className="text-muted-foreground/40 text-xs">—</span>}
          </div>
        )
      },
    },
    {
      accessorKey: 'cryptoNiche',
      header: 'Niche',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate block max-w-[100px]">
          {row.original.cryptoNiche ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Added',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.original.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      ),
    },
  ], [])

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  })

  if (loading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0">
            <div className="h-4 w-8 bg-secondary animate-pulse rounded" />
            <div className="h-4 w-32 bg-secondary animate-pulse rounded" />
            <div className="h-4 w-24 bg-secondary animate-pulse rounded" />
            <div className="h-4 w-20 bg-secondary animate-pulse rounded ml-auto" />
          </div>
        ))}
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="border border-border rounded-lg py-16 text-center">
        <p className="text-sm text-muted-foreground">No leads found.</p>
        <Link href="/leads/new" className="text-sm text-primary hover:underline mt-1 inline-block">
          Add your first lead →
        </Link>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-border bg-secondary/50">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : (
                      header.column.getCanSort() ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc'  ? <ArrowUp   className="w-3 h-3" /> :
                           header.column.getIsSorted() === 'desc' ? <ArrowDown className="w-3 h-3" /> :
                           <ArrowUpDown className="w-3 h-3 opacity-40" />}
                        </button>
                      ) : flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}