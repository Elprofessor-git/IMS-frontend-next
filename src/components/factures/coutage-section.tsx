'use client'

import { useState } from 'react'
import { BadgeEuro, Info } from 'lucide-react'
import { useGetCommandes } from '@/hooks/use-commandes'
import { useGetCoutage } from '@/hooks/use-factures'
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

function fmt2(v: number) {
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function fmt(v: number) {
  return Number(v).toLocaleString('fr-FR')
}

// Coûtage par style, déplacé du détail commande vers la Facturation (LOT 5).
// Les montants sont sommés en TND (devise de référence système) par le backend.
export function CoutageSection() {
  const { data: commandes, isLoading: commandesLoading } = useGetCommandes()
  const [commandeId, setCommandeId] = useState(0)
  const { data: coutage, isLoading } = useGetCoutage(commandeId, commandeId > 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BadgeEuro className="size-4" /> Coût par style (matière + façon)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid w-full max-w-sm gap-1.5">
            <label className="text-sm font-medium">Commande</label>
            <Select
              value={commandeId > 0 ? String(commandeId) : '0'}
              onValueChange={(v) => setCommandeId(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir une commande…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Choisir une commande…</SelectItem>
                {(commandes ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.numeroCommande}
                    {c.titreCommande ? ` — ${c.titreCommande}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Coût matière = BOM × dernier prix connu par article (sinon prix de référence), coût
              façon = prix façon × total pièces. Les prix saisis dans une autre devise que le TND
              sont convertis au taux affiché par ligne — les totaux sont exprimés en TND.
            </span>
          </div>
        </CardContent>
      </Card>

      {commandesLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : commandeId === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Sélectionnez une commande pour afficher son coûtage.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : !coutage ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Coûtage indisponible pour cette commande.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold tabular-nums">{fmt(coutage.totalPieces)}</p>
                <p className="text-sm text-muted-foreground">Pièces (total tailles)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold tabular-nums">{fmt2(coutage.coutTotalMatiere)} TND</p>
                <p className="text-sm text-muted-foreground">Coût matière (BOM × prix)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold tabular-nums">
                  {fmt2(coutage.coutTotalFacon ?? 0)} TND
                </p>
                <p className="text-sm text-muted-foreground">
                  Coût façon{' '}
                  {coutage.prixFacon != null
                    ? `(${fmt2(coutage.prixFacon)}${coutage.deviseCommande ? ` ${coutage.deviseCommande}` : ''} / pièce)`
                    : '(non défini)'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold tabular-nums text-green-700">
                  {fmt2(coutage.coutTotalGeneral)} TND
                </p>
                <p className="text-sm text-muted-foreground">Coût total estimé</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détail par article</CardTitle>
            </CardHeader>
            <CardContent>
              {coutage.lignes.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucune BOM définie — le coût matière est nul.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead className="text-right">Qté / pièce</TableHead>
                        <TableHead className="text-right">Besoin total</TableHead>
                        <TableHead className="text-right">Prix unitaire</TableHead>
                        <TableHead className="text-right">Taux TND</TableHead>
                        <TableHead>Source prix</TableHead>
                        <TableHead className="text-right">Coût ligne (TND)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coutage.lignes.map((l) => (
                        <TableRow key={l.articleId}>
                          <TableCell className="whitespace-normal break-words">
                            <p className="font-medium">{l.designation}</p>
                            {l.reference && (
                              <p className="font-mono text-xs text-muted-foreground">{l.reference}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(l.quantiteParPiece)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(l.quantiteTotale)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {fmt2(l.prixUnitaire)}
                            {l.devise ? ` ${l.devise}` : ''}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground tabular-nums">
                            {Number(l.tauxConvTND).toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                l.sourcePrix === 'Historique'
                                  ? 'border-green-200 bg-green-100 text-green-800'
                                  : l.sourcePrix === 'Article'
                                    ? 'border-blue-200 bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-600'
                              }
                            >
                              {l.sourcePrix === 'Historique'
                                ? 'Dernier prix connu'
                                : l.sourcePrix === 'Article'
                                  ? 'Prix de référence'
                                  : 'Aucun prix'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium tabular-nums">
                            {fmt2(l.coutLigne)} TND
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}