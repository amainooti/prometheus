// src/app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'prometheus_session'
const SESSION_VALUE  = 'authenticated'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      console.error('[auth] ADMIN_PASSWORD not set in environment')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    if (!password || password !== adminPassword) {
      // Artificial delay to slow brute-force
      await new Promise(r => setTimeout(r, 800))
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })

    res.cookies.set(SESSION_COOKIE, SESSION_VALUE, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   COOKIE_MAX_AGE,
      path:     '/',
    })

    return res
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}