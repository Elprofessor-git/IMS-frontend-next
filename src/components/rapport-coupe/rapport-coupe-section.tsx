'use client'

import { useState } from 'react'
import { Scissors, Truck, Trash2, AlertTriangle, FileDown } from 'lucide-react'
import {
  useGetRapportCoupe,
  useGetCoupes,
  useGetExports,
  useAjouterCoupe,
  useSupprimerCoupe,
  useAjouterExport,
  useSupprimerExport,
} from '@/hooks/use-rapport-coupe'
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
import { toast } from 'sonner'
import { downloadViaProxy } from '@/lib/download'

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
  const [taille, setTaille] = useState('')
  const [quantite, setQuantite] = useState('')
  const [forcer, setForcer] = useState(false)
  const isCoupe = kind === 'coupe'

  const submit = () => {
    const q = Number(quantite)
    if (!taille || !q || q <= 0) return
    ajouter.mutate(
      {
        taille,
        [isCoupe ? 'quantiteCoupee' : 'quantiteExportee']: q,
        forcerDepassement: forcer,
      },
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

export function RapportCoupeSection({ commandeId }: { commandeId: number }) {
  const { data: rapport, isLoading } = useGetRapportCoupe(commandeId)
  const supprimerCoupe = useSupprimerCoupe(commandeId)
  const supprimerExport = useSupprimerExport(commandeId)
  const [exportEnCours, setExportEnCours] = useState(false)

  const telecharger = () => {
    if (!rapport) return
    setExportEnCours(true)
    downloadViaProxy(
      `/api/proxy/api/RapportCoupe/${commandeId}/Export`,
      `RapportCoupe_${rapport.numeroCommande}.xlsx`,
    )
      .then(() => toast.success('Rapport de coupe téléchargé'))
      .catch((e: Error) => toast.error(e.message ?? 'Téléchargement impossible'))
      .finally(() => setExportEnCours(false))
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
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
        <Button variant="outline" size="sm" onClick={telecharger} disabled={exportEnCours}>
          <FileDown className="size-3.5" />
          {exportEnCours ? 'Génération…' : 'Télécharger (Excel)'}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LotForm commandeId={commandeId} kind="coupe" tailles={tailles} />
        <LotForm commandeId={commandeId} kind="export" tailles={tailles} />
      </div>

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
        <CoupesHistorique commandeId={commandeId} onDelete={(id) => supprimerCoupe.mutate(id)} />
        <ExportsHistorique commandeId={commandeId} onDelete={(id) => supprimerExport.mutate(id)} />
      </div>
    </div>
  )
}

function CoupesHistorique({
  commandeId,
  onDelete,
}: {
  commandeId: number
  onDelete: (id: number) => void
}) {
  const { data: coupes } = useGetCoupes(commandeId)
  return (
    <HistoriqueList
      title="Historique des coupes"
      items={(coupes ?? []).map((c) => ({
        id: c.id,
        label: `Taille ${c.taille} — ${c.quantiteCoupee} pièce(s)`,
        date: new Date(c.dateCoupe).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
        force: c.forcerDepassement,
      }))}
      onDelete={onDelete}
    />
  )
}

function ExportsHistorique({
  commandeId,
  onDelete,
}: {
  commandeId: number
  onDelete: (id: number) => void
}) {
  const { data: exports } = useGetExports(commandeId)
  return (
    <HistoriqueList
      title="Historique des exports"
      items={(exports ?? []).map((c) => ({
        id: c.id,
        label: `Taille ${c.taille} — ${c.quantiteExportee} pièce(s)`,
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
}: {
  title: string
  items: { id: number; label: string; date: string; force: boolean }[]
  onDelete: (id: number) => void
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
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" title="Supprimer">
                  <Trash2 className="size-3.5" />
                </Button>
              }
              onConfirm={() => onDelete(i.id)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}