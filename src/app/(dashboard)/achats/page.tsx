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
import { useGetAchats, useDeleteAchat } from '@/hooks/use-achats'
import { useGetFournisseurs } from '@/hooks/use-fournisseurs'
import { useGetPlateformes } from '@/hooks/use-plateformes'
import { useGetCommandes } from '@/hooks/use-commandes'
import { STATUT_ACHAT } from '@/types/fournisseur'
import type { Achat, LigneAchat } from '@/types/achat'
import type { CommandeClient } from '@/types/commande'

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
      {STATUT_ACHAT[statut] ?? String(statut)}
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
  fournisseurId: string
  plateformeId: string
  commandeId: string
  article: string
}

const EMPTY_FILTERS: Filters = {
  dateDebut: '',
  dateFin: '',
  statut: 'tous',
  fournisseurId: '',
  plateformeId: '',
  commandeId: '',
  article: '',
}

// La plateforme d'une ligne : dès que le contexte Plateforme est renseigné,
// quel que soit le niveau effectif de destination (Commande / Marque / Plateforme).
function plateformeDeLaLigne(l: LigneAchat, plateformes: { id: number; nom: string }[] | undefined) {
  if (l.plateformeId) {
    return plateformes?.find((p) => p.id === l.plateformeId)?.nom ?? `Plf #${l.plateformeId}`
  }
  return null
}

function plateformeDeLAchat(a: Achat) {
  return a.commandeClient?.client?.plateforme?.nom ?? null
}

function ligneMatchePlateforme(
  l: LigneAchat,
  a: Achat,
  plateformeId: string,
): boolean {
  if (!plateformeId) return true
  const pid = Number(plateformeId)
  if (l.plateformeId === pid) return true
  if (!l.plateformeId && a.commandeClient?.client?.plateforme?.id === pid) return true
  return false
}

function ligneMatcheCommande(l: LigneAchat, a: Achat, commandeId: string): boolean {
  if (!commandeId) return true
  const cid = Number(commandeId)
  if (l.commandeClientId === cid) return true
  return !l.commandeClientId && a.commandeClientId === cid
}

function ligneMatcheArticle(l: LigneAchat, terme: string): boolean {
  if (!terme.trim()) return true
  const t = terme.trim().toLowerCase()
  return (
    (l.article?.designation?.toLowerCase().includes(t) ?? false) ||
    (l.article?.reference?.toLowerCase().includes(t) ?? false) ||
    (l.couleur?.toLowerCase().includes(t) ?? false) ||
    (l.taille?.toLowerCase().includes(t) ?? false) ||
    (l.dimension?.toLowerCase().includes(t) ?? false)
  )
}

// Libellé d'une commande pour un id donné : les utilisateurs identifient une commande
// par son NOM (titre de la commande, sinon le client) — le numéro reste en secours.
// Même logique partout : colonnes « Commande destinée », exports CSV et pages détail.
function libelleCommande(
  id: number | null | undefined,
  commandes: CommandeClient[] | undefined,
): string | null {
  const c = commandes?.find((c) => c.id === id)
  if (!c) return id ? `#${id}` : null
  const nom = c.titreCommande || c.client?.nom || null
  return nom ? `${nom} (${c.numeroCommande})` : c.numeroCommande
}

// Commande destinataire d'une ligne : celle de la ligne, sinon celle de l'en-tête
// (héritage du niveau Commande). Lecture seule — aucune écriture sur l'entité Achat.
function commandeIdDeLaLigne(l: LigneAchat | null, a: Achat): number | null {
  return l?.commandeClientId ?? a.commandeClientId
}

// Vue en-têtes : agrège l'en-tête + les lignes (ids distincts). Une seule → son
// libellé ; plusieurs → « N commandes ».
function commandeDestineeDeLAchat(
  a: Achat,
  commandes: CommandeClient[] | undefined,
): string | null {
  const ids = new Set<number>()
  if (a.commandeClientId) ids.add(a.commandeClientId)
  for (const l of a.lignesAchat ?? []) {
    if (l.commandeClientId) ids.add(l.commandeClientId)
  }
  if (ids.size === 0) return null
  if (ids.size === 1) return libelleCommande(ids.values().next().value, commandes)
  return `${ids.size} commandes`
}

