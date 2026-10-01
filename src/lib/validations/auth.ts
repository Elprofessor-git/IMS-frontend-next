import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export type LoginFormData = z.infer<typeof loginSchema>

/**
 * « Mot de passe oublié » : un seul champ, l'email.
 *
 * La réponse de l'API est volontairement identique que le compte existe ou non —
 * le formulaire ne doit donc jamais laisser croire qu'un email a été reconnu.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

/**
 * Règles de robustesse du mot de passe.
 *
 * MIROIR EXACT de Program.cs (AddIdentity) : digit + minuscule + majuscule,
 * 6 caractères minimum, pas de contrainte de caractère spécial. Toute divergence
 * ici donnerait un message de validation qui ment sur ce que le serveur exige.
 */
const motDePasseFort = z
  .string()
  .min(6, '6 caractères minimum')
  .regex(/[a-z]/, 'Au moins une minuscule requise')
  .regex(/[A-Z]/, 'Au moins une majuscule requise')
  .regex(/[0-9]/, 'Au moins un chiffre requis')

/** Confirmation obligatoire, commune à la réinitialisation et au changement. */
const avecConfirmation = z
  .object({
    nouveauMotDePasse: motDePasseFort,
    confirmation: z.string().min(1, 'Confirmation requise'),
  })
  .refine((d) => d.nouveauMotDePasse === d.confirmation, {
    message: 'La confirmation ne correspond pas au nouveau mot de passe',
    path: ['confirmation'],
  })

export const resetPasswordSchema = avecConfirmation

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z
  .object({
    ancienMotDePasse: z.string().min(1, 'Mot de passe actuel requis'),
    nouveauMotDePasse: motDePasseFort,
    confirmation: z.string().min(1, 'Confirmation requise'),
  })
  .refine((d) => d.nouveauMotDePasse === d.confirmation, {
    message: 'La confirmation ne correspond pas au nouveau mot de passe',
    path: ['confirmation'],
  })
  // Interdit de réutiliser le mot de passe actuel : sinon un « changement » ne
  // change rien, tout en invalidant toutes les sessions — l'utilisateur se retrouve
  // déconnecté de partout pour un résultat identique.
  .refine((d) => d.nouveauMotDePasse !== d.ancienMotDePasse, {
    message: "Le nouveau mot de passe doit être différent de l'actuel",
    path: ['nouveauMotDePasse'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
