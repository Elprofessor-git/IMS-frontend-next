'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { PermissionGate } from '@/components/auth/permission-gate'
import { OrdreCoupeSheet } from '@/components/coupe/ordre-coupe-sheet'

/**
 * /coupe/{commandeId}/ordre-de-coupe — écran d'ordre de coupe C2, une seule page
 * proche de la feuille Excel : en-tête, colonnes de tailles, plans, restes calculés,
 * matières. Chaque cellule est modifiable ; la grille défile horizontalement sur mobile.
 */
export default function OrdreDeCoupePage() {
  const params = useParams()
  const commandeId = Number(params.commandeId)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Ordre de coupe"
          description="Feuille d'ordre de coupe : tailles, plans, restes, matières. Chaque cellule est modifiable."
        />
        <Button variant="ghost" size="sm" asChild className="mt-6">
          <Link href={`/coupe/${commandeId}`}>
            <ArrowLeft className="size-4" /> Matelas de la commande
          </Link>
        </Button>
      </div>
      <PermissionGate module="coupe" mode="read" fallback={<ForbiddenState moduleLabel="coupe" />}>
        <OrdreCoupeSheet commandeId={commandeId} />
      </PermissionGate>
    </div>
  )
}
