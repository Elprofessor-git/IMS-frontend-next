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
  // L'hôte vient de API_URL, jamais de l'appelant : ce n'est pas un proxy ouvert.
  // En revanche le chemin est fourni par l'appelant, donc « .. » doit être écarté —
  // sans cela, /api/proxy/../interne viserait une route hors du préfixe /api sur
  // le même hôte. On ne restreint pas le jeu de caractères : un content-id
  // d'image inline contient « @ » et « . », et le bannir casserait les logos
  // embarqués dans les emails.
  if (path.some((segment) => segment === '..' || segment === '.' || /[/\\]/.test(segment))) {
    return new NextResponse('Chemin invalide.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

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

  // IP réelle du client, pour le rate limiting backend du endpoint public.
  // Au bord (Vercel), x-forwarded-for est posé par la plateforme et le client ne
  // peut pas le forger ; le backend ne fait confiance qu'à ce proxy (KnownProxies
  // vide côté ASP.NET). On ne transmet PAS les en-têtes bruts entrants : seul ce
  // que la plateforme a établi. x-real-ip sert de repli.
  const clientIp =
    request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
  if (clientIp) outHeaders.set('X-Forwarded-For', clientIp)

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
