'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Info, ListOrdered, FileText, Pencil, Trash2, PackageCheck, AlertTriangle } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { StatutWorkflow } from '@/components/ui/statut-workflow'
import { ArticleSelect } from '@/components/forms/article-select'
import { DestinationScopeFields } from '@/components/forms/destination-scope'
import { DocumentSection } from '@/components/documents/document-section'
import {
  useGetAchat,
  useUpdateAchat,
  useDeleteAchat,
  useAjouterLigneAchat,
  useUpdateLigneAchat,
  useDeleteLigneAchat,
  useSoumettreAchat,
  useConfirmerAchat,
  useLivrerAchat,
  useRecevoirPartielAchat,
  useClotureForceeAchat,
} from '@/hooks/use-achats'
import { useGetCommandes } from '@/hooks/use-commandes'
import { useGetClients } from '@/hooks/use-clients'
import { useGetPlateformes } from '@/hooks/use-plateformes'
import {
  ligneAchatSchema,
  toLigneAchatPayload,
  type LigneAchatSchema,
} from '@/lib/validations/achat'
import type { WorkflowStatutConfig, WorkflowTransition } from '@/components/ui/statut-workflow'
import type { LigneAchat } from '@/types/achat'
import type { Plateforme } from '@/types/plateforme'
import type { CommandeClient } from '@/types/commande'
import type { Client } from '@/types/client'
import type { ApiError } from '@/types'
import { libelleCommande } from '@/lib/labels'

const ACHAT_STATUT_CONFIG: Record<number, WorkflowStatutConfig> = {
  0: { label: 'Brouillon', badgeVariant: 'secondary' },
  1: { label: 'Soumis', badgeClassName: 'border-amber-200 bg-amber-100 text-amber-800' },
  2: { label: 'Confirmé', badgeClassName: 'border-green-200 bg-green-100 text-green-800' },
  3: { label: 'Livré', badgeClassName: 'border-green-200 bg-green-100 text-green-800' },
  4: { label: 'Annulé', badgeVariant: 'destructive' },
}

const DESTINATION_LABELS: Record<number, string> = {
  0: 'Commande',
  1: 'Client',
  2: 'Plateforme',
  3: 'Libre',
}

function destinationLabel(
  l: LigneAchat,
  plateformes?: Plateforme[],
  commandes?: CommandeClient[],
  clients?: Client[],
): string {
  const base = DESTINATION_LABELS[l.typeDestination] ?? `#${l.typeDestination}`
  if (l.typeDestination === 0 && l.commandeClientId) {
    return libelleCommande(l.commandeClientId, commandes) ?? `Cde #${l.commandeClientId}`
  }
  if (l.typeDestination === 1 && l.clientId) {
    const cl = clients?.find((c) => c.id === l.clientId)
    const nom = cl?.nomEntreprise ?? cl?.nom
    return nom ?? `Client #${l.clientId}`
  }
  if (l.typeDestination === 2 && l.plateformeId) {
    const nom = plateformes?.find((p) => p.id === l.plateformeId)?.nom
    return nom ?? `Plf #${l.plateformeId}`
  }
  return base
}

// ── Dialog Ajouter / Modifier ligne achat ───────────────────────
const EMPTY_LIGNE_FORM = {
  articleId: 0,
  quantite: 0,
  prixUnitaire: 0,
  commandeClientId: null,
  clientId: null,
  plateformeId: null,
  couleur: null,
  codeCouleur: null,
  taille: null,
  dimension: null,
  unite: null,
  devise: 'EUR',
  descriptionSpecifique: null,
  notes: null,
}

function ligneToFormValues(l: LigneAchat): LigneAchatSchema {
  return {
    articleId: l.articleId,
    quantite: Number(l.quantite),
    prixUnitaire: Number(l.prixUnitaire),
    commandeClientId: l.commandeClientId,
    clientId: l.clientId,
    plateformeId: l.plateformeId,
    couleur: l.couleur,
    codeCouleur: l.codeCouleur,
    taille: l.taille,
    dimension: l.dimension,
    unite: l.unite,
    devise: l.devise ?? 'EUR',
    descriptionSpecifique: l.descriptionSpecifique,
    notes: l.notes,
  }
}

