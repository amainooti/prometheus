// src/app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'prometheus_session'

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}

// Also handle GET so a plain link/redirect to /api/auth/logout works
export async function GET(_req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}