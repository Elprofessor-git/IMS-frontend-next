'use client'

import { useState } from 'react'
import { Boxes, PackagePlus, Send, Trash2, Plus, AlertTriangle, Factory, Scissors } from 'lucide-react'
import {
  useGetMatelas,
  useCreerMatelas,
  useGetChainesProduction,
  useCreateChaineProduction,
  useDesactiverChaineProduction,
  useGetNomenclature,
  useCreerLigneNomenclature,
  useSupprimerLigneNomenclature,
  useGetReceptions,
  useCreerReception,
  useGetEnvois,
  useCreerEnvoi,
  useGetRapportFournitures,
} from '@/hooks/use-fournitures'
import { ArticleSelect } from '@/components/forms/article-select'
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
import { toast } from 'sonner'
import type { ApiError } from '@/types'
import type { PorteeFourniture } from '@/types/fourniture'

function fmt(v: number | null | undefined) {
  return v == null ? '—' : Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 4 })
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}

export function FournituresSection({ commandeId }: { commandeId: number }) {
  return (
    <div className="grid gap-4">
      <NomenclatureCard commandeId={commandeId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <MatelasCard commandeId={commandeId} />
        <ChainesCard />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReceptionCard commandeId={commandeId} />
        <EnvoiCard commandeId={commandeId} />
      </div>
      <RapportCard commandeId={commandeId} />
    </div>
  )
}

// ─────────────────────────── C3 — Nomenclature ───────────────────────────

function NomenclatureCard({ commandeId }: { commandeId: number }) {
  const { data: lignes, isLoading } = useGetNomenclature(commandeId)
  const creer = useCreerLigneNomenclature(commandeId)
  const supprimer = useSupprimerLigneNomenclature(commandeId)

  const [articleId, setArticleId] = useState<number | null>(null)
  const [portee, setPortee] = useState<PorteeFourniture>('Commune')
  const [taille, setTaille] = useState('')
  const [quantite, setQuantite] = useState('')
  const [unite, setUnite] = useState('')
  const [designation, setDesignation] = useState('')

  const submit = () => {
    const q = Number(quantite)
    if (!articleId || !q || q <= 0) return
    if (portee === 'ParTaille' && !taille.trim()) {
      toast.error('Une taille est requise pour une ligne « ParTaille ».')
      return
    }
    creer.mutate(
      {
        articleId,
        portee,
        designationSpecifique: designation.trim() || null,
        quantiteFourniture: q,
        taille: portee === 'ParTaille' ? taille.trim() : null,
        unite: unite.trim() || null,
      },
      {
        onSuccess: () => {
          setArticleId(null)
          setPortee('Commune')
          setTaille('')
          setQuantite('')
          setUnite('')
          setDesignation('')
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <PackagePlus className="size-4" /> Nomenclature fournitures (pièces coupées)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Article fourniture</Label>
            <ArticleSelect value={articleId} onChange={setArticleId} />
          </div>
          <div className="grid gap-1.5">
            <Label>Portée</Label>
            <Select value={portee} onValueChange={(v) => setPortee(v as PorteeFourniture)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Commune">Commune (toutes tailles)</SelectItem>
                <SelectItem value="ParTaille">Par taille</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{portee === 'ParTaille' ? 'Taille' : 'Qté / pièce'}</Label>
            {portee === 'ParTaille' ? (
              <Input value={taille} onChange={(e) => setTaille(e.target.value)} placeholder="ex. M" />
            ) : (
              <Input
                type="number"
                min="0"
                step="any"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                placeholder="0"
              />
            )}
          </div>
          {portee === 'ParTaille' && (
            <div className="grid gap-1.5">
              <Label>Qté / pièce</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                placeholder="0"
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label>Unité</Label>
            <Input value={unite} onChange={(e) => setUnite(e.target.value)} placeholder="ex. m, pièce, boîte" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Désignation spécifique</Label>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={creer.isPending || !articleId || !(Number(quantite) > 0)}
          onClick={submit}
        >
          {creer.isPending ? 'Ajout…' : 'Ajouter la ligne'}
        </Button>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fourniture</TableHead>
                <TableHead>Portée</TableHead>
                <TableHead className="text-right">Qté / pièce</TableHead>
                <TableHead className="text-right">Reçu</TableHead>
                <TableHead className="text-right">Envoyé</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(lignes ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <p className="font-medium">{l.articleDesignation ?? `#${l.articleId}`}</p>
                    {l.designationSpecifique && (
                      <p className="text-xs text-muted-foreground">{l.designationSpecifique}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {l.portee}
                      {l.taille ? ` — ${l.taille}` : ''}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{fmt(l.quantiteFourniture)}{l.unite ? ` ${l.unite}` : ''}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(l.totalRecu)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(l.totalEnvoye)}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" className="text-destructive" title="Supprimer">
                          <Trash2 className="size-3.5" />
                        </Button>
                      }
                      onConfirm={() => supprimer.mutate(l.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {(lignes ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Aucune fourniture déclarée. Ajoutez une ligne pour commencer.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────── C1 — Matelas ───────────────────────────

function MatelasCard({ commandeId }: { commandeId: number }) {
  const { data: matelas, isLoading } = useGetMatelas(commandeId)
  const creer = useCreerMatelas(commandeId)

  const [numero, setNumero] = useState('')
  const [pliage, setPliage] = useState('')
  const [estimee, setEstimee] = useState('')
  const [notes, setNotes] = useState('')

  const submit = () => {
    if (!numero.trim()) {
      toast.error('Le numéro du matelas est requis.')
      return
    }
    creer.mutate(
      {
        numeroMatelas: numero.trim(),
        piecePliage: Number(pliage) || 0,
        coupeEstimee: Number(estimee) || 0,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          setNumero('')
          setPliage('')
          setEstimee('')
          setNotes('')
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Boxes className="size-4" /> Matelas (coupes)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5 col-span-2">
            <Label>N° matelas</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="ex. M-2026-001" />
          </div>
          <div className="grid gap-1.5">
            <Label>Plis</Label>
            <Input type="number" min="0" value={pliage} onChange={(e) => setPliage(e.target.value)} placeholder="0" />
          </div>
          <div className="grid gap-1.5">
            <Label>Coupe estimée</Label>
            <Input type="number" min="0" value={estimee} onChange={(e) => setEstimee(e.target.value)} placeholder="0" />
          </div>
        </div>
        <Button type="button" size="sm" disabled={creer.isPending || !numero.trim()} onClick={submit}>
          {creer.isPending ? 'Création…' : 'Créer le matelas'}
        </Button>

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-2">
            {(matelas ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun matelas rattaché à cette commande.</p>
            )}
            {(matelas ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{m.numeroMatelas}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.dateMatelas).toLocaleDateString('fr-FR')} · {m.nombreCoupes} pièce(s) coupée(s)
                  </p>
                </div>
                {!m.estActif && <Badge variant="outline">inactif</Badge>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────── C2 — Chaînes de production ───────────────────────────

function ChainesCard() {
  const { data: chaines, isLoading } = useGetChainesProduction()
  const creer = useCreateChaineProduction()
  const desactiver = useDesactiverChaineProduction()

  const [nom, setNom] = useState('')
  const [type, setType] = useState('Confection')

  const submit = () => {
    if (!nom.trim()) return
    creer.mutate(
      { nom: nom.trim(), typeChaine: type },
      {
        onSuccess: () => {
          setNom('')
          setType('Confection')
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Factory className="size-4" /> Chaînes de production (sous-traitance)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Nom</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. Atelier Est" />
          </div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Decoupe">Découpe</SelectItem>
                <SelectItem value="Confection">Confection</SelectItem>
                <SelectItem value="Conditionnement">Conditionnement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="button" size="sm" disabled={creer.isPending || !nom.trim()} onClick={submit}>
          {creer.isPending ? 'Création…' : 'Créer la chaîne'}
        </Button>

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-2">
            {(chaines ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune chaîne de production.</p>
            )}
            {(chaines ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {c.nom}
                    {!c.estActif && <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.typeChaine} · {c.nombreEnvois} envoi(s) · {c.nombreExports} export(s)
                  </p>
                </div>
                {c.estActif && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" className="text-destructive" title="Désactiver">
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                    title="Désactiver la chaîne ?"
                    description="La chaîne sera désactivée (pas de suppression physique — l'historique des exports/envois est conservé)."
                    confirmLabel="Désactiver"
                    onConfirm={() => desactiver.mutate(c.id)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────── C4 — Réceptions (cumulatives, sans plafond) ───────────────────────────

function ReceptionCard({ commandeId }: { commandeId: number }) {
  const { data: receptions, isLoading } = useGetReceptions(commandeId)
  const { data: lignes } = useGetNomenclature(commandeId)
  const creer = useCreerReception(commandeId)

  const [ligneId, setLigneId] = useState<number>(0)
  const [quantite, setQuantite] = useState('')
  const [notes, setNotes] = useState('')

  const submit = () => {
    const q = Number(quantite)
    if (!ligneId || !q || q <= 0) return
    creer.mutate(
      { commandeFournitureLigneId: ligneId, quantiteRecue: q, notes: notes.trim() || null },
      {
        onSuccess: () => {
          setQuantite('')
          setNotes('')
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <PackagePlus className="size-4" /> Réception fournitures (sans plafond)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-1.5">
          <Label>Fourniture</Label>
          <Select value={String(ligneId)} onValueChange={(v) => setLigneId(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir une ligne de fourniture…" />
            </SelectTrigger>
            <SelectContent>
              {(lignes ?? []).map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.articleDesignation ?? `#${l.articleId}`}
                  {l.taille ? ` (${l.taille})` : ''}
                  {l.portee === 'Commune' ? ' — toutes tailles' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Qté reçue</Label>
            <Input type="number" min="0" step="any" value={quantite} onChange={(e) => setQuantite(e.target.value)} placeholder="0" />
          </div>
        </div>
        <Button type="button" size="sm" disabled={creer.isPending || !ligneId || !(Number(quantite) > 0)} onClick={submit}>
          {creer.isPending ? 'Enregistrement…' : 'Enregistrer la réception'}
        </Button>

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-2">
            {(receptions ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune réception.</p>
            )}
            {(receptions ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {r.articleDesignation ?? `#${r.articleId}`}
                    {r.taille ? ` (${r.taille})` : ''} — {fmt(r.quantiteRecue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.dateReception).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    {r.effectuePar ? ` · ${r.effectuePar}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────── C5 — Envois (plafond + force) ───────────────────────────

function EnvoiCard({ commandeId }: { commandeId: number }) {
  const { data: envois, isLoading } = useGetEnvois(commandeId)
  const { data: lignes } = useGetNomenclature(commandeId)
  const { data: chaines } = useGetChainesProduction()
  const creer = useCreerEnvoi(commandeId)

  const [ligneId, setLigneId] = useState<number>(0)
  const [chaineId, setChaineId] = useState<number>(0)
  const [quantite, setQuantite] = useState('')
  const [forcer, setForcer] = useState(false)
  const [warning, setWarning] = useState<ApiError | null>(null)

  const submit = (forceDebut: boolean) => {
    const q = Number(quantite)
    if (!ligneId || !q || q <= 0) return
    creer.mutate(
      {
        commandeFournitureLigneId: ligneId,
        chaineProductionId: chaineId || null,
        quantiteEnvoyee: q,
        forcerDepassement: forceDebut,
      },
      {
        onSuccess: () => {
          setQuantite('')
          setChaineId(0)
          setForcer(false)
          setWarning(null)
        },
        onError: (err: ApiError) => {
          if (err.status === 409) {
            setWarning(err)
          } else {
            toast.error(err.message ?? 'Erreur lors de l\'envoi')
          }
        },
      },
    )
  }

  const handleForce = () => {
    setWarning(null)
    setForcer(true)
    submit(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Send className="size-4" /> Envoi fournitures vers chaînes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Fourniture</Label>
            <Select value={String(ligneId)} onValueChange={(v) => setLigneId(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir une ligne de fourniture…" />
              </SelectTrigger>
              <SelectContent>
                {(lignes ?? []).map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.articleDesignation ?? `#${l.articleId}`}
                    {l.taille ? ` (${l.taille})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Chaîne de production</Label>
            <Select value={String(chaineId)} onValueChange={(v) => setChaineId(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sans chaîne" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sans chaîne</SelectItem>
                {(chaines ?? []).filter((c) => c.estActif).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Qté envoyée</Label>
              <Input type="number" min="0" step="any" value={quantite} onChange={(e) => setQuantite(e.target.value)} placeholder="0" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Checkbox
                  checked={forcer}
                  onCheckedChange={(v) => setForcer(v === true)}
                />
                Forcer le dépassement
              </label>
            </div>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={creer.isPending || !ligneId || !(Number(quantite) > 0)}
          onClick={() => submit(false)}
        >
          {creer.isPending ? 'Envoi…' : 'Valider l\'envoi'}
        </Button>

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-2">
            {(envois ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun envoi.</p>
            )}
            {(envois ?? []).map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {e.articleDesignation ?? `#${e.articleId}`}
                    {e.taille ? ` (${e.taille})` : ''} — {fmt(e.quantiteEnvoyee)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.chaineProductionNom ?? 'Sans chaîne'} ·{' '}
                    {new Date(e.dateEnvoi).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    {e.effectuePar ? ` · ${e.effectuePar}` : ''}
                  </p>
                </div>
                {e.forcerDepassement && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                    <AlertTriangle className="size-3" /> forcé
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <DepassementDialog warning={warning} onCancel={() => setWarning(null)} onForce={handleForce} />
    </Card>
  )
}

function DepassementDialog({
  warning,
  onCancel,
  onForce,
}: {
  warning: ApiError | null
  onCancel: () => void
  onForce: () => void
}) {
  if (!warning) return null
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" /> Dépassement d&apos;envoi
          </DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {warning.message}
            <span className="mt-2 block text-xs text-muted-foreground">
              Voulez-vous forcer l&apos;envoi malgré le dépassement ? L&apos;historique conservé peut excéder le total reçu.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button variant="default" onClick={onForce}>
            Forcer quand même
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────── C6 — Rapport agrégé ───────────────────────────

function RapportCard({ commandeId }: { commandeId: number }) {
  const { data: rapport, isLoading } = useGetRapportFournitures(commandeId)

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (!rapport) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Rapport fournitures vs pièces exportées</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatCard icon={<Boxes className="size-4 text-muted-foreground" />} label="Matelas" value={String(rapport.totalMatelas)} />
          <StatCard icon={<Scissors className="size-4 text-muted-foreground" />} label="Pièces coupées" value={fmt(rapport.totalPiecesCoupees)} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fourniture</TableHead>
              <TableHead>Portée</TableHead>
              <TableHead className="text-right">Qté / pièce</TableHead>
              <TableHead className="text-right">Besoin calculé</TableHead>
              <TableHead className="text-right">Total reçu</TableHead>
              <TableHead className="text-right">Total envoyé</TableHead>
              <TableHead className="text-right">Écart</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rapport.articles.map((a) => (
              <TableRow key={a.commandeFournitureLigneId}>
                <TableCell>
                  <p className="font-medium">{a.articleDesignation}</p>
                  {a.taille && <p className="text-xs text-muted-foreground">Taille {a.taille}</p>}
                </TableCell>
                <TableCell><Badge variant="outline">{a.portee}</Badge></TableCell>
                <TableCell className="text-right font-mono">{fmt(a.quantiteParPiece)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(a.besoinCalcule)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(a.totalRecu)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(a.totalEnvoye)}</TableCell>
                <TableCell className="text-right">
                  <EcartBadge ecart={a.ecart} />
                </TableCell>
              </TableRow>
            ))}
            {rapport.articles.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  Aucune nomenclature déclarée pour cette commande.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {(rapport.parChaine.length > 0 || rapport.articles.length === 0) && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chaîne</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead className="text-right">Pièces exportées</TableHead>
                <TableHead className="text-right">Fournitures attendues</TableHead>
                <TableHead className="text-right">Fournitures envoyées</TableHead>
                <TableHead className="text-right">Écart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rapport.parChaine.map((p, i) => (
                <TableRow key={i}>
                  <TableCell>{p.chaineProductionNom ?? 'Sans chaîne'}</TableCell>
                  <TableCell>{p.taille}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p.piècesExportees)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p.fournituresAttendues)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p.fournituresEnvoyees)}</TableCell>
                  <TableCell className="text-right"><EcartBadge ecart={p.ecart} /></TableCell>
                </TableRow>
              ))}
              {rapport.parChaine.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Aucun export par chaîne pour cette commande.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function EcartBadge({ ecart }: { ecart: number }) {
  if (ecart < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 font-mono text-xs font-semibold text-red-700">
        <AlertTriangle className="size-3" /> {fmt(ecart)}
      </span>
    )
  }
  if (ecart > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-700">
        <Plus className="size-3" /> {fmt(ecart)}
      </span>
    )
  }
  return <span className="font-mono text-xs text-muted-foreground">{fmt(0)}</span>
}