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
import {
  useGetImportations,
  useDeleteImportation,
} from '@/hooks/use-importations'
import { STATUT_IMPORTATION, MODE_EXPEDITION } from '@/types/fournisseur'
import type { Importation } from '@/types/importation'

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
      {STATUT_IMPORTATION[statut] ?? String(statut)}
    </Badge>
  )
}

const TABS = [
  { value: 'tous',      label: 'Tous',      filter: () => true },
  { value: 'brouillon', label: 'Brouillon', filter: (i: Importation) => i.statut === 0 },
  { value: 'soumise',   label: 'Soumise',   filter: (i: Importation) => i.statut === 1 },
  { value: 'validee',   label: 'Validée',   filter: (i: Importation) => i.statut === 2 },
  { value: 'recue',     label: 'Reçue',     filter: (i: Importation) => i.statut === 3 },
]

export default function ImportationsPage() {
  const { data: importations, isLoading } = useGetImportations()
  const deleteMutation = useDeleteImportation()

  const byTab = useMemo(() => {
    if (!importations) return {}
    return Object.fromEntries(TABS.map((t) => [t.value, importations.filter(t.filter)]))
  }, [importations])

  const columns = useMemo<ColDef<Importation>[]>(
    () => [
      {
        key: 'reference',
        header: 'Référence',
        cardPrimary: true,
        cell: (i) => (
          <span className="font-mono font-medium">{i.referenceImportation}</span>
        ),
      },
      {
        key: 'fournisseur',
        header: 'Fournisseur',
        cardPrimary: true,
        cell: (i) => (
          <span>{i.fournisseur?.nomEntreprise ?? `#${i.fournisseurId}`}</span>
        ),
      },
      {
        key: 'mode',
        header: 'Mode',
        cell: (i) => (
          <span className="text-sm text-muted-foreground">
            {MODE_EXPEDITION[i.modeExpedition] ?? String(i.modeExpedition)}
          </span>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        cardPrimary: true,
        cell: (i) => <StatutBadge statut={i.statut} />,
      },
      {
        key: 'montant',
        header: 'Montant',
        cardPrimary: true,
        headerClassName: 'text-right',
        cell: (i) => (
          <span className="font-mono">
            {Number(i.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            {i.devise ? ` ${i.devise}` : ''}
          </span>
        ),
      },
      {
        key: 'dateReception',
        header: 'Réception prévue',
        cell: (i) => (
          <span className="text-sm text-muted-foreground">
            {i.dateReceptionPrevue
              ? new Date(i.dateReceptionPrevue).toLocaleDateString('fr-FR')
              : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cardPrimary: true,
        headerClassName: 'w-[100px]',
        cell: (i) => {
          const canDelete = i.statut < 2
          return (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" asChild title="Voir">
                <Link href={`/importations/${i.id}`}>
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
              <PermissionGate module="importations" mode="write">
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      title={canDelete ? 'Supprimer' : 'Suppression impossible (validée ou reçue)'}
                      disabled={!canDelete || deleteMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                  title="Supprimer cette importation ?"
                  description="Cette action est irréversible."
                  onConfirm={() => deleteMutation.mutate(i.id)}
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
        title="Importations"
        action={
          <PermissionGate module="importations" mode="write">
            <Button size="sm" asChild>
              <Link href="/importations/nouveau">
                <Plus className="size-4" />
                Nouvelle importation
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
              keyExtractor={(i) => i.id}
              isLoading={isLoading}
              emptyText="Aucune importation trouvée."
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
