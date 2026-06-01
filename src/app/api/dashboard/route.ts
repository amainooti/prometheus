import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      totalLeads,
      byPriority,
      byStatus,
      verifiedEmails,
      recentLeads,
    ] = await Promise.all([
      prisma.lead.count(),

      prisma.lead.groupBy({
        by: ['priority'],
        _count: { priority: true },
      }),

      prisma.lead.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      prisma.lead.count({ where: { emailVerified: true } }),

      prisma.lead.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          role: true,
          company: true,
          priority: true,
          status: true,
          email: true,
          emailVerified: true,
          cryptoNiche: true,
          createdAt: true,
        },
      }),
    ])

    const aPlus = byPriority.find(r => r.priority === 'A_PLUS')?._count.priority ?? 0
    const readyToContact = byStatus.find(r => r.status === 'READY_TO_CONTACT')?._count.status ?? 0

    return NextResponse.json({
      totalLeads,
      aPlus,
      verifiedEmails,
      readyToContact,
      byPriority,
      byStatus,
      recentLeads,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}