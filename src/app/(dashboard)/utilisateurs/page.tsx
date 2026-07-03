'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Plus, Trash2, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import {
  useGetUsers,
  useToggleUserActif,
  useDeleteUser,
  useAssignRole,
  useRegisterUser,
} from '@/hooks/use-users'
import { useGetRoles } from '@/hooks/use-roles'

const EMPTY_FORM = {
  nom: '',
  prenom: '',
  email: '',
  password: '',
  role: 'User',
}

export default function UtilisateursPage() {
  const { data: users, isLoading } = useGetUsers()
  const { data: roles } = useGetRoles()
  const toggleMutation = useToggleUserActif()
  const deleteMutation = useDeleteUser()
  const assignRoleMutation = useAssignRole()
  const registerMutation = useRegisterUser()
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function handleField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleOpenDialog() {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    registerMutation.mutate(
      {
        nom: form.nom,
        prenom: form.prenom || undefined,
        email: form.email,
        password: form.password,
        role: form.role,
      },
      {
        onSuccess: () => setDialogOpen(false),
      },
    )
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        action={
          <PermissionGate module="utilisateurs" mode="write">
            <Button size="sm" onClick={handleOpenDialog}>
              <Plus className="mr-1.5 size-4" />
              Ajouter un utilisateur
            </Button>
          </PermissionGate>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle personnalisé</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Membre depuis</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
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

            {!isLoading && users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucun utilisateur trouvé.
                </TableCell>
              </TableRow>
            )}

            {users?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.nom}
                  {u.prenom ? ` ${u.prenom}` : ''}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <PermissionGate
                    module="utilisateurs"
                    mode="write"
                    fallback={
                      u.nomRole ? (
                        <Badge variant="outline">{u.nomRole}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )
                    }
                  >
                    <Select
                      value={u.roleId?.toString() ?? '0'}
                      disabled={assignRoleMutation.isPending && pendingRoleId === u.id}
                      onValueChange={(val) => {
                        setPendingRoleId(u.id)
                        assignRoleMutation.mutate(
                          { id: u.id, roleId: val === '0' ? null : Number(val) },
                          { onSettled: () => setPendingRoleId(null) },
                        )
                      }}
                    >
                      <SelectTrigger className="h-7 w-44 text-xs">
                        <SelectValue placeholder="Aucun rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">
                          <span className="text-muted-foreground">Aucun rôle</span>
                        </SelectItem>
                        {roles?.map((r) => (
                          <SelectItem key={r.id} value={r.id.toString()}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PermissionGate>
                </TableCell>
                <TableCell>
                  <Badge variant={u.estActif ? 'default' : 'secondary'}>
                    {u.estActif ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(u.dateCreation).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <PermissionGate module="utilisateurs" mode="write">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" asChild title="Modifier">
                        <Link href={`/utilisateurs/${u.id}`}>
                          <Pencil className="size-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={u.estActif ? 'Désactiver' : 'Activer'}
                        disabled={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate({ id: u.id, estActif: !u.estActif })}
                      >
                        {u.estActif ? (
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
                        title={`Supprimer « ${u.nom} » ?`}
                        description="Cette action est irréversible. L'utilisateur ne pourra plus se connecter."
                        onConfirm={() => deleteMutation.mutate(u.id)}
                      />
                    </div>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={form.nom}
                  onChange={(e) => handleField('nom', e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  value={form.prenom}
                  onChange={(e) => handleField('prenom', e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleField('email', e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe temporaire *</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => handleField('password', e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Rôle système *</Label>
              <Select value={form.role} onValueChange={(v) => handleField('role', v)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="User">Utilisateur</SelectItem>
                  <SelectItem value="Admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={registerMutation.isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? 'Création…' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
