// src/app/api/dashboard/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now       = new Date()
    const weekAgo   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalLeads,
      totalWithEmail,
      emailsThisWeek,
      emailsThisMonth,
      bySource,
      byEcosystem,
      recentLeads,
      totalSaved,
    ] = await Promise.all([

      // Total profiles saved
      prisma.lead.count(),

      // Total with a real email
      prisma.lead.count({
        where: { email: { not: null } },
      }),

      // Emails found this week
      prisma.lead.count({
        where: {
          email:     { not: null },
          createdAt: { gte: weekAgo },
        },
      }),

      // Emails found this month
      prisma.lead.count({
        where: {
          email:     { not: null },
          createdAt: { gte: monthAgo },
        },
      }),

      // Breakdown by source (X_TWITTER, REDDIT, BITCOINTALK, etc.)
      prisma.lead.groupBy({
        by:     ['sourceFound'],
        _count: { sourceFound: true },
        orderBy: { _count: { sourceFound: 'desc' } },
      }),

      // Breakdown by ecosystem — top 10
      prisma.lead.groupBy({
        by:     ['ecosystem'],
        _count: { ecosystem: true },
        orderBy: { _count: { ecosystem: 'desc' } },
        take:   10,
      }),

      // Recent 6 leads with email
      prisma.lead.findMany({
        where:   { email: { not: null } },
        take:    6,
        orderBy: { createdAt: 'desc' },
        select: {
          id:          true,
          name:        true,
          email:       true,
          ecosystem:   true,
          sourceFound: true,
          twitterUrl:  true,
          createdAt:   true,
        },
      }),

      // Total saved (all leads regardless of email)
      prisma.lead.count(),
    ])

    // Email hit rate
    const emailHitRate = totalLeads > 0
      ? Math.round((totalWithEmail / totalLeads) * 100)
      : 0

    // Source labels
    const SOURCE_LABELS: Record<string, string> = {
      X_TWITTER:   'X / Twitter',
      REDDIT:      'Reddit',
      BITCOINTALK: 'Bitcointalk',
      GITHUB:      'GitHub',
      LINKEDIN:    'LinkedIn',
      FARCASTER:   'Farcaster',
      SUBSTACK:    'Substack',
      MANUAL:      'Manual',
      UNKNOWN:     'Unknown',
    }

    const sourceBreakdown = bySource
      .filter(r => r.sourceFound)
      .map(r => ({
        source: SOURCE_LABELS[r.sourceFound ?? ''] ?? r.sourceFound ?? 'Unknown',
        count:  r._count.sourceFound,
      }))

    const ecosystemBreakdown = byEcosystem
      .filter(r => r.ecosystem)
      .map(r => ({
        ecosystem: r.ecosystem ?? 'Unknown',
        count:     r._count.ecosystem,
      }))

    return NextResponse.json({
      totalLeads,
      totalWithEmail,
      emailsThisWeek,
      emailsThisMonth,
      emailHitRate,
      sourceBreakdown,
      ecosystemBreakdown,
      recentLeads,
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}