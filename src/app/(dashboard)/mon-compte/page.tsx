'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/page-header'
import { useAuth } from '@/hooks/use-auth'
import { useChangePassword, messageErreurAuth } from '@/hooks/use-auth-mutations'
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/validations/auth'

/**
 * Paramètres du compte de l'utilisateur connecté.
 *
 * Volontairement SANS PermissionGate : le module « parametres » est réservé aux
 * administrateurs (PermissionService.MapModule), or changer son propre mot de passe
 * est un droit de TOUT utilisateur authentifié. Le placer sous cette permission
 * interdirait à un simple magasinier de sécuriser son compte.
 *
 * L'endpoint Called n'expose qu'[Authorize] : il n'agit que sur le compte porté par
 * le JWT, jamais sur un compte choisi par le client.
 */
export default function MonComptePage() {
  const { data: user } = useAuth()
  const changeMutation = useChangePassword()

  const [serverError, setServerError] = useState<string | null>(null)
  const [serverMessage, setServerMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = async (data: ChangePasswordFormData) => {
    setServerError(null)
    setServerMessage(null)

    try {
      const reponse = await changeMutation.mutateAsync(data)
      setServerMessage(
        reponse.message ??
          'Mot de passe modifié. Vos autres sessions ont été déconnectées.',
      )
      reset()
    } catch (err) {
      setServerError(messageErreurAuth(err, 'Impossible de modifier le mot de passe.'))
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Mon compte" />

      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <p className="text-sm font-medium">Identité</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Nom</dt>
              <dd>
                {user
                  ? `${user.nom}${user.prenom ? ' ' + user.prenom : ''}`
                  : '…'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-words">{user?.email ?? '…'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rôle</dt>
              <dd>{user?.role ?? 'Aucun rôle'}</dd>
            </div>
          </dl>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4 px-6 py-5"
        >
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="size-4" />
              Changer mon mot de passe
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              6 caractères minimum, avec au moins une minuscule, une majuscule et un
              chiffre. Le changement déconnecte immédiatement vos autres sessions.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ancienMotDePasse">Mot de passe actuel *</Label>
            <Input
              id="ancienMotDePasse"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.ancienMotDePasse}
              {...register('ancienMotDePasse')}
            />
            {errors.ancienMotDePasse && (
              <p className="text-sm text-destructive">{errors.ancienMotDePasse.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nouveauMotDePasse">Nouveau mot de passe *</Label>
            <Input
              id="nouveauMotDePasse"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.nouveauMotDePasse}
              {...register('nouveauMotDePasse')}
            />
            {errors.nouveauMotDePasse && (
              <p className="text-sm text-destructive">{errors.nouveauMotDePasse.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmation">Confirmation *</Label>
            <Input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmation}
              {...register('confirmation')}
            />
            {errors.confirmation && (
              <p className="text-sm text-destructive">{errors.confirmation.message}</p>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </div>
          )}

          {serverMessage && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
            >
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              {serverMessage}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Modification…' : 'Modifier mon mot de passe'}
          </Button>
        </form>
      </div>
    </div>
  )
}
