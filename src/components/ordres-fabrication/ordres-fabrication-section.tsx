'use client'

import { useEffect, useState } from 'react'
import { Factory, Plus, Trash2, Pencil, Boxes, Tags, Save, Layers } from 'lucide-react'
import {
  useGetOrdresFabrication,
  useGetOrdreFabrication,
  useCreateOrdreFabrication,
  useUpdateOrdreFabrication,
  useDeleteOrdreFabrication,
  useSetOrdreFabricationTailles,
  useCreateOrdreFabricationEtiquette,
} from '@/hooks/use-ordres-fabrication'
import { useGetChainesProduction, useGetNomenclature } from '@/hooks/use-fournitures'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { OrdreFabrication, SaisieTaillePayload } from '@/types/ordre-fabrication'

function fmt(v: number | null | undefined) {
  return v == null ? '—' : Number(v).toLocaleString('fr-FR')
}

export function OrdresFabricationSection({ commandeId }: { commandeId: number }) {
  const { data: ordres, isLoading } = useGetOrdresFabrication(commandeId, commandeId > 0)
  const [creating, setCreating] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Factory className="size-4" /> Ordres de fabrication
          </CardTitle>
          <PermissionGate module="commandes" mode="write">
            <Button type="button" size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-3.5" /> Nouvel OF
            </Button>
          </PermissionGate>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (ordres ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun ordre de fabrication. Créez le premier pour répartir la production par taille.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° OF</TableHead>
                  <TableHead>Chaîne</TableHead>
                  <TableHead className="text-right">Pièces</TableHead>
                  <TableHead className="text-right">Lignes tailles</TableHead>
                  <TableHead className="text-right">Étiquettes</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ordres ?? []).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.numeroOF}</TableCell>
                    <TableCell>{o.chaineProductionNom ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(o.totalPieces)}</TableCell>
                    <TableCell className="text-right font-mono">{o.nombreLignesTailles}</TableCell>
                    <TableCell className="text-right font-mono">{o.nombreEtiquettes}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" title="Gérer" onClick={() => setDetailId(o.id)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <PermissionGate module="commandes" mode="write">
                          <ConfirmeSuppression ordre={o} />
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {creating && (
        <OfFormDialog commandeId={commandeId} onClose={() => setCreating(false)} />
      )}
      {detailId !== null && (
        <DetailDialog commandeId={commandeId} ordreId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  )
}

function ConfirmeSuppression({ ordre }: { ordre: OrdreFabrication }) {
  const supprimer = useDeleteOrdreFabrication()
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" className="text-destructive" title="Supprimer">
          <Trash2 className="size-3.5" />
        </Button>
      }
      title="Supprimer l'OF ?"
      description={`L'OF ${ordre.numeroOF} sera supprimée avec ses répartitions et étiquettes. Les coupes déjà rattachées restent (historique conservé).`}
      confirmLabel="Supprimer"
      onConfirm={() => supprimer.mutate(ordre.id)}
    />
  )
}

// ─────────────────────────── Création / édition ───────────────────────────

