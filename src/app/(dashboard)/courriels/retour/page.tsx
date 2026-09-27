'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Page de transit après le callback OAuth Google.
 * Elle ne montre qu'un chargement : le résultat est transmis à /courriels via
 * l'URL, puis l'utilisateur est redirigé.
 */
function GmailReturnContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const success = searchParams.get('success') === 'true'
    // Le backend fournit un message d'erreur explicite (403 state, code refusé…) : on le
    // relaie à la page Courriels plutôt que d'afficher un échec générique.
    const error = searchParams.get('error')
    const target = new URLSearchParams({ connexion: success ? 'success' : 'error' })
    if (error) target.set('message', error)
    router.replace(`/courriels?${target}`)
  }, [router, searchParams])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Finalisation de la connexion Gmail…</p>
    </div>
  )
}

export default function GmailReturnPage() {
  return (
    <Suspense>
      <GmailReturnContent />
    </Suspense>
  )
}
