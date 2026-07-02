'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { StatutWorkflow } from '@/components/ui/statut-workflow'
import { ArticleSelect } from '@/components/forms/article-select'
import {
  useGetCommande,
  useUpdateCommande,
  useDeleteCommande,
  useAjouterBesoin,
  useSetTailles,
  useSetBom,
  useCalculer,
  useGetResultatCalcul,
  useValiderRessources,
  useGenererTaches,
} from '@/hooks/use-commandes'
import { STATUT_COMMANDE, TYPE_BESOIN } from '@/types/commande'
import {
  besoinSchema,
  toBesoinPayload,
  tailleItemSchema,
  bomItemSchema,
  type BesoinSchema,
  type TailleItem,
  type BomItem,
} from '@/lib/validations/commande'
import { z } from 'zod'
import type { WorkflowStatutConfig } from '@/components/ui/statut-workflow'

const COMMANDE_STATUT_CONFIG: Record<number, WorkflowStatutConfig> = {
  0: { label: 'En attente', badgeVariant: 'secondary' },
  1: { label: 'Prête', badgeClassName: 'border-green-200 bg-green-100 text-green-800' },
  2: { label: 'En production', badgeVariant: 'default' },
  3: { label: 'Terminée', badgeClassName: 'border-blue-200 bg-blue-100 text-blue-800' },
  4: { label: 'Annulée', badgeVariant: 'destructive' },
}

// ── Badge RÉALISABLE / NON LANÇABLE ────────────────────────────
function RealisableBadge({ statut, pct }: { statut: number; pct: number }) {
  if (pct === 0) return null
  if (statut === 1) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800">
        <CheckCircle2 className="size-4" />
        RÉALISABLE — {pct.toFixed(1)}% couvert
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive">
      <AlertTriangle className="size-4" />
      NON LANÇABLE — {pct.toFixed(1)}% couvert
    </div>
  )
}

