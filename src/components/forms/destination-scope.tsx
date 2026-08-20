'use client'

import { Controller, useWatch, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CommandeSelect } from '@/components/forms/commande-select'
import {
  destinationEffectif,
  DESTINATION_LABELS,
} from '@/lib/validations/destination'
import type { CommandeClient } from '@/types/commande'
import type { Client } from '@/types/client'
import type { Plateforme } from '@/types/plateforme'

type ScopeKey = 'commandeClientId' | 'clientId' | 'plateformeId'

function clientLabel(c: Pick<Client, 'nom' | 'prenom' | 'nomEntreprise'>): string {
  return c.nomEntreprise ?? `${c.nom} ${c.prenom ?? ''}`.trim()
}

function scopePaths<T extends FieldValues>(path?: string): Record<ScopeKey, Path<T>> {
  const prefix = path && path.length > 0 ? `${path}.` : ''
  return {
    commandeClientId: `${prefix}commandeClientId` as Path<T>,
    clientId: `${prefix}clientId` as Path<T>,
    plateformeId: `${prefix}plateformeId` as Path<T>,
  }
}

interface DestinationScopeFieldsProps<T extends FieldValues> {
  control: Control<T>
  path?: string
  commandes?: CommandeClient[] | null
  clients?: Client[] | null
  plateformes?: Plateforme[] | null
}

export function DestinationScopeFields<T extends FieldValues>({
  control,
  path,
  commandes,
  clients,
  plateformes,
}: DestinationScopeFieldsProps<T>) {
  const names = scopePaths<T>(path)

  const commandeClientId = useWatch({ control, name: names.commandeClientId }) as
    | number
    | null
    | undefined
  const clientId = useWatch({ control, name: names.clientId }) as number | null | undefined
  const plateformeId = useWatch({ control, name: names.plateformeId }) as
    | number
    | null
    | undefined

  const effectif = destinationEffectif({
    commandeClientId: commandeClientId ?? null,
    clientId: clientId ?? null,
    plateformeId: plateformeId ?? null,
  })

  const commande = commandes?.find((c) => c.id === commandeClientId)
  const client = clients?.find((c) => c.id === clientId)
  const plateforme = plateformes?.find((p) => p.id === plateformeId)

  const effectiveLabel =
    effectif === 'Commande'
      ? `${commande?.numeroCommande ?? `#${commandeClientId}`}`
      : effectif === 'Marque'
        ? (client ? clientLabel(client) : `#${clientId}`)
        : effectif === 'Plateforme'
          ? (plateforme?.nom ?? `#${plateformeId}`)
          : ''

  const secondary: string[] = []
  if (effectif !== 'Commande' && commande)
    secondary.push(`Commande ${commande.numeroCommande}`)
  if (effectif !== 'Marque' && client) secondary.push(`Client ${clientLabel(client)}`)
  if (effectif !== 'Plateforme' && plateforme) secondary.push(`Plateforme ${plateforme.nom}`)

  return (
    <div className="space-y-3 rounded-md border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Destination (niveaux combinables et indépendants)
      </p>

      {/* Commande client */}
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground">
          Commande client <span>(optionnel)</span>
        </Label>
        <Controller
          name={names.commandeClientId}
          control={control}
          render={({ field: f }) => (
            <CommandeSelect
              value={f.value ?? null}
              onChange={(id) => f.onChange(id)}
              commandes={commandes ?? []}
              placeholder="Aucune commande — sélectionner…"
            />
          )}
        />
      </div>

      {/* Marque (client) */}
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground">
          Marque / Client <span>(optionnel)</span>
        </Label>
        <Controller
          name={names.clientId}
          control={control}
          render={({ field: f }) => (
            <Select
              value={f.value ? String(f.value) : '0'}
              onValueChange={(v) => f.onChange(v === '0' ? null : Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun client — sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Aucun client</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {clientLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Plateforme */}
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground">
          Plateforme <span>(optionnel)</span>
        </Label>
        <Controller
          name={names.plateformeId}
          control={control}
          render={({ field: f }) => (
            <Select
              value={f.value ? String(f.value) : '0'}
              onValueChange={(v) => f.onChange(v === '0' ? null : Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucune plateforme — sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Aucune plateforme</SelectItem>
                {plateformes?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Niveau effectif (badge garde-fou) */}
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-muted-foreground">Niveau effectif :</span>
          <Badge
            variant={
              effectif === 'Commande'
                ? 'default'
                : effectif === 'StockLibre'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {effectif === 'StockLibre'
              ? DESTINATION_LABELS.StockLibre
              : `${DESTINATION_LABELS[effectif]} — ${effectiveLabel}`}
          </Badge>
        </div>
        {effectif === 'StockLibre' ? (
          <p className="mt-1 text-muted-foreground">
            Aucun niveau renseigné — la ligne est en stock libre (hors seaux de couverture a1/a2/a3).
          </p>
        ) : secondary.length > 0 ? (
          <p className="mt-1 text-muted-foreground">
            Contexte (non compté dans la couverture) : {secondary.join(' · ')}
          </p>
        ) : null}
      </div>
    </div>
  )
}