'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error.message || 'Quelque chose s\'est mal passé.'}
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  )
}
