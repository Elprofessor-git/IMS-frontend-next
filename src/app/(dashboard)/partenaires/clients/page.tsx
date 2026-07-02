'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, UserX, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ResponsiveTable, type ColDef } from '@/components/ui/responsive-table'
import { useGetClients, useDeleteClient, useDesactiverClient } from '@/hooks/use-clients'
import { useGetPlateformes } from '@/hooks/use-plateformes'
import type { Client } from '@/types/client'

export default function ClientsPage() {
  const [filterPlateforme, setFilterPlateforme] = useState<string>('all')

  const { data: clients, isLoading } = useGetClients()
  const { data: plateformes } = useGetPlateformes()
  const deleteMutation    = useDeleteClient()
  const desactiverMutation = useDesactiverClient()

  const filtered =
    filterPlateforme === 'all'
      ? clients
      : clients?.filter((c) => c.plateformeId === Number(filterPlateforme))

  const columns = useMemo<ColDef<Client>[]>(
    () => [
      {
        key: 'nom',
        header: 'Nom',
        cardPrimary: true,
        cell: (c) => (
          <span className="font-medium">
            {c.nom}
            {c.prenom ? ` ${c.prenom}` : ''}
          </span>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        cell: (c) => (
          <span className="text-muted-foreground">{c.email}</span>
        ),
      },
      {
        key: 'entreprise',
        header: 'Entreprise',
        cell: (c) => (
          <span className="text-muted-foreground">{c.nomEntreprise ?? '—'}</span>
        ),
      },
      {
        key: 'plateforme',
        header: 'Plateforme',
        cardPrimary: true,
        cell: (c) =>
          c.plateforme ? (
            <Badge variant="outline">{c.plateforme.nom}</Badge>
          ) : (
            <span>—</span>
          ),
      },
      {
        key: 'ville',
        header: 'Ville',
        cell: (c) => (
          <span className="text-muted-foreground">{c.ville ?? '—'}</span>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        cardPrimary: true,
        cell: (c) => (
          <Badge variant={c.estActif ? 'default' : 'secondary'}>
            {c.estActif ? 'Actif' : 'Inactif'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cardPrimary: true,
        headerClassName: 'w-[140px]',
        cell: (c) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" asChild title="Historique">
              <Link href={`/partenaires/clients/${c.id}?tab=historique`}>
                <History className="size-3.5" />
              </Link>
            </Button>
            <PermissionGate module="clients" mode="write">
              <Button variant="ghost" size="icon-sm" asChild title="Modifier">
                <Link href={`/partenaires/clients/${c.id}`}>
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
                title={`Désactiver « ${c.nom} » ?`}
                description="Le client sera masqué des listes mais conservé en base."
                confirmLabel="Désactiver"
                onConfirm={() => desactiverMutation.mutate(c.id)}
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
                title={`Supprimer « ${c.nom} » ?`}
                description="Bloqué par le serveur si le client a des commandes. Préférez la désactivation."
                onConfirm={() => deleteMutation.mutate(c.id)}
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
        title="Clients"
        action={
          <PermissionGate module="clients" mode="write">
            <Button asChild>
              <Link href="/partenaires/clients/nouveau">
                <Plus className="size-4" />
                Nouveau client
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Filtrer par plateforme :</span>
        <Select value={filterPlateforme} onValueChange={setFilterPlateforme}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les plateformes</SelectItem>
            {plateformes?.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered?.length ?? 0} client(s)
        </span>
      </div>

      <ResponsiveTable
        columns={columns}
        data={filtered ?? []}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyText="Aucun client trouvé."
      />
    </div>
  )
}
