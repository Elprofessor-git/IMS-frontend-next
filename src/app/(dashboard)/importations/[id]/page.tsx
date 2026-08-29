'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Info, ListOrdered, FileText, PackageCheck, Clock, Pencil, Trash2 } from 'lucide-react'
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
import { DocumentSection } from '@/components/documents/document-section'
import { DestinationScopeFields } from '@/components/forms/destination-scope'
import { useGetCommandes } from '@/hooks/use-commandes'
import { useGetClients } from '@/hooks/use-clients'
import { useGetPlateformes } from '@/hooks/use-plateformes'

import {
  useGetImportation,
  useUpdateImportation,
  useDeleteImportation,
  useAjouterLigneImportation,
  useUpdateLigneImportation,
  useDeleteLigneImportation,
  useSoumettreImportation,
  useValiderImportation,
  useRecevoirImportation,
  useAffecterCommandes,
  useRecevoirPartielImportation,
  useClotureForceeImportation,
} from '@/hooks/use-importations'
import { MODE_EXPEDITION } from '@/types/fournisseur'
import type { LigneImportation } from '@/types/importation'
import type { CommandeClient } from '@/types/commande'
import { libelleCommande } from '@/lib/labels'
import {
  ligneImportationSchema,
  toLigneImportationPayload,
  type LigneImportationSchema,
} from '@/lib/validations/importation'
import type { WorkflowStatutConfig } from '@/components/ui/statut-workflow'

const IMPORTATION_STATUT_CONFIG: Record<number, WorkflowStatutConfig> = {
  0: { label: 'Brouillon', badgeVariant: 'secondary' },
  1: { label: 'Soumise', badgeClassName: 'border-amber-200 bg-amber-100 text-amber-800' },
  2: { label: 'Validée', badgeClassName: 'border-green-200 bg-green-100 text-green-800' },
  3: { label: 'Reçue', badgeClassName: 'border-green-200 bg-green-100 text-green-800' },
  4: { label: 'Annulée', badgeVariant: 'destructive' },
}

// TypeDestinationImportation (backend, sérialisé en nombre) : Commande=0, Marque=1, Plateforme=2, StockLibre=3
const DESTINATION_LABEL_BY_NUMBER: Record<number, string> = {
  0: 'Commande',
  1: 'Client',
  2: 'Plateforme',
  3: 'Stock libre',
  4: 'Groupe de commandes',
}

