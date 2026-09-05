// Téléchargement de fichiers via le proxy Next (/api/proxy/...). Le proxy ajoute le
// token JWT (cookie httpOnly) côté serveur — aucun token n'est exposé au JS.
export async function downloadViaProxy(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(path)

  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try {
      const data = await res.json()
      if (typeof data?.message === 'string') message = data.message
    } catch {
      /* corps non JSON */
    }
    throw new Error(message)
  }

  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') ?? ''
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(cd)
  const name = match ? decodeURIComponent(match[1]) : fallbackName

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}