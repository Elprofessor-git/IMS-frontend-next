'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Layers } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { OrdreDeCoupeSection } from '@/components/coupe/ordre-de-coupe-section'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { PermissionGate } from '@/components/auth/permission-gate'

/**
 * /coupe/{commandeId} — UN SEUL onglet « Ordre de coupe » (fusion des anciens onglets
 * « Plan de coupe » et « Ordre de coupe »). C'est ici qu'on planifie les matelas
 * (créer / modifier / supprimer un matelas et son plan) ; cliquer une ligne de matelas
 * ouvre l'écran « Saisie de coupe » de ce matelas.
 */
export default function CoupeCommandePage() {
  const params = useParams()
  const commandeId = Number(params.commandeId)
  const [tab, setTab] = useState('ordre')

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Module Coupe"
          description="Ordre de coupe de la commande : planifier les matelas, puis saisir la coupe de chaque matelas."
        />
        <Button variant="ghost" size="sm" asChild className="mt-6">
          <Link href="/coupe">Tableau de bord Coupe</Link>
        </Button>
      </div>
      <PermissionGate module="coupe" mode="read" fallback={<ForbiddenState moduleLabel="coupe" />}>
        <Tabs value={tab} onValueChange={setTab} className="max-w-6xl">
          <TabsList variant="line" className="mb-4">
            <TabsTrigger value="ordre">
              <Layers className="size-4" />
              Ordre de coupe
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ordre">
            <OrdreDeCoupeSection commandeId={commandeId} />
          </TabsContent>
        </Tabs>
      </PermissionGate>
    </div>
  )
}
