'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCanPartagerLiens } from '@/hooks/use-permissions'
import { PartageDialog, type PartageScopePreset } from './partage-dialog'

/**
 * Bouton « Partager » autonome : n'apparaît que si l'utilisateur dispose de la
 * permission transverse. Sans `preset`, le dialogue propose le sélecteur de périmètre.
 */
export function BoutonPartage({
  preset,
  label = 'Partager',
  variant = 'outline',
  size = 'sm',
  iconOnly = false,
}: {
  preset?: PartageScopePreset | null
  label?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'sm' | 'default' | 'icon-sm'
  iconOnly?: boolean
}) {
  const peutPartager = useCanPartagerLiens()
  const [open, setOpen] = useState(false)

  if (!peutPartager) return null

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={() => setOpen(true)}
        title="Partager"
      >
        <Share2 className={iconOnly ? 'size-3.5' : 'size-4'} />
        {!iconOnly && label}
      </Button>
      {open && (
        <PartageDialog open={open} onClose={() => setOpen(false)} preset={preset} />
      )}
    </>
  )
}
