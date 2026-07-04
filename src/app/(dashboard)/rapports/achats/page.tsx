'use client'

import { useMemo, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
import { PageHeader } from '@/components/shared/page-header'
import { PermissionGate } from '@/components/auth/permission-gate'
import { useGetAchats } from '@/hooks/use-achats'
import { STATUT_ACHAT } from '@/types/fournisseur'

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('fr-FR')

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function exportCsv(rows: Record<string, string | number | null | undefined>[], filename: string) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(',')),
  ]
  const blob = new Blob(['﻿' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Badge statut ───────────────────────────────────────────────────────────────

const STATUT_VARIANT: Record<number, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  0: 'secondary',
  1: 'outline',
  2: 'default',
  3: 'outline',
  4: 'destructive',
}
const STATUT_CLASS: Record<number, string> = {
  3: 'border-green-200 bg-green-100 text-green-800',
}

// ── Barre visuelle relative ────────────────────────────────────────────────────

function BarCell({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RapportAchatsPage() {
  const { data: achats, isLoading } = useGetAchats()

  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [statutFilter, setStatutFilter] = useState<string>('tous')

  // ── Données filtrées ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!achats) return []
    return achats.filter((a) => {
      const d = a.dateAchat?.slice(0, 10) ?? ''
      if (dateDebut && d < dateDebut) return false
      if (dateFin && d > dateFin) return false
      if (statutFilter !== 'tous' && a.statut !== Number(statutFilter)) return false
      return true
    })
  }, [achats, dateDebut, dateFin, statutFilter])

  // ── KPIs résumé ───────────────────────────────────────────────────────────────
  const totalMontant = useMemo(
    () => filtered.reduce((s, a) => s + (a.montantTotal ?? 0), 0),
    [filtered],
  )
  const nbFournisseurs = useMemo(
    () => new Set(filtered.map((a) => a.fournisseurId)).size,
    [filtered],
  )
  const montantMoyen = filtered.length > 0 ? totalMontant / filtered.length : 0

  // ── Agrégation par fournisseur ────────────────────────────────────────────────
  const byFournisseur = useMemo(() => {
    const map = new Map<string, { nom: string; count: number; montant: number }>()
    for (const a of filtered) {
      const nom = a.fournisseur?.nomEntreprise ?? `Fournisseur #${a.fournisseurId}`
      const row = map.get(nom) ?? { nom, count: 0, montant: 0 }
      row.count++
      row.montant += a.montantTotal ?? 0
      map.set(nom, row)
    }
    return [...map.values()].sort((a, b) => b.montant - a.montant)
  }, [filtered])

  const maxFournisseurMontant = byFournisseur[0]?.montant ?? 0

  // ── Agrégation par statut ─────────────────────────────────────────────────────
  const byStatut = useMemo(() => {
    const map = new Map<number, { count: number; montant: number }>()
    for (const a of filtered) {
      const row = map.get(a.statut) ?? { count: 0, montant: 0 }
      row.count++
      row.montant += a.montantTotal ?? 0
      map.set(a.statut, row)
    }
    return [...map.entries()]
      .map(([statut, row]) => ({ statut, ...row }))
      .sort((a, b) => b.montant - a.montant)
  }, [filtered])

  // ── Agrégation par marque (= commandeClient.client.nom) ───────────────────────
  const byMarque = useMemo(() => {
    const map = new Map<string, { nom: string; count: number; montant: number }>()
    for (const a of filtered) {
      const nom = a.commandeClient?.client?.nom ?? 'Sans marque'
      const row = map.get(nom) ?? { nom, count: 0, montant: 0 }
      row.count++
      row.montant += a.montantTotal ?? 0
      map.set(nom, row)
    }
    return [...map.values()].sort((a, b) => b.montant - a.montant)
  }, [filtered])

  // ── Agrégation par plateforme ─────────────────────────────────────────────────
  const byPlateforme = useMemo(() => {
    const map = new Map<string, { nom: string; count: number; montant: number }>()
    for (const a of filtered) {
      const nom = a.commandeClient?.client?.plateforme?.nom ?? 'Sans plateforme'
      const row = map.get(nom) ?? { nom, count: 0, montant: 0 }
      row.count++
      row.montant += a.montantTotal ?? 0
      map.set(nom, row)
    }
    return [...map.values()].sort((a, b) => b.montant - a.montant)
  }, [filtered])

  // ── Export CSV ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map((a) => ({
      'N° Achat': a.numeroAchat,
      Fournisseur: a.fournisseur?.nomEntreprise ?? '',
      'Marque / Client': a.commandeClient?.client?.nom ?? '',
      Plateforme: a.commandeClient?.client?.plateforme?.nom ?? '',
      Statut: STATUT_ACHAT[a.statut] ?? String(a.statut),
      'Date achat': a.dateAchat ? fmtDate(a.dateAchat) : '',
      'Montant total': a.montantTotal ?? 0,
      Devise: a.devise ?? 'EUR',
    }))
    const suffix =
      dateDebut || dateFin
        ? `_${dateDebut || 'debut'}_${dateFin || 'fin'}`
        : '_tous'
    exportCsv(rows, `rapport_achats${suffix}.csv`)
  }

  const handleReset = () => {
    setDateDebut('')
    setDateFin('')
    setStatutFilter('tous')
  }

  const hasFilter = dateDebut || dateFin || statutFilter !== 'tous'

  return (
    <PermissionGate
      module="rapports"
      mode="read"
      fallback={
        <p className="text-sm text-muted-foreground">
          Vous n&apos;avez pas les droits pour accéder à ce module.
        </p>
      }
    >
      <div className="space-y-6">
        <PageHeader
        title="Rapport — Achats"
        backHref="/dashboard"
        action={
          <Button size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="size-4" />
            Exporter CSV
          </Button>
        }
      />

      {/* ── Filtres ── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Date début</Label>
              <Input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Date fin</Label>
              <Input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Statut</Label>
              <Select value={statutFilter} onValueChange={setStatutFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  {Object.entries(STATUT_ACHAT).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilter && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="size-3.5" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Bandeau résumé ── */}
      {isLoading ? (
        <Skeleton className="h-14 w-full rounded-lg" />
      ) : (
        <div className="flex flex-wrap items-center gap-6 rounded-lg border bg-muted/40 px-5 py-3 text-sm">
          <span>
            <span className="text-2xl font-bold">{filtered.length}</span>
            <span className="ml-1 text-muted-foreground">achat(s)</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span>
            <span className="text-2xl font-bold">{fmtEur(totalMontant)}</span>
            <span className="ml-1 text-muted-foreground">montant total</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span>
            <span className="text-2xl font-bold">{nbFournisseurs}</span>
            <span className="ml-1 text-muted-foreground">fournisseur(s)</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span>
            <span className="font-semibold">{fmtEur(montantMoyen)}</span>
            <span className="ml-1 text-muted-foreground">moyenne / achat</span>
          </span>
        </div>
      )}

      {/* ── Tableaux agrégés ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Par fournisseur — Top 5 mis en avant */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Par fournisseur
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (trié par montant décroissant)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : byFournisseur.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune donnée pour cette période.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead className="text-right">Achats</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Part</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byFournisseur.map((row, i) => (
                    <TableRow
                      key={row.nom}
                      className={i < 5 ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}
                    >
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{row.nom}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {fmtEur(row.montant)}
                      </TableCell>
                      <TableCell>
                        <BarCell value={row.montant} max={maxFournisseurMontant} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Par statut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Par statut</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : byStatut.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune donnée pour cette période.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Achats</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byStatut.map((row) => (
                    <TableRow key={row.statut}>
                      <TableCell>
                        <Badge
                          variant={STATUT_VARIANT[row.statut] ?? 'secondary'}
                          className={STATUT_CLASS[row.statut] ?? ''}
                        >
                          {STATUT_ACHAT[row.statut] ?? String(row.statut)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {fmtEur(row.montant)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {totalMontant > 0
                          ? ((row.montant / totalMontant) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Par marque / client */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Par marque / client</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : byMarque.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune donnée pour cette période.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marque / Client</TableHead>
                    <TableHead className="text-right">Achats</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byMarque.map((row) => (
                    <TableRow key={row.nom}>
                      <TableCell className="font-medium">{row.nom}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {fmtEur(row.montant)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {totalMontant > 0
                          ? ((row.montant / totalMontant) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Par plateforme */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Par plateforme</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : byPlateforme.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune donnée pour cette période.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plateforme</TableHead>
                    <TableHead className="text-right">Achats</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byPlateforme.map((row) => (
                    <TableRow key={row.nom}>
                      <TableCell className="font-medium">{row.nom}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {fmtEur(row.montant)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {totalMontant > 0
                          ? ((row.montant / totalMontant) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </PermissionGate>
  )
}
