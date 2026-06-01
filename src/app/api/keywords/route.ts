import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createKeywordSchema } from '@/lib/validations'

export async function GET() {
  try {
    const keywords = await prisma.keyword.findMany()
    return NextResponse.json(keywords)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const validatedData = createKeywordSchema.parse(data)

    const keyword = await prisma.keyword.create({
      data: validatedData,
    })

    return NextResponse.json(keyword, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create keyword' }, { status: 500 })
  }
}
