import { Lock } from 'lucide-react'

export function ForbiddenState({
  moduleLabel,
}: {
  moduleLabel?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
      <Lock className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">
        Accès refusé{moduleLabel ? ` : module « ${moduleLabel} » non autorisé` : ''}
      </p>
      <p className="text-xs text-muted-foreground">
        Votre rôle ne dispose pas des droits de lecture nécessaires. Contactez un administrateur.
      </p>
    </div>
  )
}