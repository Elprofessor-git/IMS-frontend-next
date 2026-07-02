'use client'

import { useState, useMemo } from 'react'
import { ShieldCheck, ArrowDownToLine, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ResponsiveTable, type ColDef } from '@/components/ui/responsive-table'
import {
  useGetStocks,
  useGetStocksLibres,
  useGetStocksReserves,
  useGetStocksAlertes,
  useDeleteStock,
  useValiderStock,
  useReserverStock,
} from '@/hooks/use-stocks'
import { TYPE_STOCK } from '@/types/stock'
import type { Stock, AlerteStock } from '@/types/stock'

// ── Dialog Valider ──────────────────────────────────────────────
type ValiderDialogState = { stockId: number } | null
type ReserverDialogState = { stockId: number; disponible: number } | null

function ValiderDialog({
  state,
  onClose,
  onConfirm,
  isPending,
}: {
  state: ValiderDialogState
  onClose: () => void
  onConfirm: (validePar: string) => void
  isPending: boolean
}) {
  const [validePar, setValidePar] = useState('')
  if (!state) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl">
        <h3 className="mb-4 font-semibold">Valider le stock</h3>
        <div className="grid gap-2">
          <Label htmlFor="validePar">Validé par</Label>
          <Input
            id="validePar"
            placeholder="Votre nom…"
            value={validePar}
            onChange={(e) => setValidePar(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && validePar.trim()) onConfirm(validePar.trim())
              if (e.key === 'Escape') onClose()
            }}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            disabled={!validePar.trim() || isPending}
            onClick={() => onConfirm(validePar.trim())}
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Dialog Réserver ─────────────────────────────────────────────
function ReserverDialog({
  state,
  onClose,
  onConfirm,
  isPending,
}: {
  state: ReserverDialogState
  onClose: () => void
  onConfirm: (quantite: number) => void
  isPending: boolean
}) {
  const [qty, setQty] = useState('')
  if (!state) return null
  const num = parseFloat(qty)
  const isValid = !isNaN(num) && num > 0 && num <= state.disponible
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl">
        <h3 className="mb-1 font-semibold">Réserver du stock</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Disponible : {state.disponible}
        </p>
        <div className="grid gap-2">
          <Label htmlFor="qty">Quantité à réserver</Label>
          <Input
            id="qty"
            type="number"
            min="0.01"
            max={state.disponible}
            step="0.01"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid) onConfirm(num)
              if (e.key === 'Escape') onClose()
            }}
          />
          {qty && !isValid && (
            <p className="text-sm text-destructive">
              Valeur invalide (max {state.disponible})
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button size="sm" disabled={!isValid || isPending} onClick={() => onConfirm(num)}>
            Réserver
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────
export default function StockPage() {
  const [validerDialog, setValiderDialog] = useState<ValiderDialogState>(null)
  const [reserverDialog, setReserverDialog] = useState<ReserverDialogState>(null)

  const { data: allStocks,      isLoading: loadingAll      } = useGetStocks()
  const { data: libresStocks,   isLoading: loadingLibres   } = useGetStocksLibres()
  const { data: reservesStocks, isLoading: loadingReserves } = useGetStocksReserves()
  const { data: alertes,        isLoading: loadingAlertes  } = useGetStocksAlertes()

  const deleteMutation   = useDeleteStock()
  const validerMutation  = useValiderStock()
  const reserverMutation = useReserverStock()

  function confirmValider(validePar: string) {
    if (!validerDialog) return
    validerMutation.mutate({ id: validerDialog.stockId, validePar })
    setValiderDialog(null)
  }

  function confirmReserver(quantite: number) {
    if (!reserverDialog) return
    reserverMutation.mutate({ id: reserverDialog.stockId, quantite })
    setReserverDialog(null)
  }

  const stockColumns = useMemo<ColDef<Stock>[]>(
    () => [
      {
        key: 'article',
        header: 'Article',
        cardPrimary: true,
        cell: (s) => (
          <div>
            <p className="font-medium">{s.article?.designation ?? `#${s.articleId}`}</p>
            {s.article?.reference && (
              <p className="font-mono text-xs text-muted-foreground">{s.article.reference}</p>
            )}
            {(s.couleur || s.taille) && (
              <p className="text-xs text-muted-foreground">
                {[s.couleur, s.taille].filter(Boolean).join(' — ')}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'typeStock',
        header: 'Type',
        cardPrimary: true,
        cell: (s) => (
          <Badge variant="outline">{TYPE_STOCK[s.typeStock] ?? s.typeStock}</Badge>
        ),
      },
      {
        key: 'quantite',
        header: 'Qté',
        headerClassName: 'text-right',
        cardPrimary: true,
        cell: (s) => <span className="font-mono">{Number(s.quantite)}</span>,
      },
      {
        key: 'quantiteReservee',
        header: 'Réservée',
        headerClassName: 'text-right',
        cell: (s) => (
          <span className="font-mono text-muted-foreground">
            {Number(s.quantiteReservee) > 0 ? Number(s.quantiteReservee) : '—'}
          </span>
        ),
      },
      {
        key: 'emplacement',
        header: 'Emplacement',
        cell: (s) => (
          <span className="text-sm text-muted-foreground">{s.emplacementPhysique ?? '—'}</span>
        ),
      },
      {
        key: 'estValide',
        header: 'Validé',
        cardPrimary: true,
        cell: (s) =>
          s.estValide ? (
            <Badge variant="default">Validé</Badge>
          ) : (
            <Badge variant="secondary">En attente</Badge>
          ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cardPrimary: true,
        headerClassName: 'w-[120px]',
        cell: (s) => {
          const disponible = Number(s.quantite) - Number(s.quantiteReservee)
          return (
            <PermissionGate module="stock" mode="write">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Valider"
                  onClick={() => setValiderDialog({ stockId: s.id })}
                >
                  <ShieldCheck className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Réserver"
                  disabled={disponible <= 0}
                  onClick={() => setReserverDialog({ stockId: s.id, disponible })}
                >
                  <ArrowDownToLine className="size-3.5" />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      title="Supprimer"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                  title="Supprimer cette entrée de stock ?"
                  description="Cette action est irréversible."
                  onConfirm={() => deleteMutation.mutate(s.id)}
                />
              </div>
            </PermissionGate>
          )
        },
      },
    ],
    [deleteMutation, setValiderDialog, setReserverDialog],
  )

  const alerteColumns = useMemo<ColDef<AlerteStock>[]>(
    () => [
      {
        key: 'designation',
        header: 'Article',
        cardPrimary: true,
        cell: (a) => <span className="font-medium">{a.designation}</span>,
      },
      {
        key: 'quantite',
        header: 'Quantité',
        cardPrimary: true,
        cell: (a) => <span className="font-mono">{Number(a.quantite)}</span>,
      },
      {
        key: 'seuilAlerte',
        header: 'Seuil alerte',
        cell: (a) => <span className="text-muted-foreground">{a.seuilAlerte}</span>,
      },
      {
        key: 'seuilCritique',
        header: 'Seuil critique',
        cell: (a) => <span className="text-muted-foreground">{a.seuilCritique}</span>,
      },
      {
        key: 'niveau',
        header: 'Niveau',
        cardPrimary: true,
        cell: (a) =>
          a.estCritique ? (
            <Badge variant="destructive">Critique</Badge>
          ) : (
            <Badge className="border border-orange-200 bg-orange-100 text-orange-800">Alerte</Badge>
          ),
      },
    ],
    [],
  )

  return (
    <div>
      <PageHeader title="Stock" />

      <Tabs defaultValue="tous">
        <div className="mb-4 overflow-x-auto">
          <TabsList>
            <TabsTrigger value="tous">Tous</TabsTrigger>
            <TabsTrigger value="libre">Libre</TabsTrigger>
            <TabsTrigger value="reserve">Réservé</TabsTrigger>
            <TabsTrigger value="alertes">
              Alertes
              {(alertes?.length ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs">
                  {alertes!.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tous">
          <ResponsiveTable
            columns={stockColumns}
            data={allStocks ?? []}
            keyExtractor={(s) => s.id}
            isLoading={loadingAll}
            emptyText="Aucune entrée de stock."
          />
        </TabsContent>

        <TabsContent value="libre">
          <ResponsiveTable
            columns={stockColumns}
            data={libresStocks ?? []}
            keyExtractor={(s) => s.id}
            isLoading={loadingLibres}
            emptyText="Aucune entrée de stock."
          />
        </TabsContent>

        <TabsContent value="reserve">
          <ResponsiveTable
            columns={stockColumns}
            data={reservesStocks ?? []}
            keyExtractor={(s) => s.id}
            isLoading={loadingReserves}
            emptyText="Aucune entrée de stock."
          />
        </TabsContent>

        <TabsContent value="alertes">
          <ResponsiveTable
            columns={alerteColumns}
            data={alertes ?? []}
            keyExtractor={(a) => a.id}
            isLoading={loadingAlertes}
            emptyText="Aucun article en alerte de stock."
          />
        </TabsContent>
      </Tabs>

      <ValiderDialog
        state={validerDialog}
        onClose={() => setValiderDialog(null)}
        onConfirm={confirmValider}
        isPending={validerMutation.isPending}
      />
      <ReserverDialog
        state={reserverDialog}
        onClose={() => setReserverDialog(null)}
        onConfirm={confirmReserver}
        isPending={reserverMutation.isPending}
      />
    </div>
  )
}
