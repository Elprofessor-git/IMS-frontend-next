'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, UserX, History, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ResponsiveTable, type ColDef } from '@/components/ui/responsive-table'
import {
  useGetFournisseurs,
  useSearchFournisseurs,
  useDeleteFournisseur,
  useDesactiverFournisseur,
} from '@/hooks/use-fournisseurs'
import type { Fournisseur } from '@/types/fournisseur'

export default function FournisseursPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const isSearching = debouncedSearch.length >= 2
  const { data: allFournisseurs, isLoading: loadingAll } = useGetFournisseurs()
  const { data: searchResults, isLoading: loadingSearch } = useSearchFournisseurs(
    debouncedSearch,
    isSearching,
  )

  const fournisseurs = isSearching ? searchResults : allFournisseurs
  const isLoading = isSearching ? loadingSearch : loadingAll

  const deleteMutation     = useDeleteFournisseur()
  const desactiverMutation = useDesactiverFournisseur()

  const columns = useMemo<ColDef<Fournisseur>[]>(
    () => [
      {
        key: 'nomEntreprise',
        header: 'Entreprise',
        cardPrimary: true,
        cell: (f) => <span className="font-medium">{f.nomEntreprise}</span>,
      },
      {
        key: 'personneContact',
        header: 'Contact',
        cell: (f) => (
          <span className="text-muted-foreground">{f.personneContact ?? '—'}</span>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        cell: (f) => (
          <span className="text-muted-foreground">{f.email}</span>
        ),
      },
      {
        key: 'telephone',
        header: 'Téléphone',
        cell: (f) => (
          <span className="text-muted-foreground">{f.telephone ?? '—'}</span>
        ),
      },
      {
        key: 'ville',
        header: 'Ville',
        cell: (f) => (
          <span className="text-muted-foreground">{f.ville ?? '—'}</span>
        ),
      },
      {
        key: 'delaiLivraison',
        header: 'Délai livraison',
        cell: (f) => (
          <span className="text-muted-foreground">{f.delaiLivraisonJours} j</span>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        cardPrimary: true,
        cell: (f) => (
          <Badge variant={f.estActif ? 'default' : 'secondary'}>
            {f.estActif ? 'Actif' : 'Inactif'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cardPrimary: true,
        headerClassName: 'w-[140px]',
        cell: (f) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" asChild title="Historique">
              <Link href={`/partenaires/fournisseurs/${f.id}?tab=historique`}>
                <History className="size-3.5" />
              </Link>
            </Button>
            <PermissionGate module="fournisseurs" mode="write">
              <Button variant="ghost" size="icon-sm" asChild title="Modifier">
                <Link href={`/partenaires/fournisseurs/${f.id}`}>
                  <Pencil className="size-3.5" />
                </Link>
              </Button>
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Désactiver"
                    disabled={desactiverMutation.isPending}
                  >
                    <UserX className="size-3.5" />
                  </Button>
                }
                title={`Désactiver « ${f.nomEntreprise} » ?`}
                description="Le fournisseur sera masqué des listes mais conservé en base."
                confirmLabel="Désactiver"
                onConfirm={() => desactiverMutation.mutate(f.id)}
              />
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
                title={`Supprimer « ${f.nomEntreprise} » ?`}
                description="Bloqué par le serveur si le fournisseur a des achats ou importations. Préférez la désactivation."
                onConfirm={() => deleteMutation.mutate(f.id)}
              />
            </PermissionGate>
          </div>
        ),
      },
    ],
    [deleteMutation, desactiverMutation],
  )

  return (
    <div>
      <PageHeader
        title="Fournisseurs"
        action={
          <PermissionGate module="fournisseurs" mode="write">
            <Button asChild>
              <Link href="/partenaires/fournisseurs/nouveau">
                <Plus className="size-4" />
                Nouveau fournisseur
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un fournisseur…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {fournisseurs?.length ?? 0} fournisseur(s)
        </span>
      </div>

      <ResponsiveTable
        columns={columns}
        data={fournisseurs ?? []}
        keyExtractor={(f) => f.id}
        isLoading={isLoading}
        emptyText={isSearching ? 'Aucun résultat pour cette recherche.' : 'Aucun fournisseur trouvé.'}
      />
    </div>
  )
}
