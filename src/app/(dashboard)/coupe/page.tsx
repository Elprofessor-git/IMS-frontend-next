'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PaginatedResponsiveTable } from '@/components/shared/paginated-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KEY_MATELAS } from '@/hooks/use-matelas'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { MatelasGlobal } from '@/types/matelas'

export default function CoupePage() {
  const { data: matelas = [], isLoading } = useQuery({
    queryKey: KEY_MATELAS,
    queryFn: () => apiClient.get<MatelasGlobal[]>('/api/Matelas'),
  })

  const [recherche, setRecherche] = useState('')

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    if (!q) return matelas
    return matelas.filter(
      (m) =>
        m.NumeroMatelas.toLowerCase().includes(q) ||
        m.NumeroCommande.toLowerCase().includes(q),
    )
  }, [matelas, recherche])

  return (
    <div>
      <PageHeader
        title="Module Coupe"
        description="Suivi transversal des matelas à travers toutes les commandes."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Rechercher un matelas ou une commande…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">
          {filtres.length} matelas
        </span>
      </div>

      <PaginatedResponsiveTable
        label="matelas"
        data={filtres}
        isLoading={isLoading}
        emptyText="Aucun matelas pour l'instant."
        columns={[
          {
            key: 'NumeroMatelas',
            header: 'Matelas',
            cardPrimary: true,
            cell: (m: MatelasGlobal) => (
              <span className="font-medium">{m.NumeroMatelas}</span>
            ),
          },
          {
            key: 'NumeroCommande',
            header: 'Commande',
            cell: (m: MatelasGlobal) => (
              <span className="text-muted-foreground">{m.NumeroCommande}</span>
            ),
          },
          {
            key: 'DateMatelas',
            header: 'Date',
            cell: (m: MatelasGlobal) => (
              <span className="text-muted-foreground">
                {new Date(m.DateMatelas).toLocaleDateString('fr-FR')}
              </span>
            ),
          },
          {
            key: 'PiecePliage',
            header: 'Pliage',
            cell: (m: MatelasGlobal) => (
              <span className="text-muted-foreground">{m.PiecePliage}</span>
            ),
          },
          {
            key: 'CoupeEstimee',
            header: 'Coupe est.',
            cell: (m: MatelasGlobal) => (
              <span className="text-muted-foreground">{m.CoupeEstimee}</span>
            ),
          },
          {
            key: 'NombreCoupes',
            header: 'Coupes',
            cell: (m: MatelasGlobal) => (
              <Badge variant="outline">{m.NombreCoupes}</Badge>
            ),
          },
          {
            key: 'actions',
            header: '',
            headerClassName: 'w-[80px]',
            cell: (m: MatelasGlobal) => (
              <div className="flex items-center justify-end">
                <Button variant="ghost" size="icon-sm" asChild title="Rapport de coupe de la commande">
                  <Link href={`/commandes/${m.CommandeId}`}>
                    <Eye className="size-3.5" />
                  </Link>
                </Button>
              </div>
            ),
          },
        ]}
        keyExtractor={(m: MatelasGlobal) => m.Id}
      />
    </div>
  )
}
