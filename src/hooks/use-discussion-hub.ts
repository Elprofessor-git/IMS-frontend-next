'use client'

import { useEffect, useRef } from 'react'
import {
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// Route canonique du hub côté backend : app.MapHub<DiscussionHub>("/hubs/discussion").
const HUB_PATH = '/hubs/discussion'

// URL PUBLIQUE DÉDIÉE, FACULTATIVE. Sa PRÉSENCE est le drapeau : si elle n'est pas
// définie, aucun hub ne se connecte et le polling GET /sync reste le seul transport.
// C'est ce qui rend le temps réel opt-in par environnement (aucun test n'en dépend).
const HUB_URL = process.env.NEXT_PUBLIC_DISCUSSION_HUB_URL

type TicketReponse = { ticket: string; expiresInSeconds: number }

/**
 * Demande un ticket à usage unique (60 s) au backend, via le proxy Next (donc avec
 * le JWT en cookie httpOnly — le jeton de session n'est JAMAIS exposé au JS ni mis
 * dans l'URL du hub).
 */
async function obtenirTicket(): Promise<string> {
  const { ticket } = await apiClient.post<TicketReponse>('/api/Discussion/hub-ticket')
  return ticket
}

/**
 * Temps réel Discussion — AMÉLIORATION du polling, jamais un remplacement.
 *
 * Le serveur pousse deux « pokes » sans contenu : `DiscussionChanged` (une
 * conversation a bougé) et `NotificationChanged` (la cloche a bougé). Le client se
 * contente d'invalider ses requêtes : c'est l'API qui applique les droits du lecteur
 * (cartes de références E3 comprises), donc un broadcast ne peut pas divulguer ce
 * qu'une réponse HTTP refuserait.
 *
 * L'authentification passe par un TICKET à usage unique, redemandé à chaque tentative
 * de connexion (le précédent est consommé ou a expiré en 60 s). WebSockets uniquement,
 * sans négociation : le ticket n'est présenté qu'une fois, au handshake.
 */
export function useDiscussionHub(enabled: boolean) {
  const qc = useQueryClient()
  const connectionRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    const baseUrl = HUB_URL
    if (!enabled || !baseUrl) return

    let cancelled = false

    const invaliderDiscussion = () => {
      // Couvre /sync, l'historique des conversations contextuelles et l'annuaire.
      qc.invalidateQueries({ queryKey: ['discussion'] })
    }
    const invaliderNotifications = () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'me'] })
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${baseUrl}${HUB_PATH}`, {
        accessTokenFactory: obtenirTicket,
        transport: HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      // Reconnexion automatique ILLIMITÉE : l'offre gratuite Render s'endort et son
      // redémarrage peut dépasser la minute ; on retente tant que l'onglet est ouvert.
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: ({ previousRetryCount }) =>
          previousRetryCount === 0 ? 0 : Math.min(15_000, 1_000 * 2 ** previousRetryCount),
      })
      .configureLogging(LogLevel.Warning)
      .build()

    connectionRef.current = connection

    connection.on('DiscussionChanged', invaliderDiscussion)
    connection.on('NotificationChanged', invaliderNotifications)
    connection.onreconnected(() => {
      // Après une coupure, on resynchronise via l'API (le ticket est redemandé).
      invaliderDiscussion()
      invaliderNotifications()
    })

    const start = async () => {
      try {
        await connection.start()
      } catch {
        // Backend endormi ou pas encore prêt : on retente sans bloquer le polling.
        if (!cancelled) setTimeout(start, 10_000)
      }
    }
    void start()

    return () => {
      cancelled = true
      connection.off('DiscussionChanged', invaliderDiscussion)
      connection.off('NotificationChanged', invaliderNotifications)
      connection.stop().catch(() => {})
      if (connectionRef.current === connection) connectionRef.current = null
    }
  }, [enabled, qc])

  return connectionRef.current
}
