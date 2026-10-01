// Les URLs de pièces jointes et d'images intégrées sont produites par le BACKEND
// sous forme de chemins absolus côté API (`/api/gmail/...`). Or le navigateur
// interroge le serveur Next, pas l'API : sans réécriture, un <img src> ou un
// <a href> de téléchargement partirait vers une route inexistante et afficherait
// « 404 » ou une image cassée.
//
// Le proxy Next (/api/proxy/[...path]) relaie la requête vers le backend en
// ajoutant le jeton du cookie httpOnly, et transmet le binaire tel quel
// (arrayBuffer + Content-Disposition), ce qui convient aux téléchargements.

const PROXY_BASE = '/api/proxy'

/** Chemin d'API déjà absolu côté backend → URL servie par le proxy. */
export function toApiUrl(backendPath: string): string {
  if (!backendPath) return ''
  if (/^https?:\/\//i.test(backendPath)) return backendPath
  const normalized = backendPath.startsWith('/') ? backendPath : `/${backendPath}`
  return `${PROXY_BASE}${normalized}`
}

/**
 * Réécrit dans un HTML déjà assaini les URL d'images intégrées pour qu'elles passent
 * par le proxy.
 *
 * Seules les URL pointant vers NOS endpoints (`/api/gmail/messages/.../inline/...`)
 * sont réécrites. Les src="http(s)://..." externes, laissés intacts par
 * l'assainisseur, ne sont pas touchés : un chargement d'image distante suit alors
 * la charge utile réelle de l'email, et l'utilisateur en est informé (voir
 * <img> rendu avec un indicateur).
 */
export function rewriteInlineImageUrls(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/(src\s*=\s*)(["'])\/api\/gmail\//gi, `$1$2${PROXY_BASE}/api/gmail/`)
}
