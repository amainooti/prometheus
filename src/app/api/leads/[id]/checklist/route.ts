import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()

    const checklist = await prisma.emailChecklist.upsert({
      where:  { leadId: params.id },
      update: { ...body, updatedAt: new Date() },
      create: { leadId: params.id, ...body },
    })

    return NextResponse.json(checklist)
  } catch (error) {
    console.error('Checklist PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 })
  }
}