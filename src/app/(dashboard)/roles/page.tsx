'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ShieldCheck, Shield } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { useGetRoles, useCreateRole, useUpdateRole, useDeleteRole } from '@/hooks/use-roles'
import type { Role, CreateRolePayload } from '@/types/role'

const roleSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(50),
  description: z.string().max(500).nullable(),
  estAdministrateur: z.boolean(),
  peutGererStock: z.boolean(),
  peutGererCommandes: z.boolean(),
  peutGererTaches: z.boolean(),
  peutGererClients: z.boolean(),
  peutGererFournisseurs: z.boolean(),
  peutGererAchats: z.boolean(),
  peutGererImportations: z.boolean(),
  peutGererUtilisateurs: z.boolean(),
  peutGererMouvements: z.boolean(),
  peutValiderStock: z.boolean(),
  peutConfirmerAchats: z.boolean(),
  peutValiderImportations: z.boolean(),
})
type RoleSchema = z.infer<typeof roleSchema>

const PERM_MODULES = [
  { key: 'peutGererStock', label: 'Gérer le stock' },
  { key: 'peutGererCommandes', label: 'Gérer les commandes' },
  { key: 'peutGererTaches', label: 'Gérer les tâches' },
  { key: 'peutGererClients', label: 'Gérer les clients' },
  { key: 'peutGererFournisseurs', label: 'Gérer les fournisseurs' },
  { key: 'peutGererAchats', label: 'Gérer les achats' },
  { key: 'peutGererImportations', label: 'Gérer les importations' },
  { key: 'peutGererUtilisateurs', label: 'Gérer les utilisateurs' },
  { key: 'peutGererMouvements', label: 'Gérer les mouvements' },
] as const

const PERM_SPECIALES = [
  { key: 'peutValiderStock', label: 'Valider les entrées de stock' },
  { key: 'peutConfirmerAchats', label: 'Confirmer les achats' },
  { key: 'peutValiderImportations', label: 'Valider les importations' },
] as const

const DEFAULT_VALUES: RoleSchema = {
  name: '',
  description: null,
  estAdministrateur: false,
  peutGererStock: false,
  peutGererCommandes: false,
  peutGererTaches: false,
  peutGererClients: false,
  peutGererFournisseurs: false,
  peutGererAchats: false,
  peutGererImportations: false,
  peutGererUtilisateurs: false,
  peutGererMouvements: false,
  peutValiderStock: false,
  peutConfirmerAchats: false,
  peutValiderImportations: false,
}

function roleToSchema(r: Role): RoleSchema {
  return {
    name: r.name,
    description: r.description,
    estAdministrateur: r.estAdministrateur,
    peutGererStock: r.peutGererStock,
    peutGererCommandes: r.peutGererCommandes,
    peutGererTaches: r.peutGererTaches,
    peutGererClients: r.peutGererClients,
    peutGererFournisseurs: r.peutGererFournisseurs,
    peutGererAchats: r.peutGererAchats,
    peutGererImportations: r.peutGererImportations,
    peutGererUtilisateurs: r.peutGererUtilisateurs,
    peutGererMouvements: r.peutGererMouvements,
    peutValiderStock: r.peutValiderStock,
    peutConfirmerAchats: r.peutConfirmerAchats,
    peutValiderImportations: r.peutValiderImportations,
  }
}

function RoleDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: Role | null
}) {
  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RoleSchema>({
    resolver: zodResolver(roleSchema),
    defaultValues: editing ? roleToSchema(editing) : DEFAULT_VALUES,
  })

  const isAdmin = watch('estAdministrateur')

  const onSubmit = async (data: RoleSchema) => {
    const payload: CreateRolePayload = { ...data, description: data.description || null }
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    reset()
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Modifier le rôle' : 'Nouveau rôle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Nom du rôle <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...register('name')} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Administration</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="estAdministrateur"
                checked={isAdmin}
                onCheckedChange={(v) => setValue('estAdministrateur', !!v)}
              />
              <Label htmlFor="estAdministrateur" className="font-normal cursor-pointer">
                Administrateur — accès complet en lecture et écriture
              </Label>
            </div>
          </div>

          {!isAdmin && (
            <>
              <div className="space-y-3">
                <p className="text-sm font-medium">Modules</p>
                <div className="grid grid-cols-1 gap-2">
                  {PERM_MODULES.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={key}
                        checked={watch(key)}
                        onCheckedChange={(v) => setValue(key, !!v)}
                      />
                      <Label htmlFor={key} className="font-normal cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Permissions spéciales</p>
                <div className="grid grid-cols-1 gap-2">
                  {PERM_SPECIALES.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={key}
                        checked={watch(key)}
                        onCheckedChange={(v) => setValue(key, !!v)}
                      />
                      <Label htmlFor={key} className="font-normal cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function RolesPage() {
  const { data: roles, isLoading } = useGetRoles()
  const deleteMutation = useDeleteRole()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (role: Role) => {
    setEditing(role)
    setDialogOpen(true)
  }
  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  return (
    <div>
      <PageHeader
        title="Rôles"
        action={
          <PermissionGate module="roles" mode="write">
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              Nouveau rôle
            </Button>
          </PermissionGate>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Modules autorisés</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && roles?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Aucun rôle configuré.
                </TableCell>
              </TableRow>
            )}

            {roles?.map((r) => {
              const nbModules = [
                r.peutGererStock,
                r.peutGererCommandes,
                r.peutGererTaches,
                r.peutGererClients,
                r.peutGererFournisseurs,
                r.peutGererAchats,
                r.peutGererImportations,
                r.peutGererUtilisateurs,
                r.peutGererMouvements,
              ].filter(Boolean).length

              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.description ?? '—'}
                  </TableCell>
                  <TableCell>
                    {r.estAdministrateur ? (
                      <Badge className="gap-1">
                        <ShieldCheck className="size-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="size-3" />
                        Personnalisé
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.estAdministrateur ? 'Tous' : `${nbModules} / 9`}
                  </TableCell>
                  <TableCell>
                    <PermissionGate module="roles" mode="write">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Modifier"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="size-3.5" />
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
                          title={`Supprimer « ${r.name} » ?`}
                          description="Les utilisateurs assignés à ce rôle perdront leurs permissions."
                          onConfirm={() => deleteMutation.mutate(r.id)}
                        />
                      </div>
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {dialogOpen && (
        <RoleDialog key={editing?.id ?? 'new'} open={dialogOpen} onClose={closeDialog} editing={editing} />
      )}
    </div>
  )
}
