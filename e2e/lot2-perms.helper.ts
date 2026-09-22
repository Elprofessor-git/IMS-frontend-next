import type { APIRequestContext } from '@playwright/test'

// Contrôle du rôle jetable n°2 (« SansPlanning ») via l'API pour rendre les specs
// LOT 2 (C1/C2/D) autonomes et répétables : chaque spec octroie/restaure les flags.
const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:5070'
const EMAIL_ADMIN = process.env.EMAIL_ADMIN ?? 'admin2@test.com'
const MDP_ADMIN = process.env.MDP_ADMIN ?? 'Admin2.123'

// État d'origine du rôle 2 (créé par le seed LOT 1) : uniquement VoirMouvements + VoirCommandes.
export const ROLE2_BASE: Record<string, unknown> = {
  name: 'SansPlanning',
  description: 'role test',
  estAdministrateur: false,
  peutGererStock: false,
  peutGererCommandes: false,
  peutGererTaches: false,
  peutGererClients: false,
  peutGererFournisseurs: false,
  peutGererAchats: false,
  peutGererImportations: false,
  peutGererUtilisateurs: false,
  peutGererMouvements: false,
  peutGererPlateformes: false,
  peutVoirMouvements: true,
  peutVoirCommandes: true,
  peutVoirClients: false,
  peutVoirFournisseurs: false,
  peutVoirPlateformes: false,
  peutVoirTaches: false,
  peutVoirUtilisateurs: false,
  peutVoirRoles: false,
  peutValiderStock: false,
  peutConfirmerAchats: false,
  peutValiderImportations: false,
  peutVoirDashboard: false,
  peutVoirRapports: false,
  peutVoirFactures: false,
  peutGererFactures: false,
  peutVoirMachines: false,
  peutGererMachines: false,
  peutVoirCoupe: false,
  peutGererCoupe: false,
  peutVoirPlanning: false,
  peutGererPlanning: false,
}

export async function setRole2(request: APIRequestContext, flags: Record<string, unknown>) {
  const login = await request.post(`${BACKEND}/api/Auth/login`, {
    data: { email: EMAIL_ADMIN, password: MDP_ADMIN },
  })
  const token = (await login.json()).token as string
  const res = await request.put(`${BACKEND}/api/roles/2`, {
    headers: { Authorization: `Bearer ${token}` },
    data: flags,
  })
  if (res.status() !== 204) {
    throw new Error(`setRole2 → ${res.status()} ${await res.text()}`)
  }
}

export function withFlags(...extra: Record<string, unknown>[]): Record<string, unknown> {
  return { ...ROLE2_BASE, ...Object.assign({}, ...extra) }
}