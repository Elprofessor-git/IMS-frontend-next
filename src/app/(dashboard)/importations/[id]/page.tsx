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
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { StatutWorkflow } from '@/components/ui/statut-workflow'
import { ArticleSelect } from '@/components/forms/article-select'
import {
  useGetImportation,
  useUpdateImportation,
  useDeleteImportation,
  useAjouterLigneImportation,
  useSoumettreImportation,
  useValiderImportation,
  useRecevoirImportation,
  useAffecterCommandes,
} from '@/hooks/use-importations'
import { MODE_EXPEDITION } from '@/types/fournisseur'
import {
  ligneImportationSchema,
  toLigneImportationPayload,
  type LigneImportationSchema,
} from '@/lib/validations/importation'
import type { WorkflowStatutConfig } from '@/components/ui/statut-workflow'

const IMPORTATION_STATUT_CONFIG: Record<number, WorkflowStatutConfig> = {
  0: { label: 'Brouillon', badgeVariant: 'secondary' },
  1: { label: 'Soumise', badgeVariant: 'outline' },
  2: { label: 'Validée', badgeVariant: 'default' },
  3: { label: 'Reçue', badgeClassName: 'border-green-200 bg-green-100 text-green-800' },
  4: { label: 'Annulée', badgeVariant: 'destructive' },
}

