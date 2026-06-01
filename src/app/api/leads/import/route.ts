import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LeadFormSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json() as { rows: Record<string, string>[] }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    const PRIORITY_MAP: Record<string, string> = {
      'a+': 'A_PLUS', 'a plus': 'A_PLUS',
      'a':  'A', 'b': 'B', 'c': 'C', 'd': 'D',
    }
    const STATUS_MAP: Record<string, string> = {
      'new': 'NEW', 'reviewed': 'REVIEWED',
      'email found': 'EMAIL_FOUND', 'email verified': 'EMAIL_VERIFIED',
      'ready to contact': 'READY_TO_CONTACT', 'contacted': 'CONTACTED',
      'replied': 'REPLIED', 'not relevant': 'NOT_RELEVANT',
      'do not contact': 'DO_NOT_CONTACT',
    }
    const CONFIDENCE_MAP: Record<string, string> = {
      'high': 'HIGH', 'medium': 'MEDIUM', 'low': 'LOW',
      'do not contact': 'DO_NOT_CONTACT',
    }
    const ACTIVITY_MAP: Record<string, string> = {
      'very active': 'VERY_ACTIVE', 'active': 'ACTIVE',
      'moderate': 'MODERATE', 'low': 'LOW', 'unknown': 'UNKNOWN',
    }

    const map = (dict: Record<string, string>, val?: string) =>
      val ? (dict[val.toLowerCase()] ?? undefined) : undefined

    const results = { created: 0, skipped: 0, errors: [] as string[] }

    for (const row of rows) {
      try {
        const parsed = LeadFormSchema.safeParse({
          name:            row.name?.trim(),
          linkedinUrl:     row.linkedinUrl?.trim()    || row.linkedin?.trim()    || '',
          twitterUrl:      row.twitterUrl?.trim()     || row.twitter?.trim()     || '',
          role:            row.role?.trim()            || '',
          company:         row.company?.trim()         || '',
          companyWebsite:  row.companyWebsite?.trim()  || row.website?.trim()    || '',
          cryptoNiche:     row.cryptoNiche?.trim()     || row.niche?.trim()      || '',
          beliefSignal:    row.beliefSignal?.trim()    || '',
          activityLevel:   map(ACTIVITY_MAP,   row.activityLevel)   ?? 'UNKNOWN',
          tags:            row.tags ? row.tags.split(';').map((t: string) => t.trim()).filter(Boolean) : [],
          email:           row.email?.trim()           || '',
          emailSource:     row.emailSource?.trim()     || '',
          emailConfidence: map(CONFIDENCE_MAP, row.emailConfidence) as any,
          emailVerified:   row.emailVerified?.toLowerCase() === 'true',
          emailType:       (['PERSONAL','COMPANY','UNKNOWN'].includes(row.emailType?.toUpperCase()))
                             ? row.emailType.toUpperCase() as any : 'UNKNOWN',
          priority:        map(PRIORITY_MAP,   row.priority) as any   ?? 'C',
          status:          map(STATUS_MAP,     row.status)   as any   ?? 'NEW',
          sourceFound:     row.sourceFound?.trim() || row.source?.trim() || undefined,
          notes:           row.notes?.trim()           || '',
        })

        if (!parsed.success) {
          results.errors.push(`Row "${row.name}": ${parsed.error.errors[0]?.message}`)
          results.skipped++
          continue
        }

        // Skip duplicates silently
        const exists = await prisma.lead.findFirst({
          where: {
            name:    { equals: parsed.data.name,    mode: 'insensitive' },
            company: { equals: parsed.data.company ?? '', mode: 'insensitive' },
          },
          select: { id: true },
        })

        if (exists) { results.skipped++; continue }

        const clean = Object.fromEntries(
          Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v])
        )
        await prisma.lead.create({ data: clean as any })
        results.created++
      } catch (e: any) {
        results.errors.push(`Row "${row.name}": ${e.message}`)
        results.skipped++
      }
    }

    return NextResponse.json(results, { status: 201 })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}