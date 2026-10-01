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
import { EmptyState } from '@/components/shared/empty-state'
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
  peutVoirToutesTaches: z.boolean(),
  peutAssignerTaches: z.boolean(),
  peutGererClients: z.boolean(),
  peutGererFournisseurs: z.boolean(),
  peutGererAchats: z.boolean(),
  peutGererImportations: z.boolean(),
  peutGererUtilisateurs: z.boolean(),
  peutGererMouvements: z.boolean(),
  peutGererPlateformes: z.boolean(),
  peutVoirMouvements: z.boolean(),
  peutVoirCommandes: z.boolean(),
  peutVoirClients: z.boolean(),
  peutVoirFournisseurs: z.boolean(),
  peutVoirPlateformes: z.boolean(),
  peutVoirTaches: z.boolean(),
  peutVoirUtilisateurs: z.boolean(),
  peutVoirRoles: z.boolean(),
  peutValiderStock: z.boolean(),
  peutConfirmerAchats: z.boolean(),
  peutValiderImportations: z.boolean(),
  peutVoirDashboard: z.boolean(),
  peutVoirRapports: z.boolean(),
  peutVoirFactures: z.boolean(),
  peutGererFactures: z.boolean(),
  peutVoirMachines: z.boolean(),
  peutGererMachines: z.boolean(),
  peutVoirCoupe: z.boolean(),
  peutGererCoupe: z.boolean(),
  peutVoirPlanning: z.boolean(),
  peutGererPlanning: z.boolean(),
  peutVoirProduction: z.boolean(),
  peutGererProduction: z.boolean(),
  peutVoirQualite: z.boolean(),
  peutGererQualite: z.boolean(),
  peutVoirCourriels: z.boolean(),
  peutGererCourriels: z.boolean(),
  peutPartagerLiens: z.boolean(),
})
type RoleSchema = z.infer<typeof roleSchema>

const PERM_ECRITURE = [
  { key: 'peutValiderStock', label: 'Gérer le stock' },
  { key: 'peutGererCommandes', label: 'Gérer les commandes clients' },
  { key: 'peutGererTaches', label: 'Gérer les tâches' },
  { key: 'peutGererClients', label: 'Gérer les clients' },
  { key: 'peutGererFournisseurs', label: 'Gérer les fournisseurs' },
  { key: 'peutConfirmerAchats', label: 'Gérer les achats' },
  { key: 'peutValiderImportations', label: 'Gérer les importations' },
  { key: 'peutGererMouvements', label: 'Gérer les mouvements de stock' },
  { key: 'peutGererPlateformes', label: 'Gérer les plateformes' },
  { key: 'peutGererFactures', label: 'Gérer les factures' },
  { key: 'peutGererUtilisateurs', label: 'Gérer les utilisateurs' },
  { key: 'peutGererMachines', label: 'Gérer les machines' },
  { key: 'peutGererCoupe', label: 'Gérer la coupe' },
  { key: 'peutGererPlanning', label: 'Gérer le planning' },
  { key: 'peutGererProduction', label: 'Gérer la production' },
  { key: 'peutGererQualite', label: 'Gérer la qualité' },
  { key: 'peutGererCourriels', label: 'Gérer les courriels (connexion Gmail, synchronisation, envoi)' },
] as const

const PERM_LECTURE = [
  { key: 'peutVoirMouvements', label: 'Voir les mouvements' },
  { key: 'peutVoirCommandes', label: 'Voir les commandes' },
  { key: 'peutVoirClients', label: 'Voir les clients' },
  { key: 'peutVoirFournisseurs', label: 'Voir les fournisseurs' },
  { key: 'peutVoirPlateformes', label: 'Voir les plateformes' },
  { key: 'peutVoirTaches', label: 'Voir les tâches' },
  { key: 'peutVoirUtilisateurs', label: 'Voir les utilisateurs' },
  { key: 'peutVoirRoles', label: 'Voir les rôles' },
  { key: 'peutGererStock', label: 'Voir le stock' },
  { key: 'peutGererAchats', label: 'Voir les achats' },
  { key: 'peutGererImportations', label: 'Voir les importations' },
  { key: 'peutVoirDashboard', label: 'Voir le dashboard' },
  { key: 'peutVoirRapports', label: 'Voir les rapports' },
  { key: 'peutVoirFactures', label: 'Voir les factures' },
  { key: 'peutVoirMachines', label: 'Voir les machines' },
  { key: 'peutVoirCoupe', label: 'Voir la coupe' },
  { key: 'peutVoirPlanning', label: 'Voir le planning' },
  { key: 'peutVoirProduction', label: 'Voir la production' },
  { key: 'peutVoirQualite', label: 'Voir la qualité' },
  { key: 'peutVoirCourriels', label: 'Voir les courriels' },
] as const

