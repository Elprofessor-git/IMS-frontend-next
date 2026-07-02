'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, UserX, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTable, type ColDef } from '@/components/ui/responsive-table'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import {
  useGetArticles,
  useSearchArticles,
  useDeleteArticle,
  useDesactiverArticle,
  useActiverArticle,
} from '@/hooks/use-articles'
import type { Article } from '@/types/article'

const PAGE_SIZE = 20

function stockLevel(article: Article) {
  const stocks = article.stocks ?? []
  const total  = stocks.reduce((sum, s) => sum + Number(s.quantite), 0)
  const dispo  = stocks.reduce(
    (sum, s) => sum + Number(s.quantite) - Number(s.quantiteReservee),
    0,
  )
  if (article.seuilCritique > 0 && total <= article.seuilCritique) return { dispo, level: 'critical' as const }
  if (article.seuilAlerte  > 0 && total <= article.seuilAlerte)   return { dispo, level: 'alert'    as const }
  return { dispo, level: 'ok' as const }
}

export default function ArticlesPage() {
  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter,  setCategoryFilter]  = useState('')
  const [page,            setPage]            = useState(1)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const isSearchMode = debouncedSearch.length >= 2

  const { data: paginated,     isLoading: loadingList   } = useGetArticles(page, PAGE_SIZE)
  const { data: searchResults, isLoading: loadingSearch } = useSearchArticles(
    debouncedSearch,
    isSearchMode,
  )

  const deleteMutation      = useDeleteArticle()
  const desactiverMutation  = useDesactiverArticle()
  const activerMutation     = useActiverArticle()

  const rawList: Article[] = isSearchMode ? (searchResults ?? []) : (paginated?.data ?? [])

  const displayed = categoryFilter.trim()
    ? rawList.filter((a) =>
        a.categorie?.toLowerCase().includes(categoryFilter.trim().toLowerCase()),
      )
    : rawList

  const isLoading  = isSearchMode ? loadingSearch : loadingList
  const totalPages = paginated?.totalPages ?? 1

  // ── Définition des colonnes ─────────────────────────────────────────────────

  const columns = useMemo<ColDef<Article>[]>(
    () => [
      {
        key: 'designation',
        header: 'Désignation',
        cardPrimary: true,
        cell: (a) => <span className="font-medium">{a.designation}</span>,
      },
      {
        key: 'reference',
        header: 'Référence',
        cell: (a) => (
          <span className="font-mono text-sm text-muted-foreground">{a.reference ?? '—'}</span>
        ),
      },
      {
        key: 'categorie',
        header: 'Catégorie',
        cell: (a) => <span className="text-muted-foreground">{a.categorie ?? '—'}</span>,
      },
      {
        key: 'unite',
        header: 'Unité',
        cell: (a) => <span className="text-muted-foreground">{a.unite ?? '—'}</span>,
      },
      {
        key: 'stock',
        header: 'Stock dispo',
        cardPrimary: true,
        cell: (a) => {
          const { dispo, level } = stockLevel(a)
          return (
            <div className="flex items-center gap-2">
              <span>{dispo}</span>
              {level === 'critical' && (
                <Badge variant="destructive" className="text-xs">Critique</Badge>
              )}
              {level === 'alert' && (
                <Badge className="border border-orange-200 bg-orange-100 text-xs text-orange-800">
                  Alerte
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        key: 'statut',
        header: 'Statut',
        cardPrimary: true,
        cell: (a) => (
          <Badge variant={a.estActif ? 'default' : 'secondary'}>
            {a.estActif ? 'Actif' : 'Inactif'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cardPrimary: true,
        headerClassName: 'w-[120px]',
        cell: (a) => (
          <PermissionGate module="articles" mode="write">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" asChild title="Modifier">
                <Link href={`/articles/${a.id}`}>
                  <Pencil className="size-3.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title={a.estActif ? 'Désactiver' : 'Activer'}
                disabled={desactiverMutation.isPending || activerMutation.isPending}
                onClick={() =>
                  a.estActif
                    ? desactiverMutation.mutate(a.id)
                    : activerMutation.mutate(a.id)
                }
              >
                {a.estActif ? (
                  <UserX className="size-3.5" />
                ) : (
                  <UserCheck className="size-3.5" />
                )}
              </Button>
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    title="Supprimer"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                }
                title={`Supprimer « ${a.designation} » ?`}
                description="Bloqué si l'article est utilisé dans un stock, achat, importation ou besoin."
                onConfirm={() => deleteMutation.mutate(a.id)}
              />
            </div>
          </PermissionGate>
        ),
      },
    ],
    [deleteMutation, desactiverMutation, activerMutation],
  )

  // ── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Articles"
        action={
          <PermissionGate module="articles" mode="write">
            <Button asChild>
              <Link href="/articles/nouveau">
                <Plus className="size-4" />
                Nouvel article
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher (désignation, référence…)"
          className="w-full sm:w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Input
          placeholder="Filtrer par catégorie"
          className="w-full sm:w-48"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">{displayed.length} article(s)</span>
      </div>

      <ResponsiveTable
        columns={columns}
        data={displayed}
        keyExtractor={(a) => a.id}
        isLoading={isLoading}
        emptyText="Aucun article trouvé."
      />

      {!isSearchMode && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} sur {totalPages} ({paginated?.totalCount ?? 0} articles)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Suivant
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
