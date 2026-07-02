import { z } from 'zod'

const nullableStr = (max: number) => z.string().max(max).nullable()

export const userSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100),
  prenom: nullableStr(100),
  email: z.string().min(1, 'Email requis').max(100).email('Format email invalide'),
})

export type UserSchema = z.infer<typeof userSchema>

export function toUserPayload(data: UserSchema) {
  return {
    nom: data.nom.trim(),
    prenom: data.prenom?.trim() || null,
    email: data.email.trim(),
  }
}