/**
 * Droits de RESSOURCE (LOT 16) : ils ne portent pas sur l'accès au module Tâches
 * mais sur la propriété des données. Un rôle peut donc voir le module Tâches et
 * ne voir que ses propres tâches — c'est le cas par défaut.
 * Voir `PermissionService.CanViewAllTachesAsync` / `CanAssignerTachesAsync`.
 */
const PERM_PORTEE = [
  {
    key: 'peutVoirToutesTaches',
    label: 'Voir toutes les tâches (y compris celles des autres utilisateurs)',
  },
  {
    key: 'peutAssignerTaches',
    label: 'Assigner une tâche à un autre utilisateur',
  },
] as const

/**
 * Capacités transversales (indépendantes d'un module métier).
 */
const PERM_TRANSVERSE = [
  {
    key: 'peutPartagerLiens',
    label: 'Créer des liens de partage en lecture seule',
  },
] as const

/**
 * Garde-fou d'exhaustivité.
 *
 * Toute permission booléenne de `Role` doit être proposée par l'écran Rôles.
 * Si le modèle gagne une permission sans que l'UI ne la liste ici,
 * `AssertNever` échoue à la compilation : le bug « permission accordable
 * uniquement en base » ne peut plus réapparaître silencieusement.
 *
 * `estActif` n'est pas une permission (état technique du rôle, non saisissable).
 * `estAdministrateur` est rendu à part (section Administration) : il est déclaré
 * dans `PermAdminKey` pour l'exhaustivité.
 */
type BooleanPermissionKey = {
  [K in keyof Role]: Role[K] extends boolean ? K : never
}[keyof Role]

type PermAdminKey = 'estAdministrateur'

type AssertNever<T extends never> = T
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _ToutesPermissionsExposees = AssertNever<
  Exclude<
    BooleanPermissionKey,
    | (typeof PERM_ECRITURE)[number]['key']
    | (typeof PERM_LECTURE)[number]['key']
    | (typeof PERM_PORTEE)[number]['key']
    | (typeof PERM_TRANSVERSE)[number]['key']
    | PermAdminKey
    | 'estActif'
  >
>

const DEFAULT_VALUES: RoleSchema = {
  name: '',
  description: null,
  estAdministrateur: false,
  peutGererStock: false,
  peutGererCommandes: false,
  peutGererTaches: false,
  peutVoirToutesTaches: false,
  peutAssignerTaches: false,
  peutGererClients: false,
  peutGererFournisseurs: false,
  peutGererAchats: false,
  peutGererImportations: false,
  peutGererUtilisateurs: false,
  peutGererMouvements: false,
  peutGererPlateformes: false,
  peutVoirMouvements: false,
  peutVoirCommandes: false,
  peutVoirClients: false,
  peutVoirFournisseurs: false,
  peutVoirPlateformes: false,
  peutVoirTaches: false,
  peutVoirUtilisateurs: false,
  peutVoirRoles: false,
  peutValiderStock: false,
  peutConfirmerAchats: false,
  peutValiderImportations: false,
  peutVoirDashboard: true,
  peutVoirRapports: true,
  peutVoirFactures: false,
  peutGererFactures: false,
  peutVoirMachines: false,
  peutGererMachines: false,
  peutVoirCoupe: false,
  peutGererCoupe: false,
  peutVoirPlanning: false,
  peutGererPlanning: false,
  peutVoirProduction: false,
  peutGererProduction: false,
  peutVoirQualite: false,
  peutGererQualite: false,
  peutVoirCourriels: false,
  peutGererCourriels: false,
  peutPartagerLiens: false,
}

