import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { TOKEN_COOKIE, isTokenExpired } from '@/lib/auth'

// POST /api/session — stocke le token JWT en cookie httpOnly
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { token?: string }
  const token = body.token

  if (!token || isTokenExpired(token)) {
    return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 h — aligné avec l'expiration backend
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/session — logout : efface le cookie
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_COOKIE)
  return NextResponse.json({ ok: true })
}
