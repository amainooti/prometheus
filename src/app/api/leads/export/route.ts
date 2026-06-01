import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PRIORITY_LABELS, STATUS_LABELS, EMAIL_CONFIDENCE_LABELS, ACTIVITY_LABELS, SOURCE_LABELS } from '@/types'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const search     = searchParams.get('search') ?? ''
    const priority   = searchParams.getAll('priority')
    const status     = searchParams.getAll('status')
    const confidence = searchParams.getAll('emailConfidence')

    const where: Prisma.LeadWhereInput = {
      ...(search ? {
        OR: [
          { name:    { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { email:   { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(priority.length   ? { priority:        { in: priority   as any[] } } : {}),
      ...(status.length     ? { status:          { in: status     as any[] } } : {}),
      ...(confidence.length ? { emailConfidence: { in: confidence as any[] } } : {}),
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const headers = [
      'name','role','company','linkedinUrl','twitterUrl','companyWebsite',
      'cryptoNiche','beliefSignal','activityLevel','tags',
      'email','emailSource','emailConfidence','emailVerified','emailType',
      'priority','status','sourceFound','notes','createdAt',
    ]

    const escape = (v: any) => {
      if (v === null || v === undefined) return ''
      const s = Array.isArray(v) ? v.join('; ') : String(v)
      return `"${s.replace(/"/g, '""')}"`
    }

    const rows = [
      headers.join(','),
      ...leads.map(l => [
        escape(l.name),
        escape(l.role),
        escape(l.company),
        escape(l.linkedinUrl),
        escape(l.twitterUrl),
        escape(l.companyWebsite),
        escape(l.cryptoNiche),
        escape(l.beliefSignal),
        escape(l.activityLevel ? ACTIVITY_LABELS[l.activityLevel] : ''),
        escape(l.tags),
        escape(l.email),
        escape(l.emailSource),
        escape(l.emailConfidence ? EMAIL_CONFIDENCE_LABELS[l.emailConfidence] : ''),
        escape(l.emailVerified),
        escape(l.emailType),
        escape(l.priority ? PRIORITY_LABELS[l.priority] : ''),
        escape(l.status ? STATUS_LABELS[l.status] : ''),
        escape(l.sourceFound ? SOURCE_LABELS[l.sourceFound] : ''),
        escape(l.notes),
        escape(l.createdAt.toISOString()),
      ].join(',')),
    ]

    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    })
  } catch (error) {
    console.error('Leads export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}