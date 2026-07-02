import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { TOKEN_COOKIE } from '@/lib/auth'

const BACKEND = process.env.API_URL ?? ''

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

  const upstream = await fetch(backendUrl, {
    method: request.method,
    headers: outHeaders,
    body: body || undefined,
  })

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
