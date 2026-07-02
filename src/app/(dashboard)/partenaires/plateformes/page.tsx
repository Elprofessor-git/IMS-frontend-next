'use client'

import Link from 'next/link'
import { Plus, Pencil, Trash2, Globe, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useGetPlateformes, useDeletePlateforme } from '@/hooks/use-plateformes'

export default function PlateformesPage() {
  const { data: plateformes, isLoading } = useGetPlateformes()
  const deleteMutation = useDeletePlateforme()

  return (
    <div>
      <PageHeader
        title="Plateformes"
        action={
          <Button asChild>
            <Link href="/partenaires/plateformes/nouveau">
              <Plus className="size-4" />
              Nouvelle plateforme
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email contact</TableHead>
              <TableHead>Site web</TableHead>
              <TableHead className="text-center">Clients</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && plateformes?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucune plateforme. Créez-en une pour commencer.
                </TableCell>
              </TableRow>
            )}

            {plateformes?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-muted-foreground" />
                    {p.nom}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.contactEmail ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.siteWeb ? (
                    <a
                      href={p.siteWeb}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {p.siteWeb}
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="size-3.5 text-muted-foreground" />
                    <span>{p.clients.length}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={p.estActif ? 'default' : 'secondary'}>
                    {p.estActif ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href={`/partenaires/plateformes/${p.id}`}>
                        <Pencil className="size-3.5" />
                      </Link>
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      }
                      title={`Supprimer « ${p.nom} » ?`}
                      description={
                        p.clients.length > 0
                          ? `Cette plateforme a ${p.clients.length} client(s) associé(s). La suppression sera bloquée par le serveur.`
                          : 'Cette action est irréversible.'
                      }
                      onConfirm={() => deleteMutation.mutate(p.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
