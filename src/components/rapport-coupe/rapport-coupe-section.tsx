'use client'

import { useState } from 'react'
import { AlertTriangle, FileDown, FileText } from 'lucide-react'
import { useGetRapportCoupe, useGetCoupes, useGetExports } from '@/hooks/use-rapport-coupe'
import { Button } from '@/components/ui/button'
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
import { ForbiddenState } from '@/components/shared/forbidden-state'
import { toast } from 'sonner'
import { downloadViaProxy } from '@/lib/download'

function formatM(v: number | null | undefined) {
  return v == null ? '—' : `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m`
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Onglet « Rapport de coupe » de /commandes/{id} — CONSULTATION SEULE.
 * Aucun bouton d'écriture ici : la saisie de coupe vit dans le module Coupe
 * (/coupe/{commandeId} puis écran « Saisie de coupe » du matelas concerné).
 */
export function RapportCoupeSection({ commandeId }: { commandeId: number }) {
  const { data: rapport, isLoading, isError, error } = useGetRapportCoupe(commandeId)
  const { data: coupes } = useGetCoupes(commandeId)
  const { data: exports } = useGetExports(commandeId)
  const [exportEnCours, setExportEnCours] = useState<'xlsx' | 'pdf' | null>(null)

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
        <HistoriqueLectureSeule
          titre="Historique des coupes"
          items={(coupes ?? []).map((c) => ({
            id: c.id,
            label: `Taille ${c.taille} — ${c.quantiteCoupee} pièce(s)${c.matelasNumero ? ` · ${c.matelasNumero}` : ''}`,
            date: formatDateTime(c.dateCoupe),
            force: c.forcerDepassement,
          }))}
        />
        <HistoriqueLectureSeule
          titre="Historique des exports"
          items={(exports ?? []).map((e) => ({
            id: e.id,
            label: `Taille ${e.taille} — ${e.quantiteExportee} pièce(s)${e.chaineProductionNom ? ` · ${e.chaineProductionNom}` : ''}`,
            date: formatDateTime(e.dateExport),
            force: e.forcerDepassement,
          }))}
        />
      </div>
    </div>
  )
}

/** Liste d'historique SANS aucun bouton d'écriture (onglet consultation). */
function HistoriqueLectureSeule({
  titre,
  items,
}: {
  titre: string
  items: { id: number; label: string; date: string; force: boolean }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{titre}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Aucune entrée.</p>}
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
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
