// src/app/api/leads/dedup/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { names = [], emails = [] } = await req.json()

    const cleanEmails = emails.filter(Boolean)

    const [byName, byEmail] = await Promise.all([
      names.length
        ? prisma.lead.findMany({
            where: { name: { in: names, mode: 'insensitive' } },
            select: { name: true },
          })
        : [],
      cleanEmails.length
        ? prisma.lead.findMany({
            where: { email: { in: cleanEmails } },
            select: { email: true },
          })
        : [],
    ])

    return NextResponse.json({
      names:  byName.map((l: { name: string }) => l.name.toLowerCase().trim()),
      emails: byEmail
        .map((l: { email: string | null }) => l.email?.toLowerCase().trim())
        .filter(Boolean),
    })
  } catch (e: any) {
    console.error('[dedup]', e.message)
    return NextResponse.json({ names: [], emails: [] }, { status: 500 })
  }
}