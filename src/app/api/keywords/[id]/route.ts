import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { KeywordSchema } from '@/lib/validations'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()

    // Toggle enabled
    if ('enabled' in body && Object.keys(body).length === 1) {
      const keyword = await prisma.keyword.update({
        where: { id: params.id },
        data: { enabled: body.enabled },
      })
      return NextResponse.json(keyword)
    }

    // Full update
    const parsed = KeywordSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const keyword = await prisma.keyword.update({
      where: { id: params.id },
      data: parsed.data,
    })

    return NextResponse.json(keyword)
  } catch (error) {
    console.error('Keyword PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update keyword' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.keyword.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Keyword DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete keyword' }, { status: 500 })
  }
}