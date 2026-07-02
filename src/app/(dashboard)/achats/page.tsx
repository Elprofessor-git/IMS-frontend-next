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
import { useGetAchats, useDeleteAchat } from '@/hooks/use-achats'
import { STATUT_ACHAT } from '@/types/fournisseur'
import type { Achat } from '@/types/achat'

const STATUT_BADGE: Record<number, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  0: { variant: 'secondary' },
  1: { variant: 'outline' },
  2: { variant: 'default' },
  3: { variant: 'outline', className: 'border-green-200 bg-green-100 text-green-800' },
  4: { variant: 'destructive' },
}

function StatutBadge({ statut }: { statut: number }) {
  const cfg = STATUT_BADGE[statut]
  return (
    <Badge variant={cfg?.variant} className={cfg?.className}>
      {STATUT_ACHAT[statut] ?? String(statut)}
    </Badge>
  )
}

const TABS = [
  { value: 'tous',      label: 'Tous',      filter: () => true },
  { value: 'brouillon', label: 'Brouillon', filter: (a: Achat) => a.statut === 0 },
  { value: 'soumis',    label: 'Soumis',    filter: (a: Achat) => a.statut === 1 },
  { value: 'confirme',  label: 'Confirmé',  filter: (a: Achat) => a.statut === 2 },
  { value: 'livre',     label: 'Livré',     filter: (a: Achat) => a.statut === 3 },
]

export default function AchatsPage() {
  const { data: achats, isLoading } = useGetAchats()
  const deleteMutation = useDeleteAchat()

  const byTab = useMemo(() => {
    if (!achats) return {}
    return Object.fromEntries(TABS.map((t) => [t.value, achats.filter(t.filter)]))
  }, [achats])

  const columns = useMemo<ColDef<Achat>[]>(
    () => [
      {
        key: 'numeroAchat',
        header: 'Numéro',
        cardPrimary: true,
        cell: (a) => <span className="font-mono font-medium">{a.numeroAchat}</span>,
      },
      {
        key: 'fournisseur',
        header: 'Fournisseur',
        cardPrimary: true,
        cell: (a) => (
          <span>{a.fournisseur?.nomEntreprise ?? `#${a.fournisseurId}`}</span>
        ),
      },
      {
        key: 'commande',
        header: 'Commande',
        cell: (a) => (
          <span className="text-sm text-muted-foreground">
            {a.commandeClient
              ? a.commandeClient.numeroCommande ?? `#${a.commandeClientId}`
              : `#${a.commandeClientId}`}
          </span>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        cardPrimary: true,
        cell: (a) => <StatutBadge statut={a.statut} />,
      },
      {
        key: 'montant',
        header: 'Montant',
        cardPrimary: true,
        headerClassName: 'text-right',
        cell: (a) => (
          <span className="font-mono">
            {Number(a.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            {a.devise ? ` ${a.devise}` : ''}
          </span>
        ),
      },
      {
        key: 'dateLivraison',
        header: 'Livraison prévue',
        cell: (a) => (
          <span className="text-sm text-muted-foreground">
            {a.dateLivraisonPrevue
              ? new Date(a.dateLivraisonPrevue).toLocaleDateString('fr-FR')
              : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cardPrimary: true,
        headerClassName: 'w-[100px]',
        cell: (a) => {
          const canDelete = a.statut < 2
          return (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" asChild title="Voir">
                <Link href={`/achats/${a.id}`}>
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
              <PermissionGate module="achats" mode="write">
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      title={canDelete ? 'Supprimer' : 'Suppression impossible (confirmé ou livré)'}
                      disabled={!canDelete || deleteMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                  title="Supprimer cet achat ?"
                  description="Cette action est irréversible."
                  onConfirm={() => deleteMutation.mutate(a.id)}
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
        title="Achats"
        action={
          <PermissionGate module="achats" mode="write">
            <Button size="sm" asChild>
              <Link href="/achats/nouveau">
                <Plus className="size-4" />
                Nouvel achat
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
                {!isLoading && byTab[t.value] !== undefined && byTab[t.value].length > 0 && (
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
              keyExtractor={(a) => a.id}
              isLoading={isLoading}
              emptyText="Aucun achat trouvé."
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
