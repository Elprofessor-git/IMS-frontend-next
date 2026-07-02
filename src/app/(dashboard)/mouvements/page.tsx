'use client'

import { Suspense, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2, ArrowLeftRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ArticleSelect } from '@/components/forms/article-select'
import { ResponsiveTable, type ColDef } from '@/components/ui/responsive-table'
import {
  useFiltrerMouvements,
  useMouvementStatistiques,
  useCreateMouvement,
  useTransfertStock,
  useDeleteMouvement,
} from '@/hooks/use-mouvements'
import { useGetStocks } from '@/hooks/use-stocks'
import {
  TYPE_MOUVEMENT,
  ORIGINE_MOUVEMENT,
} from '@/types/mouvement'
import type { TypeMouvementValue, MouvementStock } from '@/types/mouvement'
import {
  mouvementSchema,
  toMouvementPayload,
  transfertSchema,
  type MouvementSchema,
  type TransfertSchema,
} from '@/lib/validations/mouvement'

const PAGE_SIZE = 20

// ── Badge couleur par type de mouvement ─────────────────────────
function TypeBadge({ type }: { type: TypeMouvementValue }) {
  const label = TYPE_MOUVEMENT[type] ?? String(type)
  const variant =
    type === 0 ? 'default'
    : type === 1 ? 'destructive'
    : type === 2 ? 'outline'
    : type === 3 ? undefined
    : 'secondary'

  if (type === 3) {
    return (
      <Badge className="border border-orange-200 bg-orange-100 text-orange-800">
        {label}
      </Badge>
    )
  }
  return <Badge variant={variant}>{label}</Badge>
}

