'use client'

import { useEffect, useRef } from 'react'
import {
  HubConnectionBuilder,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'

const HUB_PATH = '/hubs/planning'

// ⚠️ CONNEXION HUB DÉSACTIVÉE PAR DÉFAUT (feature flag).
// Le JWT vit dans un cookie httpOnly côté Next.js — inaccessible au JS du
// navigateur. Le backend s'authentifie par en-tête Authorization ; une
// connexion SignalR navigateur ne peut pas le fournir sans exposer le token
// (INTERDIT). Le temps réel garanti est le POLLING (refetchInterval 25 s +
// refocus) via le proxy Next (voir use-planning / use-notifications).
// N'ACTIVER que lorsqu'un mécanisme d'authentification du hub qui n'expose
// pas le token au JS existe (ex. jeton de hub éphémère délivré par le proxy).
const HUB_FEATURE_FLAG = process.env.NEXT_PUBLIC_PLANNING_HUB_ENABLED === 'true'

/**
 * Connexion temps réel au hub SignalR du planning (désactivée par défaut).
 * — `PlanningChanged`    → rechargement de la grille de planification
 * — `NotificationReceived` → recalcul du badge de la cloche
 * Reconnexion automatique (withAutomaticReconnect), retry manuel au démarrage.
 */
export function usePlanningHub(enabled = true): HubConnection | null {
  const qc = useQueryClient()
  const connectionRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    if (!enabled || !HUB_FEATURE_FLAG) return

    let cancelled = false

    const invalidatePlanning = () => {
      qc.invalidateQueries({ queryKey: ['planning'] })
    }
    const invalidateNotifications = () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'me'] })
    }

    // Aucune URL en dur vers Render : même origine (l'éventuelle activation doit
    // transiter par un endpoint qui n'expose pas le token).
    const hubBaseUrl = process.env.NEXT_PUBLIC_PLANNING_HUB_URL ?? window.location.origin

    const connection = new HubConnectionBuilder()
      .withUrl(`${hubBaseUrl}${HUB_PATH}`)
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