function destinationLabel(
  l: LigneImportation,
  commandes?: CommandeClient[],
): string {
  if (l.typeDestination === 0 && l.commandeClientId) {
    return libelleCommande(l.commandeClientId, commandes) ?? `Cde #${l.commandeClientId}`
  }
  if (l.typeDestination === 4) {
    const noms = l.groupeCommandeMembres
      .map((id) => libelleCommande(id, commandes) ?? `Cde #${id}`)
    return noms.length
      ? noms.join(', ')
      : (DESTINATION_LABEL_BY_NUMBER[4] ?? 'Groupe de commandes')
  }
  return DESTINATION_LABEL_BY_NUMBER[l.typeDestination] ?? String(l.typeDestination)
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

// ── Dialog Ajouter / Modifier ligne importation ────────────────
const EMPTY_LIGNE_FORM = {
  articleId: 0,
  quantite: 0,
  prixUnitaire: 0,
  commandeClientId: null,
  clientId: null,
  plateformeId: null,
  commandeClientIds: [],
  designation: null,
  couleur: null,
  codeCouleur: null,
  dimension: null,
  nature: null,
  unite: null,
  devise: 'EUR',
  notes: null,
}

function ligneToFormValues(l: LigneImportation): LigneImportationSchema {
  return {
    articleId: l.articleId,
    quantite: Number(l.quantite),
    prixUnitaire: Number(l.prixUnitaire),
    commandeClientId: l.commandeClientId,
    clientId: l.clientId,
    plateformeId: l.plateformeId,
    commandeClientIds: [],
    designation: l.designation,
    couleur: l.couleur,
    codeCouleur: l.codeCouleur,
    dimension: l.dimension,
    nature: l.nature,
    unite: l.unite,
    devise: l.devise ?? 'EUR',
    notes: l.notes,
  }
}

function LigneDialog({
  importationId,
  ligne,
  open,
  onClose,
}: {
  importationId: number
  ligne: LigneImportation | null
  open: boolean
  onClose: () => void
}) {
  const ajouterMutation = useAjouterLigneImportation()
  const modifierMutation = useUpdateLigneImportation()
  const { data: commandes } = useGetCommandes()
  const { data: clients } = useGetClients()
  const { data: plateformes } = useGetPlateformes()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LigneImportationSchema>({
    resolver: zodResolver(ligneImportationSchema),
    defaultValues: ligne ? ligneToFormValues(ligne) : EMPTY_LIGNE_FORM,
  })

  // Réinitialise le formulaire à chaque ouverture (valeurs de la ligne en édition, vierge sinon)
  useEffect(() => {
    if (open) reset(ligne ? ligneToFormValues(ligne) : EMPTY_LIGNE_FORM)
  }, [open, ligne, reset])

  if (!open) return null

  const isEdition = !!ligne
  const isPending = isEdition ? modifierMutation.isPending : ajouterMutation.isPending

  const onSubmit = async (data: LigneImportationSchema) => {
    const payload = toLigneImportationPayload(data) as Record<string, unknown>
    if (ligne) {
      await modifierMutation.mutateAsync({ importationId, ligneId: ligne.id, data: payload })
    } else {
      await ajouterMutation.mutateAsync({ importationId, data: payload })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-[520px] overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">
          {isEdition ? 'Modifier la ligne' : 'Ajouter une ligne'}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-2">
            <Label>Article <span className="text-destructive">*</span></Label>
            <Controller
              name="articleId"
              control={control}
              render={({ field }) => (
                <ArticleSelect
                  value={field.value || null}
                  onChange={(id, article) => {
                    field.onChange(id ?? 0)
                    // Pré-remplissage de l'unité depuis l'article (modifiable manuellement)
                    if (article?.unite) {
                      setValue('unite', article.unite)
                    }
                  }}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="imp-unite">Unité</Label>
              <Input id="imp-unite" placeholder="m, kg, pièce…" {...register('unite')} />
            </div>
          </div>

          {/* Destination (niveaux combinables et indépendants) */}
          <DestinationScopeFields
            control={control}
            commandes={commandes}
            clients={clients}
            plateformes={plateformes}
            setValue={setValue}
          />

          <div className="grid gap-2">
            <Label htmlFor="imp-notes">Notes</Label>
            <Textarea id="imp-notes" rows={2} {...register('notes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending
                ? isEdition
                  ? 'Enregistrement…'
                  : 'Ajout…'
                : isEdition
                  ? 'Enregistrer'
                  : 'Ajouter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Dialog Réception partielle ────────────────────────────────
function ReceptionPartielDialog({
  importationId,
  ligne,
  open,
  onClose,
}: {
  importationId: number
  ligne: LigneImportation | null
  open: boolean
  onClose: () => void
}) {
  const recevoirM = useRecevoirPartielImportation()
  const [quantite, setQuantite] = useState<number>(0)

  useEffect(() => {
    if (open && ligne) {
      const reliquat = Number(ligne.quantite) - Number(ligne.quantiteRecue)
      setQuantite(reliquat > 0 ? reliquat : 0)
    }
  }, [open, ligne])

  if (!open || !ligne) return null

  const reliquat = Number(ligne.quantite) - Number(ligne.quantiteRecue)

  const onSubmit = async () => {
    await recevoirM.mutateAsync({ importationId, ligneId: ligne.id, quantite })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[420px] rounded-lg bg-background p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Réception partielle</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Article&nbsp;: <span className="font-medium text-foreground">{ligne.designation ?? ligne.article?.designation ?? `#${ligne.articleId}`}</span>
        </p>
        <p className="mb-2 text-sm text-muted-foreground">
          Quantité commandée&nbsp;: <span className="font-mono">{Number(ligne.quantite)}</span>
          &nbsp;— Déjà reçue&nbsp;: <span className="font-mono">{Number(ligne.quantiteRecue)}</span>
        </p>
        <div className="grid gap-2">
          <Label htmlFor="quantite-reception">Quantité à recevoir <span className="text-destructive">*</span></Label>
          <Input
            id="quantite-reception"
            type="number"
            min="0.01"
            step="0.01"
            value={quantite}
            onChange={(e) => setQuantite(Number(e.target.value))}
          />
          {quantite > reliquat ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Sur-réception : {Number((quantite - reliquat).toFixed(2))} unités au-delà du reliquat
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Reliquat restant&nbsp;: {reliquat}</p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={recevoirM.isPending || quantite <= 0}
            onClick={onSubmit}
          >
            {recevoirM.isPending ? 'Enregistrement…' : 'Réceptionner'}
          </Button>
        </div>
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
  const [activeTab, setActiveTab] = useState('info')
  const [ligneDialogOpen, setLigneDialogOpen] = useState(false)
  const [ligneEnEdition, setLigneEnEdition] = useState<LigneImportation | null>(null)
  const [validerDialogOpen, setValiderDialogOpen] = useState(false)
  const [receptionDialogOpen, setReceptionDialogOpen] = useState(false)
  const [ligneEnReception, setLigneEnReception] = useState<LigneImportation | null>(null)
  const [notes, setNotes] = useState('')
  const [dateReception, setDateReception] = useState('')

  const { data: importation, isLoading } = useGetImportation(importationId)
  const { data: commandes } = useGetCommandes()
  const updateMutation = useUpdateImportation()
  const deleteMutation = useDeleteImportation()
  const soumettreM = useSoumettreImportation()
  const validerM = useValiderImportation()
  const recevoirM = useRecevoirImportation()
  const affecterM = useAffecterCommandes()
  const deleteLigneM = useDeleteLigneImportation()
  const clotureForceeM = useClotureForceeImportation()

  const ouvrirAjoutLigne = () => {
    setLigneEnEdition(null)
    setLigneDialogOpen(true)
  }

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

              {importation.statut === 2 && (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm" disabled={clotureForceeM.isPending}>
                      Clôturer
                    </Button>
                  }
                  title="Clôturer cette importation ?"
                  description="Cette action marquera les lignes non encore reçues comme clôturées et l'importation comme reçue. Cette action ne peut pas être annulée."
                  confirmLabel="Clôturer"
                  onConfirm={() => clotureForceeM.mutate({ id: importation.id })}
                />
              )}

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

      {importation.statut === 0 && importation.lignesImportation.length === 0 && (
        <div className="mb-4 flex max-w-4xl items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950">
          <Info className="mt-0.5 size-4.5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Ajoutez maintenant les articles de cette importation
            </p>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
              L&apos;importation a été créée — ajoutez au moins une ligne avant de la soumettre.
            </p>
          </div>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => {
              setActiveTab('lignes')
              ouvrirAjoutLigne()
            }}
          >
            <Plus className="mr-1.5 size-4" />
            Ajouter une ligne
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="info">
            <Info className="size-4" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="lignes">
            <ListOrdered className="size-4" />
            Lignes
            {importation.lignesImportation.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">
                {importation.lignesImportation.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="size-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* ── Onglet Informations ── */}
        <TabsContent value="info">
          <div className="grid gap-4">
            <Card>
              <CardContent className="pt-6">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Source</dt>
                    <dd className="font-semibold">
                      {importation.plateformeId
                        ? `${importation.plateforme?.nom ?? `#${importation.plateformeId}`} (plateforme)`
                        : importation.fournisseur?.nomEntreprise ??
                          (importation.fournisseurId ? `#${importation.fournisseurId}` : '—')}
                    </dd>
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
                        // En-tête uniquement : le backend PutImportation attend UpdateImportationDto
                        updateMutation.mutate({
                          id: importation.id,
                          fournisseurId: importation.fournisseurId,
                          plateformeId: importation.plateformeId,
                          dateReceptionPrevue: dateReception || importation.dateReceptionPrevue,
                          modeExpedition: importation.modeExpedition,
                          devise: importation.devise,
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
                <div className="sticky top-0 z-10 flex justify-end bg-background py-2">
                  <Button size="sm" onClick={ouvrirAjoutLigne}>
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
                    <TableHead>Destination</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    {importation.statut >= 2 && (
                      <TableHead className="text-right">Reçue</TableHead>
                    )}
                    <TableHead className="text-right">Prix unit.</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Variantes</TableHead>
                    <TableHead>Affecté</TableHead>
                    {(importation.statut === 0 || importation.statut === 2) && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importation.lignesImportation.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={(importation.statut === 0 || importation.statut === 2) ? 10 : importation.statut >= 2 ? 9 : 8}
                        className="py-10 text-center text-muted-foreground"
                      >
                        Aucune ligne.{importation.statut === 0 && ' Ajoutez des articles.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {importation.lignesImportation.map((l) => {
                    const isComplete = l.statutLigne === 2 || l.statutLigne === 3
                    return (
                    <TableRow key={l.id}>
                      <TableCell className="max-w-[280px] whitespace-normal">
                        <p className="break-words font-medium">
                          {l.designation ?? l.article?.designation ?? `#${l.articleId}`}
                        </p>
                        {l.article?.reference && (
                          <p className="break-words font-mono text-xs text-muted-foreground">{l.article.reference}</p>
                        )}
                        {l.commandeClientId && (
                          <p className="break-words text-xs text-muted-foreground">
                            Commande {libelleCommande(l.commandeClientId, commandes) ?? `#${l.commandeClientId}`}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.typeDestination === 3 ? 'secondary' : 'outline'}>
                          {destinationLabel(l, commandes)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-normal break-words max-w-[160px]">
                        {l.unite ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{Number(l.quantite)}</TableCell>
                      {importation.statut >= 2 && (
                        <TableCell className="text-right font-mono text-sm">
                          <span className={isComplete ? 'text-green-600 font-medium' : Number(l.quantiteRecue) > 0 ? 'text-amber-600' : 'text-muted-foreground'}>
                            {Number(l.quantiteRecue)} / {Number(l.quantite)}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="text-right font-mono">
                        {Number(l.prixUnitaire).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        {l.devise ? ` ${l.devise}` : ''}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {Number(l.montantLigne).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-sm text-muted-foreground">
                        {[l.couleur, l.dimension, l.nature].filter(Boolean).join(' / ') || '—'}
                      </TableCell>
                      <TableCell>
                        {l.estAffecteStock ? (
                          <Badge variant="default" className="border-green-200 bg-green-100 text-green-800">
                            <PackageCheck className="size-3.5" />
                            Affecté
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-800">
                            <Clock className="size-3.5" />
                            En attente
                          </Badge>
                        )}
                      </TableCell>
                      {importation.statut === 0 && (
                        <TableCell className="text-right">
                          <PermissionGate module="importations" mode="write">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="Modifier"
                                onClick={() => {
                                  setLigneEnEdition(l)
                                  setLigneDialogOpen(true)
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <ConfirmDialog
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-destructive hover:text-destructive"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                }
                                title="Supprimer cette ligne ?"
                                description="Cette action est irréversible."
                                confirmLabel="Supprimer"
                                onConfirm={() =>
                                  deleteLigneM.mutate({ importationId, ligneId: l.id })
                                }
                              />
                            </div>
                          </PermissionGate>
                        </TableCell>
                      )}
                      {importation.statut === 2 && (
                        <TableCell className="text-right">
                          {!isComplete ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLigneEnReception(l)
                                setReceptionDialogOpen(true)
                              }}
                            >
                              <PackageCheck className="mr-1 size-3.5" />
                              Réceptionner
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <PackageCheck className="size-3.5" />
                              Complet
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                    )
                  })}
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
        {/* ── Onglet Documents ── */}
        <TabsContent value="documents">
          <DocumentSection scope="importation" parentId={importationId} />
        </TabsContent>
      </Tabs>

      <LigneDialog
        importationId={importationId}
        ligne={ligneEnEdition}
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

      <ReceptionPartielDialog
        importationId={importationId}
        ligne={ligneEnReception}
        open={receptionDialogOpen}
        onClose={() => setReceptionDialogOpen(false)}
      />
    </div>
  )
}
