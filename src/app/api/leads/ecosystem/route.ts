import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/leads/ecosystems
// Returns distinct ecosystems that exist in the leads table, sorted by count desc
export async function GET() {
  try {
    const rows = await prisma.lead.groupBy({
      by: ['ecosystem'],
      _count: { ecosystem: true },
      orderBy: { _count: { ecosystem: 'desc' } },
    })

    const result = rows
      .filter(r => r.ecosystem != null && r.ecosystem.trim() !== '')
      .map(r => ({
        ecosystem: r.ecosystem as string,
        count:     r._count.ecosystem,
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Ecosystems GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch ecosystems' }, { status: 500 })
  }
}