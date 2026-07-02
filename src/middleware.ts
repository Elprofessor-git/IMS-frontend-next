import { type NextRequest, NextResponse } from 'next/server'
import { TOKEN_COOKIE, isTokenExpired } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(TOKEN_COOKIE)?.value

  // Redirection de la racine
  if (pathname === '/') {
    if (token && !isTokenExpired(token)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Routes publiques
  if (pathname.startsWith('/login')) return NextResponse.next()

  // Routes protégées : token absent ou expiré → /login
  if (!token || isTokenExpired(token)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('reason', token ? 'expired' : 'unauthenticated')
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Exclut les assets statiques, les routes API et les fichiers publics
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
}
