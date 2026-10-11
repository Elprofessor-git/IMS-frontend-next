'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ClipboardList,
  Layers2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  TriangleAlert,
} from 'lucide-react'
import {
  useGetOrdreCoupe,
  useGetOrdresCoupe,
  useCreerOrdreCoupe,
  useModifierOrdreCoupe,
  usePreremplirOrdreCoupe,
  useAjouterTaille,
  useModifierTaille,
  useSupprimerTaille,
  useAjouterPlan,
  useModifierPlan,
  useSupprimerPlan,
  useAjouterMatiere,
  useModifierMatiere,
  useSupprimerMatiere,
} from '@/hooks/use-ordre-coupe'
import { useGetChainesProduction } from '@/hooks/use-production'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PermissionGate } from '@/components/auth/permission-gate'
import type { OrdreCoupePlan } from '@/types/ordre-coupe'

function fmt(v: number | null | undefined) {
  if (v == null) return '—'
  return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

function CelluleNombre({
  value,
  onCommit,
  ariaLabel,
  disabled,
  step = '1',
  className = '',
}: {
  value: string
  onCommit: (v: string) => void
  ariaLabel: string
  disabled?: boolean
  step?: string
  className?: string
}) {
  const [local, setLocal] = useState(value)
  const [focus, setFocus] = useState(false)

  useEffect(() => {
    if (!focus) setLocal(value)
  }, [value, focus])

  return (
    <Input
      aria-label={ariaLabel}
      type="number"
      step={step}
      disabled={disabled}
      value={local}
      className={`h-8 w-20 text-right font-mono ${className}`}
      onFocus={() => setFocus(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        setFocus(false)
        if (local !== value) onCommit(local)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

function CelluleTexte({
  value,
  onCommit,
  ariaLabel,
  disabled,
  className = '',
}: {
  value: string
  onCommit: (v: string) => void
  ariaLabel: string
  disabled?: boolean
  className?: string
}) {
  const [local, setLocal] = useState(value)
  const [focus, setFocus] = useState(false)

  useEffect(() => {
    if (!focus) setLocal(value)
  }, [value, focus])

  return (
    <Input
      aria-label={ariaLabel}
      disabled={disabled}
      value={local}
      className={`h-8 ${className}`}
      onFocus={() => setFocus(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        setFocus(false)
        if (local !== value) onCommit(local)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

export function OrdreCoupeSheet({ commandeId }: { commandeId: number }) {
  const { data: ordres, isLoading } = useGetOrdresCoupe(commandeId)
  const [selection, setSelection] = useState<number | null>(null)
  const [creation, setCreation] = useState(false)

  const liste = ordres ?? []
  const actif = selection ?? liste[0]?.id ?? null

  if (isLoading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <ClipboardList className="size-4" />
            Ordres de coupe de la commande
            <PermissionGate module="coupe" mode="write" fallback={null}>
              <Button size="sm" className="ml-auto" onClick={() => setCreation(true)}>
                <Plus className="size-3.5" /> Nouvel ordre
              </Button>
            </PermissionGate>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liste.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
              <Layers2 className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">Aucun ordre de coupe</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Créez un ordre par couple modèle/couleur, puis préremplissez-le depuis les
                besoins de la commande.
              </p>
              <PermissionGate module="coupe" mode="write" fallback={null}>
                <Button onClick={() => setCreation(true)}>
                  <Plus className="size-3.5" /> Créer le premier ordre
                </Button>
              </PermissionGate>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {liste.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelection(o.id)}
                  aria-pressed={actif === o.id}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    actif === o.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {o.modele} · {o.couleur}
                    {o.verrouille && <Lock className="size-3 text-amber-700" />}
                    {o.alerteManque && <TriangleAlert className="size-3 text-red-600" />}
                  </span>
                  <span className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
                    <span>{o.nbTailles} tailles</span>
                    <span>{o.nbPlans} plans</span>
                    <span>
                      planifié {fmt(o.totalPlanifie)}/{fmt(o.totalCommande)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {actif != null && <FeuilleOrdre ordreId={actif} />}

      <CreerOrdreDialog commandeId={commandeId} open={creation} onOpenChange={setCreation} />
    </div>
  )
}

function CreerOrdreDialog({
  commandeId,
  open,
  onOpenChange,
}: {
  commandeId: number
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const creer = useCreerOrdreCoupe(commandeId)
  const { data: chaines } = useGetChainesProduction(true)
  const [modele, setModele] = useState('')
  const [couleur, setCouleur] = useState('')
  const [chaine, setChaine] = useState('aucune')

  const valide = modele.trim() !== '' && couleur.trim() !== ''

  const soumettre = () => {
    if (!valide) return
    creer.mutate(
      {
        commandeId,
        modele: modele.trim(),
        couleur: couleur.trim(),
        chaineProductionId: chaine === 'aucune' ? null : Number(chaine),
      },
      {
        onSuccess: () => {
          setModele('')
          setCouleur('')
          setChaine('aucune')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel ordre de coupe</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="oc-modele">Modèle</Label>
            <Input id="oc-modele" value={modele} onChange={(e) => setModele(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="oc-couleur">Couleur</Label>
            <Input id="oc-couleur" value={couleur} onChange={(e) => setCouleur(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="oc-chaine">Chaîne de production</Label>
            <Select value={chaine} onValueChange={setChaine}>
              <SelectTrigger id="oc-chaine">
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucune">Aucune</SelectItem>
                {(chaines ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nom} {c.estSousTraitant ? '(sous-traitant)' : '(interne)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={soumettre} disabled={!valide || creer.isPending}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FeuilleOrdre({ ordreId }: { ordreId: number }) {
  const { data: ordre, isLoading } = useGetOrdreCoupe(ordreId)
  const { data: chaines } = useGetChainesProduction(true)

  const modifierEntete = useModifierOrdreCoupe(ordreId)
  const preremplir = usePreremplirOrdreCoupe(ordreId)
  const ajouterTaille = useAjouterTaille(ordreId)
  const modifierTaille = useModifierTaille(ordreId)
  const supprimerTaille = useSupprimerTaille(ordreId)
  const ajouterPlan = useAjouterPlan(ordreId)
  const modifierPlan = useModifierPlan(ordreId)
  const supprimerPlan = useSupprimerPlan(ordreId)

  const [entete, setEntete] = useState({
    modele: '',
    couleur: '',
    chaine: 'aucune',
    marge: '',
    referenceOF: '',
    notes: '',
  })
  const [nouvelleTaille, setNouvelleTaille] = useState('')

  useEffect(() => {
    if (!ordre) return
    setEntete({
      modele: ordre.modele,
      couleur: ordre.couleur,
      chaine: ordre.chaineProductionId == null ? 'aucune' : String(ordre.chaineProductionId),
      marge: ordre.margePersonnalisee ? String(ordre.margeSecurite) : '',
      referenceOF: ordre.referenceOF ?? '',
      notes: ordre.notes ?? '',
    })
  }, [ordre])

  const tailles = useMemo(
    () => [...(ordre?.tailles ?? [])].sort((a, b) => a.index - b.index || a.id - b.id),
    [ordre?.tailles],
  )

  if (isLoading || !ordre) return <Skeleton className="h-96 w-full" />

  const verrouille = ordre.verrouille

  const enregistrerEntete = () => {
    modifierEntete.mutate({
      modele: entete.modele,
      couleur: entete.couleur,
      chaineProductionId: entete.chaine === 'aucune' ? null : Number(entete.chaine),
      margeSecurite: entete.marge.trim() === '' ? null : Number(entete.marge),
      referenceOF: entete.referenceOF || null,
      notes: entete.notes || null,
    })
  }

  const ajouterUneTaille = () => {
    if (nouvelleTaille.trim() === '') return
    ajouterTaille.mutate(
      { libelle: nouvelleTaille.trim() },
      { onSuccess: () => setNouvelleTaille('') },
    )
  }

  const majTaille = (id: number, libelle: string, demandee: number | null, avecMarge: number | null) =>
    modifierTaille.mutate({ id, libelle, quantiteDemandee: demandee, quantiteAvecMarge: avecMarge })

  const majPlan = (plan: OrdreCoupePlan, patch: Partial<OrdreCoupePlan>) =>
    modifierPlan.mutate({
      id: plan.id,
      libelle: plan.libelle,
      plis: patch.plis ?? plan.plis,
      matelasId: plan.matelasId,
      occurrences: (patch.occurrences ?? plan.occurrences).map((o) => ({
        taille: o.taille,
        occurrences: o.occurrences,
      })),
    })

  const commitOccurrence = (plan: OrdreCoupePlan, taille: string, raw: string) => {
    const n = Number(raw)
    const occurrences = plan.occurrences.filter((o) => o.taille !== taille)
    if (Number.isFinite(n) && n > 0) occurrences.push({ taille, occurrences: n })
    majPlan(plan, { occurrences })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          Feuille d&apos;ordre de coupe — {ordre.modele} · {ordre.couleur}
          <Badge variant="outline">Cmd {ordre.numeroCommande}</Badge>
          {verrouille && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
              <Lock className="size-3" /> figé après coupe
            </Badge>
          )}
          <PermissionGate module="coupe" mode="write" fallback={null}>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => preremplir.mutate()}
              disabled={verrouille || preremplir.isPending}
            >
              <RefreshCw className="size-3.5" /> Préremplir
            </Button>
          </PermissionGate>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Résumé calculé côté backend */}
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">Commandé {fmt(ordre.totalCommande)}</Badge>
          <Badge variant="secondary">Planifié {fmt(ordre.totalPlanifie)}</Badge>
          <Badge variant="outline" className="border-green-300 bg-green-50 text-green-800">
            Surplus {fmt(ordre.surplus)}
          </Badge>
          <Badge
            variant="outline"
            className={ordre.alerteManque ? 'border-red-300 bg-red-50 text-red-800' : ''}
          >
            Manque {fmt(ordre.manque)}
          </Badge>
          {ordre.alerteManque && (
            <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
              <TriangleAlert className="size-3" /> commande non couverte
            </Badge>
          )}
        </div>

        {/* En-tête modifiable */}
        <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-1">
            <Label htmlFor="oc-f-modele">Modèle</Label>
            <Input
              id="oc-f-modele"
              value={entete.modele}
              disabled={verrouille}
              onChange={(e) => setEntete({ ...entete, modele: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="oc-f-couleur">Couleur</Label>
            <Input
              id="oc-f-couleur"
              value={entete.couleur}
              disabled={verrouille}
              onChange={(e) => setEntete({ ...entete, couleur: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="oc-f-chaine">Chaîne de production</Label>
            <Select
              value={entete.chaine}
              onValueChange={(v) => setEntete({ ...entete, chaine: v })}
              disabled={verrouille}
            >
              <SelectTrigger id="oc-f-chaine">
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucune">Aucune</SelectItem>
                {(chaines ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nom} {c.estSousTraitant ? '(sous-traitant)' : '(interne)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="oc-f-marge">Marge de sécurité (%)</Label>
            <Input
              id="oc-f-marge"
              type="number"
              step="0.1"
              placeholder="Marge de la commande"
              value={entete.marge}
              disabled={verrouille}
              onChange={(e) => setEntete({ ...entete, marge: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="oc-f-of">Référence OF</Label>
            <Input
              id="oc-f-of"
              value={entete.referenceOF}
              disabled={verrouille}
              onChange={(e) => setEntete({ ...entete, referenceOF: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="oc-f-notes">Notes</Label>
            <Textarea
              id="oc-f-notes"
              rows={1}
              value={entete.notes}
              disabled={verrouille}
              onChange={(e) => setEntete({ ...entete, notes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <PermissionGate module="coupe" mode="write" fallback={null}>
              <Button
                size="sm"
                onClick={enregistrerEntete}
                disabled={verrouille || modifierEntete.isPending}
              >
                <Save className="size-3.5" /> Enregistrer l&apos;en-tête
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Grille défilante (mobile : défilement horizontal) */}
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background">Plan / Taille</TableHead>
                {tailles.map((t) => (
                  <TableHead key={t.id} className="min-w-[120px]">
                    <div className="flex items-center gap-1">
                      <CelluleTexte
                        value={t.libelle}
                        disabled={verrouille}
                        ariaLabel={`Libellé de la taille ${t.libelle}`}
                        onCommit={(v) =>
                          v.trim() !== '' && majTaille(t.id, v.trim(), t.quantiteDemandee, t.quantiteAvecMarge)
                        }
                        className="w-24"
                      />
                      <PermissionGate module="coupe" mode="write" fallback={null}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Supprimer la taille ${t.libelle}`}
                          disabled={verrouille}
                          onClick={() => supprimerTaille.mutate(t.id)}
                        >
                          <span aria-hidden>×</span>
                        </Button>
                      </PermissionGate>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="min-w-[150px]">
                  <div className="flex items-center gap-1">
                    <Input
                      aria-label="Nouvelle taille"
                      placeholder="Nouvelle taille"
                      value={nouvelleTaille}
                      className="h-8 w-24"
                      onChange={(e) => setNouvelleTaille(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') ajouterUneTaille()
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Ajouter la taille"
                      disabled={nouvelleTaille.trim() === ''}
                      onClick={ajouterUneTaille}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="sticky left-0 z-10 bg-background font-medium">Demandé</TableCell>
                {tailles.map((t) => (
                  <TableCell key={t.id} className="text-right">
                    <CelluleNombre
                      value={t.quantiteDemandee == null ? '' : String(t.quantiteDemandee)}
                      disabled={verrouille}
                      ariaLabel={`Quantité demandée ${t.libelle}`}
                      onCommit={(v) =>
                        majTaille(t.id, t.libelle, v === '' ? null : Number(v), t.quantiteAvecMarge)
                      }
                    />
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell className="sticky left-0 z-10 bg-background font-medium">
                  Avec marge
                </TableCell>
                {tailles.map((t) => (
                  <TableCell key={t.id} className="text-right">
                    <CelluleNombre
                      value={t.quantiteAvecMarge == null ? '' : String(t.quantiteAvecMarge)}
                      disabled={verrouille}
                      ariaLabel={`Quantité avec marge ${t.libelle}`}
                      onCommit={(v) =>
                        majTaille(t.id, t.libelle, t.quantiteDemandee, v === '' ? null : Number(v))
                      }
                    />
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>

              {ordre.plans.map((plan, i) => {
                const restes = new Map(plan.restes.map((r) => [r.taille, r.valeur]))
                return (
                  <Fragment key={plan.id}>
                    <TableRow className="border-t-2">
                      <TableCell className="sticky left-0 z-10 bg-background">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Plan {i + 1}</span>
                          <CelluleNombre
                            value={String(plan.plis)}
                            disabled={verrouille}
                            ariaLabel={`Plis du plan ${i + 1}`}
                            onCommit={(v) => Number(v) >= 1 && majPlan(plan, { plis: Number(v) })}
                            className="w-16"
                          />
                          <span className="text-xs text-muted-foreground">plis</span>
                          <PermissionGate module="coupe" mode="write" fallback={null}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Supprimer le plan ${i + 1}`}
                              disabled={verrouille}
                              onClick={() => supprimerPlan.mutate(plan.id)}
                            >
                              <span aria-hidden>×</span>
                            </Button>
                          </PermissionGate>
                        </div>
                      </TableCell>
                      {tailles.map((t) => {
                        const occ = plan.occurrences.find((o) => o.taille === t.libelle)?.occurrences ?? 0
                        return (
                          <TableCell key={t.id} className="text-right">
                            <CelluleNombre
                              value={occ === 0 ? '' : String(occ)}
                              disabled={verrouille}
                              ariaLabel={`Occurrences ${t.libelle} plan ${i + 1}`}
                              onCommit={(v) => commitOccurrence(plan, t.libelle, v)}
                            />
                          </TableCell>
                        )
                      })}
                      <TableCell />
                    </TableRow>
                    <TableRow>
                      <TableCell className="sticky left-0 z-10 bg-background text-xs text-muted-foreground">
                        Restes après plan {i + 1}
                      </TableCell>
                      {tailles.map((t) => {
                        const v = restes.get(t.libelle) ?? 0
                        return (
                          <TableCell
                            key={t.id}
                            className={`text-right font-mono font-semibold ${v < 0 ? 'text-red-600' : ''}`}
                          >
                            {fmt(v)}
                          </TableCell>
                        )
                      })}
                      <TableCell />
                    </TableRow>
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <PermissionGate module="coupe" mode="write" fallback={null}>
          <Button
            size="sm"
            variant="outline"
            disabled={verrouille || ajouterPlan.isPending}
            onClick={() => ajouterPlan.mutate({ plis: 1, occurrences: [] })}
          >
            <Plus className="size-3.5" /> Ajouter un plan
          </Button>
        </PermissionGate>

        <MatieresTable ordreId={ordreId} verrouille={verrouille} />
      </CardContent>
    </Card>
  )
}

function MatieresTable({ ordreId, verrouille }: { ordreId: number; verrouille: boolean }) {
  const { data: ordre } = useGetOrdreCoupe(ordreId)
  const ajouter = useAjouterMatiere(ordreId)
  const modifier = useModifierMatiere(ordreId)
  const supprimer = useSupprimerMatiere(ordreId)

  const [designation, setDesignation] = useState('')
  const [consoClient, setConsoClient] = useState('')
  const [metresRecus, setMetresRecus] = useState('')

  const matieres = ordre?.matieres ?? []

  const valide = designation.trim() !== '' && consoClient.trim() !== '' && metresRecus.trim() !== ''

  const ajouterMatiere = () => {
    if (!valide) return
    ajouter.mutate(
      {
        designation: designation.trim(),
        consoClient: Number(consoClient),
        metresRecus: Number(metresRecus),
        retraitPourcentage: 0,
      },
      {
        onSuccess: () => {
          setDesignation('')
          setConsoClient('')
          setMetresRecus('')
        },
      },
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Matières (laize, conso client / réelle, retrait, mètres reçus)</h3>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Laize</TableHead>
              <TableHead className="text-right">Conso client</TableHead>
              <TableHead className="text-right">Conso réelle</TableHead>
              <TableHead className="text-right">Écart</TableHead>
              <TableHead className="text-right">Retrait %</TableHead>
              <TableHead className="text-right">Mètres reçus</TableHead>
              <TableHead className="text-right">Utilisés</TableHead>
              <TableHead className="text-right">Retrait</TableHead>
              <TableHead className="text-right">Stock restant</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {matieres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-4 text-center text-sm text-muted-foreground">
                  Aucune matière.
                </TableCell>
              </TableRow>
            ) : (
              matieres.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <CelluleTexte
                      value={m.designation}
                      disabled={verrouille}
                      ariaLabel={`Désignation ${m.designation}`}
                      onCommit={(v) =>
                        v.trim() !== '' &&
                        modifier.mutate({
                          id: m.id,
                          designation: v.trim(),
                          laize: m.laize,
                          consoClient: m.consoClient,
                          consoReelle: m.consoReelle,
                          retraitPourcentage: m.retraitPourcentage,
                          metresRecus: m.metresRecus,
                        })
                      }
                      className="w-40"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <CelluleNombre
                      value={m.laize == null ? '' : String(m.laize)}
                      disabled={verrouille}
                      step="0.1"
                      ariaLabel={`Laize ${m.designation}`}
                      onCommit={(v) =>
                        modifier.mutate({
                          id: m.id,
                          designation: m.designation,
                          laize: v === '' ? null : Number(v),
                          consoClient: m.consoClient,
                          consoReelle: m.consoReelle,
                          retraitPourcentage: m.retraitPourcentage,
                          metresRecus: m.metresRecus,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <CelluleNombre
                      value={String(m.consoClient)}
                      disabled={verrouille}
                      step="0.01"
                      ariaLabel={`Conso client ${m.designation}`}
                      onCommit={(v) =>
                        modifier.mutate({
                          id: m.id,
                          designation: m.designation,
                          laize: m.laize,
                          consoClient: Number(v) || 0,
                          consoReelle: m.consoReelle,
                          retraitPourcentage: m.retraitPourcentage,
                          metresRecus: m.metresRecus,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <CelluleNombre
                      value={m.consoReelle == null ? '' : String(m.consoReelle)}
                      disabled={verrouille}
                      step="0.01"
                      ariaLabel={`Conso réelle ${m.designation}`}
                      onCommit={(v) =>
                        modifier.mutate({
                          id: m.id,
                          designation: m.designation,
                          laize: m.laize,
                          consoClient: m.consoClient,
                          consoReelle: v === '' ? null : Number(v),
                          retraitPourcentage: m.retraitPourcentage,
                          metresRecus: m.metresRecus,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">{fmt(m.ecartConso)}</TableCell>
                  <TableCell className="text-right">
                    <CelluleNombre
                      value={String(m.retraitPourcentage)}
                      disabled={verrouille}
                      step="0.1"
                      ariaLabel={`Retrait ${m.designation}`}
                      onCommit={(v) =>
                        modifier.mutate({
                          id: m.id,
                          designation: m.designation,
                          laize: m.laize,
                          consoClient: m.consoClient,
                          consoReelle: m.consoReelle,
                          retraitPourcentage: Number(v) || 0,
                          metresRecus: m.metresRecus,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <CelluleNombre
                      value={String(m.metresRecus)}
                      disabled={verrouille}
                      step="0.1"
                      ariaLabel={`Mètres reçus ${m.designation}`}
                      onCommit={(v) =>
                        modifier.mutate({
                          id: m.id,
                          designation: m.designation,
                          laize: m.laize,
                          consoClient: m.consoClient,
                          consoReelle: m.consoReelle,
                          retraitPourcentage: m.retraitPourcentage,
                          metresRecus: Number(v) || 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">{fmt(m.utilises)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(m.retrait)}</TableCell>
                  <TableCell
                    className={`text-right font-mono font-semibold ${m.stockRestant < 0 ? 'text-red-600' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {m.alerte && <AlertTriangle className="size-3.5" />}
                      {fmt(m.stockRestant)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <PermissionGate module="coupe" mode="write" fallback={null}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Supprimer la matière ${m.designation}`}
                        disabled={verrouille}
                        onClick={() => supprimer.mutate(m.id)}
                      >
                        <span aria-hidden>×</span>
                      </Button>
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PermissionGate module="coupe" mode="write" fallback={null}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label htmlFor="mat-designation">Désignation</Label>
            <Input
              id="mat-designation"
              value={designation}
              className="h-9 w-44"
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="mat-conso">Conso client (m/pièce)</Label>
            <Input
              id="mat-conso"
              type="number"
              step="0.01"
              value={consoClient}
              className="h-9 w-28"
              onChange={(e) => setConsoClient(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="mat-metres">Mètres reçus</Label>
            <Input
              id="mat-metres"
              type="number"
              step="0.1"
              value={metresRecus}
              className="h-9 w-28"
              onChange={(e) => setMetresRecus(e.target.value)}
            />
          </div>
          <Button onClick={ajouterMatiere} disabled={!valide || ajouter.isPending} className="h-9">
            <Plus className="size-4" /> Ajouter la matière
          </Button>
        </div>
      </PermissionGate>
    </div>
  )
}
