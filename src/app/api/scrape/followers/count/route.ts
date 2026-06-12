// src/app/api/scrape/followers/count/route.ts

import { NextRequest, NextResponse } from 'next/server'

const TWITTER_API_BASE = 'https://api.twitterapi.io'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.replace('@', '').trim()

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const apiKey = process.env.TWITTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'TWITTER_API_KEY not set' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `${TWITTER_API_BASE}/twitter/user/info?userName=${encodeURIComponent(username)}`,
      { headers: { 'x-api-key': apiKey } },
    )

    if (res.status === 404) {
      return NextResponse.json({ error: `@${username} not found` }, { status: 404 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Twitter API error ${res.status}` }, { status: 502 })
    }

    const body = await res.json()

    // twitterapi.io /twitter/user/info returns { data: { followers, name, userName, ... }, status }
    // Field is `followers` not `followers_count`
    const user = body.data ?? body.user ?? body

    const followersCount =
      user.followers        ??   // twitterapi.io /user/info
      user.followers_count  ??   // legacy fallback
      user.followersCount   ??   // just in case
      0

    return NextResponse.json({
      username:       user.userName    ?? user.screen_name ?? username,
      displayName:    user.name        ?? username,
      followersCount,
    })
  } catch (e: any) {
    console.error('[followers/count] Error:', e.message)
    return NextResponse.json({ error: e.message ?? 'Lookup failed' }, { status: 500 })
  }
}