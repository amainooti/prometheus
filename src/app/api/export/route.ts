import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format') || 'json'
    const leads = await prisma.lead.findMany()

    if (format === 'csv') {
      const csv = convertToCSV(leads)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="leads.csv"',
        },
      })
    }

    return NextResponse.json(leads)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}

function convertToCSV(data: any[]) {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csv = [headers.join(','), ...data.map(row => headers.map(h => row[h]).join(','))].join('\n')

  return csv
}
