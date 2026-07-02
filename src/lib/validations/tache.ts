import { z } from 'zod'

export const tacheSchema = z.object({
  titre: z.string().min(1, 'Titre requis').max(100),
  description: z.string().max(1000).nullable(),
  commandeClientId: z.number().int().nullable(),
  equipeAssignee: z.string().max(100).nullable(),
  responsableAssigne: z.string().max(100).nullable(),
  priorite: z.enum(['Basse', 'Normale', 'Haute', 'Urgente']),
  dateDebutPrevue: z.string().nullable(),
  dateFinPrevue: z.string().nullable(),
  dureeEstimeeHeures: z.number().int().min(0),
  creePar: z.string().max(100).nullable(),
})

export type TacheSchema = z.infer<typeof tacheSchema>