// Filtres d'EN-TÊTE uniquement (date, statut, fournisseur) — s'appliquent à l'achat.
function achatMatcheEnTete(a: Achat, f: Filters): boolean {
  const d = a.dateAchat?.slice(0, 10) ?? ''
  if (f.dateDebut && d < f.dateDebut) return false
  if (f.dateFin && d > f.dateFin) return false
  if (f.statut !== 'tous' && a.statut !== Number(f.statut)) return false
  if (f.fournisseurId && a.fournisseurId !== Number(f.fournisseurId)) return false
  if (f.commandeId) {
    const cid = Number(f.commandeId)
    const match =
      a.commandeClientId === cid ||
      (a.lignesAchat?.some((l) => l.commandeClientId === cid) ?? false)
    if (!match) return false
  }
  return true
}

// Une LIGNE matche-t-elle les filtres plateforme + commande + article ?
function ligneMatcheFiltres(
  l: LigneAchat,
  a: Achat,
  f: Filters,
): boolean {
  if (f.plateformeId && !ligneMatchePlateforme(l, a, f.plateformeId)) return false
  if (f.commandeId && !ligneMatcheCommande(l, a, f.commandeId)) return false
  if (f.article.trim() && !ligneMatcheArticle(l, f.article)) return false
  return true
}

