import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CATEGORY_LABELS } from '@/types'
import { KeywordCategory } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') ?? 'csv'
    const category = searchParams.get('category')

    const keywords = await prisma.keyword.findMany({
      where: category && category !== 'ALL' ? { category: category as KeywordCategory } : {},
      orderBy: [{ category: 'asc' }, { text: 'asc' }],
    })

    if (format === 'json') {
      return new NextResponse(JSON.stringify(keywords, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="keywords.json"',
        },
      })
    }

    // CSV
    const rows = [
      ['text', 'category', 'enabled', 'createdAt'],
      ...keywords.map(k => [
        `"${k.text.replace(/"/g, '""')}"`,
        CATEGORY_LABELS[k.category as KeywordCategory],
        k.enabled ? 'true' : 'false',
        k.createdAt.toISOString(),
      ]),
    ]

    return new NextResponse(rows.map(r => r.join(',')).join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="keywords.csv"',
      },
    })
  } catch (error) {
    console.error('Keywords export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}