function LigneDialog({
  achatId,
  ligne,
  open,
  onClose,
}: {
  achatId: number
  ligne: LigneAchat | null
  open: boolean
  onClose: () => void
}) {
  const ajouterMutation = useAjouterLigneAchat()
  const modifierMutation = useUpdateLigneAchat()
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
  } = useForm<LigneAchatSchema>({
    resolver: zodResolver(ligneAchatSchema),
    defaultValues: ligne ? ligneToFormValues(ligne) : EMPTY_LIGNE_FORM,
  })

  // Réinitialise le formulaire à chaque ouverture (valeurs de la ligne en édition, vierge sinon)
  useEffect(() => {
    if (open) reset(ligne ? ligneToFormValues(ligne) : EMPTY_LIGNE_FORM)
  }, [open, ligne, reset])

  if (!open) return null

  const isEdition = !!ligne
  const isPending = isEdition ? modifierMutation.isPending : ajouterMutation.isPending

  const onSubmit = async (data: LigneAchatSchema) => {
    const payload = toLigneAchatPayload(data) as Record<string, unknown>
    if (ligne) {
      await modifierMutation.mutateAsync({ achatId, ligneId: ligne.id, data: payload })
    } else {
      await ajouterMutation.mutateAsync({ achatId, data: payload })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-[540px] overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
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
                    if (id) setValue('articleId', id)
                    // Pré-remplissage du prix avec le dernier prix connu de l'article
                    // (achats uniquement) — champ librement modifiable pour cette ligne.
                    const dernierPrix = Number(article?.prixUnitaireMoyen ?? 0)
                    if (dernierPrix > 0) {
                      setValue('prixUnitaire', dernierPrix)
                    }
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="unite">Unité</Label>
              <Input id="unite" placeholder="m, kg, pièce…" {...register('unite')} />
            </div>
          </div>

          {/* Destination (niveaux combinables et indépendants) */}
          <DestinationScopeFields
            control={control}
            commandes={commandes}
            clients={clients}
            plateformes={plateformes}
          />

          <div className="grid gap-2">
            <Label htmlFor="descriptionSpecifique">Description spécifique</Label>
            <Textarea id="descriptionSpecifique" rows={2} {...register('descriptionSpecifique')} />
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
  achatId,
  ligne,
  open,
  onClose,
}: {
  achatId: number
  ligne: LigneAchat | null
  open: boolean
  onClose: () => void
}) {
  const recevoirM = useRecevoirPartielAchat()
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
    await recevoirM.mutateAsync({ achatId, ligneId: ligne.id, quantite })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[420px] rounded-lg bg-background p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Réception partielle</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Article&nbsp;: <span className="font-medium text-foreground">{ligne.article?.designation ?? `#${ligne.articleId}`}</span>
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
            max={reliquat}
            step="0.01"
            value={quantite}
            onChange={(e) => setQuantite(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">Reliquat restant&nbsp;: {reliquat}</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={recevoirM.isPending || quantite <= 0 || quantite > reliquat}
            onClick={onSubmit}
          >
            {recevoirM.isPending ? 'Enregistrement…' : 'Réceptionner'}
          </Button>
        </div>
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
  const [ligneEnEdition, setLigneEnEdition] = useState<LigneAchat | null>(null)
  const [receptionDialogOpen, setReceptionDialogOpen] = useState(false)
  const [ligneEnReception, setLigneEnReception] = useState<LigneAchat | null>(null)

  const { data: achat, isLoading } = useGetAchat(achatId)
  const { data: plateformes } = useGetPlateformes()
  const { data: commandes } = useGetCommandes()
  const { data: clients } = useGetClients()
  const updateMutation = useUpdateAchat()
  const deleteMutation = useDeleteAchat()
  const soumettreM = useSoumettreAchat()
  const confirmerM = useConfirmerAchat()
  const livrerM = useLivrerAchat()
  const deleteLigneM = useDeleteLigneAchat()
  const clotureForceeM = useClotureForceeAchat()

  const ouvrirAjoutLigne = () => {
    setLigneEnEdition(null)
    setLigneDialogOpen(true)
  }

  const [activeTab, setActiveTab] = useState('info')
  const [notes, setNotes] = useState('')
  const [dateLivraison, setDateLivraison] = useState('')
  const [depassements, setDepassements] = useState<Array<{
    ligneId: number
    articleDesignation: string
    quantiteCommandee: number
    besoinTotal: number
    exces: number
  }> | null>(null)

  const handleSoumettre = (forcer: boolean) => {
    if (!achat) return
    soumettreM.mutate(
      { id: achat.id, forcerDepassement: forcer },
      {
        onError: (err: ApiError) => {
          if (err.status === 409 && err.data?.depassements) {
            setDepassements(err.data.depassements as Array<{
              ligneId: number; articleDesignation: string; quantiteCommandee: number; besoinTotal: number; exces: number
            }>)
          }
        },
      },
    )
  }

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
      onConfirm: () => handleSoumettre(false),
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
              {achat.statut === 2 && (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm" disabled={clotureForceeM.isPending}>
                      Clôturer
                    </Button>
                  }
                  title="Clôturer cet achat ?"
                  description="Cette action marquera les lignes non encore reçues comme clôturées et l'achat comme livré. Cette action ne peut pas être annulée."
                  confirmLabel="Clôturer"
                  onConfirm={() => clotureForceeM.mutate({ id: achat.id })}
                />
              )}
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

      {depassements && depassements.length > 0 && (
        <Dialog open onOpenChange={(open) => { if (!open) setDepassements(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" />
                Dépassement de besoin détecté
              </DialogTitle>
              <DialogDescription>
                {depassements.length === 1
                  ? '1 ligne dépasse le besoin de la commande associée.'
                  : `${depassements.length} lignes dépassent le besoin de la commande associée.`}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {depassements.map((d) => (
                <div
                  key={d.ligneId}
                  className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950"
                >
                  <div>
                    <p className="font-medium">{d.articleDesignation}</p>
                    <p className="text-muted-foreground">
                      Commandé : {d.quantiteCommandee} · Besoin : {d.besoinTotal}
                    </p>
                  </div>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    +{d.exces}
                  </span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepassements(null)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  setDepassements(null)
                  handleSoumettre(true)
                }}
                disabled={soumettreM.isPending}
              >
                Soumettre quand même
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {achat.statut === 0 && achat.lignesAchat.length === 0 && (
        <div className="mb-4 flex max-w-4xl items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950">
          <Info className="mt-0.5 size-4.5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Ajoutez maintenant les articles de cet achat
            </p>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
              L&apos;achat a été créé — ajoutez au moins une ligne avant de le soumettre.
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
            {achat.lignesAchat.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">
                {achat.lignesAchat.length}
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
                    <dt className="text-muted-foreground">Fournisseur</dt>
                    <dd className="font-semibold">{achat.fournisseur?.nomEntreprise ?? `#${achat.fournisseurId}`}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Commande client (en-tête)</dt>
                    <dd className="font-semibold">
                      {achat.commandeClient
                        ? (achat.commandeClient.titreCommande ?? achat.commandeClient.numeroCommande ?? `#${achat.commandeClientId}`)
                        : achat.commandeClientId
                          ? `#${achat.commandeClientId}`
                          : '—'}
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
                        // En-tête uniquement : le backend PutAchat attend UpdateAchatDto
                        updateMutation.mutate({
                          id: achat.id,
                          fournisseurId: achat.fournisseurId,
                          commandeClientId: achat.commandeClientId,
                          dateLivraisonPrevue: dateLivraison || achat.dateLivraisonPrevue,
                          devise: achat.devise,
                          conditionsPaiement: achat.conditionsPaiement,
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
                    {achat.statut >= 2 && (
                      <TableHead className="text-right">Reçue</TableHead>
                    )}
                    <TableHead className="text-right">Prix unit.</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Variantes</TableHead>
                    {(achat.statut === 0 || achat.statut === 2) && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {achat.lignesAchat.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={achat.statut === 0 || achat.statut === 2 ? 9 :achat.statut >= 2 ? 8 : 7}
                        className="py-10 text-center text-muted-foreground"
                      >
                        Aucune ligne.{achat.statut === 0 && ' Ajoutez des articles.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {achat.lignesAchat.map((l) => {
                    const isComplete = l.statutLigne === 2 || l.statutLigne === 3
                    return (
                    <TableRow key={l.id}>
                      <TableCell className="max-w-[280px] whitespace-normal">
                        <p className="break-words font-medium">{l.article?.designation ?? `#${l.articleId}`}</p>
                        {l.article?.reference && (
                          <p className="break-words font-mono text-xs text-muted-foreground">{l.article.reference}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {destinationLabel(l, plateformes, commandes, clients)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-normal break-words max-w-[160px]">
                        {l.unite ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{Number(l.quantite)}</TableCell>
                      {achat.statut >= 2 && (
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
                        {[l.couleur, l.taille, l.dimension].filter(Boolean).join(' / ') || '—'}
                      </TableCell>
                      {achat.statut === 0 && (
                        <TableCell className="text-right">
                          <PermissionGate module="achats" mode="write">
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
                                  deleteLigneM.mutate({ achatId, ligneId: l.id })
                                }
                              />
                            </div>
                          </PermissionGate>
                        </TableCell>
                      )}
                      {achat.statut === 2 && (
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

      <LigneDialog
        achatId={achatId}
        ligne={ligneEnEdition}
        open={ligneDialogOpen}
        onClose={() => setLigneDialogOpen(false)}
      />
      <ReceptionPartielDialog
        achatId={achatId}
        ligne={ligneEnReception}
        open={receptionDialogOpen}
        onClose={() => setReceptionDialogOpen(false)}
      />
    </div>
  )
}
