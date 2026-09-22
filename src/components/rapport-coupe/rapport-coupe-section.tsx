'use client'

import { useState } from 'react'
import { Scissors, Truck, Trash2, Pencil, AlertTriangle, FileDown, FileText, Plus } from 'lucide-react'
import {
  useGetRapportCoupe,
  useGetCoupes,
  useGetExports,
  useAjouterCoupe,
  useSupprimerCoupe,
  useModifierCoupe,
  useAjouterExport,
  useSupprimerExport,
} from '@/hooks/use-rapport-coupe'
import { useGetMatelas, useCreerMatelas, useGetChainesProduction } from '@/hooks/use-fournitures'
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
import { ForbiddenState } from '@/components/shared/forbidden-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { downloadViaProxy } from '@/lib/download'
import type { LotCoupe } from '@/types/rapport-coupe'
import type { Matelas } from '@/types/fourniture'

function formatM(v: number | null | undefined) {
  return v == null ? '—' : `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m`
}

function LotForm({
  commandeId,
  kind,
  tailles,
}: {
  commandeId: number
  kind: 'coupe' | 'export'
  tailles: string[]
}) {
  const ajouterCoupe = useAjouterCoupe(commandeId)
  const ajouterExport = useAjouterExport(commandeId)
  const ajouter = kind === 'coupe' ? ajouterCoupe : ajouterExport
  const { data: matelas } = useGetMatelas(commandeId)
  const { data: chaines } = useGetChainesProduction()
  const creerMatelas = useCreerMatelas(commandeId)
  const [taille, setTaille] = useState('')
  const [quantite, setQuantite] = useState('')
  const [forcer, setForcer] = useState(false)
  const [matelasId, setMatelasId] = useState<string>('')
  const [chaineId, setChaineId] = useState<string>('')
  const [nouveauVisible, setNouveauVisible] = useState(false)
  const [nouveauNumero, setNouveauNumero] = useState('')
  const [nouveauPliage, setNouveauPliage] = useState('')
  const isCoupe = kind === 'coupe'

  const submit = () => {
    const q = Number(quantite)
    if (!taille || !q || q <= 0) return
    ajouter.mutate(
      {
        taille,
        [isCoupe ? 'quantiteCoupee' : 'quantiteExportee']: q,
        forcerDepassement: forcer,
        matelasId: matelasId ? Number(matelasId) : null,
        chaineProductionId: chaineId ? Number(chaineId) : null,
      },
      {
        onSuccess: () => {
          setQuantite('')
          setForcer(false)
        },
      },
    )
  }

  const creerNouveauMatelas = () => {
    if (!nouveauNumero.trim()) {
      toast.error('Le numéro du matelas est requis.')
      return
    }
    creerMatelas.mutate(
      {
        numeroMatelas: nouveauNumero.trim(),
        piecePliage: Number(nouveauPliage) || 0,
      },
      {
        onSuccess: (res) => {
          setMatelasId(String(res.id))
          setNouveauNumero('')
          setNouveauPliage('')
          setNouveauVisible(false)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {isCoupe ? (
            <>
              <Scissors className="size-4" /> Enregistrer une coupe
            </>
          ) : (
            <>
              <Truck className="size-4" /> Enregistrer un export (atelier)
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Taille</Label>
            <Select value={taille} onValueChange={setTaille}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Taille…" />
              </SelectTrigger>
              <SelectContent>
                {tailles.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{isCoupe ? 'Qté coupée' : 'Qté exportée'}</Label>
            <Input
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

        {isCoupe ? (
          <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
            <div className="grid gap-1.5">
              <Label className="flex items-center justify-between">
                Matelas
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setNouveauVisible((v) => !v)}
                >
                  <Plus className="size-3.5" /> {nouveauVisible ? 'Annuler' : 'Nouveau'}
                </Button>
              </Label>
              <Select value={matelasId} onValueChange={setMatelasId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sans matelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sans matelas</SelectItem>
                  {(matelas ?? []).map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.numeroMatelas} — {new Date(m.dateMatelas).toLocaleDateString('fr-FR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {nouveauVisible && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_7rem_auto]">
                <div className="grid gap-1.5">
                  <Label>N° matelas</Label>
                  <Input
                    value={nouveauNumero}
                    onChange={(e) => setNouveauNumero(e.target.value)}
                    placeholder="ex. M-2026-001"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Plis</Label>
                  <Input
                    type="number"
                    min="0"
                    value={nouveauPliage}
                    onChange={(e) => setNouveauPliage(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={creerMatelas.isPending || !nouveauNumero.trim()}
                    onClick={creerNouveauMatelas}
                  >
                    {creerMatelas.isPending ? 'Création…' : 'Créer'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-1.5 rounded-md border bg-muted/30 p-3">
            <Label>Chaîne de production</Label>
            <Select value={chaineId} onValueChange={setChaineId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sans chaîne" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sans chaîne</SelectItem>
                {(chaines ?? []).filter((c) => c.estActif).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          type="button"
          size="sm"
          variant={isCoupe ? 'default' : 'outline'}
          disabled={ajouter.isPending || !taille || !(Number(quantite) > 0)}
          onClick={submit}
        >
          {ajouter.isPending ? 'Enregistrement…' : isCoupe ? 'Valider la coupe' : 'Valider l\'export'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function RapportCoupeSection({ commandeId, lectureSeule = false }: { commandeId: number; lectureSeule?: boolean }) {
  const { data: rapport, isLoading, isError, error } = useGetRapportCoupe(commandeId)
  const supprimerCoupe = useSupprimerCoupe(commandeId)
  const supprimerExport = useSupprimerExport(commandeId)
  const { data: matelas } = useGetMatelas(commandeId)
  const [exportEnCours, setExportEnCours] = useState<'xlsx' | 'pdf' | null>(null)
  const [coupeEditee, setCoupeEditee] = useState<LotCoupe | null>(null)

  const telecharger = (format: 'xlsx' | 'pdf') => {
    if (!rapport) return
    setExportEnCours(format)
    downloadViaProxy(
      `/api/proxy/api/RapportCoupe/${commandeId}/Export${format === 'pdf' ? 'Pdf' : ''}`,
      format === 'pdf'
        ? `RapportCoupe_${rapport.numeroCommande}.pdf`
        : `RapportCoupe_${rapport.numeroCommande}.xlsx`,
    )
      .then(() => toast.success('Rapport de coupe téléchargé'))
      .catch((e: Error) => toast.error(e.message ?? 'Téléchargement impossible'))
      .finally(() => setExportEnCours(null))
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  // Erreur 403 (permission « coupe » retirée entre le chargement et la requête) → état explicite.
  if (isError && (error as { status?: number } | undefined)?.status === 403) {
    return <ForbiddenState moduleLabel="coupe" />
  }

  if (!rapport) return null

  const tailles = rapport.tailles.map((t) => t.taille)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <span className="font-medium">{rapport.numeroCommande}{rapport.titreCommande ? ` — ${rapport.titreCommande}` : ''}</span>
        <span>{rapport.clientNom ?? ''}</span>
        <span className="ml-auto text-xs">
          Coupes : <b>{rapport.totalQuantiteCoupee}</b> / {rapport.totalQuantiteCommande} pièces · Exports :{' '}
          <b>{rapport.totalQuantiteExportee}</b>
        </span>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => telecharger('xlsx')} disabled={exportEnCours !== null}>
              <FileDown className="size-3.5" />
              {exportEnCours === 'xlsx' ? 'Génération…' : 'Télécharger (Excel)'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => telecharger('pdf')} disabled={exportEnCours !== null}>
              <FileText className="size-3.5" />
              {exportEnCours === 'pdf' ? 'Génération…' : 'Télécharger (PDF)'}
            </Button>
          </div>
      </div>

      {!lectureSeule && (
      <div className="grid gap-4 lg:grid-cols-2">
        {!lectureSeule && (
          <>
            <LotForm commandeId={commandeId} kind="coupe" tailles={tailles} />
            <LotForm commandeId={commandeId} kind="export" tailles={tailles} />
          </>
        )}
      </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Suivi par taille</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Taille</TableHead>
                <TableHead className="text-right">Qté commande</TableHead>
                <TableHead className="text-right">Qté coupée</TableHead>
                <TableHead className="text-right">Qté exportée</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rapport.tailles.map((t) => (
                <TableRow key={t.taille}>
                  <TableCell className="font-medium">{t.taille}</TableCell>
                  <TableCell className="text-right font-mono">{t.quantiteCommande}</TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1.5 font-mono">
                      {t.quantiteCoupee}
                      {t.depassementCoupe && (
                        <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800">
                          <AlertTriangle className="size-3" /> dépassement
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1.5 font-mono">
                      {t.quantiteExportee}
                      {t.depassementExport && (
                        <Badge variant="outline" className="gap-1 border-red-300 bg-red-50 text-red-800">
                          <AlertTriangle className="size-3" /> dépasse la coupe
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {rapport.tailles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    Aucune taille configurée pour cette commande.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Consommation tissu / stock restant</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tissu</TableHead>
                <TableHead className="text-right">Laize</TableHead>
                <TableHead className="text-right">Métrage annoncé</TableHead>
                <TableHead className="text-right">Pièces coupées</TableHead>
                <TableHead className="text-right">Conso réelle / pièce</TableHead>
                <TableHead className="text-right">Métrage réel</TableHead>
                <TableHead className="text-right">Stock restant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rapport.tissus.map((t) => (
                <TableRow key={t.articleId}>
                  <TableCell className="font-medium">{t.designation}</TableCell>
                  <TableCell className="text-right font-mono">{formatM(t.laize)}</TableCell>
                  <TableCell className="text-right font-mono">{formatM(t.metrageAnnonce)}</TableCell>
                  <TableCell className="text-right font-mono">{t.quantiteCoupee}</TableCell>
                  <TableCell className="text-right font-mono">{formatM(t.consoReelle)}</TableCell>
                  <TableCell className="text-right font-mono">{formatM(t.metrageReelle)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono ${t.stockRestant < 0 ? 'font-semibold text-red-600' : ''}`}>
                      {formatM(t.stockRestant)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {rapport.tissus.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Aucun tissu consommable déclaré dans la BOM de cette commande.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <CoupesHistorique
          commandeId={commandeId}
          onDelete={lectureSeule ? undefined : (id) => supprimerCoupe.mutate(id)}
          onEdit={lectureSeule ? undefined : (c) => setCoupeEditee(c)}
        />
        <ExportsHistorique commandeId={commandeId} onDelete={lectureSeule ? undefined : (id) => supprimerExport.mutate(id)} />
      </div>

      <ModifierCoupeDialog key={coupeEditee?.id ?? 'vide'} commandeId={commandeId} matelas={matelas ?? []} tailles={tailles} coupe={coupeEditee} onOpenChange={() => setCoupeEditee(null)} />
    </div>
  )
}

function CoupesHistorique({
  commandeId,
  onDelete,
  onEdit,
}: {
  commandeId: number
  onDelete?: (id: number) => void
  onEdit?: (coupe: LotCoupe) => void
}) {
  const { data: coupes } = useGetCoupes(commandeId)
  return (
    <HistoriqueList
      title="Historique des coupes"
      items={(coupes ?? []).map((c) => ({
        id: c.id,
        label: `Taille ${c.taille} — ${c.quantiteCoupee} pièce(s)${c.matelasNumero ? ` · ${c.matelasNumero}` : ''}`,
        date: new Date(c.dateCoupe).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
        force: c.forcerDepassement,
        editLabel: 'Modifier la coupe',
      }))}
      onDelete={onDelete}
      onEditItem={(id) => {
        const coupe = (coupes ?? []).find((c) => c.id === id)
        if (coupe && onEdit) onEdit(coupe)
      }}
    />
  )
}

function ExportsHistorique({
  commandeId,
  onDelete,
}: {
  commandeId: number
  onDelete?: (id: number) => void
}) {
  const { data: exports } = useGetExports(commandeId)
  return (
    <HistoriqueList
      title="Historique des exports"
      items={(exports ?? []).map((c) => ({
        id: c.id,
        label: `Taille ${c.taille} — ${c.quantiteExportee} pièce(s)${c.chaineProductionNom ? ` · ${c.chaineProductionNom}` : ''}`,
        date: new Date(c.dateExport).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
        force: c.forcerDepassement,
      }))}
      onDelete={onDelete}
    />
  )
}

function HistoriqueList({
  title,
  items,
  onDelete,
  onEditItem,
}: {
  title: string
  items: { id: number; label: string; date: string; force: boolean; editLabel?: string }[]
  onDelete?: (id: number) => void
  onEditItem?: (id: number) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune entrée.</p>
        )}
        {items.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{i.label}</p>
              <p className="text-xs text-muted-foreground">{i.date}</p>
            </div>
            {i.force && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                dépassement forcé
              </Badge>
            )}
            <div className="flex items-center gap-1">
              {onEditItem && (
                <Button variant="ghost" size="icon-sm" title={i.editLabel} onClick={() => onEditItem(i.id)}>
                  <Pencil className="size-3.5" />
                </Button>
              )}
              {onDelete && (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" title="Supprimer">
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                  onConfirm={() => onDelete(i.id)}
                />
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Dialog modification d'une coupe (mêmes garde-fous que la création) ───

function ModifierCoupeDialog({
  commandeId,
  matelas,
  tailles,
  coupe,
  onOpenChange,
}: {
  commandeId: number
  matelas: Matelas[]
  tailles: string[]
  coupe: LotCoupe | null
  onOpenChange: (v: boolean) => void
}) {
  const modifier = useModifierCoupe(commandeId)
  const [taille, setTaille] = useState(coupe?.taille ?? '')
  const [quantite, setQuantite] = useState(String(coupe?.quantiteCoupee ?? ''))
  const [notes, setNotes] = useState(coupe?.notes ?? '')
  const [forcer, setForcer] = useState(coupe?.forcerDepassement ?? false)
  const [matelasId, setMatelasId] = useState(coupe?.matelasId ? String(coupe.matelasId) : '')
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
        matelasId: matelasId ? Number(matelasId) : null,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    )
  }

  return (
    <Dialog open={coupe !== null} onOpenChange={(v) => { if (!v) onOpenChange(false) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la coupe</DialogTitle>
          <DialogDescription>Mêmes garde-fous qu&apos;à la création : taille dans la configuration, matelas de la commande, plafond de dépassement (409).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Taille</Label>
              <Select key={`${selectKey}-taille`} value={taille} onValueChange={setTaille}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Taille…" />
                </SelectTrigger>
                <SelectContent>
                  {tailles.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Qté coupée</Label>
              <Input type="number" min="1" step="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Matelas</Label>
            <Select key={`${selectKey}-matelas`} value={matelasId} onValueChange={setMatelasId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sans matelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sans matelas</SelectItem>
                {matelas.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.numeroMatelas} — {new Date(m.dateMatelas).toLocaleDateString('fr-FR')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optionnel" />
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