// ── Dialog Valider (saisie validePar) ──────────────────────────
function ValiderDialog({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (validePar: string) => void
  isPending: boolean
}) {
  const [validePar, setValidePar] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg bg-background p-6 shadow-xl">
        <h3 className="mb-4 font-semibold">Valider l&apos;importation</h3>
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
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
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

// ── Dialog Ajouter ligne importation ───────────────────────────
function AjouterLigneDialog({
  importationId,
  open,
  onClose,
}: {
  importationId: number
  open: boolean
  onClose: () => void
}) {
  const ajouterMutation = useAjouterLigneImportation()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<LigneImportationSchema>({
    resolver: zodResolver(ligneImportationSchema),
    defaultValues: {
      articleId: 0,
      quantite: 0,
      prixUnitaire: 0,
      commandeClientId: null,
      designation: null,
      couleur: null,
      codeCouleur: null,
      dimension: null,
      nature: null,
      devise: 'EUR',
      notes: null,
    },
  })

  if (!open) return null

  const onSubmit = async (data: LigneImportationSchema) => {
    await ajouterMutation.mutateAsync({
      importationId,
      data: toLigneImportationPayload(data) as Record<string, unknown>,
    })
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-[520px] overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
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
                  onChange={(id) => field.onChange(id ?? 0)}
                />
              )}
            />
            {errors.articleId && (
              <p className="text-sm text-destructive">{errors.articleId.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="designation">Désignation libre</Label>
            <Input id="designation" {...register('designation')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="imp-quantite">Quantité <span className="text-destructive">*</span></Label>
              <Input
                id="imp-quantite"
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
              <Label htmlFor="imp-prix">Prix unitaire <span className="text-destructive">*</span></Label>
              <Input
                id="imp-prix"
                type="number"
                min="0"
                step="0.01"
                {...register('prixUnitaire', { valueAsNumber: true })}
                aria-invalid={!!errors.prixUnitaire}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="imp-couleur">Couleur</Label>
              <Input id="imp-couleur" {...register('couleur')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imp-dimension">Dimension</Label>
              <Input id="imp-dimension" {...register('dimension')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="imp-nature">Nature</Label>
              <Input id="imp-nature" {...register('nature')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imp-devise">Devise</Label>
              <Input id="imp-devise" {...register('devise')} maxLength={10} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="imp-commande">ID Commande client (pour affectation)</Label>
            <Input
              id="imp-commande"
              type="number"
              min="1"
              {...register('commandeClientId', { valueAsNumber: true, setValueAs: (v) => v === '' ? null : Number(v) })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="imp-notes">Notes</Label>
            <Textarea id="imp-notes" rows={2} {...register('notes')} />
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

// ── Page détail importation ─────────────────────────────────────
export default function ImportationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const importationId = Number(id)
  const router = useRouter()
  const [ligneDialogOpen, setLigneDialogOpen] = useState(false)
  const [validerDialogOpen, setValiderDialogOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [dateReception, setDateReception] = useState('')

  const { data: importation, isLoading } = useGetImportation(importationId)
  const updateMutation = useUpdateImportation()
  const deleteMutation = useDeleteImportation()
  const soumettreM = useSoumettreImportation()
  const validerM = useValiderImportation()
  const recevoirM = useRecevoirImportation()
  const affecterM = useAffecterCommandes()

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!importation) {
    return <p className="text-muted-foreground">Importation introuvable.</p>
  }

  const canDelete = importation.statut < 2
  const canEdit = importation.statut === 0

  // Bouton Valider utilise customRender car il nécessite une saisie validePar
  function getTransition() {
    const s = importation!.statut
    if (s === 0) return {
      label: 'Soumettre',
      confirmTitle: 'Soumettre cette importation ?',
      confirmDesc: 'L\'importation doit contenir au moins une ligne. Les lignes ne pourront plus être modifiées.',
      buttonVariant: 'default' as const,
      onConfirm: () => soumettreM.mutate(importation!.id),
      isPending: soumettreM.isPending,
    }
    if (s === 1) return {
      label: 'Valider',
      confirmTitle: '',
      confirmDesc: '',
      buttonVariant: 'default' as const,
      onConfirm: () => {},
      isPending: validerM.isPending,
      customRender: (
        <Button
          size="sm"
          disabled={validerM.isPending}
          onClick={() => setValiderDialogOpen(true)}
        >
          Valider…
        </Button>
      ),
    }
    if (s === 2) return {
      label: 'Marquer reçue',
      confirmTitle: 'Marquer comme reçue ?',
      confirmDesc: 'Le stock sera mis à jour pour chaque ligne. Cette action est irréversible.',
      buttonVariant: 'default' as const,
      onConfirm: () => recevoirM.mutate(importation!.id),
      isPending: recevoirM.isPending,
    }
    return undefined
  }

  return (
    <div>
      <PageHeader
        title={importation.referenceImportation}
        backHref="/importations"
        action={
          <PermissionGate module="importations" mode="write">
            <div className="flex items-center gap-3">
              <StatutWorkflow
                statut={importation.statut}
                statutConfig={IMPORTATION_STATUT_CONFIG}
                transition={getTransition()}
              />

              {/* Affecter aux commandes — visible uniquement au statut Reçue (3) */}
              {importation.statut === 3 && (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm" disabled={affecterM.isPending}>
                      Affecter aux commandes
                    </Button>
                  }
                  title="Affecter aux commandes ?"
                  description="Réserve le stock importé sur les commandes clients associées aux lignes."
                  confirmLabel="Affecter"
                  onConfirm={() => affecterM.mutate(importation.id)}
                />
              )}

              <ConfirmDialog
                trigger={
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!canDelete || deleteMutation.isPending}
                    title={canDelete ? 'Supprimer' : 'Suppression impossible (validée ou reçue)'}
                  >
                    Supprimer
                  </Button>
                }
                title="Supprimer cette importation ?"
                description="Cette action est irréversible."
                onConfirm={async () => {
                  await deleteMutation.mutateAsync(importation.id)
                  router.push('/importations')
                }}
              />
            </div>
          </PermissionGate>
        }
      />

      <Tabs defaultValue="info" className="max-w-4xl">
        <TabsList className="mb-4">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="lignes">
            Lignes
            {importation.lignesImportation.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">
                {importation.lignesImportation.length}
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
                    <dt className="text-muted-foreground">Fournisseur</dt>
                    <dd className="font-medium">{importation.fournisseur?.nomEntreprise ?? `#${importation.fournisseurId}`}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Mode d&apos;expédition</dt>
                    <dd>{MODE_EXPEDITION[importation.modeExpedition] ?? String(importation.modeExpedition)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Date d&apos;importation</dt>
                    <dd>{new Date(importation.dateImportation).toLocaleDateString('fr-FR')}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Réception prévue</dt>
                    <dd>
                      {importation.dateReceptionPrevue
                        ? new Date(importation.dateReceptionPrevue).toLocaleDateString('fr-FR')
                        : '—'}
                    </dd>
                  </div>
                  {importation.dateReceptionReelle && (
                    <div>
                      <dt className="text-muted-foreground">Réception réelle</dt>
                      <dd>{new Date(importation.dateReceptionReelle).toLocaleDateString('fr-FR')}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Montant total</dt>
                    <dd className="font-mono font-medium">
                      {Number(importation.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                      {importation.devise ? ` ${importation.devise}` : ''}
                    </dd>
                  </div>
                  {importation.modifiePar && (
                    <div>
                      <dt className="text-muted-foreground">Validé par</dt>
                      <dd>{importation.modifiePar}</dd>
                    </div>
                  )}
                  {importation.creePar && (
                    <div>
                      <dt className="text-muted-foreground">Créé par</dt>
                      <dd>{importation.creePar}</dd>
                    </div>
                  )}
                  {importation.notesImportation && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Notes</dt>
                      <dd className="whitespace-pre-line">{importation.notesImportation}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            <PermissionGate module="importations" mode="write">
              {canEdit && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Modifier</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-reception">Réception prévue</Label>
                        <Input
                          id="edit-reception"
                          type="date"
                          defaultValue={importation.dateReceptionPrevue?.substring(0, 10) ?? ''}
                          onChange={(e) => setDateReception(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-notes">Notes</Label>
                      <Textarea
                        id="edit-notes"
                        rows={3}
                        defaultValue={importation.notesImportation ?? ''}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          ...importation,
                          dateReceptionPrevue: dateReception || importation.dateReceptionPrevue,
                          notesImportation: notes || importation.notesImportation,
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
            <PermissionGate module="importations" mode="write">
              {importation.statut === 0 && (
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
                    <TableHead>Affecté</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importation.lignesImportation.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Aucune ligne.{importation.statut === 0 && ' Ajoutez des articles.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {importation.lignesImportation.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <p className="font-medium">
                          {l.designation ?? l.article?.designation ?? `#${l.articleId}`}
                        </p>
                        {l.article?.reference && (
                          <p className="font-mono text-xs text-muted-foreground">{l.article.reference}</p>
                        )}
                        {l.commandeClientId && (
                          <p className="text-xs text-muted-foreground">Commande #{l.commandeClientId}</p>
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
                        {[l.couleur, l.dimension, l.nature].filter(Boolean).join(' / ') || '—'}
                      </TableCell>
                      <TableCell>
                        {l.estAffecteStock ? (
                          <Badge variant="default" className="border-green-200 bg-green-100 text-green-800">
                            Affecté
                          </Badge>
                        ) : (
                          <Badge variant="secondary">En attente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {importation.lignesImportation.length > 0 && (
              <div className="flex justify-end rounded-lg border bg-card px-4 py-3 text-sm font-medium">
                Total&nbsp;
                <span className="ml-2 font-mono">
                  {Number(importation.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  {importation.devise ? ` ${importation.devise}` : ''}
                </span>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AjouterLigneDialog
        importationId={importationId}
        open={ligneDialogOpen}
        onClose={() => setLigneDialogOpen(false)}
      />

      <ValiderDialog
        open={validerDialogOpen}
        onClose={() => setValiderDialogOpen(false)}
        onConfirm={(validePar) => {
          validerM.mutate({ id: importationId, validePar })
          setValiderDialogOpen(false)
        }}
        isPending={validerM.isPending}
      />
    </div>
  )
}
