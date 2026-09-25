'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Layers2,
  Lock,
  Pencil,
  Scissors,
  Trash2,
  Truck,
} from 'lucide-react'
import { useGetOrdreDeCoupe } from '@/hooks/use-plan-de-coupe'
import {
  useGetCoupes,
  useGetExports,
  useAjouterCoupe,
  useAjouterExport,
  useModifierCoupe,
  useSupprimerCoupe,
  useSupprimerExport,
} from '@/hooks/use-rapport-coupe'
import { useGetChainesProduction } from '@/hooks/use-fournitures'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { LotCoupe } from '@/types/rapport-coupe'

function fmt(v: number) {
  return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function fmtDim(v: number | null | undefined) {
  return v == null ? '—' : fmt(v)
}

/**
 * Écran « Saisie de coupe » scopé à UN matelas, atteint par clic sur une ligne de
 * l'onglet « Ordre de coupe » (/coupe/{commandeId}).
 *
 * Le matelas n'est PAS choisi ici : il est déterminé par la navigation et son identité
 * est affichée en en-tête. On y enregistre ce qui a réellement été coupé (quantité par
 * taille, garde-fou seuil + marge avec repli ForcerDepassement) et les exports vers une
 * chaîne de production. Aucune chaîne de production n'intervient dans la planification
 * du matelas.
 */
export function SaisieDeCoupe({ commandeId, matelasId }: { commandeId: number; matelasId: number }) {
  const { data: doc, isLoading: docLoading } = useGetOrdreDeCoupe(commandeId)
  const { data: coupes, isLoading: coupesLoading } = useGetCoupes(commandeId)
  const { data: exports } = useGetExports(commandeId)
  const { data: chaines } = useGetChainesProduction()
  const supprimerCoupe = useSupprimerCoupe(commandeId)
  const supprimerExport = useSupprimerExport(commandeId)
  const [coupeEditee, setCoupeEditee] = useState<LotCoupe | null>(null)

  const matelas = useMemo(
    () => doc?.matelas.find((m) => m.matelasId === matelasId) ?? null,
    [doc, matelasId],
  )

  // Tailles proposées : d'abord celles du plan de CE matelas, puis les autres tailles
  // de la commande (le backend refuse toute taille hors configuration).
  const tailles = useMemo(() => {
    const duPlan = (matelas?.lignes ?? []).map((l) => l.taille)
    const deLaCommande = doc?.tailles.map((t) => t.taille) ?? []
    return Array.from(new Set([...duPlan, ...deLaCommande]))
  }, [matelas, doc])

  // Demande configurée par taille (affichage d'aide dans le sélecteur de taille).
  const demandeParTaille = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of doc?.tailles ?? []) map.set(t.taille, t.quantiteCommande)
    return map
  }, [doc])

  const coupesDuMatelas = useMemo(
    () => (coupes ?? []).filter((c) => c.matelasId === matelasId),
    [coupes, matelasId],
  )

  if (docLoading || coupesLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!doc) return null

  if (!matelas) {
    return (
      <div className="grid gap-4">
        <BandeauIdentite commandeId={commandeId} />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Ce matelas n&apos;appartient pas à cette commande.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <BandeauIdentite commandeId={commandeId} />

      {/* ─── Identité du matelas (déjà déterminé par la navigation) ─── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <div className="flex flex-wrap items-center gap-2">
          <Scissors className="size-4" />
          <span className="font-medium">{matelas.numeroMatelas}</span>
          <Badge variant="outline" className="gap-1">
            <Layers2 className="size-3" /> {fmt(matelas.piecePliage)} plis
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Boxes className="size-3" /> Long. {fmtDim(matelas.longueur)} m · Laize {fmtDim(matelas.laize)} cm
          </Badge>
          <Badge variant="outline">
            Plan <span className="font-mono">{fmt(matelas.totalTheorique)}</span>
            {matelas.longueur != null && (
              <span className="ml-1 font-mono text-muted-foreground">
                tissu ≈ {fmt(matelas.longueur * matelas.piecePliage)} m
              </span>
            )}
          </Badge>
          <Badge variant="outline">
            Coupé <span className="font-mono">{fmt(matelas.totalCoupeReelle)}</span> · reste{' '}
            <span className={matelas.resteTotal < 0 ? 'font-mono font-semibold text-red-600' : 'font-mono font-semibold'}>
              {fmt(matelas.resteTotal)}
            </span>
          </Badge>
          {matelas.totalCoupeReelle > 0 && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
              <Lock className="size-3" /> plan figé
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs">
          {doc.numeroCommande} · {fmtDateTime(matelas.dateMatelas)} · ordre de coupe #{matelas.ordreDeCoupe}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormulaireCoupe
          commandeId={commandeId}
          matelasId={matelasId}
          tailles={tailles}
          demandeParTaille={demandeParTaille}
        />
        <FormulaireExport
          commandeId={commandeId}
          tailles={tailles}
          chaines={(chaines ?? []).filter((c) => c.estActif).map((c) => ({ id: c.id, nom: c.nom }))}
        />
      </div>

      {/* ─── Reste à couper par taille, pour ce matelas ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Reste à couper par taille</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Taille</TableHead>
                <TableHead className="text-right">Occurrences</TableHead>
                <TableHead className="text-right">Théorique</TableHead>
                <TableHead className="text-right">Déjà coupé</TableHead>
                <TableHead className="text-right">Reste à couper</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matelas.lignes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    Aucune ligne de plan pour ce matelas : le plan se saisit dans l&apos;ordre de
                    coupe de la commande.
                  </TableCell>
                </TableRow>
              ) : (
                matelas.lignes.map((l) => (
                  <TableRow key={l.ligneId}>
                    <TableCell className="font-medium">{l.taille}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(l.occurrences)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(l.theorique)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(l.coupeReelle)}</TableCell>
                    <TableCell
                      className={`text-right font-mono font-semibold ${l.resteACouper < 0 ? 'text-red-600' : ''}`}
                    >
                      {fmt(l.resteACouper)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Coupes enregistrées sur ce matelas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {coupesDuMatelas.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune coupe enregistrée.</p>
            )}
            {coupesDuMatelas.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    Taille {c.taille} — {fmt(c.quantiteCoupee)} pièce(s)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(c.dateCoupe)}
                    {c.effectuePar ? ` · ${c.effectuePar}` : ''}
                  </p>
                </div>
                {c.forcerDepassement && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                    <AlertTriangle className="size-3" /> dépassement forcé
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Modifier la coupe"
                    onClick={() => setCoupeEditee(c)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                    onConfirm={() => supprimerCoupe.mutate(c.id)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Truck className="size-4" /> Exports de la commande
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(exports ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun export.</p>}
            {(exports ?? []).map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    Taille {e.taille} — {fmt(e.quantiteExportee)} pièce(s)
                    {e.chaineProductionNom ? ` · ${e.chaineProductionNom}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(e.dateExport)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                    onConfirm={() => supprimerExport.mutate(e.id)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ModifierCoupeDialog
        key={coupeEditee?.id ?? 'vide'}
        commandeId={commandeId}
        tailles={tailles}
        coupe={coupeEditee}
        onOpenChange={() => setCoupeEditee(null)}
      />
    </div>
  )
}

function BandeauIdentite({ commandeId }: { commandeId: number }) {
  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/coupe/${commandeId}`}>
          <ArrowLeft className="size-4" /> Retour à l&apos;ordre de coupe
        </Link>
      </Button>
    </div>
  )
}

/** « Enregistrer ce qui a été coupé » — garde-fou seuil + marge avec repli ForcerDepassement. */
function FormulaireCoupe({
  commandeId,
  matelasId,
  tailles,
  demandeParTaille,
}: {
  commandeId: number
  matelasId: number
  tailles: string[]
  demandeParTaille: Map<string, number>
}) {
  const ajouterCoupe = useAjouterCoupe(commandeId)
  const [taille, setTaille] = useState('')
  const [quantite, setQuantite] = useState('')
  const [forcer, setForcer] = useState(false)

  const submit = () => {
    const q = Number(quantite)
    if (!taille || !q || q <= 0) return
    ajouterCoupe.mutate(
      { taille, quantiteCoupee: q, forcerDepassement: forcer, matelasId },
      {
        onSuccess: () => {
          setQuantite('')
          setForcer(false)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Scissors className="size-4" /> Enregistrer ce qui a été coupé
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="saisie-taille">Taille</Label>
            <Select value={taille} onValueChange={setTaille}>
              <SelectTrigger id="saisie-taille" className="w-full">
                <SelectValue placeholder="Taille…" />
              </SelectTrigger>
              <SelectContent>
                {tailles.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                    {demandeParTaille.has(t) ? ` (demande ${demandeParTaille.get(t)})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="saisie-quantite">Qté coupée</Label>
            <Input
              id="saisie-quantite"
              type="number"
              min="1"
              step="1"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Checkbox checked={forcer} onCheckedChange={(v) => setForcer(v === true)} />
              Forcer le dépassement
            </label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          La coupe est rattachée à ce matelas (identité ci-dessus, pas de choix ici). Au-delà de la
          demande augmentée de la marge de sécurité, le backend refuse l&apos;enregistrement
          (409) : cochez « Forcer le dépassement » pour passer outre.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={ajouterCoupe.isPending || !taille || !(Number(quantite) > 0)}
          onClick={submit}
        >
          {ajouterCoupe.isPending ? 'Enregistrement…' : 'Valider la coupe'}
        </Button>
      </CardContent>
    </Card>
  )
}

/** « Enregistrer un export » vers une chaîne de production (logique et modèle inchangés). */
function FormulaireExport({
  commandeId,
  tailles,
  chaines,
}: {
  commandeId: number
  tailles: string[]
  chaines: { id: number; nom: string }[]
}) {
  const ajouterExport = useAjouterExport(commandeId)
  const [taille, setTaille] = useState('')
  const [quantite, setQuantite] = useState('')
  const [chaineId, setChaineId] = useState('')
  const [forcer, setForcer] = useState(false)

  const submit = () => {
    const q = Number(quantite)
    if (!taille || !q || q <= 0) return
    ajouterExport.mutate(
      {
        taille,
        quantiteExportee: q,
        forcerDepassement: forcer,
        chaineProductionId: chaineId ? Number(chaineId) : null,
      },
      { onSuccess: () => { setQuantite(''); setForcer(false) } },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Truck className="size-4" /> Enregistrer un export (atelier)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="export-taille">Taille</Label>
            <Select value={taille} onValueChange={setTaille}>
              <SelectTrigger id="export-taille" className="w-full">
                <SelectValue placeholder="Taille…" />
              </SelectTrigger>
              <SelectContent>
                {tailles.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="export-quantite">Qté exportée</Label>
            <Input
              id="export-quantite"
              type="number"
              min="1"
              step="1"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <div className="grid gap-1.5 rounded-md border bg-muted/30 p-3">
          <Label htmlFor="export-chaine">Chaîne de production</Label>
          <Select value={chaineId} onValueChange={setChaineId}>
            <SelectTrigger id="export-chaine" className="w-full">
              <SelectValue placeholder="Sans chaîne" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sans chaîne</SelectItem>
              {chaines.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Checkbox checked={forcer} onCheckedChange={(v) => setForcer(v === true)} />
            Forcer le dépassement
          </label>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={ajouterExport.isPending || !taille || !(Number(quantite) > 0)}
          onClick={submit}
        >
          {ajouterExport.isPending ? 'Enregistrement…' : 'Valider l\'export'}
        </Button>
      </CardContent>
    </Card>
  )
}

function ModifierCoupeDialog({
  commandeId,
  tailles,
  coupe,
  onOpenChange,
}: {
  commandeId: number
  tailles: string[]
  coupe: LotCoupe | null
  onOpenChange: (v: boolean) => void
}) {
  const modifier = useModifierCoupe(commandeId)
  const [taille, setTaille] = useState(coupe?.taille ?? '')
  const [quantite, setQuantite] = useState(String(coupe?.quantiteCoupee ?? ''))
  const [notes, setNotes] = useState(coupe?.notes ?? '')
  const [forcer, setForcer] = useState(coupe?.forcerDepassement ?? false)
  const selectKey = coupe?.id ?? 'vide'

  if (!coupe) return null

  const save = () => {
    const q = Number(quantite)
    if (!taille || !q || q <= 0) return
    modifier.mutate(
      {
        id: coupe.id,
        taille,
        quantiteCoupee: q,
        notes: notes.trim() || null,
        forcerDepassement: forcer,
        // La coupe reste rattachée à son matelas : pas de sélecteur ici.
        matelasId: coupe.matelasId,
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={coupe !== null} onOpenChange={(v) => { if (!v) onOpenChange(false) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la coupe</DialogTitle>
          <DialogDescription>
            Mêmes garde-fous qu&apos;à l&apos;enregistrement : taille dans la configuration de la
            commande, plafond de dépassement (409).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="modifier-coupe-taille">Taille</Label>
              <Select key={`${selectKey}-taille`} value={taille} onValueChange={setTaille}>
                <SelectTrigger id="modifier-coupe-taille" className="w-full">
                  <SelectValue placeholder="Taille…" />
                </SelectTrigger>
                <SelectContent>
                  {tailles.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="modifier-coupe-quantite">Qté coupée</Label>
              <Input
                id="modifier-coupe-quantite"
                type="number"
                min="1"
                step="1"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="modifier-coupe-notes">Notes</Label>
            <Input
              id="modifier-coupe-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Checkbox checked={forcer} onCheckedChange={(v) => setForcer(v === true)} />
            Forcer le dépassement
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button disabled={modifier.isPending || !taille || !(Number(quantite) > 0)} onClick={save}>
            {modifier.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
