'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import type { AuthResponse } from '@/types'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const expired = searchParams.get('expired')

  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (expired === '1') setServerError('Votre session a expiré, veuillez vous reconnecter.')
  }, [expired])

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null)

    try {
      // 1. Appel login via le proxy (→ backend POST /api/Auth/login)
      const res = await fetch('/api/proxy/api/Auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: data.email, Password: data.password }),
      })

      // 401 backend = corps vide, message générique côté frontend
      if (res.status === 401) {
        setServerError('Email ou mot de passe incorrect.')
        return
      }

      if (res.status === 400) {
        const err = await res.json() as { title?: string; errors?: Record<string, string[]> }
        const msg = err.errors
          ? Object.values(err.errors).flat()[0]
          : (err.title ?? 'Requête invalide.')
        setServerError(msg ?? 'Requête invalide.')
        return
      }

      if (!res.ok) {
        setServerError(`Erreur serveur (${res.status}).`)
        return
      }

      const { token } = (await res.json()) as AuthResponse

      // 2. Stockage du token en cookie httpOnly via la route /api/session
      const sessionRes = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!sessionRes.ok) {
        setServerError('Impossible de créer la session.')
        return
      }

      toast.success('Connexion réussie !')
      router.push('/dashboard')
      router.refresh()
    } catch {
      setServerError('Erreur réseau. Veuillez réessayer.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">IMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez-vous à votre espace
          </p>
        </div>

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
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
