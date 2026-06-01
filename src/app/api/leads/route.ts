import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLeadSchema } from '@/lib/validations'

export async function GET() {
  try {
    const leads = await prisma.lead.findMany()
    return NextResponse.json(leads)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const validatedData = createLeadSchema.parse(data)

    const lead = await prisma.lead.create({
      data: validatedData,
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
