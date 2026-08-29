'use client'

import { useMemo, useState } from 'react'
import { Download, X, ShoppingCart, Wallet, Building2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useGetPlateformes } from '@/hooks/use-plateformes'
import { useGetClients } from '@/hooks/use-clients'
import { useGetCommandes } from '@/hooks/use-commandes'
import { STATUT_ACHAT } from '@/types/fournisseur'
import type { Achat, LigneAchat } from '@/types/achat'
import type { Client } from '@/types/client'
import type { CommandeClient } from '@/types/commande'
import type { Plateforme } from '@/types/plateforme'

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

// ── Résolution plateforme / client par ligne d'achat ───────────────────────────
// Utilisé par byClient, byPlateforme et l'export CSV pour résoudre les lignes
// destinées à une commande (0), un client (1) ou une plateforme (2).

function resoudrePlateforme(
  l: LigneAchat | null,
  a: Achat,
  plateformes?: Plateforme[],
  commandes?: CommandeClient[],
  clients?: Client[],
): string {
  const pfById = (id: number) =>
    plateformes?.find((p) => p.id === id)?.nom ?? `Plf #${id}`
  if (!l) {
    // Achat sans lignes → on résout via l'en-tête (commande liée)
    return a.commandeClient?.client?.plateforme?.nom ?? 'Sans plateforme'
  }
  switch (l.typeDestination) {
    case 2:
      return l.plateformeId ? pfById(l.plateformeId) : 'Sans plateforme'
    case 1: {
      if (!l.clientId) return 'Sans plateforme'
      const cl = clients?.find((c) => c.id === l.clientId)
      if (!cl) return 'Sans plateforme'
      const pfId = cl.plateformeId
      if (pfId) return pfById(pfId)
      return cl.plateforme?.nom ?? 'Sans plateforme'
    }
    case 0: {
      if (!l.commandeClientId) return 'Sans plateforme'
      const c = commandes?.find((cc) => cc.id === l.commandeClientId)
      return c?.client?.plateforme?.nom ?? 'Sans plateforme'
    }
    case 3:
    case 4:
    default:
      return 'Sans plateforme'
  }
}

function resoudreClient(
  l: LigneAchat | null,
  a: Achat,
  commandes?: CommandeClient[],
  clients?: Client[],
): string {
  if (!l) {
    return a.commandeClient?.client?.nom ?? 'Sans client'
  }
  switch (l.typeDestination) {
    case 1: {
      if (!l.clientId) return 'Sans client'
      const cl = clients?.find((c) => c.id === l.clientId)
      if (!cl) return 'Sans client'
      return cl.nomEntreprise ?? cl.nom ?? `Client #${l.clientId}`
    }
    case 0: {
      if (!l.commandeClientId) return 'Sans client'
      const c = commandes?.find((cc) => cc.id === l.commandeClientId)
      return c?.client?.nom ?? 'Sans client'
    }
    case 2:
    case 3:
    case 4:
    default:
      return 'Sans client'
  }
}

// ── Carte KPI (même style que le rapport Analytics) ────────────────────────────

function KpiCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  icon: React.ElementType
  tone: string
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-center gap-4 py-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-[15px] text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold leading-none">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RapportAchatsPage() {
  const { data: achats, isLoading } = useGetAchats()
  const { data: plateformes } = useGetPlateformes()
  const { data: clients } = useGetClients()
  const { data: commandes } = useGetCommandes()

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

  // ── Agrégation par client (résolue ligne par ligne selon typeDestination) ─────
  const byClient = useMemo(() => {    const map = new Map<string, { nom: string; count: number; montant: number }>()
    for (const a of filtered) {
      const lignes = a.lignesAchat?.length ? a.lignesAchat : []
      let nom = 'Sans client'
      if (lignes.length === 0) {
        nom = resoudreClient(null, a, commandes, clients)
      } else {
        const ligne = lignes.find(
          (l) => l.typeDestination === 0 || l.typeDestination === 1,
        )
        if (ligne) nom = resoudreClient(ligne, a, commandes, clients)
      }
      const row = map.get(nom) ?? { nom, count: 0, montant: 0 }
      row.count++
      row.montant += a.montantTotal ?? 0
      map.set(nom, row)
    }
    return [...map.values()].sort((a, b) => b.montant - a.montant)
  }, [filtered, commandes, clients])

  // ── Agrégation par plateforme ─────────────────────────────────────────────────
  // La plateforme est portée par les LIGNES (typeDestination=2 Plateforme) ou, pour
  // les lignes Commande/Client, par le niveau lié (commande → client → plateforme).
  const byPlateforme = useMemo(() => {
    const map = new Map<string, { nom: string; count: number; montant: number }>()
    for (const a of filtered) {
      const lignes = a.lignesAchat?.length ? a.lignesAchat : []
      if (lignes.length === 0) {
        const nom = resoudrePlateforme(null, a, plateformes, commandes, clients)
        const row = map.get(nom) ?? { nom, count: 0, montant: 0 }
        row.count++
        row.montant += a.montantTotal ?? 0
        map.set(nom, row)
        continue
      }
      for (const l of lignes) {
        const nom = resoudrePlateforme(l, a, plateformes, commandes, clients)
        const row = map.get(nom) ?? { nom, count: 0, montant: 0 }
        row.count++
        row.montant += l.montantLigne ?? 0
        map.set(nom, row)
      }
    }
    return [...map.values()].sort((a, b) => b.montant - a.montant)
  }, [filtered, plateformes, commandes, clients])

  // ── Agrégation par article (lignes) ───────────────────────────────────────────
  const byArticle = useMemo(() => {
    const map = new Map<
      number,
      { nom: string; reference: string | null; count: number; quantite: number; montant: number }
    >()
    for (const a of filtered) {
      const lignes = a.lignesAchat?.length ? a.lignesAchat : []
      for (const l of lignes) {
        if (!l.articleId) continue
        const row = map.get(l.articleId) ?? {
          nom: l.article?.designation ?? `Article #${l.articleId}`,
          reference: l.article?.reference ?? null,
          count: 0,
          quantite: 0,
          montant: 0,
        }
        row.count++
        row.quantite += l.quantite ?? 0
        row.montant += l.montantLigne ?? 0
        map.set(l.articleId, row)
      }
    }
    return [...map.values()].sort((a, b) => b.montant - a.montant)
  }, [filtered])

  // ── Export CSV (par ligne, colonnes Excel) ─────────────────────────────────
  const handleExport = () => {
    const rows: Record<string, string | number | null | undefined>[] = []
    for (const a of filtered) {
      const lignes = a.lignesAchat?.length ? a.lignesAchat : [null]
      for (const l of lignes) {
        const plateforme = l
          ? resoudrePlateforme(l, a, plateformes, commandes, clients)
          : resoudrePlateforme(null, a, plateformes, commandes, clients)
        rows.push({
          'N° Achat': a.numeroAchat,
          'Date achat': a.dateAchat ? fmtDate(a.dateAchat) : '',
          'Date livraison': a.dateLivraisonPrevue ? fmtDate(a.dateLivraisonPrevue) : '',
          Fournisseur: a.fournisseur?.nomEntreprise ?? '',
          Article: l?.article?.designation ?? '',
          'Désignation / Réf.': l?.article?.reference ?? '',
          Couleur: l?.couleur ?? '',
          Taille: l?.taille ?? '',
          Dimension: l?.dimension ?? '',
          Quantité: l?.quantite ?? 0,
          'Prix unitaire': l?.prixUnitaire ?? 0,
          'Montant ligne': l?.montantLigne ?? 0,
          Devise: l?.devise ?? a.devise ?? 'EUR',
          Plateforme: plateforme,
          'Commande destinée': l?.commandeClientId
            ? (commandes?.find((c) => c.id === l.commandeClientId)?.numeroCommande ?? '')
            : (a.commandeClient?.numeroCommande ?? ''),
          'Commandé par': a.creePar ?? '',
          Statut: STATUT_ACHAT[a.statut] ?? String(a.statut),
        })
      }
    }
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
              <Label>Date début</Label>
              <Input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Date fin</Label>
              <Input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Statut</Label>
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

      {/* ── KPIs (cards, style rapport Analytics) ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Achat(s)"
            value={String(filtered.length)}
            icon={ShoppingCart}
            tone="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
          />
          <KpiCard
            title="Montant total"
            value={fmtEur(totalMontant)}
            icon={Wallet}
            tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          />
          <KpiCard
            title="Fournisseur(s)"
            value={String(nbFournisseurs)}
            icon={Building2}
            tone="bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
          />
          <KpiCard
            title="Moyenne / achat"
            value={fmtEur(montantMoyen)}
            icon={TrendingUp}
            tone="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          />
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
                        <BarCell value={row.montant} max={totalMontant} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Par article */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Par article
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
            ) : byArticle.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune donnée pour cette période.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead className="text-right">Lignes</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Part</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byArticle.map((row) => (
                    <TableRow key={row.nom + row.reference}>
                      <TableCell className="font-medium">
                        {row.nom}
                        {row.reference && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({row.reference})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.quantite}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {fmtEur(row.montant)}
                      </TableCell>
                      <TableCell>
                        <BarCell value={row.montant} max={totalMontant} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Par client */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Par client</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : byClient.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune donnée pour cette période.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Achats</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byClient.map((row) => (
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
                    <TableHead className="text-right">Lignes</TableHead>
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
