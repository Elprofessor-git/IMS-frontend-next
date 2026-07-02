import { z } from 'zod'

export const plateformeSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100, 'Max 100 caractères'),
  // Nullable : l'input HTML envoie toujours une string, la conversion '' → null
  // est faite dans le onSubmit avant d'envoyer à l'API.
  description: z.string().max(500, 'Max 500 caractères').nullable(),
  siteWeb: z.string().max(200, 'Max 200 caractères').nullable(),
  contactEmail: z.string().max(100, 'Max 100 caractères').nullable(),
  telephone: z.string().max(20, 'Max 20 caractères').nullable(),
})

export type PlateformeSchema = z.infer<typeof plateformeSchema>

/** Convertit les chaînes vides en null avant envoi API */
export function toApiPayload(data: PlateformeSchema): PlateformeSchema {
  return {
    nom: data.nom.trim(),
    description: data.description?.trim() || null,
    siteWeb: data.siteWeb?.trim() || null,
    contactEmail: data.contactEmail?.trim() || null,
    telephone: data.telephone?.trim() || null,
  }
}
