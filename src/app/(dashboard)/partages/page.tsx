'use client'

import { Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { BoutonPartage } from '@/components/partage/bouton-partage'
import { useGetPartages, useRevoquerPartage } from '@/hooks/use-partage'
import {
  SHARE_SCOPE_LABEL,
  SHARE_SECTION_OPTIONS,
  type ShareLink,
} from '@/types/partage'

function libelleSections(mask: number): string {
  const actives = SHARE_SECTION_OPTIONS.filter((o) => (mask & o.value) === o.value).map(
    (o) => o.label,
  )
  return actives.length > 0 ? actives.join(', ') : '—'
}

function statutLien(l: ShareLink): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (l.revokedAtUtc) return { label: 'Révoqué', variant: 'destructive' }
  if (!l.actif) return { label: 'Expiré', variant: 'secondary' }
  if (l.maxUses != null && l.useCount >= l.maxUses)
    return { label: 'Saturé', variant: 'secondary' }
  return { label: 'Actif', variant: 'default' }
}

export default function PartagesPage() {
  const { data: liens, isLoading, isError } = useGetPartages()
  const revokeMutation = useRevoquerPartage()

  return (
    <div>
      <PageHeader
        title="Liens de partage"
        action={<BoutonPartage label="Nouveau lien" />}
      />

      <p className="mb-4 text-sm text-muted-foreground">
        Les liens donnent un accès public en lecture seule à un périmètre précis (stock,
        commandes, importations). Le jeton n&apos;est affiché qu&apos;à la création : seul son
        empreinte est conservée. Révoquer un lien le rend immédiatement inutilisable.
      </p>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Libellé</TableHead>
              <TableHead>Périmètre</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead>Expire le</TableHead>
              <TableHead>Ouvertures</TableHead>
              <TableHead>État</TableHead>
              <TableHead className="w-[90px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    title="Accès refusé"
                    description="Vous n'avez pas le droit de consulter les liens de partage."
                  />
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && liens?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    title="Aucun lien de partage"
                    description="Créez un lien pour partager un périmètre en lecture seule."
                  />
                </TableCell>
              </TableRow>
            )}

            {liens?.map((l) => {
              const statut = statutLien(l)
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.label ?? '—'}</TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted-foreground">
                      {SHARE_SCOPE_LABEL[l.scopeType] ?? '—'} ·{' '}
                    </span>
                    <span>{l.scopeLibelle}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {libelleSections(l.sections)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(l.expiresAtUtc).toLocaleString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.useCount}
                    {l.maxUses != null ? ` / ${l.maxUses}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statut.variant}>{statut.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {!l.revokedAtUtc && (
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            title="Révoquer"
                            disabled={revokeMutation.isPending}
                          >
                            <Ban className="size-3.5" />
                          </Button>
                        }
                        title="Révoquer ce lien ?"
                        description="Toute personne disposant du lien perdra immédiatement l'accès."
                        onConfirm={() => revokeMutation.mutate(l.id)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
