'use client'

import { useEffect, useRef } from 'react'
import {
  HubConnectionBuilder,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'

const HUB_PATH = '/hubs/planning'

// L'URL du backend est un secret serveur (API_URL, lue par le proxy). Pour la
// connexion SignalR, on s'appuie sur NEXT_PUBLIC_API_URL si définie, sinon sur
// l'URL Render du backend par défaut.
const HUB_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://ims-backend-g95v.onrender.com'

/**
 * Connexion temps réel au hub SignalR du planning.
 * — `PlanningChanged`    → rechargement de la grille de planification
 * — `NotificationReceived` → recalcul du badge de la cloche
 * Reconnexion automatique (withAutomaticReconnect), retry manuel au démarrage.
 */
export function usePlanningHub(enabled = true): HubConnection | null {
  const qc = useQueryClient()
  const connectionRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const invalidatePlanning = () => {
      qc.invalidateQueries({ queryKey: ['planning'] })
    }
    const invalidateNotifications = () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'me'] })
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${HUB_BASE_URL}${HUB_PATH}`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connectionRef.current = connection

    connection.on('PlanningChanged', invalidatePlanning)
    connection.on('NotificationReceived', invalidateNotifications)
    connection.onreconnected(() => {
      invalidatePlanning()
      invalidateNotifications()
    })

    const start = async () => {
      try {
        await connection.start()
      } catch {
        // Hub pas (encore) disponible sur le backend : on réessaie.
        if (!cancelled) setTimeout(start, 10_000)
      }
    }
    void start()

    return () => {
      cancelled = true
      connection.off('PlanningChanged', invalidatePlanning)
      connection.off('NotificationReceived', invalidateNotifications)
      connection.stop().catch(() => {})
      if (connectionRef.current === connection) connectionRef.current = null
    }
  }, [enabled, qc])

  return connectionRef.current
}