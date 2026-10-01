'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/auth'
import { useResetPassword, messageErreurAuth } from '@/hooks/use-auth-mutations'

/**
 * Page consommée par le lien « choisir mon mot de passe » / « mot de passe oublié ».
 *
 * Elle est PUBLIQUE et l'estVolontairement : middleware.ts laisse passer `/login`
 * seulement (src/middleware.ts:17), il faut donc ajouter `/reset-password` à la liste
 * des routes publiques — sinon le lien de l'email redirigerait vers /login en
 * boucle, l'utilisateur perdant son token au passage.
 *
 * `userId` et `token` ne sont JAMAIS saisis : ils viennent de l'URL, sont relayés
 * tels quels, et ne sont ni stockés ni journalisés côté client.
 */
function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const resetMutation = useResetPassword()

  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const userId = searchParams.get('userId') ?? ''
  const token = searchParams.get('token') ?? ''

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // Lien tronqué (mail rogné, copier-coller partiel) : inutile d'afficher un
  // formulaire qui ne pourrait aboutir.
  if (!userId || !token) {
    return (
      <Card>
        <Title />
        <Alert tone="destructive">
          Ce lien est incomplet. Demandez-en un nouveau depuis la page de connexion.
        </Alert>
        <Button asChild className="w-full">
          <Link href="/login">Retour à la connexion</Link>
        </Button>
      </Card>
    )
  }

  if (done) {
    return (
      <Card>
        <Title />
        <Alert tone="success">
          Mot de passe défini. Vos sessions précédentes ont été déconnectées.
        </Alert>
        <Button asChild className="w-full">
          <Link href="/login">Se connecter</Link>
        </Button>
      </Card>
    )
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError(null)

    try {
      await resetMutation.mutateAsync({
        userId,
        token,
        nouveauMotDePasse: data.nouveauMotDePasse,
        confirmation: data.confirmation,
      })
      setDone(true)
    } catch (err) {
      setServerError(
        messageErreurAuth(
          err,
          'Ce lien de réinitialisation n’est plus valide (expiré, déjà utilisé ou incorrect).',
        ),
      )
    }
  }

  return (
    <Card>
      <Title />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <PasswordField
          id="nouveauMotDePasse"
          label="Nouveau mot de passe"
          autoComplete="new-password"
          error={errors.nouveauMotDePasse?.message}
          register={register('nouveauMotDePasse')}
        />
        <PasswordField
          id="confirmation"
          label="Confirmation"
          autoComplete="new-password"
          error={errors.confirmation?.message}
          register={register('confirmation')}
        />

        {serverError && <Alert tone="destructive">{serverError}</Alert>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : 'Définir mon mot de passe'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Retour à la connexion
          </Link>
        </p>
      </form>
    </Card>
  )
}

function Title() {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-xl bg-header text-header-foreground shadow-md">
        <KeyRound className="size-6" />
      </span>
      <h1 className="text-xl font-bold tracking-tight">Choisir mon mot de passe</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Lien à usage unique — il cesse de fonctionner dès que le mot de passe est défini
      </p>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">{children}</div>
    </div>
  )
}

function Alert({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'destructive' | 'success'
}) {
  return (
    <div
      role="alert"
      className={
        tone === 'destructive'
          ? 'rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
          : 'rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800'
      }
    >
      {children}
    </div>
  )
}

function PasswordField({
  id,
  label,
  autoComplete,
  error,
  register,
}: {
  id: string
  label: string
  autoComplete: string
  error?: string
  register: ReturnType<ReturnType<typeof useForm<ResetPasswordFormData>>['register']>
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={!!error}
        {...register}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
