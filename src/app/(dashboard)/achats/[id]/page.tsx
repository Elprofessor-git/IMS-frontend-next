'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { StatutWorkflow } from '@/components/ui/statut-workflow'
import { ArticleSelect } from '@/components/forms/article-select'
import { DocumentSection } from '@/components/documents/document-section'
import {
  useGetAchat,
  useUpdateAchat,
  useDeleteAchat,
  useAjouterLigneAchat,
  useSoumettreAchat,
  useConfirmerAchat,
  useLivrerAchat,
} from '@/hooks/use-achats'
import {
  ligneAchatSchema,
  toLigneAchatPayload,
  type LigneAchatSchema,
} from '@/lib/validations/achat'
import type { WorkflowStatutConfig, WorkflowTransition } from '@/components/ui/statut-workflow'

const ACHAT_STATUT_CONFIG: Record<number, WorkflowStatutConfig> = {
  0: { label: 'Brouillon', badgeVariant: 'secondary' },
  1: { label: 'Soumis', badgeVariant: 'outline' },
  2: { label: 'Confirmé', badgeVariant: 'default' },
  3: { label: 'Livré', badgeClassName: 'border-green-200 bg-green-100 text-green-800' },
  4: { label: 'Annulé', badgeVariant: 'destructive' },
}

