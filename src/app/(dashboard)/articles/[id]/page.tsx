'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, UserCheck, UserX, Info, Warehouse, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { articleSchema, toArticlePayload, type ArticleSchema } from '@/lib/validations/article'
import {
  useGetArticle,
  useUpdateArticle,
  useDeleteArticle,
  useDesactiverArticle,
  useActiverArticle,
  useGetArticleStockTotal,
  useGetHistoriquePrix,
} from '@/hooks/use-articles'
import type { HistoriquePrixSource } from '@/types/article'

const SOURCE_PRIX_CONFIG: Record<HistoriquePrixSource, { label: string; badgeClassName?: string; badgeVariant?: 'secondary' }> = {
  Manuel: { label: 'Manuel', badgeVariant: 'secondary' },
  LigneAchat: {
    label: 'Achat',
    badgeClassName: 'border-green-200 bg-green-100 text-green-800',
  },
  LigneImportation: {
    label: 'Import',
    badgeClassName: 'border-blue-200 bg-blue-100 text-blue-800',
  },
}

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const articleId = Number(id)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('info')

  const { data: article, isLoading } = useGetArticle(articleId)
  const {
    data: stockTotal,
    isLoading: stockLoading,
    isError: stockError,
  } = useGetArticleStockTotal(articleId, activeTab === 'stock')

  const {
    data: historiquePrix,
    isLoading: historiquePrixLoading,
  } = useGetHistoriquePrix(articleId, activeTab === 'prix')

  const updateMutation = useUpdateArticle()
  const deleteMutation = useDeleteArticle()
  const desactiverMutation = useDesactiverArticle()
  const activerMutation = useActiverArticle()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ArticleSchema>({
    resolver: zodResolver(articleSchema),
  })

  useEffect(() => {
    if (article) {
      reset({
        designation: article.designation,
        description: article.description ?? '',
        categorie: article.categorie ?? '',
        sousCategorie: article.sousCategorie ?? '',
        unite: article.unite ?? '',
        marque: article.marque ?? '',
        reference: article.reference ?? '',
        caracteristiques: article.caracteristiques ?? '',
        laize: article.laize ?? null,
        seuilAlerte: article.seuilAlerte,
        seuilCritique: article.seuilCritique,
      })
    }
  }, [article, reset])

  const onSubmit = async (data: ArticleSchema) => {
    if (!article) return
    await updateMutation.mutateAsync({ id: article.id, ...toArticlePayload(data) })
    router.push('/articles')
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!article) {
    return <p className="text-muted-foreground">Article introuvable.</p>
  }

  // Alert state derived from article.stocks (available without extra call)
  const totalQty = (article.stocks ?? []).reduce((sum, s) => sum + Number(s.quantite), 0)
  const isCritique = article.seuilCritique > 0 && totalQty <= article.seuilCritique
  const isAlerte = !isCritique && article.seuilAlerte > 0 && totalQty <= article.seuilAlerte

  return (
    <div>
      <PageHeader
        title={article.designation}
        backHref="/articles"
        action={
          <div className="flex items-center gap-2">
            <Badge variant={article.estActif ? 'outline' : 'secondary'} className={article.estActif ? 'border-green-200 bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
              {article.estActif ? 'Actif' : 'Inactif'}
            </Badge>
            <PermissionGate module="articles" mode="write">
              {article.estActif ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm" disabled={desactiverMutation.isPending}>
                      <UserX className="size-4" />
                      Désactiver
                    </Button>
                  }
                  title="Désactiver cet article ?"
                  description="L'article ne sera plus proposé dans les listes mais ses stocks sont conservés."
                  confirmLabel="Désactiver"
                  onConfirm={() => desactiverMutation.mutate(articleId)}
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => activerMutation.mutate(articleId)}
                  disabled={activerMutation.isPending}
                >
                  <UserCheck className="size-4" />
                  Activer
                </Button>
              )}
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}>
                    Supprimer
                  </Button>
                }
                title="Supprimer cet article ?"
                description="Bloqué si l'article est utilisé dans un stock, achat, importation ou besoin."
                onConfirm={async () => {
                  await deleteMutation.mutateAsync(articleId)
                  router.push('/articles')
                }}
              />
            </PermissionGate>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="info">
            <Info className="size-4" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-1.5">
            <Warehouse className="size-4" />
            Stock
            {isCritique && (
              <span className="inline-block size-2 rounded-full bg-destructive" />
            )}
            {isAlerte && (
              <span className="inline-block size-2 rounded-full bg-orange-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="prix" className="gap-1.5">
            <History className="size-4" />
            Historique des prix
            {(historiquePrix?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">
                {historiquePrix!.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── ONGLET INFORMATIONS ── */}
        <TabsContent value="info">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Identification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="designation">
                      Désignation <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="designation"
                      {...register('designation')}
                      aria-invalid={!!errors.designation}
                    />
                    {errors.designation && (
                      <p className="text-sm text-destructive">{errors.designation.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="reference">Référence</Label>
                      <Input
                        id="reference"
                        {...register('reference')}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        Générée automatiquement à la création, non modifiable.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="marque">Marque</Label>
                      <Input id="marque" {...register('marque')} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="categorie">Catégorie</Label>
                      <Input id="categorie" {...register('categorie')} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sousCategorie">Sous-catégorie</Label>
                      <Input id="sousCategorie" {...register('sousCategorie')} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="unite">Unité</Label>
                      <Input id="unite" {...register('unite')} />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="laize">Laize (m) — tissus uniquement</Label>
                    <Input
                      id="laize"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ex. 1.50"
                      {...register('laize', {
                        setValueAs: (v) => (v === '' ? null : Number(v)),
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Largeur du rouleau de tissu en mètres. Laissez vide pour les articles
                      non tissus (boutons, fils…).
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" rows={3} {...register('description')} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="caracteristiques">Caractéristiques</Label>
                    <Textarea
                      id="caracteristiques"
                      rows={3}
                      {...register('caracteristiques')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Seuils d&apos;alerte</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="seuilAlerte">Seuil d&apos;alerte (orange)</Label>
                      <Input
                        id="seuilAlerte"
                        type="number"
                        min="0"
                        {...register('seuilAlerte', { valueAsNumber: true })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="seuilCritique">Seuil critique (rouge)</Label>
                      <Input
                        id="seuilCritique"
                        type="number"
                        min="0"
                        {...register('seuilCritique', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <PermissionGate module="articles" mode="write">
                <div className="flex gap-3">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/articles')}
                  >
                    Annuler
                  </Button>
                </div>
              </PermissionGate>
            </div>
          </form>
        </TabsContent>

        {/* ── ONGLET STOCK ── */}
        <TabsContent value="stock">
          {stockLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : stockError ? (
            <p className="text-muted-foreground">Aucun stock enregistré pour cet article.</p>
          ) : stockTotal ? (
            <div className="space-y-6">
              {(isCritique || isAlerte) && (
                <div
                  className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${
                    isCritique
                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                      : 'border-orange-300 bg-orange-50 text-orange-800'
                  }`}
                >
                  <AlertTriangle className="size-4 shrink-0" />
                  {isCritique
                    ? `Stock critique — quantité totale (${totalQty}) ≤ seuil critique (${article.seuilCritique})`
                    : `Stock bas — quantité totale (${totalQty}) ≤ seuil d'alerte (${article.seuilAlerte})`}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {Number(stockTotal.quantiteTotale)}
                    </p>
                    <p className="text-sm text-muted-foreground">Quantité totale</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {Number(stockTotal.quantiteReservee)}
                    </p>
                    <p className="text-sm text-muted-foreground">Réservée</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {Number(stockTotal.quantiteDisponible)}
                    </p>
                    <p className="text-sm text-muted-foreground">Disponible</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </TabsContent>

        {/* ── ONGLET HISTORIQUE DES PRIX ── */}
        <TabsContent value="prix">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Historique des prix
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — dernier prix connu :{' '}
                  <span className="font-mono font-medium text-foreground">
                    {Number(article.prixUnitaireMoyen).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historiquePrixLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : !historiquePrix || historiquePrix.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun prix enregistré — l&apos;historique se remplit à la création de lignes
                  d&apos;achat/importation ou lors d&apos;une saisie manuelle du prix.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date effective</TableHead>
                      <TableHead className="text-right">Prix unitaire</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Référence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historiquePrix.map((h) => {
                      const sourceCfg = SOURCE_PRIX_CONFIG[h.source] ?? SOURCE_PRIX_CONFIG.Manuel
                      return (
                        <TableRow key={h.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {new Date(h.dateEffective).toLocaleString('fr-FR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {Number(h.prixUnitaire).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                            {h.devise ? ` ${h.devise}` : ''}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={sourceCfg.badgeVariant ?? 'outline'}
                              className={sourceCfg.badgeClassName}
                            >
                              {sourceCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {h.ligneAchatId && h.numeroAchat ? (
                              <a
                                href={`/achats/${h.ligneAchatId}`}
                                className="font-mono hover:underline"
                              >
                                {h.numeroAchat}
                              </a>
                            ) : h.ligneImportationId && h.referenceImportation ? (
                              <a
                                href={`/importations/${h.ligneImportationId}`}
                                className="font-mono hover:underline"
                              >
                                {h.referenceImportation}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
