'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2, Pencil, Eye, FileText, Clock, CheckCircle2, Send, Ban, X, LayoutGrid, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PaginatedResponsiveTable } from '@/components/shared/paginated-table'
import { PermissionGate } from '@/components/auth/permission-gate'
import { type ColDef } from '@/components/ui/responsive-table'
import { useGetFactures, useGetFacture, useDeleteFacture } from '@/hooks/use-factures'
import { STATUT_FACTURE_LABELS } from '@/types/facture'
import type { FactureListDto } from '@/types/facture'
import { toast } from 'sonner'
import { downloadViaProxy } from '@/lib/download'
import { FactureDetailDialog } from '@/components/factures/facture-detail-dialog'
import { FactureFormDialog } from '@/components/factures/facture-form-dialog'

const STATUT_CFG: Record<number, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string; icon?: React.ReactNode }> = {
  0: { variant: 'outline', className: 'border-amber-200 bg-amber-100 text-amber-800', icon: <FileText className="size-3.5" /> },
  1: { variant: 'outline', className: 'border-blue-200 bg-blue-100 text-blue-800', icon: <Send className="size-3.5" /> },
  2: { variant: 'outline', className: 'border-green-200 bg-green-100 text-green-800', icon: <CheckCircle2 className="size-3.5" /> },
  3: { variant: 'destructive', icon: <Ban className="size-3.5" /> },
}

function StatutBadge({ statut }: { statut: number }) {
  const cfg = STATUT_CFG[statut]
  return (
    <Badge variant={cfg?.variant} className={cfg?.className}>
      {cfg?.icon}
      {STATUT_FACTURE_LABELS[statut] ?? String(statut)}
    </Badge>
  )
}

const TABS = [
  { value: 'tous',        label: 'Toutes',     icon: LayoutGrid,    filter: () => true },
  { value: 'brouillon',   label: 'Brouillons', icon: FileText,      filter: (f: FactureListDto) => f.statut === 0 },
  { value: 'emises',      label: 'Émises',     icon: Clock,         filter: (f: FactureListDto) => f.statut === 1 },
  { value: 'payees',      label: 'Payées',     icon: CheckCircle2,  filter: (f: FactureListDto) => f.statut === 2 },
]

export default function FacturesPage() {
  const { data: factures, isLoading } = useGetFactures()
  const deleteMutation = useDeleteFacture()

  const [recherche, setRecherche] = useState('')
  const [detailId, setDetailId] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formFactureId, setFormFactureId] = useState(0)

  // Détail chargé pour le mode édition du formulaire.
  const { data: editDetail } = useGetFacture(formFactureId)
  const formDetail = formFactureId > 0 && editDetail ? editDetail : undefined

  const byTab = useMemo(() => {
    if (!factures) return {}
    const t = recherche.trim().toLowerCase()
    return Object.fromEntries(
      TABS.map((t2) => [
        t2.value,
        factures.filter((f) => {
          if (!t2.filter(f)) return false
          if (!t) return true
          return (
            f.numeroFacture.toLowerCase().includes(t) ||
            (f.clientNom?.toLowerCase().includes(t) ?? false)
          )
        }),
      ]),
    )
  }, [factures, recherche])

  const columns = useMemo<ColDef<FactureListDto>[]>(
    () => [
      {
        key: 'numeroFacture',
        header: 'Numéro',
        cardPrimary: true,
        cell: (f) => <span className="font-mono font-medium">{f.numeroFacture}</span>,
      },
      {
        key: 'client',
        header: 'Client',
        cardPrimary: true,
        cell: (f) => <span className="font-medium">{f.clientNom ?? `#${f.clientId}`}</span>,
      },
      {
        key: 'dateFacture',
        header: 'Date',
        cell: (f) => (
          <span className="text-sm text-muted-foreground">
            {new Date(f.dateFacture).toLocaleDateString('fr-FR')}
          </span>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        cardPrimary: true,
        cell: (f) => <StatutBadge statut={f.statut} />,
      },
      {
        key: 'montantTotal',
        header: 'Montant',
        cell: (f) => (
          <span className="font-semibold tabular-nums">
            {f.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{' '}
            {f.devise ?? 'EUR'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cardPrimary: true,
        headerClassName: 'w-[130px]',
        cell: (f) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              title="Télécharger (Excel)"
              onClick={() =>
                downloadViaProxy(
                  `/api/proxy/api/Facture/${f.id}/Export`,
                  `Facture_${f.numeroFacture}.xlsx`,
                ).catch((e: Error) => toast.error(e.message ?? 'Téléchargement impossible'))
              }
            >
              <FileDown className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Voir la facture"
              onClick={() => {
                setDetailId(f.id)
                setDetailOpen(true)
              }}
            >
              <Eye className="size-3.5" />
            </Button>
            {f.statut === 0 && (
              <PermissionGate module="factures" mode="write">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Modifier"
                  onClick={() => {
                    setFormFactureId(f.id)
                    setFormOpen(true)
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </PermissionGate>
            )}
            <PermissionGate module="factures" mode="write">
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    title={f.statut === 2 ? 'Suppression impossible (facture réglée)' : 'Supprimer'}
                    disabled={f.statut === 2 || deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                }
                title="Supprimer cette facture ?"
                description="Cette action est irréversible."
                onConfirm={() => deleteMutation.mutate(f.id, { onSuccess: () => setDetailOpen(false) })}
              />
            </PermissionGate>
          </div>
        ),
      },
    ],
    [deleteMutation],
  )

  return (
    <div>
      <PageHeader
        title="Facturation"
        description="Factures de façonnage émises aux clients"
        action={
          <PermissionGate module="factures" mode="write">
            <Button
              size="sm"
              onClick={() => {
                setFormFactureId(0)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" />
              Nouvelle facture
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="grid w-full max-w-sm gap-1.5">
          <Label>Recherche</Label>
          <Input
            placeholder="N° de facture, client…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
        {recherche && (
          <Button variant="ghost" size="sm" onClick={() => setRecherche('')}>
            <X className="size-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>

      <Tabs defaultValue="tous">
        <div className="mb-4 overflow-x-auto">
          <TabsList variant="line">
            {TABS.map((t) => {
              const TabIcon = t.icon
              return (
                <TabsTrigger key={t.value} value={t.value}>
                  <TabIcon className="size-4" />
                  {t.label}
                  {!isLoading && byTab[t.value]?.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0 text-xs font-medium">
                      {byTab[t.value].length}
                    </span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <PaginatedResponsiveTable
              columns={columns}
              data={byTab[t.value] ?? []}
              keyExtractor={(f) => f.id}
              isLoading={isLoading}
              emptyText="Aucune facture ne correspond à ce statut."
              label="factures"
            />
          </TabsContent>
        ))}
      </Tabs>

      <FactureDetailDialog
        factureId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => {
          setDetailOpen(false)
          setFormFactureId(detailId)
          setFormOpen(true)
        }}
      />

      <FactureFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) {
            setFormFactureId(0)
            setFormOpen(false)
          }
        }}
        factureId={formFactureId > 0 ? formFactureId : undefined}
        detail={formDetail}
      />
    </div>
  )
}