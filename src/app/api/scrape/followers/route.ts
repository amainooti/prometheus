// src/app/api/scrape/followers/route.ts
// Thin proxy — forwards the request to the VPS scraper and pipes SSE back.
// All the heavy lifting (Twitter API, email hunting, Claude analysis) runs on
// the VPS which has no timeout limit. Vercel just relays the stream.

import { NextRequest } from 'next/server'

export const maxDuration = 300 // 5 min — Vercel Pro max; stream keeps the connection alive

export async function POST(req: NextRequest) {
  const url    = process.env.REDDIT_SCRAPER_URL?.replace(/\/$/, '')
  const secret = process.env.REDDIT_SCRAPER_SECRET

  if (!url || !secret) {
    return new Response(
      JSON.stringify({ error: 'REDDIT_SCRAPER_URL / REDDIT_SCRAPER_SECRET not set' }),
      { status: 500 },
    )
  }

  const body = await req.json()

  // Forward to VPS
  const upstream = await fetch(`${url}/scrape/followers`, {
    method:  'POST',
    headers: {
      'Content-Type':     'application/json',
      'X-Scraper-Secret': secret,
    },
    body: JSON.stringify(body),
  })

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    return new Response(
      JSON.stringify({ error: `VPS error ${upstream.status}: ${text}` }),
      { status: upstream.status },
    )
  }

  // Pipe the SSE stream straight back to the browser
  return new Response(upstream.body, {
    headers: {
      'Content-Type':                'text/event-stream',
      'Cache-Control':               'no-cache',
      'X-Accel-Buffering':           'no',
      'Access-Control-Allow-Origin': '*',
    },
  })
}