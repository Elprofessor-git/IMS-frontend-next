'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, ExternalLink, Trash2, Download, X, Rows3, Table2, FilePenLine, Send, BadgeCheck, PackageCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { PaginationBar } from '@/components/shared/pagination'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CommandeSelect } from '@/components/forms/commande-select'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ResponsiveTable, type ColDef } from '@/components/ui/responsive-table'
import { useClientPagination } from '@/hooks/use-client-pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetImportations, useDeleteImportation } from '@/hooks/use-importations'
import { useGetFournisseurs } from '@/hooks/use-fournisseurs'
import { useGetPlateformes } from '@/hooks/use-plateformes'
import { useGetCommandes } from '@/hooks/use-commandes'
import { STATUT_IMPORTATION, MODE_EXPEDITION } from '@/types/fournisseur'
import type { Importation, LigneImportation } from '@/types/importation'
import { libelleCommande } from '@/lib/labels'

const STATUT_BADGE: Record<number, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string; icon?: React.ReactNode }> = {
  0: { variant: 'secondary', icon: <FilePenLine className="size-3.5" /> },
  1: { variant: 'outline', className: 'border-amber-200 bg-amber-100 text-amber-800', icon: <Send className="size-3.5" /> },
  2: { variant: 'outline', className: 'border-green-200 bg-green-100 text-green-800', icon: <BadgeCheck className="size-3.5" /> },
  3: { variant: 'outline', className: 'border-green-200 bg-green-100 text-green-800', icon: <PackageCheck className="size-3.5" /> },
  4: { variant: 'destructive', icon: <XCircle className="size-3.5" /> },
}

function StatutBadge({ statut }: { statut: number }) {
  const cfg = STATUT_BADGE[statut]
  return (
    <Badge variant={cfg?.variant} className={cfg?.className}>
      {cfg?.icon}
      {STATUT_IMPORTATION[statut] ?? String(statut)}
    </Badge>
  )
}

// ── Helpers CSV ────────────────────────────────────────────────────────────────

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
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('fr-FR') : ''

// ── Filtres (combinables, façon Excel) ────────────────────────────────────────

type Filters = {
  dateDebut: string
  dateFin: string
  statut: string
  modeExpedition: string
  fournisseurId: string
  plateformeId: string
  commandeId: string
  article: string
}

const EMPTY_FILTERS: Filters = {
  dateDebut: '',
  dateFin: '',
  statut: 'tous',
  modeExpedition: 'tous',
  fournisseurId: '',
  plateformeId: '',
  commandeId: '',
  article: '',
}

// La plateforme d'une ligne : dès que le contexte Plateforme est renseigné,
// quel que soit le niveau effectif de destination (Commande / Marque / Plateforme).
function plateformeDeLaLigne(l: LigneImportation, plateformes: { id: number; nom: string }[] | undefined) {
  if (l.plateformeId) {
    return plateformes?.find((p) => p.id === l.plateformeId)?.nom ?? `Plf #${l.plateformeId}`
  }
  return null
}

function ligneMatchePlateforme(
  l: LigneImportation,
  plateformeId: string,
): boolean {
  if (!plateformeId) return true
  return l.plateformeId === Number(plateformeId)
}

function ligneMatcheCommande(l: LigneImportation, commandeId: string): boolean {
  if (!commandeId) return true
  return l.commandeClientId === Number(commandeId)
}

function ligneMatcheArticle(l: LigneImportation, terme: string): boolean {
  if (!terme.trim()) return true
  const t = terme.trim().toLowerCase()
  return (
    (l.article?.designation?.toLowerCase().includes(t) ?? false) ||
    (l.article?.reference?.toLowerCase().includes(t) ?? false) ||
    (l.couleur?.toLowerCase().includes(t) ?? false) ||
    (l.dimension?.toLowerCase().includes(t) ?? false) ||
    (l.nature?.toLowerCase().includes(t) ?? false)
  )
}

