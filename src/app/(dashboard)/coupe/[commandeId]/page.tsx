'use client'

import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { RapportCoupeSection } from '@/components/rapport-coupe/rapport-coupe-section'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { PermissionGate } from '@/components/auth/permission-gate'

export default function CoupeCommandePage() {
  const params = useParams()
  const commandeId = Number(params.commandeId)

  return (
    <div>
      <PageHeader
        title="Module Coupe"
        description="Gestion de la coupe et des exports de cette commande."
      />
      <PermissionGate module="coupe" mode="read" fallback={<ForbiddenState moduleLabel="coupe" />}>
        <RapportCoupeSection commandeId={commandeId} />
      </PermissionGate>
    </div>
  )
}