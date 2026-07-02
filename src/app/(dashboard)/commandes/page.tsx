'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ResponsiveTable, type ColDef } from '@/components/ui/responsive-table'
import { useGetCommandes, useDeleteCommande } from '@/hooks/use-commandes'
import { STATUT_COMMANDE } from '@/types/commande'
import type { CommandeClient } from '@/types/commande'

const STATUT_CFG: Record<number, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  0: { variant: 'secondary' },
  1: { variant: 'outline', className: 'border-green-200 bg-green-100 text-green-800' },
  2: { variant: 'default' },
  3: { variant: 'outline', className: 'border-blue-200 bg-blue-100 text-blue-800' },
  4: { variant: 'destructive' },
}

function StatutBadge({ statut }: { statut: number }) {
  const cfg = STATUT_CFG[statut]
  return (
    <Badge variant={cfg?.variant} className={cfg?.className}>
      {STATUT_COMMANDE[statut] ?? String(statut)}
    </Badge>
  )
}

function CouvertureBarre({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const color = clamped >= 100 ? 'bg-green-500' : clamped >= 50 ? 'bg-orange-400' : 'bg-destructive'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{clamped.toFixed(0)}%</span>
    </div>
  )
}

const TABS = [
  { value: 'tous',       label: 'Tous',          filter: () => true },
  { value: 'attente',    label: 'En attente',     filter: (c: CommandeClient) => c.statut === 0 },
  { value: 'prete',      label: 'Prête',          filter: (c: CommandeClient) => c.statut === 1 },
  { value: 'production', label: 'En production',  filter: (c: CommandeClient) => c.statut === 2 },
  { value: 'terminee',   label: 'Terminée',       filter: (c: CommandeClient) => c.statut === 3 },
]

export default function CommandesPage() {
  const { data: commandes, isLoading } = useGetCommandes()
  const deleteMutation = useDeleteCommande()

  const byTab = useMemo(() => {
    if (!commandes) return {}
    return Object.fromEntries(TABS.map((t) => [t.value, commandes.filter(t.filter)]))
  }, [commandes])

  const columns = useMemo<ColDef<CommandeClient>[]>(
    () => [
      {
        key: 'numeroCommande',
        header: 'Numéro',
        cardPrimary: true,
        cell: (c) => (
          <span className="font-mono font-medium">{c.numeroCommande}</span>
        ),
      },
      {
        key: 'titre',
        header: 'Titre',
        cardPrimary: true,
        cell: (c) => (
          <span className="max-w-[180px] truncate">{c.titreCommande ?? '—'}</span>
        ),
      },
      {
        key: 'client',
        header: 'Client / Marque',
        cardPrimary: true,
        cell: (c) => (
          <div className="text-sm">
            <p className="font-medium">{c.client?.nom ?? `#${c.clientId}`}</p>
            {c.marque && (
              <p className="text-muted-foreground">{c.marque.nom}</p>
            )}
          </div>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        cardPrimary: true,
        cell: (c) => <StatutBadge statut={c.statut} />,
      },
      {
        key: 'couverture',
        header: 'Couverture',
        cell: (c) => (
          <CouvertureBarre pct={Number(c.pourcentageRessourcesCouvertes)} />
        ),
      },
      {
        key: 'dateLivraison',
        header: 'Livraison souhaitée',
        cell: (c) => (
          <span className="text-sm text-muted-foreground">
            {c.dateLivraisonSouhaitee
              ? new Date(c.dateLivraisonSouhaitee).toLocaleDateString('fr-FR')
              : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cardPrimary: true,
        headerClassName: 'w-[90px]',
        cell: (c) => {
          const canDelete = c.statut < 2
          return (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href={`/commandes/${c.id}`}>
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
              <PermissionGate module="commandes" mode="write">
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      title={
                        canDelete
                          ? 'Supprimer'
                          : 'Suppression impossible (en production ou terminée)'
                      }
                      disabled={!canDelete || deleteMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                  title="Supprimer cet ordre de fabrication ?"
                  description="Cette action est irréversible."
                  onConfirm={() => deleteMutation.mutate(c.id)}
                />
              </PermissionGate>
            </div>
          )
        },
      },
    ],
    [deleteMutation],
  )

  return (
    <div>
      <PageHeader
        title="Ordres de fabrication"
        action={
          <PermissionGate module="commandes" mode="write">
            <Button size="sm" asChild>
              <Link href="/commandes/nouveau">
                <Plus className="size-4" />
                Nouvelle commande
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <Tabs defaultValue="tous">
        <div className="mb-4 overflow-x-auto">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
                {!isLoading && byTab[t.value]?.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0 text-xs font-medium">
                    {byTab[t.value].length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <ResponsiveTable
              columns={columns}
              data={byTab[t.value] ?? []}
              keyExtractor={(c) => c.id}
              isLoading={isLoading}
              emptyText="Aucun ordre de fabrication."
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
