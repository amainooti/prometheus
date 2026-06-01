import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { KeywordSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const enabled = searchParams.get('enabled')

    const keywords = await prisma.keyword.findMany({
      where: {
        ...(category && category !== 'ALL' ? { category: category as any } : {}),
        ...(enabled !== null && enabled !== '' ? { enabled: enabled === 'true' } : {}),
      },
      orderBy: [{ category: 'asc' }, { text: 'asc' }],
    })

    return NextResponse.json(keywords)
  } catch (error) {
    console.error('Keywords GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Bulk import
    if (Array.isArray(body)) {
      const results = await Promise.allSettled(
        body.map(item => {
          const parsed = KeywordSchema.safeParse(item)
          if (!parsed.success) return Promise.reject(parsed.error)
          return prisma.keyword.upsert({
            where: { text_category: { text: parsed.data.text, category: parsed.data.category } },
            update: {},
            create: parsed.data,
          })
        })
      )
      const created = results.filter(r => r.status === 'fulfilled').length
      const failed  = results.filter(r => r.status === 'rejected').length
      return NextResponse.json({ created, failed }, { status: 201 })
    }

    // Single create
    const parsed = KeywordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const keyword = await prisma.keyword.upsert({
      where: { text_category: { text: parsed.data.text, category: parsed.data.category } },
      update: {},
      create: parsed.data,
    })

    return NextResponse.json(keyword, { status: 201 })
  } catch (error) {
    console.error('Keywords POST error:', error)
    return NextResponse.json({ error: 'Failed to create keyword' }, { status: 500 })
  }
}