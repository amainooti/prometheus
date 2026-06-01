import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const keywords = await prisma.keyword.findMany({
      where: { enabled: true },
      select: { text: true, category: true },
      orderBy: { text: 'asc' },
    })

    const grouped = keywords.reduce((acc, kw) => {
      if (!acc[kw.category]) acc[kw.category] = []
      acc[kw.category].push(kw.text)
      return acc
    }, {} as Record<string, string[]>)

    return NextResponse.json(grouped)
  } catch (error) {
    console.error('Query options error:', error)
    return NextResponse.json({ error: 'Failed to load keyword options' }, { status: 500 })
  }
}