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
  if (token) outHeaders.set('Authorization', `Bearer ${token}`)
  // Forward the original Content-Type (needed for multipart/form-data boundary;
  // omitting it for GET/HEAD/DELETE is correct — no body to describe)
  const contentType = request.headers.get('Content-Type')
  if (contentType) outHeaders.set('Content-Type', contentType)

  const isBodyless = ['GET', 'HEAD', 'DELETE'].includes(request.method)
  // Use arrayBuffer to preserve binary data (multipart uploads, etc.)
  const body = isBodyless ? undefined : await request.arrayBuffer()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let upstream: Response
  try {
    upstream = await fetch(backendUrl, {
      method: request.method,
      headers: outHeaders,
      body: body !== undefined && body.byteLength > 0 ? body : undefined,
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

  // Read as binary to support file downloads (text() would corrupt binary content)
  const responseBuffer = await upstream.arrayBuffer()

  const responseHeaders: Record<string, string> = {
    'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
  }
  // Forward Content-Disposition so browsers receive the correct filename on download
  const cd = upstream.headers.get('Content-Disposition')
  if (cd) responseHeaders['Content-Disposition'] = cd

  return new NextResponse(responseBuffer.byteLength > 0 ? responseBuffer : null, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
}