function roleToSchema(r: Role): RoleSchema {
  return {
    name: r.name,
    description: r.description,
    estAdministrateur: r.estAdministrateur,
    peutGererStock: r.peutGererStock,
    peutGererCommandes: r.peutGererCommandes,
    peutGererTaches: r.peutGererTaches,
    peutVoirToutesTaches: r.peutVoirToutesTaches,
    peutAssignerTaches: r.peutAssignerTaches,
    peutGererClients: r.peutGererClients,
    peutGererFournisseurs: r.peutGererFournisseurs,
    peutGererAchats: r.peutGererAchats,
    peutGererImportations: r.peutGererImportations,
    peutGererUtilisateurs: r.peutGererUtilisateurs,
    peutGererMouvements: r.peutGererMouvements,
    peutGererPlateformes: r.peutGererPlateformes,
    peutVoirMouvements: r.peutVoirMouvements,
    peutVoirCommandes: r.peutVoirCommandes,
    peutVoirClients: r.peutVoirClients,
    peutVoirFournisseurs: r.peutVoirFournisseurs,
    peutVoirPlateformes: r.peutVoirPlateformes,
    peutVoirTaches: r.peutVoirTaches,
    peutVoirUtilisateurs: r.peutVoirUtilisateurs,
    peutVoirRoles: r.peutVoirRoles,
    peutValiderStock: r.peutValiderStock,
    peutConfirmerAchats: r.peutConfirmerAchats,
    peutValiderImportations: r.peutValiderImportations,
    peutVoirDashboard: r.peutVoirDashboard,
    peutVoirRapports: r.peutVoirRapports,
    peutVoirFactures: r.peutVoirFactures,
    peutGererFactures: r.peutGererFactures,
    peutVoirMachines: r.peutVoirMachines,
    peutGererMachines: r.peutGererMachines,
    peutVoirCoupe: r.peutVoirCoupe,
    peutGererCoupe: r.peutGererCoupe,
    peutVoirPlanning: r.peutVoirPlanning,
    peutGererPlanning: r.peutGererPlanning,
    peutVoirProduction: r.peutVoirProduction,
    peutGererProduction: r.peutGererProduction,
    peutVoirQualite: r.peutVoirQualite,
    peutGererQualite: r.peutGererQualite,
    peutVoirCourriels: r.peutVoirCourriels,
    peutGererCourriels: r.peutGererCourriels,
    peutPartagerLiens: r.peutPartagerLiens,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <p className="text-xs text-muted-foreground">
              Seul un administrateur peut gérer les rôles et les utilisateurs.
            </p>
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
                <p className="text-sm font-medium">Écriture (Gérer)</p>
                <div className="grid grid-cols-1 gap-2">
                  {PERM_ECRITURE.map(({ key, label }) => (
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
                <p className="text-sm font-medium">Lecture (Voir)</p>
                <div className="grid grid-cols-1 gap-2">
                  {PERM_LECTURE.map(({ key, label }) => (
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
                <p className="text-sm font-medium">Portée des tâches</p>
                <p className="text-xs text-muted-foreground">
                  Ces droits ne portent pas sur l&apos;accès au module Tâches mais sur la
                  propriété des données. Sans eux, un rôle voit le module mais uniquement ses
                  propres tâches.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {PERM_PORTEE.map(({ key, label }) => (
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
                <p className="text-sm font-medium">Partage</p>
                <p className="text-xs text-muted-foreground">
                  Autorise la création de liens publics en lecture seule (stock, commandes,
                  importations). Les liens restent limités au périmètre choisi et peuvent être
                  révoqués à tout moment.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {PERM_TRANSVERSE.map(({ key, label }) => (
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
              <TableHead>Écriture</TableHead>
              <TableHead>Lecture</TableHead>
              <TableHead>Portée tâches</TableHead>
              <TableHead>Partage</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && roles?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    title="Aucun rôle configuré"
                    description="Créez un premier rôle et assignez les permissions métier."
                  />
                </TableCell>
              </TableRow>
            )}

            {roles?.map((r) => {
              // Comptages dérivés des listes ci-dessus : une permission ajoutée à
              // PERM_ECRITURE / PERM_LECTURE est automatiquement comptée, sans
              // compteur figé à mettre à jour à la main.
              const nbEcriture = PERM_ECRITURE.filter(({ key }) => r[key]).length
              const nbLecture = PERM_LECTURE.filter(({ key }) => r[key]).length
              const nbPortee = PERM_PORTEE.filter(({ key }) => r[key]).length

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
                    {r.estAdministrateur ? 'Tous' : `${nbEcriture} / ${PERM_ECRITURE.length}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.estAdministrateur ? 'Tous' : `${nbLecture} / ${PERM_LECTURE.length}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.estAdministrateur ? 'Tous' : `${nbPortee} / ${PERM_PORTEE.length}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.estAdministrateur || r.peutPartagerLiens ? 'Oui' : '—'}
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