// Filtres d'EN-TÊTE uniquement (date, statut, fournisseur, mode expédition).
function importationMatcheEnTete(i: Importation, f: Filters): boolean {
  const d = i.dateImportation?.slice(0, 10) ?? ''
  if (f.dateDebut && d < f.dateDebut) return false
  if (f.dateFin && d > f.dateFin) return false
  if (f.statut !== 'tous' && i.statut !== Number(f.statut)) return false
  if (f.modeExpedition !== 'tous' && i.modeExpedition !== Number(f.modeExpedition)) return false
  if (f.fournisseurId && i.fournisseurId !== Number(f.fournisseurId)) return false
  return true
}

// Une LIGNE matche-t-elle les filtres plateforme + commande + article ?
function ligneMatcheFiltres(
  l: LigneImportation,
  f: Filters,
): boolean {
  if (f.plateformeId && !ligneMatchePlateforme(l, f.plateformeId)) return false
  if (f.commandeId && !ligneMatcheCommande(l, f.commandeId)) return false
  if (f.article.trim() && !ligneMatcheArticle(l, f.article)) return false
  return true
}

// L'importation (vue en-têtes) est retenue si une de ses lignes matche
// plateforme/commande/article ; ces filtres sont ignorés sans lignes.
function importationMatcheLignes(i: Importation, f: Filters): boolean {
  const aDesLignes = i.lignesImportation?.length > 0

  if (f.plateformeId) {
    if (!aDesLignes) return false
    if (!i.lignesImportation.some((l) => ligneMatchePlateforme(l, f.plateformeId))) return false
  }

  if (f.commandeId) {
    if (!aDesLignes) return false
    if (!i.lignesImportation.some((l) => ligneMatcheCommande(l, f.commandeId))) return false
  }

  if (f.article.trim()) {
    if (aDesLignes) {
      if (!i.lignesImportation.some((l) => ligneMatcheArticle(l, f.article))) return false
    } else if (
      !i.referenceImportation.toLowerCase().includes(f.article.trim().toLowerCase()) &&
      !(i.fournisseur?.nomEntreprise?.toLowerCase().includes(f.article.trim().toLowerCase()) ?? false)
    ) {
      return false
    }
  }

  return true
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ImportationsPage() {
  const { data: importations, isLoading } = useGetImportations()
  const deleteMutation = useDeleteImportation()
  const { data: fournisseurs } = useGetFournisseurs()
  const { data: plateformes } = useGetPlateformes()
  const { data: commandes } = useGetCommandes()

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  const setFilter = (k: keyof Filters, v: string) =>
    setFilters((prev) => ({ ...prev, [k]: v }))

  const hasFilter =
    filters.dateDebut ||
    filters.dateFin ||
    filters.statut !== 'tous' ||
    filters.modeExpedition !== 'tous' ||
    filters.fournisseurId ||
    filters.plateformeId ||
    filters.commandeId ||
    filters.article.trim()

  const resetFilters = () => setFilters(EMPTY_FILTERS)

  // Importations retenues par les filtres d'en-tête (date, statut, fournisseur, mode)
  const enTete = useMemo(() => {
    if (!importations) return []
    return importations.filter((i) => importationMatcheEnTete(i, filters))
  }, [importations, filters])

  // Vue « Importations » : en-têtes dont au moins une ligne matche plateforme/article
  const filtered = useMemo(() => {
    return enTete.filter((i) => importationMatcheLignes(i, filters))
  }, [enTete, filters])

  // Vue « Lignes » : une ligne = un article importé, filtrée INDIVIDUELLEMENT.
  const lignes = useMemo(() => {
    const rows: { importation: Importation; ligne: LigneImportation | null }[] = []
    for (const i of enTete) {
      const ls = i.lignesImportation?.length ? i.lignesImportation : []
      if (ls.length === 0) {
        if (filters.plateformeId || filters.commandeId || filters.article.trim()) {
          if (importationMatcheLignes(i, filters)) rows.push({ importation: i, ligne: null })
        } else {
          rows.push({ importation: i, ligne: null })
        }
        continue
      }
      for (const l of ls) {
        if (ligneMatcheFiltres(l, filters)) {
          rows.push({ importation: i, ligne: l })
        }
      }
    }
    return rows
  }, [enTete, filters])

  const paginationImportations = useClientPagination(filtered)
  const paginationLignes = useClientPagination(lignes)

  // ── Colonnes tableau en-têtes ──
  const columns = useMemo<ColDef<Importation>[]>(
    () => [
      {
        key: 'reference',
        header: 'Référence',
        cardPrimary: true,
        cell: (i) => (
          <Link href={`/importations/${i.id}`} className="font-mono font-medium hover:underline">
            {i.referenceImportation}
          </Link>
        ),
      },
      {
        key: 'fournisseur',
        header: 'Source',
        cardPrimary: true,
        cell: (i) => (
          <span>
            {i.plateformeId
              ? `${i.plateforme?.nom ?? `#${i.plateformeId}`} (plateforme)`
              : i.fournisseur?.nomEntreprise ?? (i.fournisseurId ? `#${i.fournisseurId}` : '—')}
          </span>
        ),
      },
      {
        key: 'mode',
        header: 'Mode',
        cell: (i) => (
          <span className="text-sm text-muted-foreground">
            {MODE_EXPEDITION[i.modeExpedition] ?? String(i.modeExpedition)}
          </span>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        cardPrimary: true,
        cell: (i) => <StatutBadge statut={i.statut} />,
      },
      {
        key: 'montant',
        header: 'Montant',
        cardPrimary: true,
        headerClassName: 'text-right',
        cell: (i) => (
          <span className="font-mono">
            {Number(i.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            {i.devise ? ` ${i.devise}` : ''}
          </span>
        ),
      },
      {
        key: 'dateReception',
        header: 'Réception prévue',
        cell: (i) => (
          <span className="text-sm text-muted-foreground">
            {fmtDate(i.dateReceptionPrevue) || '—'}
          </span>
        ),
      },
      {
        key: 'lignes',
        header: 'Lignes',
        headerClassName: 'text-right',
        cell: (i) => (
          <span className="tabular-nums text-muted-foreground">
            {i.lignesImportation?.length ?? 0}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cardPrimary: true,
        headerClassName: 'w-[100px]',
        cell: (i) => {
          const canDelete = i.statut < 2
          return (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" asChild title="Voir">
                <Link href={`/importations/${i.id}`}>
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
              <PermissionGate module="importations" mode="write">
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      title={canDelete ? 'Supprimer' : 'Suppression impossible (validée ou reçue)'}
                      disabled={!canDelete || deleteMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                  title="Supprimer cette importation ?"
                  description="Cette action est irréversible."
                  onConfirm={() => deleteMutation.mutate(i.id)}
                />
              </PermissionGate>
            </div>
          )
        },
      },
    ],
    [deleteMutation],
  )

  // ── Colonnes tableau lignes (façon Excel) ──
  const ligneColumns = useMemo<ColDef<{ importation: Importation; ligne: LigneImportation | null }>[]>(
    () => [
      {
        key: 'reference',
        header: 'N° Importation',
        cardPrimary: true,
        cell: ({ importation }) => (
          <Link href={`/importations/${importation.id}`} className="font-mono font-medium hover:underline">
            {importation.referenceImportation}
          </Link>
        ),
      },
      {
        key: 'dateReception',
        header: 'Réception prévue',
        cardPrimary: true,
        cell: ({ importation }) => (
          <span className="text-sm">{fmtDate(importation.dateReceptionPrevue) || '—'}</span>
        ),
      },
      {
        key: 'article',
        header: 'Article',
        cardPrimary: true,
        cell: ({ ligne }) => (
          <span>{ligne?.article?.designation ?? '—'}</span>
        ),
      },
      {
        key: 'designation',
        header: 'Désignation / Réf.',
        cell: ({ ligne }) => (
          <span className="text-sm text-muted-foreground">
            {ligne?.article?.reference ?? '—'}
          </span>
        ),
      },
      {
        key: 'caracteristiques',
        header: 'Couleur / Dim. / Nature',
        cell: ({ ligne }) => (
          <span className="text-sm text-muted-foreground">
            {[ligne?.couleur, ligne?.dimension, ligne?.nature].filter(Boolean).join(' · ') || '—'}
          </span>
        ),
      },
      {
        key: 'unite',
        header: 'Unité',
        cell: ({ ligne }) => (
          <span className="text-sm text-muted-foreground">{ligne?.unite ?? '—'}</span>
        ),
      },
      {
        key: 'quantite',
        header: 'Quantité',
        cardPrimary: true,
        headerClassName: 'text-right',
        cell: ({ ligne }) => (
          <span className="tabular-nums">{Number(ligne?.quantite ?? 0)}</span>
        ),
      },
      {
        key: 'prixUnitaire',
        header: 'Prix unitaire',
        headerClassName: 'text-right',
        cell: ({ ligne }) => (
          <span className="tabular-nums">
            {Number(ligne?.prixUnitaire ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'montantLigne',
        header: 'Montant',
        headerClassName: 'text-right',
        cell: ({ ligne }) => (
          <span className="tabular-nums">
            {Number(ligne?.montantLigne ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'plateforme',
        header: 'Plateforme',
        cardPrimary: true,
        cell: ({ ligne }) => (
          <span className="text-sm">
            {ligne ? (plateformeDeLaLigne(ligne, plateformes) ?? '—') : '—'}
          </span>
        ),
      },
      {
        key: 'commandeDestinee',
        header: 'Commande destinée',
        cell: ({ ligne }) => (
          <span className="text-sm text-muted-foreground">
            {libelleCommande(ligne?.commandeClientId ?? null, commandes) ?? '—'}
          </span>
        ),
      },
      {
        key: 'mode',
        header: 'Mode expédition',
        cell: ({ importation }) => (
          <span className="text-sm text-muted-foreground">
            {MODE_EXPEDITION[importation.modeExpedition] ?? String(importation.modeExpedition)}
          </span>
        ),
      },
      {
        key: 'creePar',
        header: 'Créé par',
        cell: ({ importation }) => (
          <span className="text-sm text-muted-foreground">
            {importation.creePar ?? '—'}
          </span>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        cell: ({ importation }) => <StatutBadge statut={importation.statut} />,
      },
    ],
    [plateformes, commandes],
  )

  // ── Export CSV (par ligne, colonnes Excel) ──
  const handleExport = () => {
    const rows = lignes.map(({ importation, ligne }) => ({
      'N° Importation': importation.referenceImportation,
      'Date importation': fmtDate(importation.dateImportation),
      'Réception prévue': fmtDate(importation.dateReceptionPrevue),
      'Réception réelle': fmtDate(importation.dateReceptionReelle),
      Source: importation.plateformeId
        ? `${importation.plateforme?.nom ?? `#${importation.plateformeId}`} (plateforme)`
        : importation.fournisseur?.nomEntreprise ?? '',
      Article: ligne?.article?.designation ?? '',
      'Désignation / Réf.': ligne?.article?.reference ?? '',
      Couleur: ligne?.couleur ?? '',
      Dimension: ligne?.dimension ?? '',
      Nature: ligne?.nature ?? '',
      Unité: ligne?.unite ?? '',
      Quantité: ligne?.quantite ?? 0,
      'Prix unitaire': ligne?.prixUnitaire ?? 0,
      'Montant ligne': ligne?.montantLigne ?? 0,
      Devise: ligne?.devise ?? importation.devise ?? 'EUR',
      Plateforme: ligne ? (plateformeDeLaLigne(ligne, plateformes) ?? '') : '',
      'Commande destinée': libelleCommande(ligne?.commandeClientId ?? null, commandes) ?? '',
      'Mode expédition': MODE_EXPEDITION[importation.modeExpedition] ?? String(importation.modeExpedition),
      'Créé par': importation.creePar ?? '',
      Statut: STATUT_IMPORTATION[importation.statut] ?? String(importation.statut),
    }))
    const suffix =
      filters.dateDebut || filters.dateFin
        ? `_${filters.dateDebut || 'debut'}_${filters.dateFin || 'fin'}`
        : '_tous'
    exportCsv(rows, `importations${suffix}.csv`)
  }

  // Totaux (pour la barre résumé)
  const totalLignes = lignes.reduce((s, r) => s + Number(r.ligne?.quantite ?? 0), 0)
  const totalMontant = filtered.reduce((s, i) => s + Number(i.montantTotal ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Importations"
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExport} disabled={lignes.length === 0}>
              <Download className="size-4" />
              Exporter CSV
            </Button>
            <PermissionGate module="importations" mode="write">
              <Button size="sm" asChild>
                <Link href="/importations/nouveau">
                  <Plus className="size-4" />
                  Nouvelle importation
                </Link>
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {/* ── Filtres combinables ── */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-4 p-4">
          <div className="grid gap-1.5">
            <Label>Date début</Label>
            <Input
              type="date"
              value={filters.dateDebut}
              onChange={(e) => setFilter('dateDebut', e.target.value)}
              className="w-40"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Date fin</Label>
            <Input
              type="date"
              value={filters.dateFin}
              onChange={(e) => setFilter('dateFin', e.target.value)}
              className="w-40"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Statut</Label>
            <Select value={filters.statut} onValueChange={(v) => setFilter('statut', v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {Object.entries(STATUT_IMPORTATION).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Mode expédition</Label>
            <Select value={filters.modeExpedition} onValueChange={(v) => setFilter('modeExpedition', v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les modes</SelectItem>
                {Object.entries(MODE_EXPEDITION).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Fournisseur</Label>
            <Select
              value={filters.fournisseurId}
              onValueChange={(v) => setFilter('fournisseurId', v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les fournisseurs</SelectItem>
                {fournisseurs?.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.nomEntreprise}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Plateforme</Label>
            <Select
              value={filters.plateformeId}
              onValueChange={(v) => setFilter('plateformeId', v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les plateformes</SelectItem>
                {plateformes?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Commande</Label>
            <div className="w-52">
              <CommandeSelect
                value={filters.commandeId ? Number(filters.commandeId) : null}
                onChange={(id) => setFilter('commandeId', id ? String(id) : '')}
                commandes={commandes ?? []}
                placeholder="Toutes les commandes — rechercher…"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Article / Réf.</Label>
            <Input
              placeholder="bobine, bouton…"
              value={filters.article}
              onChange={(e) => setFilter('article', e.target.value)}
              className="w-44"
            />
          </div>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="size-3.5" />
              Réinitialiser
            </Button>
          )}
        </div>
      </Card>

      {/* ── Bandeau résumé ── */}
      <div className="mb-4 flex flex-wrap items-center gap-6 rounded-lg border bg-muted/40 px-5 py-3 text-sm">
        <span>
          <span className="text-2xl font-bold">{filtered.length}</span>
          <span className="ml-1 text-muted-foreground">importation(s)</span>
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          <span className="text-2xl font-bold">{lignes.length}</span>
          <span className="ml-1 text-muted-foreground">ligne(s)</span>
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          <span className="text-2xl font-bold">{totalLignes}</span>
          <span className="ml-1 text-muted-foreground">quantité(s)</span>
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          <span className="text-2xl font-bold">
            {totalMontant.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
          </span>
          <span className="ml-1 text-muted-foreground">montant total</span>
        </span>
      </div>

      <Tabs defaultValue="importations">
        <div className="mb-4 overflow-x-auto">
          <TabsList variant="line">
            <TabsTrigger value="importations">
              <Table2 className="size-4" />
              Importations ({filtered.length})
            </TabsTrigger>
            <TabsTrigger value="lignes">
              <Rows3 className="size-4" />
              Lignes / articles ({lignes.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="importations">
          <ResponsiveTable
            columns={columns}
            data={paginationImportations.pageItems}
            keyExtractor={(i) => i.id}
            isLoading={isLoading}
            emptyText="Aucune importation trouvée."
          />
          <PaginationBar
            {...paginationImportations}
            label="importations"
          />
        </TabsContent>

        <TabsContent value="lignes">
          <ResponsiveTable
            columns={ligneColumns}
            data={paginationLignes.pageItems}
            keyExtractor={(r) => (r.ligne ? `l${r.ligne.id}` : `i${r.importation.id}`)}
            isLoading={isLoading}
            emptyText="Aucune ligne trouvée."
          />
          <PaginationBar
            {...paginationLignes}
            label="lignes"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
