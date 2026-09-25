'use client'

import { useParams } from 'next/navigation'
import { Scissors } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SaisieDeCoupe } from '@/components/coupe/saisie-de-coupe'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { PermissionGate } from '@/components/auth/permission-gate'

/**
 * /coupe/{commandeId}/matelas/{matelasId} — écran « Saisie de coupe » scopé à UN
 * matelas, atteint par clic sur une ligne de l'ordre de coupe. Le matelas n'est pas
 * choisi ici : son identité est affichée en en-tête.
 */
export default function SaisieDeCoupePage() {
  const params = useParams()
  const commandeId = Number(params.commandeId)
  const matelasId = Number(params.matelasId)

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Saisie de coupe"
        description="Enregistrer ce qui a réellement été coupé sur ce matelas, et les exports vers une chaîne de production."
      />
      <PermissionGate module="coupe" mode="read" fallback={<ForbiddenState moduleLabel="coupe" />}>
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Scissors className="size-4" />
          Matelas {matelasId} de la commande {commandeId}
        </div>
        <SaisieDeCoupe commandeId={commandeId} matelasId={matelasId} />
      </PermissionGate>
    </div>
  )
}
