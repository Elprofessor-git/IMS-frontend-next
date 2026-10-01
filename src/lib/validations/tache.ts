import { z } from 'zod'

/**
 * Formulaire de création d'une tâche.
 *
 * Le champ d'assignation est un `assignedToUserId` (identifiant système choisi dans une
 * liste), et non un nom libre : le nom du responsable est dérivé côté serveur de
 * l'utilisateur choisi, il ne doit donc jamais être saisi ni transmis tel quel.
 * Aucun champ d'ownership ni d'audit n'est présent : le serveur les décide.
 */
export const tacheSchema = z.object({
  titre: z.string().min(1, 'Titre requis').max(100),
  description: z.string().max(1000).nullable(),
  commandeClientId: z.number().int().nullable(),
  equipeAssignee: z.string().max(100).nullable(),
  /** Vide = la tâche vous revient. Tiers = nécessite le droit d'assignation. */
  assignedToUserId: z.string().nullable(),
  priorite: z.enum(['Basse', 'Normale', 'Haute', 'Urgente']),
  dateDebutPrevue: z.string().nullable(),
  dateFinPrevue: z.string().nullable(),
  dureeEstimeeHeures: z.number().int().min(0),
})

export type TacheSchema = z.infer<typeof tacheSchema>
