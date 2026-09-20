'use client'

import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { RapportCoupeSection } from '@/components/rapport-coupe/rapport-coupe-section'

export default function CoupeCommandePage() {
  const params = useParams()
  const commandeId = Number(params.commandeId)

  return (
    <div>
      <PageHeader
        title="Module Coupe"
        description="Gestion de la coupe et des exports de cette commande."
      />
      <RapportCoupeSection commandeId={commandeId} />
    </div>
  )
}