function OfFormDialog({
  commandeId,
  ordreId,
  onClose,
}: {
  commandeId: number
  ordreId?: number
  onClose: () => void
}) {
  const { data: chaines } = useGetChainesProduction()
  const { data: detail } = useGetOrdreFabrication(ordreId ?? 0, ordreId != null)
  const creer = useCreateOrdreFabrication()
  const modifier = useUpdateOrdreFabrication()

  const [numero, setNumero] = useState('')
  const [chaineId, setChaineId] = useState<number>(0)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (detail) {
      setNumero(detail.numeroOF)
      setChaineId(detail.chaineProductionId ?? 0)
      setNotes(detail.notes ?? '')
    }
  }, [detail])

  const submit = () => {
    if (!numero.trim()) {
      toast.error('Le numéro d&apos;OF est requis.')
      return
    }
    const chaineProductionId = chaineId || null
    if (ordreId) {
      modifier.mutate(
        { id: ordreId, numeroOF: numero.trim(), chaineProductionId, notes: notes.trim() || null },
        { onSuccess: () => onClose() },
      )
    } else {
      creer.mutate(
        { commandeId, numeroOF: numero.trim(), chaineProductionId, notes: notes.trim() || null },
        { onSuccess: () => onClose() },
      )
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ordreId ? 'Modifier l\'' : 'Nouvel '}ordre de fabrication</DialogTitle>
          <DialogDescription>
            Les répartitions par taille sont saisies indépendamment — l&apos;écart éventuel avec la
            commande est signalé mais ne bloque pas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>N° OF</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="ex. OF-2026-001" />
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
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={creer.isPending || modifier.isPending || !numero.trim()}>
            {creer.isPending || modifier.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────── Détail : tailles + étiquettes + matelas ───────────────────────────

function DetailDialog({
  commandeId,
  ordreId,
  onClose,
}: {
  commandeId: number
  ordreId: number
  onClose: () => void
}) {
  const { data: detail } = useGetOrdreFabrication(ordreId, ordreId > 0)

  if (!detail) {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ordre de fabrication</DialogTitle>
          </DialogHeader>
          <Skeleton className="h-40 w-full" />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="size-4" /> OF {detail.numeroOF}
            {detail.chaineProductionNom && (
              <Badge variant="outline">{detail.chaineProductionNom}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Répartition par taille ({fmt(detail.totalPieces)} pièces) — indépendante des autres OF.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <RepartitionEditor detail={detail} />
          <MatelasCard detail={detail} />
          <EtiquettesCard commandeId={commandeId} detail={detail} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RepartitionEditor({ detail }: { detail: import('@/types/ordre-fabrication').OrdreFabricationDetail }) {
  const save = useSetOrdreFabricationTailles(detail.id)
  const [rows, setRows] = useState<{ taille: string; quantite: string }[]>([])

  useEffect(() => {
    setRows(
      detail.tailles.map((t) => ({ taille: t.taille, quantite: String(t.quantite) })),
    )
  }, [detail])

  const update = (i: number, patch: Partial<{ taille: string; quantite: string }>) => {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  }

  const submit = () => {
    const tailles: SaisieTaillePayload[] = rows
      .filter((r) => r.taille.trim() && Number(r.quantite) > 0)
      .map((r) => ({ taille: r.taille.trim(), quantite: Math.round(Number(r.quantite)) }))
    if (tailles.length === 0) {
      toast.error('Ajoutez au moins une ligne taille avec une quantité positive.')
      return
    }
    save.mutate(tailles)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Layers className="size-3.5" /> Répartition par taille
        </Label>
        <PermissionGate module="commandes" mode="write">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRows((r) => [...r, { taille: '', quantite: '' }])}
          >
            <Plus className="size-3.5" /> Ligne
          </Button>
        </PermissionGate>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Taille</TableHead>
            <TableHead className="w-28">Quantité</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>
                <Input value={r.taille} onChange={(e) => update(i, { taille: e.target.value })} placeholder="ex. M" />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min="0"
                  value={r.quantite}
                  onChange={(e) => update(i, { quantite: e.target.value })}
                />
              </TableCell>
              <TableCell className="text-right">
                <PermissionGate module="commandes" mode="write">
                  <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </PermissionGate>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="py-4 text-center text-muted-foreground">
                Aucune répartition. Ajoutez une ligne.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <PermissionGate module="commandes" mode="write">
        <Button type="button" size="sm" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Enregistrement…' : <><Save className="size-3.5" /> Enregistrer la répartition</>}
        </Button>
      </PermissionGate>
    </div>
  )
}

function MatelasCard({ detail }: { detail: import('@/types/ordre-fabrication').OrdreFabricationDetail }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Boxes className="size-3.5" /> Matelas rattachés ({detail.matelas.length})
      </Label>
      {detail.matelas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun matelas. Rattachez une coupe à cet OF depuis l&apos;onglet Rapport de coupe.
        </p>
      ) : (
        <div className="space-y-2">
          {detail.matelas.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{m.numeroMatelas}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.dateMatelas).toLocaleDateString('fr-FR')} · {fmt(m.piecePliage)} pli(s)
                </p>
              </div>
              <Badge variant="outline">{fmt(m.quantiteCoupee)} coupée(s)</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EtiquettesCard({
  commandeId,
  detail,
}: {
  commandeId: number
  detail: import('@/types/ordre-fabrication').OrdreFabricationDetail
}) {
  const { data: lignes } = useGetNomenclature(commandeId)
  const creer = useCreateOrdreFabricationEtiquette(detail.id)

  const [ligneId, setLigneId] = useState(0)
  const [taille, setTaille] = useState('')
  const [quantite, setQuantite] = useState('')
  const [effectuePar, setEffectuePar] = useState('')
  const [notes, setNotes] = useState('')

  const submit = () => {
    const q = Math.round(Number(quantite))
    if (!q || q <= 0) {
      toast.error('Saisissez une quantité d&apos;étiquettes positive.')
      return
    }
    creer.mutate(
      {
        fournitureCommandeLigneId: ligneId || null,
        taille: taille.trim() || null,
        quantiteEtiquettes: q,
        effectuePar: effectuePar.trim() || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          setQuantite('')
          setTaille('')
          setNotes('')
        },
      },
    )
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Tags className="size-3.5" /> Étiquettes portant le n° d&apos;OF ({detail.etiquettes.length})
      </Label>
      <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label>Fourniture (ligne commande)</Label>
          <Select value={String(ligneId)} onValueChange={(v) => setLigneId(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sans ligne de fourniture" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sans ligne de fourniture</SelectItem>
              {(lignes ?? []).map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.articleDesignation ?? `#${l.articleId}`}
                  {l.taille ? ` (${l.taille})` : l.portee === 'Commune' ? ' — toutes tailles' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Taille (facultatif)</Label>
          <Input value={taille} onChange={(e) => setTaille(e.target.value)} placeholder="ex. M" />
        </div>
        <div className="grid gap-1.5">
          <Label>Quantité</Label>
          <Input type="number" min="0" value={quantite} onChange={(e) => setQuantite(e.target.value)} placeholder="0" />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label>Effectué par</Label>
          <Input value={effectuePar} onChange={(e) => setEffectuePar(e.target.value)} placeholder="ex. Atelier" />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <PermissionGate module="commandes" mode="write">
            <Button type="button" size="sm" onClick={submit} disabled={creer.isPending || !(Number(quantite) > 0)}>
              {creer.isPending ? 'Enregistrement…' : 'Ajouter une étiquette'}
            </Button>
          </PermissionGate>
        </div>
      </div>
      {detail.etiquettes.length > 0 && (
        <div className="space-y-2">
          {detail.etiquettes.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">
                  {e.fournitureDesignation ?? 'Étiquette'}
                  {e.taille ? ` (${e.taille})` : ''} — {fmt(e.quantiteEtiquettes)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.dateImpression).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  {e.effectuePar ? ` · ${e.effectuePar}` : ''}
                </p>
              </div>
              {e.notes && <Badge variant="outline">{e.notes}</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}