// ── Dialog Nouveau mouvement ────────────────────────────────────
function NouveauMouvementDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const createMutation = useCreateMouvement()
  const { data: stocks } = useGetStocks()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<MouvementSchema>({
    resolver: zodResolver(mouvementSchema),
    defaultValues: {
      stockId: 0,
      typeMouvement: 0,
      origineMouvement: 0,
      quantite: 0,
      motif: null,
      numeroReference: null,
      emplacementSource: null,
      emplacementDestination: null,
      effectuePar: '',
    },
  })

  const typeMouvement = watch('typeMouvement')

  if (!open) return null

  const onSubmit = async (data: MouvementSchema) => {
    await createMutation.mutateAsync(toMouvementPayload(data) as Record<string, unknown>)
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
        <h3 className="mb-4 font-semibold text-lg">Nouveau mouvement de stock</h3>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-2">
            <Label>Stock</Label>
            <Controller
              name="stockId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un stock…" />
                  </SelectTrigger>
                  <SelectContent>
                    {stocks?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.article?.designation ?? `#${s.articleId}`}
                        {s.article?.reference ? ` (${s.article.reference})` : ''}
                        {' — '}qté: {Number(s.quantite)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.stockId && (
              <p className="text-sm text-destructive">{errors.stockId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Controller
                name="typeMouvement"
                control={control}
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(TYPE_MOUVEMENT) as [string, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid gap-2">
              <Label>Origine</Label>
              <Controller
                name="origineMouvement"
                control={control}
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(ORIGINE_MOUVEMENT) as [string, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quantite">
              Quantité
              {typeMouvement === 3 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (quantité finale souhaitée pour Ajustement)
                </span>
              )}
            </Label>
            <Input
              id="quantite"
              type="number"
              min="0"
              step="0.01"
              {...register('quantite', { valueAsNumber: true })}
              aria-invalid={!!errors.quantite}
            />
            {errors.quantite && (
              <p className="text-sm text-destructive">{errors.quantite.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="effectuePar">Effectué par</Label>
            <Input
              id="effectuePar"
              {...register('effectuePar')}
              aria-invalid={!!errors.effectuePar}
            />
            {errors.effectuePar && (
              <p className="text-sm text-destructive">{errors.effectuePar.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="motif">Motif</Label>
            <Input id="motif" {...register('motif')} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="numeroReference">N° référence</Label>
              <Input id="numeroReference" {...register('numeroReference')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emplacementSource">Emplacement source</Label>
              <Input id="emplacementSource" {...register('emplacementSource')} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="emplacementDestination">Emplacement destination</Label>
            <Input id="emplacementDestination" {...register('emplacementDestination')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { reset(); onClose() }}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Dialog Transfert ────────────────────────────────────────────
function TransfertDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const transfertMutation = useTransfertStock()
  const { data: stocks } = useGetStocks()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TransfertSchema>({
    resolver: zodResolver(transfertSchema),
    defaultValues: {
      stockSourceId: 0,
      stockDestinationId: 0,
      quantite: 0,
      motif: '',
      effectuePar: '',
    },
  })

  if (!open) return null

  const onSubmit = async (data: TransfertSchema) => {
    await transfertMutation.mutateAsync(data)
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[480px] rounded-lg bg-background p-6 shadow-xl">
        <h3 className="mb-4 font-semibold text-lg">Transfert de stock</h3>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-2">
            <Label>Stock source</Label>
            <Controller
              name="stockSourceId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Stock source…" />
                  </SelectTrigger>
                  <SelectContent>
                    {stocks?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.article?.designation ?? `#${s.articleId}`} — qté: {Number(s.quantite)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.stockSourceId && (
              <p className="text-sm text-destructive">{errors.stockSourceId.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Stock destination</Label>
            <Controller
              name="stockDestinationId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Stock destination…" />
                  </SelectTrigger>
                  <SelectContent>
                    {stocks?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.article?.designation ?? `#${s.articleId}`} — qté: {Number(s.quantite)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.stockDestinationId && (
              <p className="text-sm text-destructive">{errors.stockDestinationId.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transfert-quantite">Quantité</Label>
            <Input
              id="transfert-quantite"
              type="number"
              min="0.01"
              step="0.01"
              {...register('quantite', { valueAsNumber: true })}
              aria-invalid={!!errors.quantite}
            />
            {errors.quantite && (
              <p className="text-sm text-destructive">{errors.quantite.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transfert-motif">Motif</Label>
            <Input
              id="transfert-motif"
              {...register('motif')}
              aria-invalid={!!errors.motif}
            />
            {errors.motif && (
              <p className="text-sm text-destructive">{errors.motif.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transfert-effectuePar">Effectué par</Label>
            <Input
              id="transfert-effectuePar"
              {...register('effectuePar')}
              aria-invalid={!!errors.effectuePar}
            />
            {errors.effectuePar && (
              <p className="text-sm text-destructive">{errors.effectuePar.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { reset(); onClose() }}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={transfertMutation.isPending}>
              {transfertMutation.isPending ? 'Transfert…' : 'Transférer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Contenu principal (utilise useSearchParams) ─────────────────
function MouvementsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [nouveauOpen, setNouveauOpen] = useState(false)
  const [transfertOpen, setTransfertOpen] = useState(false)
  const [page, setPage] = useState(1)

  const dateDebut              = searchParams.get('dateDebut') ?? undefined
  const dateFin                = searchParams.get('dateFin') ?? undefined
  const typeMouvementParam     = searchParams.get('typeMouvement')
  const origineMouvementParam  = searchParams.get('origineMouvement')
  const articleIdParam         = searchParams.get('articleId')
  const effectuePar            = searchParams.get('effectuePar') ?? undefined

  const typeMouvement    = typeMouvementParam    !== null ? Number(typeMouvementParam)    : undefined
  const origineMouvement = origineMouvementParam !== null ? Number(origineMouvementParam) : undefined
  const articleId        = articleIdParam        !== null ? Number(articleIdParam)        : undefined

  const filtreParams = { dateDebut, dateFin, typeMouvement, origineMouvement, articleId, effectuePar }

  const { data: mouvements, isLoading } = useFiltrerMouvements(filtreParams)
  const { data: stats, isLoading: statsLoading } = useMouvementStatistiques({ dateDebut, dateFin })
  const deleteMutation = useDeleteMouvement()

  const totalPages = Math.ceil((mouvements?.length ?? 0) / PAGE_SIZE)
  const paginated = useMemo(
    () => mouvements?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [mouvements, page]
  )

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    setPage(1)
    router.replace(`?${params.toString()}`)
  }

  const columns = useMemo<ColDef<MouvementStock>[]>(
    () => [
      {
        key: 'date',
        header: 'Date',
        cardPrimary: true,
        cell: (m) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {new Date(m.dateMouvement).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        key: 'article',
        header: 'Article',
        cardPrimary: true,
        cell: (m) => (
          <div>
            <p className="font-medium">{m.article?.designation ?? `#${m.articleId}`}</p>
            {m.article?.reference && (
              <p className="font-mono text-xs text-muted-foreground">{m.article.reference}</p>
            )}
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        cardPrimary: true,
        cell: (m) => <TypeBadge type={m.typeMouvement} />,
      },
      {
        key: 'origine',
        header: 'Origine',
        cell: (m) => (
          <span className="text-sm text-muted-foreground">
            {ORIGINE_MOUVEMENT[m.origineMouvement] ?? m.origineMouvement}
          </span>
        ),
      },
      {
        key: 'quantite',
        header: 'Qté',
        cardPrimary: true,
        headerClassName: 'text-right',
        cell: (m) => <span className="font-mono">{Number(m.quantite)}</span>,
      },
      {
        key: 'avant',
        header: 'Avant',
        headerClassName: 'text-right',
        cell: (m) => (
          <span className="font-mono text-muted-foreground">{Number(m.stockAvant)}</span>
        ),
      },
      {
        key: 'apres',
        header: 'Après',
        headerClassName: 'text-right',
        cell: (m) => (
          <span className="font-mono text-muted-foreground">{Number(m.stockApres)}</span>
        ),
      },
      {
        key: 'effectuePar',
        header: 'Effectué par',
        cell: (m) => <span className="text-sm">{m.effectuePar}</span>,
      },
      {
        key: 'motif',
        header: 'Motif',
        cell: (m) => (
          <span className="max-w-[160px] truncate text-sm text-muted-foreground">
            {m.motif ?? '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        cardPrimary: true,
        headerClassName: 'w-[60px]',
        cell: (m) => {
          const canDelete = new Date(m.dateMouvement).getTime() > Date.now() - 7 * 24 * 3600 * 1000
          return (
            <PermissionGate module="mouvements" mode="write">
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    title={canDelete ? 'Supprimer' : 'Suppression impossible (> 7 jours)'}
                    disabled={!canDelete || deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                }
                title="Supprimer ce mouvement ?"
                description="Cette action est irréversible."
                onConfirm={() => deleteMutation.mutate(m.id)}
              />
            </PermissionGate>
          )
        },
      },
    ],
    [deleteMutation],
  )

  return (
    <div>
      <PageHeader
        title="Mouvements de stock"
        action={
          <PermissionGate module="mouvements" mode="write">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setTransfertOpen(true)}>
                <ArrowLeftRight className="size-4" />
                Transfert
              </Button>
              <Button size="sm" onClick={() => setNouveauOpen(true)}>
                <Plus className="size-4" />
                Nouveau
              </Button>
            </div>
          </PermissionGate>
        }
      />

      {/* ── Cartes statistiques ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          : stats && (
              <>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-green-600">{Number(stats.totalEntrees)}</p>
                    <p className="text-sm text-muted-foreground">Entrées</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-destructive">{Number(stats.totalSorties)}</p>
                    <p className="text-sm text-muted-foreground">Sorties</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold">{Number(stats.totalTransferts)}</p>
                    <p className="text-sm text-muted-foreground">Transferts</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-orange-600">{Number(stats.totalAjustements)}</p>
                    <p className="text-sm text-muted-foreground">Ajustements</p>
                  </CardContent>
                </Card>
              </>
            )}
      </div>

      {/* ── Filtres ── */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="grid gap-1">
          <Label className="text-xs">Date début</Label>
          <Input
            type="date"
            value={dateDebut ?? ''}
            onChange={(e) => setParam('dateDebut', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Date fin</Label>
          <Input
            type="date"
            value={dateFin ?? ''}
            onChange={(e) => setParam('dateFin', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={typeMouvementParam ?? 'all'}
            onValueChange={(v) => setParam('typeMouvement', v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {(Object.entries(TYPE_MOUVEMENT) as [string, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Origine</Label>
          <Select
            value={origineMouvementParam ?? 'all'}
            onValueChange={(v) => setParam('origineMouvement', v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {(Object.entries(ORIGINE_MOUVEMENT) as [string, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Article</Label>
          <ArticleSelect
            value={articleId ?? null}
            selectedArticle={null}
            onChange={(id) => {
              setParam('articleId', id ? String(id) : null)
            }}
            placeholder="Tous les articles…"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Effectué par</Label>
          <Input
            value={effectuePar ?? ''}
            onChange={(e) => setParam('effectuePar', e.target.value)}
            placeholder="Nom…"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* ── Tableau ── */}
      <ResponsiveTable
        columns={columns}
        data={paginated ?? []}
        keyExtractor={(m) => m.id}
        isLoading={isLoading}
        emptyText="Aucun mouvement trouvé."
      />

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {mouvements?.length ?? 0} résultat{(mouvements?.length ?? 0) > 1 ? 's' : ''} —
            page {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      <NouveauMouvementDialog open={nouveauOpen} onClose={() => setNouveauOpen(false)} />
      <TransfertDialog open={transfertOpen} onClose={() => setTransfertOpen(false)} />
    </div>
  )
}

// ── Export avec Suspense (requis par useSearchParams) ───────────
export default function MouvementsPage() {
  return (
    <Suspense>
      <MouvementsContent />
    </Suspense>
  )
}
