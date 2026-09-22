'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Layers, Scissors } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { RapportCoupeSection } from '@/components/rapport-coupe/rapport-coupe-section'
import { OrdreDeCoupeSection } from '@/components/rapport-coupe/ordre-de-coupe-section'
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { PermissionGate } from '@/components/auth/permission-gate'

export default function CoupeCommandePage() {
  const params = useParams()
  const commandeId = Number(params.commandeId)
  const [tab, setTab] = useState('rapport')

  return (
    <div>
      <PageHeader
        title="Module Coupe"
        description="Gestion de la coupe et des exports de cette commande."
      />
      <PermissionGate module="coupe" mode="read" fallback={<ForbiddenState moduleLabel="coupe" />}>
        <Tabs value={tab} onValueChange={setTab} className="max-w-6xl">
          <TabsList variant="line" className="mb-4">
            <TabsTrigger value="rapport">
              <Scissors className="size-4" />
              Rapport de coupe
            </TabsTrigger>
            <TabsTrigger value="ordre">
              <Layers className="size-4" />
              Ordre de coupe
            </TabsTrigger>
          </TabsList>
          <TabsContent value="rapport">
            <RapportCoupeSection commandeId={commandeId} />
          </TabsContent>
          <TabsContent value="ordre">
            <OrdreDeCoupeSection commandeId={commandeId} />
          </TabsContent>
        </Tabs>
      </PermissionGate>
    </div>
  )
}