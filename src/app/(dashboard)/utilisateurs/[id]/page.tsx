'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { userSchema, toUserPayload, type UserSchema } from '@/lib/validations/user'
import {
  useGetUser,
  useUpdateUser,
  useDeleteUser,
  useToggleUserActif,
  useAssignRole,
} from '@/hooks/use-users'
import { useGetRoles } from '@/hooks/use-roles'

export default function EditUtilisateurPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const { data: user, isLoading } = useGetUser(id)
  const { data: roles } = useGetRoles()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()
  const toggleMutation = useToggleUserActif()
  const assignRoleMutation = useAssignRole()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserSchema>({
    resolver: zodResolver(userSchema),
  })

  useEffect(() => {
    if (user) {
      reset({
        nom: user.nom,
        prenom: user.prenom ?? '',
        email: user.email,
      })
    }
  }, [user, reset])

  const onSubmit = async (data: UserSchema) => {
    if (!user) return
    await updateMutation.mutateAsync({ id: user.id, ...toUserPayload(data) })
    router.push('/utilisateurs')
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!user) {
    return <p className="text-muted-foreground">Utilisateur introuvable.</p>
  }

  return (
    <div>
      <PageHeader
        title={user.nom + (user.prenom ? ' ' + user.prenom : '')}
        backHref="/utilisateurs"
        action={
          <PermissionGate module="utilisateurs" mode="write">
            <div className="flex items-center gap-2">
              <Badge variant={user.estActif ? 'default' : 'secondary'}>
                {user.estActif ? 'Actif' : 'Inactif'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                disabled={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate({ id: user.id, estActif: !user.estActif })}
              >
                {user.estActif ? (
                  <>
                    <UserX className="size-4" />
                    Désactiver
                  </>
                ) : (
                  <>
                    <UserCheck className="size-4" />
                    Activer
                  </>
                )}
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}>
                    Supprimer
                  </Button>
                }
                title="Supprimer cet utilisateur ?"
                description="Cette action est irréversible. L'utilisateur ne pourra plus se connecter."
                onConfirm={async () => {
                  await deleteMutation.mutateAsync(user.id)
                  router.push('/utilisateurs')
                }}
              />
            </div>
          </PermissionGate>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid max-w-2xl gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="nom">
                    Nom <span className="text-destructive">*</span>
                  </Label>
                  <Input id="nom" {...register('nom')} aria-invalid={!!errors.nom} />
                  {errors.nom && (
                    <p className="text-sm text-destructive">{errors.nom.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input id="prenom" {...register('prenom')} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rôle &amp; permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label>Rôle personnalisé</Label>
                <PermissionGate
                  module="utilisateurs"
                  mode="write"
                  fallback={
                    <p className="text-sm">
                      {user.nomRole ? (
                        <Badge variant="outline">{user.nomRole}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Aucun rôle assigné</span>
                      )}
                    </p>
                  }
                >
                  <Select
                    value={user.roleId?.toString() ?? '0'}
                    disabled={assignRoleMutation.isPending}
                    onValueChange={(val) =>
                      assignRoleMutation.mutate({
                        id: user.id,
                        roleId: val === '0' ? null : Number(val),
                      })
                    }
                  >
                    <SelectTrigger>
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
                <p className="text-xs text-muted-foreground">
                  Détermine les modules accessibles et les droits d&apos;écriture.
                </p>
              </div>
            </CardContent>
          </Card>

          <PermissionGate module="utilisateurs" mode="write">
            <div className="flex gap-3">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/utilisateurs')}
              >
                Annuler
              </Button>
            </div>
          </PermissionGate>
        </div>
      </form>
    </div>
  )
}
