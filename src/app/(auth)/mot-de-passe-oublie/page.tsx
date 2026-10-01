'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, MailCheck, Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth'
import { useForgotPassword, messageErreurAuth } from '@/hooks/use-auth-mutations'

/**
 * Demande de lien de réinitialisation.
 *
 * Route PUBLIQUE : ajoutée à la liste de middleware.ts, sans quoi le clic sur « mot de
 * passe oublié » depuis /login serait renvoyé vers /login par la protection d'accès.
 *
 * La réponse affichée est celle de l'API, identique pour un email inconnu, un compte
 * existant et un compte désactivé : l'écran ne doit rien laisser deviner, sinon il
 * devient un oracle d'existence de compte.
 */
function ForgotPasswordForm() {
  const router = useRouter()
  const forgotMutation = useForgotPassword()

  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError(null)

    try {
      await forgotMutation.mutateAsync(data.email)
      setSent(true)
    } catch (err) {
      setServerError(messageErreurAuth(err, 'Impossible de traiter la demande.'))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid size-12 place-items-center rounded-xl bg-header text-header-foreground shadow-md">
            {sent ? <MailCheck className="size-6" /> : <Shirt className="size-6" />}
          </span>
          <h1 className="text-xl font-bold tracking-tight">Mot de passe oublié</h1>
        </div>

        {sent ? (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
          >
            Si un compte actif existe pour cette adresse, un lien de réinitialisation vient
            d’être envoyé. Le lien est à usage unique et expire rapidement — pensez à
            regarder dans vos courriers indésirables.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            {serverError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {serverError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Envoi…' : 'Envoyer le lien'}
            </Button>
          </form>
        )}

        <Button
          variant="ghost"
          className="mt-4 w-full"
          onClick={() => router.push('/login')}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Retour à la connexion
        </Button>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  )
}