// ── Dialog Ajouter un besoin ────────────────────────────────────
function AjouterBesoinDialog({
  commandeId,
  open,
  onClose,
}: {
  commandeId: number
  open: boolean
  onClose: () => void
}) {
  const ajouterMutation = useAjouterBesoin()

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<BesoinSchema>({
    resolver: zodResolver(besoinSchema),
    defaultValues: {
      articleId: 0,
      typeBesoin: 0,
      quantiteUnitaire: 0,
      nombrePieces: 0,
      couleur: null,
      taille: null,
      dimension: null,
      notes: null,
    },
  })

  if (!open) return null

  const onSubmit = async (data: BesoinSchema) => {
    await ajouterMutation.mutateAsync({
      commandeId,
      data: toBesoinPayload(data) as Record<string, unknown>,
    })
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Ajouter un besoin</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          La quantité totale sera calculée par le backend : quantité unitaire × nombre de pièces.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-2">
            <Label>Article <span className="text-destructive">*</span></Label>
            <Controller
              name="articleId"
              control={control}
              render={({ field }) => (
                <ArticleSelect
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? 0)}
                />
              )}
            />
            {errors.articleId && (
              <p className="text-sm text-destructive">{errors.articleId.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Type de besoin</Label>
            <Controller
              name="typeBesoin"
              control={control}
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_BESOIN) as [string, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="b-qtu">Qté unitaire <span className="text-destructive">*</span></Label>
              <Input
                id="b-qtu"
                type="number"
                min="0.001"
                step="0.001"
                {...register('quantiteUnitaire', { valueAsNumber: true })}
                aria-invalid={!!errors.quantiteUnitaire}
              />
              {errors.quantiteUnitaire && (
                <p className="text-sm text-destructive">{errors.quantiteUnitaire.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-pieces">Nombre de pièces <span className="text-destructive">*</span></Label>
              <Input
                id="b-pieces"
                type="number"
                min="1"
                {...register('nombrePieces', { valueAsNumber: true })}
                aria-invalid={!!errors.nombrePieces}
              />
              {errors.nombrePieces && (
                <p className="text-sm text-destructive">{errors.nombrePieces.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="b-couleur">Couleur</Label>
              <Input id="b-couleur" {...register('couleur')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-taille">Taille</Label>
              <Input id="b-taille" {...register('taille')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-dim">Dimension</Label>
              <Input id="b-dim" {...register('dimension')} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="b-notes">Notes</Label>
            <Textarea id="b-notes" rows={2} {...register('notes')} />
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

// ── Formulaire inline Tailles ───────────────────────────────────
function TaillesForm({ commandeId, onDone }: { commandeId: number; onDone: () => void }) {
  const setTaillesMutation = useSetTailles()
  const { control, register, handleSubmit, formState: { errors } } = useForm<{ tailles: TailleItem[] }>({
    resolver: zodResolver(z.object({ tailles: z.array(tailleItemSchema) })),
    defaultValues: { tailles: [{ taille: '', quantite: 0 }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'tailles' })

  const onSubmit = async (data: { tailles: TailleItem[] }) => {
    await setTaillesMutation.mutateAsync({ commandeId, tailles: data.tailles })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {fields.map((f, idx) => (
        <div key={f.id} className="flex items-end gap-3">
          <div className="flex-1 grid gap-1">
            <Label className="text-xs">Taille</Label>
            <Input placeholder="S, M, L…" {...register(`tailles.${idx}.taille`)} />
            {errors.tailles?.[idx]?.taille && (
              <p className="text-xs text-destructive">{errors.tailles[idx]!.taille!.message}</p>
            )}
          </div>
          <div className="w-28 grid gap-1">
            <Label className="text-xs">Quantité</Label>
            <Input type="number" min="1" {...register(`tailles.${idx}.quantite`, { valueAsNumber: true })} />
          </div>
          <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => remove(idx)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => append({ taille: '', quantite: 0 })}>
          <Plus className="size-3.5" /> Ajouter
        </Button>
        <Button type="submit" size="sm" disabled={setTaillesMutation.isPending}>
          {setTaillesMutation.isPending ? 'Enregistrement…' : 'Enregistrer les tailles'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Annuler</Button>
      </div>
    </form>
  )
}

// ── Formulaire inline BOM ───────────────────────────────────────
function BomForm({ commandeId, onDone }: { commandeId: number; onDone: () => void }) {
  const setBomMutation = useSetBom()
  const { control, register, handleSubmit, formState: { errors } } = useForm<{ bom: BomItem[] }>({
    resolver: zodResolver(z.object({ bom: z.array(bomItemSchema) })),
    defaultValues: { bom: [{ articleId: 0, quantiteParPiece: 0, unite: null }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'bom' })

  const onSubmit = async (data: { bom: BomItem[] }) => {
    await setBomMutation.mutateAsync({
      commandeId,
      bom: data.bom.map((b) => ({ ...b, unite: b.unite || null })),
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {fields.map((f, idx) => (
        <div key={f.id} className="flex flex-wrap items-end gap-3">
          <div className="w-full grid gap-1 sm:flex-1">
            <Label className="text-xs">Article</Label>
            <Controller
              name={`bom.${idx}.articleId`}
              control={control}
              render={({ field: fld }) => (
                <ArticleSelect value={fld.value || null} onChange={(id) => fld.onChange(id ?? 0)} />
              )}
            />
            {errors.bom?.[idx]?.articleId && (
              <p className="text-xs text-destructive">{errors.bom[idx]!.articleId!.message}</p>
            )}
          </div>
          <div className="w-28 grid gap-1">
            <Label className="text-xs">Qté / pièce</Label>
            <Input type="number" min="0.001" step="0.001" {...register(`bom.${idx}.quantiteParPiece`, { valueAsNumber: true })} />
          </div>
          <div className="w-20 grid gap-1">
            <Label className="text-xs">Unité</Label>
            <Input placeholder="m, kg…" {...register(`bom.${idx}.unite`)} />
          </div>
          <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => remove(idx)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => append({ articleId: 0, quantiteParPiece: 0, unite: null })}>
          <Plus className="size-3.5" /> Ajouter
        </Button>
        <Button type="submit" size="sm" disabled={setBomMutation.isPending}>
          {setBomMutation.isPending ? 'Enregistrement…' : 'Enregistrer la BOM'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Annuler</Button>
      </div>
    </form>
  )
}

// ── Page détail ─────────────────────────────────────────────────
export default function CommandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const commandeId = Number(id)
  const router = useRouter()

  const [besoinDialogOpen, setBesoinDialogOpen] = useState(false)
  const [editTailles, setEditTailles] = useState(false)
  const [editBom, setEditBom] = useState(false)
  const [marge, setMarge] = useState('5')
  const [notesEdit, setNotesEdit] = useState('')
  const [dateLivraisonEdit, setDateLivraisonEdit] = useState('')

  const { data: commande, isLoading } = useGetCommande(commandeId)
  const { data: resultats } = useGetResultatCalcul(commandeId)
  const updateMutation = useUpdateCommande()
  const deleteMutation = useDeleteCommande()
  const validerMutation = useValiderRessources()
  const calculerMutation = useCalculer()
  const genererMutation = useGenererTaches()

  if (isLoading) {
    return (
      <div className="max-w-5xl space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!commande) {
    return <p className="text-muted-foreground">Commande introuvable.</p>
  }

  const pct = Number(commande.pourcentageRessourcesCouvertes)
  const canDelete = commande.statut < 2
  const isPrete = commande.statut === 1

  // Transition GenererTaches : uniquement si statut = Prete (1)
  const genererTransition = isPrete
    ? {
        label: 'Générer les tâches',
        confirmTitle: 'Générer les tâches de production ?',
        confirmDesc:
          'La commande passera en production et une tâche sera créée. Cette action est irréversible.',
        onConfirm: () => genererMutation.mutate(commandeId),
        isPending: genererMutation.isPending,
      }
    : undefined

  return (
    <div>
      <PageHeader
        title={commande.numeroCommande}
        backHref="/commandes"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {pct > 0 && (
              <RealisableBadge statut={commande.statut} pct={pct} />
            )}
            <PermissionGate module="commandes" mode="write">
              <StatutWorkflow
                statut={commande.statut}
                statutConfig={COMMANDE_STATUT_CONFIG}
                transition={genererTransition}
              />
              <ConfirmDialog
                trigger={
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!canDelete || deleteMutation.isPending}
                    title={canDelete ? 'Supprimer' : 'Suppression impossible'}
                  >
                    Supprimer
                  </Button>
                }
                title="Supprimer cet ordre de fabrication ?"
                description="Cette action est irréversible."
                onConfirm={async () => {
                  await deleteMutation.mutateAsync(commandeId)
                  router.push('/commandes')
                }}
              />
            </PermissionGate>
          </div>
        }
      />

      <Tabs defaultValue="ressources" className="max-w-5xl">
        <TabsList className="mb-4">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="bom">Tailles &amp; BOM</TabsTrigger>
          <TabsTrigger value="ressources">
            Besoins &amp; Ressources
            {commande.besoins.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">
                {commande.besoins.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Onglet Informations ── */}
        <TabsContent value="info">
          <div className="grid gap-4">
            <Card>
              <CardContent className="pt-6">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Client</dt>
                    <dd className="font-medium">{commande.client?.nom ?? `#${commande.clientId}`}</dd>
                  </div>
                  {commande.marque && (
                    <div>
                      <dt className="text-muted-foreground">Marque</dt>
                      <dd className="font-medium">{commande.marque.nom}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Statut</dt>
                    <dd>{STATUT_COMMANDE[commande.statut] ?? commande.statut}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Couverture ressources</dt>
                    <dd className="font-medium">{pct.toFixed(1)}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Date de commande</dt>
                    <dd>{new Date(commande.dateCommande).toLocaleDateString('fr-FR')}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Livraison souhaitée</dt>
                    <dd>
                      {commande.dateLivraisonSouhaitee
                        ? new Date(commande.dateLivraisonSouhaitee).toLocaleDateString('fr-FR')
                        : '—'}
                    </dd>
                  </div>
                  {commande.titreCommande && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Titre</dt>
                      <dd className="font-medium">{commande.titreCommande}</dd>
                    </div>
                  )}
                  {commande.descriptionCommande && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Description</dt>
                      <dd className="whitespace-pre-line">{commande.descriptionCommande}</dd>
                    </div>
                  )}
                  {commande.notesSpeciales && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Notes spéciales</dt>
                      <dd className="whitespace-pre-line">{commande.notesSpeciales}</dd>
                    </div>
                  )}
                  {commande.creePar && (
                    <div>
                      <dt className="text-muted-foreground">Créé par</dt>
                      <dd>{commande.creePar}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            <PermissionGate module="commandes" mode="write">
              {commande.statut <= 1 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Modifier</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-livraison">Livraison souhaitée</Label>
                      <Input
                        id="edit-livraison"
                        type="date"
                        defaultValue={commande.dateLivraisonSouhaitee?.substring(0, 10) ?? ''}
                        onChange={(e) => setDateLivraisonEdit(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-notes">Notes spéciales</Label>
                      <Textarea
                        id="edit-notes"
                        rows={3}
                        defaultValue={commande.notesSpeciales ?? ''}
                        onChange={(e) => setNotesEdit(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          ...commande,
                          dateLivraisonSouhaitee: dateLivraisonEdit || commande.dateLivraisonSouhaitee,
                          notesSpeciales: notesEdit || commande.notesSpeciales,
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

        {/* ── Onglet Tailles & BOM ── */}
        <TabsContent value="bom">
          <div className="space-y-6">

            {/* Tailles */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Configuration des tailles</CardTitle>
                  <PermissionGate module="commandes" mode="write">
                    {!editTailles && (
                      <Button variant="outline" size="sm" onClick={() => setEditTailles(true)}>
                        Modifier
                      </Button>
                    )}
                  </PermissionGate>
                </div>
              </CardHeader>
              <CardContent>
                {editTailles ? (
                  <TaillesForm commandeId={commandeId} onDone={() => setEditTailles(false)} />
                ) : commande.configTailles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune taille configurée.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {commande.configTailles.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
                      >
                        <span className="font-medium">{t.taille}</span>
                        <span className="text-muted-foreground">× {t.quantite}</span>
                      </div>
                    ))}
                    <div className="ml-auto flex items-center text-sm font-medium">
                      Total :{' '}
                      <span className="ml-1 font-mono">
                        {commande.configTailles.reduce((s, t) => s + t.quantite, 0)} pièces
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BOM */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">BOM (nomenclature par pièce)</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Quantité par pièce × total pièces = besoin calculé par le backend
                    </p>
                  </div>
                  <PermissionGate module="commandes" mode="write">
                    {!editBom && (
                      <Button variant="outline" size="sm" onClick={() => setEditBom(true)}>
                        Modifier
                      </Button>
                    )}
                  </PermissionGate>
                </div>
              </CardHeader>
              <CardContent>
                {editBom ? (
                  <BomForm commandeId={commandeId} onDone={() => setEditBom(false)} />
                ) : commande.bomLignes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune ligne BOM définie.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Article</TableHead>
                          <TableHead className="text-right">Qté / pièce</TableHead>
                          <TableHead>Unité</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commande.bomLignes.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell>
                              <p className="font-medium">{b.article?.designation ?? `#${b.articleId}`}</p>
                              {b.article?.reference && (
                                <p className="font-mono text-xs text-muted-foreground">{b.article.reference}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">{Number(b.quantiteParPiece)}</TableCell>
                            <TableCell className="text-muted-foreground">{b.unite ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section Calculer BOM */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Calculer les besoins BOM</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <span>
                    La marge de sécurité est appliquée ici uniquement — elle n&apos;intervient
                    pas dans la validation des ressources (<code>ValiderRessources</code> n&apos;accepte
                    aucune marge).
                  </span>
                </div>

                <PermissionGate module="commandes" mode="write">
                  <div className="flex items-end gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="marge">Marge de sécurité (0–20%)</Label>
                      <Input
                        id="marge"
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={marge}
                        onChange={(e) => setMarge(e.target.value)}
                        className="w-28"
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={calculerMutation.isPending}
                      onClick={() =>
                        calculerMutation.mutate({
                          commandeId,
                          margeAppliquee: parseFloat(marge) || 0,
                        })
                      }
                    >
                      {calculerMutation.isPending ? 'Calcul…' : 'Calculer'}
                    </Button>
                  </div>
                </PermissionGate>

                {/* Résultats du calcul BOM */}
                {resultats && resultats.length > 0 && (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Article</TableHead>
                          <TableHead className="text-right">Besoin brut</TableHead>
                          <TableHead className="text-right">Marge</TableHead>
                          <TableHead className="text-right">Besoin final</TableHead>
                          <TableHead className="text-right">Stock réservé</TableHead>
                          <TableHead className="text-right">Achats</TableHead>
                          <TableHead className="text-right">Import</TableHead>
                          <TableHead className="text-right">Disponible</TableHead>
                          <TableHead className="text-right">Manque</TableHead>
                          <TableHead>État</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultats.map((r) => (
                          <TableRow key={r.id} className={!r.estSuffisant ? 'bg-destructive/5' : ''}>
                            <TableCell>
                              <p className="font-medium">{r.article?.designation ?? `#${r.articleId}`}</p>
                              {r.article?.reference && (
                                <p className="font-mono text-xs text-muted-foreground">{r.article.reference}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">{Number(r.besoinBrut).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{Number(r.margeAppliquee)}%</TableCell>
                            <TableCell className="text-right font-mono font-medium">{Number(r.besoinFinal).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">{Number(r.qteStockReserve)}</TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">{Number(r.qteAchat)}</TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">{Number(r.qteImport)}</TableCell>
                            <TableCell className="text-right font-mono">{Number(r.qteDisponible).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono font-medium text-destructive">
                              {Number(r.manque) > 0 ? Number(r.manque).toFixed(2) : '—'}
                            </TableCell>
                            <TableCell>
                              {r.estSuffisant ? (
                                <Badge variant="outline" className="border-green-200 bg-green-100 text-green-800">Suffisant</Badge>
                              ) : (
                                <Badge variant="destructive">Insuffisant</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Onglet Besoins & Ressources ── */}
        <TabsContent value="ressources">
          <div className="space-y-4">

            {/* Actions de validation */}
            <PermissionGate module="commandes" mode="write">
              <div className="flex flex-wrap items-center gap-3">
                <ConfirmDialog
                  trigger={
                    <Button disabled={validerMutation.isPending}>
                      {validerMutation.isPending ? 'Validation…' : 'Valider les ressources'}
                    </Button>
                  }
                  title="Valider les ressources ?"
                  description="Le backend vérifie le stock disponible (importé, achats confirmés, stock libre) pour chaque besoin. Le statut sera mis à jour automatiquement. Aucune marge n'est appliquée ici."
                  confirmLabel="Valider"
                  onConfirm={() => validerMutation.mutate(commandeId)}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBesoinDialogOpen(true)}
                >
                  <Plus className="size-4" />
                  Ajouter un besoin
                </Button>

                {/* GenererTaches : toujours visible, disabled si non Prête */}
                <ConfirmDialog
                  trigger={
                    <Button
                      variant={isPrete ? 'default' : 'outline'}
                      size="sm"
                      disabled={!isPrete || genererMutation.isPending}
                      title={
                        isPrete
                          ? 'Générer les tâches de production'
                          : 'Disponible uniquement quand le statut est "Prête"'
                      }
                    >
                      Générer les tâches
                    </Button>
                  }
                  title="Générer les tâches de production ?"
                  description="La commande passera en production et une tâche sera créée automatiquement. Cette action est irréversible."
                  confirmLabel="Générer"
                  onConfirm={() => genererMutation.mutate(commandeId)}
                />
              </div>
            </PermissionGate>

            {/* Résultat de validation */}
            {pct > 0 && (
              <div
                className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm ${
                  isPrete
                    ? 'border-green-300 bg-green-50 text-green-800'
                    : 'border-orange-300 bg-orange-50 text-orange-800'
                }`}
              >
                {isPrete ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertTriangle className="size-4 shrink-0" />
                )}
                <span>
                  <strong>{isPrete ? 'RÉALISABLE' : 'NON LANÇABLE'}</strong>
                  {' — '}
                  Couverture : {pct.toFixed(1)}%
                  {commande.besoins.some((b) => !b.estCompletementCouvert) && (
                    <>
                      {' · '}
                      {commande.besoins.filter((b) => !b.estCompletementCouvert).length} besoin(s) non couvert(s)
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Tableau des besoins */}
            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qté totale</TableHead>
                    <TableHead className="text-right" title="quantiteStockImporte">Importé</TableHead>
                    <TableHead className="text-right" title="quantiteAchatsLocaux">Achats locaux</TableHead>
                    <TableHead className="text-right" title="quantiteStockLibre">Stock libre</TableHead>
                    <TableHead className="text-right">Total couvert</TableHead>
                    <TableHead className="text-right text-destructive">Manque</TableHead>
                    <TableHead>État</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commande.besoins.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        Aucun besoin défini. Ajoutez des besoins puis validez les ressources.
                      </TableCell>
                    </TableRow>
                  )}
                  {commande.besoins.map((b) => {
                    const manque = Math.max(0, Number(b.quantiteTotale) - Number(b.quantiteCouverte))
                    const hasBeenValidated = Number(b.quantiteCouverte) > 0 || b.estCompletementCouvert
                    return (
                      <TableRow key={b.id} className={!b.estCompletementCouvert && hasBeenValidated ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <p className="font-medium">{b.article?.designation ?? `#${b.articleId}`}</p>
                          {b.article?.reference && (
                            <p className="font-mono text-xs text-muted-foreground">{b.article.reference}</p>
                          )}
                          {(b.couleur || b.taille) && (
                            <p className="text-xs text-muted-foreground">
                              {[b.couleur, b.taille].filter(Boolean).join(' / ')}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {TYPE_BESOIN[b.typeBesoin] ?? b.typeBesoin}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {Number(b.quantiteTotale)}
                          <p className="text-xs text-muted-foreground font-normal">
                            {Number(b.quantiteUnitaire)} × {b.nombrePieces}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {Number(b.quantiteStockImporte) > 0 ? Number(b.quantiteStockImporte) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {Number(b.quantiteAchatsLocaux) > 0 ? Number(b.quantiteAchatsLocaux) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {Number(b.quantiteStockLibre) > 0 ? Number(b.quantiteStockLibre) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(b.quantiteCouverte) > 0 ? Number(b.quantiteCouverte) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-destructive">
                          {manque > 0 ? manque : '—'}
                        </TableCell>
                        <TableCell>
                          {!hasBeenValidated ? (
                            <Badge variant="secondary">Non validé</Badge>
                          ) : b.estCompletementCouvert ? (
                            <Badge variant="outline" className="border-green-200 bg-green-100 text-green-800">
                              Couvert ✓
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Manque</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Note sur la marge */}
            <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                La validation des ressources ne tient pas compte d&apos;une marge de sécurité
                (le backend ne l&apos;accepte pas sur cet endpoint). Pour calculer avec marge,
                utilisez l&apos;onglet <strong>Tailles &amp; BOM → Calculer</strong>.
              </span>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AjouterBesoinDialog
        commandeId={commandeId}
        open={besoinDialogOpen}
        onClose={() => setBesoinDialogOpen(false)}
      />
    </div>
  )
}