// ── Dialog Ajouter une ligne ────────────────────────────────────
function AjouterLigneDialog({
  achatId,
  open,
  onClose,
}: {
  achatId: number
  open: boolean
  onClose: () => void
}) {
  const ajouterMutation = useAjouterLigneAchat()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LigneAchatSchema>({
    resolver: zodResolver(ligneAchatSchema),
    defaultValues: {
      articleId: 0,
      quantite: 0,
      prixUnitaire: 0,
      couleur: null,
      codeCouleur: null,
      taille: null,
      dimension: null,
      devise: 'EUR',
      descriptionSpecifique: null,
      notes: null,
    },
  })

  if (!open) return null

  const onSubmit = async (data: LigneAchatSchema) => {
    await ajouterMutation.mutateAsync({
      achatId,
      data: toLigneAchatPayload(data) as Record<string, unknown>,
    })
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-[500px] overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Ajouter une ligne</h3>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-2">
            <Label>Article <span className="text-destructive">*</span></Label>
            <Controller
              name="articleId"
              control={control}
              render={({ field }) => (
                <ArticleSelect
                  value={field.value || null}
                  onChange={(id) => {
                    field.onChange(id ?? 0)
                    if (id) setValue('articleId', id)
                  }}
                />
              )}
            />
            {errors.articleId && (
              <p className="text-sm text-destructive">{errors.articleId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantite">Quantité <span className="text-destructive">*</span></Label>
              <Input
                id="quantite"
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
              <Label htmlFor="prixUnitaire">Prix unitaire <span className="text-destructive">*</span></Label>
              <Input
                id="prixUnitaire"
                type="number"
                min="0"
                step="0.01"
                {...register('prixUnitaire', { valueAsNumber: true })}
                aria-invalid={!!errors.prixUnitaire}
              />
              {errors.prixUnitaire && (
                <p className="text-sm text-destructive">{errors.prixUnitaire.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="couleur">Couleur</Label>
              <Input id="couleur" {...register('couleur')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taille">Taille</Label>
              <Input id="taille" {...register('taille')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="devise">Devise</Label>
              <Input id="devise" {...register('devise')} maxLength={10} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descriptionSpecifique">Description spécifique</Label>
            <Textarea id="descriptionSpecifique" rows={2} {...register('descriptionSpecifique')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { reset(); onClose() }}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={ajouterMutation.isPending}>
              {ajouterMutation.isPending ? 'Ajout…' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page détail achat ───────────────────────────────────────────
export default function AchatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const achatId = Number(id)
  const router = useRouter()
  const [ligneDialogOpen, setLigneDialogOpen] = useState(false)

  const { data: achat, isLoading } = useGetAchat(achatId)
  const updateMutation = useUpdateAchat()
  const deleteMutation = useDeleteAchat()
  const soumettreM = useSoumettreAchat()
  const confirmerM = useConfirmerAchat()
  const livrerM = useLivrerAchat()

  const [activeTab, setActiveTab] = useState('info')
  const [notes, setNotes] = useState('')
  const [dateLivraison, setDateLivraison] = useState('')

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!achat) {
    return <p className="text-muted-foreground">Achat introuvable.</p>
  }

  function getTransition(): WorkflowTransition | undefined {
    if (!achat) return undefined
    const s = achat.statut
    if (s === 0) return {
      label: 'Soumettre',
      confirmTitle: 'Soumettre cet achat ?',
      confirmDesc: 'L\'achat sera soumis pour confirmation. Les lignes ne pourront plus être modifiées.',
      buttonVariant: 'default',
      onConfirm: () => soumettreM.mutate(achat.id),
      isPending: soumettreM.isPending,
    }
    if (s === 1) return {
      label: 'Confirmer',
      confirmTitle: 'Confirmer cet achat ?',
      confirmDesc: 'Une tâche de réception sera créée automatiquement côté backend. Cette action est irréversible.',
      buttonVariant: 'default',
      onConfirm: () => confirmerM.mutate(achat.id),
      isPending: confirmerM.isPending,
    }
    if (s === 2) return {
      label: 'Marquer livré',
      confirmTitle: 'Marquer comme livré ?',
      confirmDesc: 'Le stock sera mis à jour pour chaque ligne de cet achat. Cette action est irréversible.',
      buttonVariant: 'default',
      onConfirm: () => livrerM.mutate(achat.id),
      isPending: livrerM.isPending,
    }
    return undefined
  }

  const canDelete = achat.statut < 2
  const canEdit = achat.statut === 0

  return (
    <div>
      <PageHeader
        title={achat.numeroAchat}
        backHref="/achats"
        action={
          <PermissionGate module="achats" mode="write">
            <div className="flex items-center gap-3">
              <StatutWorkflow
                statut={achat.statut}
                statutConfig={ACHAT_STATUT_CONFIG}
                transition={getTransition()}
              />
              <ConfirmDialog
                trigger={
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!canDelete || deleteMutation.isPending}
                    title={canDelete ? 'Supprimer' : 'Suppression impossible (confirmé ou livré)'}
                  >
                    Supprimer
                  </Button>
                }
                title="Supprimer cet achat ?"
                description="Cette action est irréversible."
                onConfirm={async () => {
                  await deleteMutation.mutateAsync(achat.id)
                  router.push('/achats')
                }}
              />
            </div>
          </PermissionGate>
        }
      />

      {achat.statut === 0 && achat.lignesAchat.length === 0 && (
        <div className="mb-4 max-w-4xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Ajoutez maintenant les articles de cet achat
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
            L&apos;achat a été créé — ajoutez au moins une ligne avant de le soumettre.
          </p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => {
              setActiveTab('lignes')
              setLigneDialogOpen(true)
            }}
          >
            <Plus className="mr-1.5 size-4" />
            Ajouter une ligne
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl">
        <TabsList className="mb-4">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="lignes">
            Lignes
            {achat.lignesAchat.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">
                {achat.lignesAchat.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* ── Onglet Informations ── */}
        <TabsContent value="info">
          <div className="grid gap-4">
            <Card>
              <CardContent className="pt-6">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Fournisseur</dt>
                    <dd className="font-medium">{achat.fournisseur?.nomEntreprise ?? `#${achat.fournisseurId}`}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Commande client</dt>
                    <dd className="font-medium">
                      {achat.commandeClient
                        ? achat.commandeClient.numeroCommande ?? `#${achat.commandeClientId}`
                        : `#${achat.commandeClientId}`}
                      {achat.commandeClient?.client && (
                        <span className="ml-1 text-muted-foreground">
                          ({achat.commandeClient.client.nom})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Date d&apos;achat</dt>
                    <dd>{new Date(achat.dateAchat).toLocaleDateString('fr-FR')}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Livraison prévue</dt>
                    <dd>
                      {achat.dateLivraisonPrevue
                        ? new Date(achat.dateLivraisonPrevue).toLocaleDateString('fr-FR')
                        : '—'}
                    </dd>
                  </div>
                  {achat.dateLivraisonReelle && (
                    <div>
                      <dt className="text-muted-foreground">Livraison réelle</dt>
                      <dd>{new Date(achat.dateLivraisonReelle).toLocaleDateString('fr-FR')}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Montant total</dt>
                    <dd className="font-mono font-medium">
                      {Number(achat.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                      {achat.devise ? ` ${achat.devise}` : ''}
                    </dd>
                  </div>
                  {achat.creePar && (
                    <div>
                      <dt className="text-muted-foreground">Créé par</dt>
                      <dd>{achat.creePar}</dd>
                    </div>
                  )}
                  {achat.conditionsPaiement && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Conditions de paiement</dt>
                      <dd>{achat.conditionsPaiement}</dd>
                    </div>
                  )}
                  {achat.notesAchat && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Notes</dt>
                      <dd className="whitespace-pre-line">{achat.notesAchat}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            <PermissionGate module="achats" mode="write">
              {canEdit && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Modifier</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-livraison">Livraison prévue</Label>
                        <Input
                          id="edit-livraison"
                          type="date"
                          defaultValue={achat.dateLivraisonPrevue?.substring(0, 10) ?? ''}
                          onChange={(e) => setDateLivraison(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-notes">Notes</Label>
                      <Textarea
                        id="edit-notes"
                        rows={3}
                        defaultValue={achat.notesAchat ?? ''}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          ...achat,
                          dateLivraisonPrevue: dateLivraison || achat.dateLivraisonPrevue,
                          notesAchat: notes || achat.notesAchat,
                        })
                      }
                    >
                      {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </PermissionGate>
          </div>
        </TabsContent>

        {/* ── Onglet Lignes ── */}
        <TabsContent value="lignes">
          <div className="space-y-4">
            <PermissionGate module="achats" mode="write">
              {achat.statut === 0 && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setLigneDialogOpen(true)}>
                    <Plus className="size-4" />
                    Ajouter une ligne
                  </Button>
                </div>
              )}
            </PermissionGate>

            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead className="text-right">Prix unit.</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Variantes</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {achat.lignesAchat.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Aucune ligne.{achat.statut === 0 && ' Ajoutez des articles.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {achat.lignesAchat.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <p className="font-medium">{l.article?.designation ?? `#${l.articleId}`}</p>
                        {l.article?.reference && (
                          <p className="font-mono text-xs text-muted-foreground">{l.article.reference}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">{Number(l.quantite)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(l.prixUnitaire).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        {l.devise ? ` ${l.devise}` : ''}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {Number(l.montantLigne).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[l.couleur, l.taille, l.dimension].filter(Boolean).join(' / ') || '—'}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                        {l.descriptionSpecifique ?? l.notes ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {achat.lignesAchat.length > 0 && (
              <div className="flex justify-end rounded-lg border bg-card px-4 py-3 text-sm font-medium">
                Total&nbsp;
                <span className="ml-2 font-mono">
                  {Number(achat.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  {achat.devise ? ` ${achat.devise}` : ''}
                </span>
              </div>
            )}
          </div>
        </TabsContent>
        {/* ── Onglet Documents ── */}
        <TabsContent value="documents">
          <DocumentSection scope="achat" parentId={achatId} />
        </TabsContent>
      </Tabs>

      <AjouterLigneDialog
        achatId={achatId}
        open={ligneDialogOpen}
        onClose={() => setLigneDialogOpen(false)}
      />
    </div>
  )
}
