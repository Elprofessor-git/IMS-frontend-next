import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { TOKEN_COOKIE } from '@/lib/auth'

const BACKEND = process.env.API_URL ?? ''
const TIMEOUT_MS = 25_000

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const backendUrl =
    BACKEND + '/' + path.join('/') + (request.nextUrl.search ?? '')

  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_COOKIE)?.value

  const outHeaders = new Headers()
  outHeaders.set('Content-Type', 'application/json')
  if (token) outHeaders.set('Authorization', `Bearer ${token}`)

  const isBodyless = ['GET', 'HEAD', 'DELETE'].includes(request.method)
  const body = isBodyless ? undefined : await request.text()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let upstream: Response
  try {
    upstream = await fetch(backendUrl, {
      method: request.method,
      headers: outHeaders,
      body: body || undefined,
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    return new NextResponse(
      isTimeout
        ? 'Le serveur démarre, réessayez dans quelques secondes.'
        : 'Impossible de joindre le serveur.',
      { status: 503, headers: { 'Content-Type': 'text/plain' } },
    )
  }
  clearTimeout(timeoutId)

  const responseText = await upstream.text()

  return new NextResponse(responseText || null, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  })
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
}
