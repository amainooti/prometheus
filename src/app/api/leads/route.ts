import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LeadFormSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const search     = searchParams.get('search') ?? ''
    const priority   = searchParams.getAll('priority')
    const status     = searchParams.getAll('status')
    const confidence = searchParams.getAll('emailConfidence')
    const verified   = searchParams.get('emailVerified')
    const activity   = searchParams.getAll('activityLevel')
    const source     = searchParams.getAll('sourceFound')
    const ecosystem  = searchParams.get('ecosystem') ?? ''  // ← NEW
    const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit      = Math.min(100, parseInt(searchParams.get('limit') ?? '50'))
    const sortBy     = searchParams.get('sortBy') ?? 'createdAt'
    const sortDir    = (searchParams.get('sortDir') ?? 'desc') as 'asc' | 'desc'

    const where: Prisma.LeadWhereInput = {
      ...(search ? {
        OR: [
          { name:        { contains: search, mode: 'insensitive' } },
          { company:     { contains: search, mode: 'insensitive' } },
          { role:        { contains: search, mode: 'insensitive' } },
          { email:       { contains: search, mode: 'insensitive' } },
          { cryptoNiche: { contains: search, mode: 'insensitive' } },
          { ecosystem:   { contains: search, mode: 'insensitive' } }, // ← NEW
        ],
      } : {}),
      ...(priority.length   ? { priority:        { in: priority   as any[] } } : {}),
      ...(status.length     ? { status:          { in: status     as any[] } } : {}),
      ...(confidence.length ? { emailConfidence: { in: confidence as any[] } } : {}),
      ...(activity.length   ? { activityLevel:   { in: activity   as any[] } } : {}),
      ...(source.length     ? { sourceFound:     { in: source     as any[] } } : {}),
      ...(ecosystem         ? { ecosystem:       { contains: ecosystem, mode: 'insensitive' } } : {}), // ← NEW
      ...(verified !== null && verified !== '' ? { emailVerified: verified === 'true' } : {}),
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({ leads, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Leads GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = LeadFormSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data

    // Duplicate check — same name + same email (more reliable than name+company)
    const existing = await prisma.lead.findFirst({
      where: {
        name: { equals: data.name, mode: 'insensitive' },
        ...(data.email ? { email: { equals: data.email, mode: 'insensitive' } } : {
          company: { equals: data.company ?? '', mode: 'insensitive' },
        }),
      },
      select: { id: true, name: true, company: true, email: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Duplicate lead', duplicate: existing },
        { status: 409 }
      )
    }

    // Clean empty strings to null
    const clean = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )

    const lead = await prisma.lead.create({ data: clean as any })
    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('Lead POST error:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}