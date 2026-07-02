'use client'

import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export interface WorkflowStatutConfig {
  label: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  badgeClassName?: string
}

export interface WorkflowTransition {
  label: string
  confirmTitle: string
  confirmDesc: string
  buttonVariant?: 'default' | 'outline'
  onConfirm: () => void | Promise<void>
  isPending: boolean
  // Si fourni, remplace le ConfirmDialog (transitions nécessitant une saisie supplémentaire)
  customRender?: ReactNode
}

interface Props {
  statut: number
  statutConfig: Record<number, WorkflowStatutConfig>
  transition?: WorkflowTransition
}

export function StatutWorkflow({ statut, statutConfig, transition }: Props) {
  const cfg = statutConfig[statut]

  return (
    <div className="flex items-center gap-2">
      <Badge variant={cfg?.badgeVariant} className={cfg?.badgeClassName}>
        {cfg?.label ?? String(statut)}
      </Badge>

      {transition &&
        (transition.customRender ?? (
          <ConfirmDialog
            trigger={
              <Button
                variant={transition.buttonVariant ?? 'default'}
                size="sm"
                disabled={transition.isPending}
              >
                {transition.label}
              </Button>
            }
            title={transition.confirmTitle}
            description={transition.confirmDesc}
            confirmLabel={transition.label}
            onConfirm={transition.onConfirm}
          />
        ))}
    </div>
  )
}