// L'achat (vue en-têtes) est retenu s'il a au moins une ligne qui matche plateforme/article,
// ou (achat sans lignes) si son en-tête matche via la plateforme de la commande liée.
function achatMatcheLignes(a: Achat, f: Filters): boolean {
  const aUnArticle = a.lignesAchat?.length > 0

  if (f.plateformeId) {
    if (aUnArticle) {
      if (!a.lignesAchat.some((l) => ligneMatchePlateforme(l, a, f.plateformeId))) return false
    } else if (a.commandeClient?.client?.plateforme?.id !== Number(f.plateformeId)) {
      return false
    }
  }

  if (f.article.trim()) {
    if (aUnArticle) {
      if (!a.lignesAchat.some((l) => ligneMatcheArticle(l, f.article))) return false
    } else if (
      !a.numeroAchat.toLowerCase().includes(f.article.trim().toLowerCase()) &&
      !(a.fournisseur?.nomEntreprise?.toLowerCase().includes(f.article.trim().toLowerCase()) ?? false)
    ) {
      return false
    }
  }

  return true
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AchatsPage() {
  const { data: achats, isLoading } = useGetAchats()
  const deleteMutation = useDeleteAchat()
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
    filters.fournisseurId ||
    filters.plateformeId ||
    filters.commandeId ||
    filters.article.trim()

  const resetFilters = () => setFilters(EMPTY_FILTERS)

  // Achats retenus par les filtres d'en-tête (date, statut, fournisseur, commande)
  const achatsEnTete = useMemo(() => {
    if (!achats) return []
    return achats.filter((a) => achatMatcheEnTete(a, filters))
  }, [achats, filters])

  // Vue « Achats » : en-têtes dont au moins une ligne (ou l'en-tête sans lignes) matche plateforme/article
  const filtered = useMemo(() => {
    return achatsEnTete.filter((a) => achatMatcheLignes(a, filters))
  }, [achatsEnTete, filters])

  // Vue « Lignes » : une ligne = un article acheté. Chaque ligne est filtrée INDIVIDUELLEMENT
  // (plateforme + article), indépendamment des autres lignes de son achat.
  const lignes = useMemo(() => {
    const rows: { achat: Achat; ligne: LigneAchat | null }[] = []
    for (const a of achatsEnTete) {
      const ls = a.lignesAchat?.length ? a.lignesAchat : []
      if (ls.length === 0) {
        // Achat sans lignes : on ne le montre que si les filtres de lignes ne l'excluent pas.
        if (filters.plateformeId || filters.commandeId || filters.article.trim()) {
          if (achatMatcheLignes(a, filters)) rows.push({ achat: a, ligne: null })
        } else {
          rows.push({ achat: a, ligne: null })
        }
        continue
      }
      for (const l of ls) {
        if (ligneMatcheFiltres(l, a, filters)) {
          rows.push({ achat: a, ligne: l })
        }
      }
    }
    return rows
  }, [achatsEnTete, filters])

  const paginationAchats = useClientPagination(filtered)
  const paginationLignes = useClientPagination(lignes)

  // ── Colonnes tableau en-têtes ──
  const columns = useMemo<ColDef<Achat>[]>(
    () => [
      {
        key: 'numeroAchat',
        header: 'Numéro',
        cardPrimary: true,
        cell: (a) => <span className="font-mono font-medium">{a.numeroAchat}</span>,
      },
      {
        key: 'fournisseur',
        header: 'Fournisseur',
        cardPrimary: true,
        cell: (a) => (
          <span>{a.fournisseur?.nomEntreprise ?? `#${a.fournisseurId}`}</span>
        ),
      },
      {
        key: 'commande',
        header: 'Commande',
        cell: (a) => (
          <span className="text-sm text-muted-foreground">
            {commandeDestineeDeLAchat(a, commandes) ?? '—'}
          </span>
        ),
      },
      {
        key: 'plateforme',
        header: 'Plateforme',
        cell: (a) => (
          <span className="text-sm text-muted-foreground">
            {plateformeDeLAchat(a) ?? '—'}
          </span>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        cardPrimary: true,
        cell: (a) => <StatutBadge statut={a.statut} />,
      },
      {
        key: 'montant',
        header: 'Montant',
        cardPrimary: true,
        headerClassName: 'text-right',
        cell: (a) => (
          <span className="font-mono">
            {Number(a.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            {a.devise ? ` ${a.devise}` : ''}
          </span>
        ),
      },
      {
        key: 'dateLivraison',
        header: 'Livraison prévue',
        cell: (a) => (
          <span className="text-sm text-muted-foreground">
            {fmtDate(a.dateLivraisonPrevue) || '—'}
          </span>
        ),
      },
      {
        key: 'lignes',
        header: 'Lignes',
        headerClassName: 'text-right',
        cell: (a) => (
          <span className="tabular-nums text-muted-foreground">
            {a.lignesAchat?.length ?? 0}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cardPrimary: true,
        headerClassName: 'w-[100px]',
        cell: (a) => {
          const canDelete = a.statut < 2
          return (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" asChild title="Voir">
                <Link href={`/achats/${a.id}`}>
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
              <PermissionGate module="achats" mode="write">
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      title={canDelete ? 'Supprimer' : 'Suppression impossible (confirmé ou livré)'}
                      disabled={!canDelete || deleteMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                  title="Supprimer cet achat ?"
                  description="Cette action est irréversible."
                  onConfirm={() => deleteMutation.mutate(a.id)}
                />
              </PermissionGate>
            </div>
          )
        },
      },
    ],
    [deleteMutation, commandes],
  )

  // ── Colonnes tableau lignes (façon Excel) ──
  const ligneColumns = useMemo<ColDef<{ achat: Achat; ligne: LigneAchat | null }>[]>(
    () => [
      {
        key: 'numeroAchat',
        header: 'N° Achat',
        cardPrimary: true,
        cell: ({ achat }) => (
          <Link href={`/achats/${achat.id}`} className="font-mono font-medium hover:underline">
            {achat.numeroAchat}
          </Link>
        ),
      },
      {
        key: 'dateLivraison',
        header: 'Date livraison',
        cardPrimary: true,
        cell: ({ achat }) => (
          <span className="text-sm">{fmtDate(achat.dateLivraisonPrevue) || '—'}</span>
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
        header: 'Couleur / Taille / Dim.',
        cell: ({ ligne }) => (
          <span className="text-sm text-muted-foreground">
            {[ligne?.couleur, ligne?.taille, ligne?.dimension].filter(Boolean).join(' · ') || '—'}
          </span>
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
        cell: ({ achat, ligne }) => (
          <span className="text-sm">
            {ligne
              ? (plateformeDeLaLigne(ligne, plateformes) ?? plateformeDeLAchat(achat) ?? '—')
              : (plateformeDeLAchat(achat) ?? '—')}
          </span>
        ),
      },
      {
        key: 'commandeDestinee',
        header: 'Commande destinée',
        cell: ({ achat, ligne }) => (
          <span className="text-sm text-muted-foreground">
            {libelleCommande(commandeIdDeLaLigne(ligne, achat), commandes) ?? '—'}
          </span>
        ),
      },
      {
        key: 'commandePar',
        header: 'Commandé par',
        cell: ({ achat }) => (
          <span className="text-sm text-muted-foreground">
            {achat.creePar ?? '—'}
          </span>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        cell: ({ achat }) => <StatutBadge statut={achat.statut} />,
      },
    ],
    [plateformes, commandes],
  )

  // ── Export CSV (par ligne, colonnes Excel) ──
  const handleExport = () => {
    const rows = lignes.map(({ achat, ligne }) => {
      const plateforme = ligne
        ? (plateformeDeLaLigne(ligne, plateformes) ?? plateformeDeLAchat(achat) ?? '')
        : (plateformeDeLAchat(achat) ?? '')
      return {
        'N° Achat': achat.numeroAchat,
        'Date achat': achat.dateAchat ? fmtDate(achat.dateAchat) : '',
        'Date livraison': achat.dateLivraisonPrevue ? fmtDate(achat.dateLivraisonPrevue) : '',
        Fournisseur: achat.fournisseur?.nomEntreprise ?? '',
        Article: ligne?.article?.designation ?? '',
        'Désignation / Réf.': ligne?.article?.reference ?? '',
        Couleur: ligne?.couleur ?? '',
        Taille: ligne?.taille ?? '',
        Dimension: ligne?.dimension ?? '',
        Quantité: ligne?.quantite ?? 0,
        'Prix unitaire': ligne?.prixUnitaire ?? 0,
        'Montant ligne': ligne?.montantLigne ?? 0,
        Devise: ligne?.devise ?? achat.devise ?? 'EUR',
        Plateforme: plateforme,
        'Commande destinée': libelleCommande(commandeIdDeLaLigne(ligne, achat), commandes) ?? '',
        'Commandé par': achat.creePar ?? '',
        Statut: STATUT_ACHAT[achat.statut] ?? String(achat.statut),
      }
    })
    const suffix =
      filters.dateDebut || filters.dateFin
        ? `_${filters.dateDebut || 'debut'}_${filters.dateFin || 'fin'}`
        : '_tous'
    exportCsv(rows, `achats${suffix}.csv`)
  }

  // Totaux (pour la barre résumé)
  const totalLignes = lignes.reduce((s, r) => s + Number(r.ligne?.quantite ?? 0), 0)
  const totalMontant = filtered.reduce((s, a) => s + Number(a.montantTotal ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Achats"
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExport} disabled={lignes.length === 0}>
              <Download className="size-4" />
              Exporter CSV
            </Button>
            <PermissionGate module="achats" mode="write">
              <Button size="sm" asChild>
                <Link href="/achats/nouveau">
                  <Plus className="size-4" />
                  Nouvel achat
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
                {Object.entries(STATUT_ACHAT).map(([k, v]) => (
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
            <Select
              value={filters.commandeId}
              onValueChange={(v) => setFilter('commandeId', v)}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les commandes</SelectItem>
                {commandes?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.numeroCommande}
                    {c.titreCommande ? ` · ${c.titreCommande}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <span className="ml-1 text-muted-foreground">achat(s)</span>
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

      <Tabs defaultValue="achats">
        <div className="mb-4 overflow-x-auto">
          <TabsList variant="line">
            <TabsTrigger value="achats">
              <Table2 className="size-4" />
              Achats ({filtered.length})
            </TabsTrigger>
            <TabsTrigger value="lignes">
              <Rows3 className="size-4" />
              Lignes / articles ({lignes.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="achats">
          <ResponsiveTable
            columns={columns}
            data={paginationAchats.pageItems}
            keyExtractor={(a) => a.id}
            isLoading={isLoading}
            emptyText="Aucun achat trouvé."
          />
          <PaginationBar
            {...paginationAchats}
            label="achats"
          />
        </TabsContent>

        <TabsContent value="lignes">
          <ResponsiveTable
            columns={ligneColumns}
            data={paginationLignes.pageItems}
            keyExtractor={(r) => (r.ligne ? `l${r.ligne.id}` : `a${r.achat.id}`)}
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
