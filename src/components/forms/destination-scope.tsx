'use client'

import { Controller, useWatch, type Control, type FieldValues, type Path, type UseFormSetValue } from 'react-hook-form'
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
import { CommandesMultiSelect } from '@/components/forms/commandes-multi-select'
import {
  destinationEffectif,
  DESTINATION_LABELS,
} from '@/lib/validations/destination'
import type { CommandeClient } from '@/types/commande'
import type { Client } from '@/types/client'
import type { Plateforme } from '@/types/plateforme'

type ScopeKey = 'commandeClientIds' | 'commandeClientId' | 'clientId' | 'plateformeId'

function clientLabel(c: Pick<Client, 'nom' | 'prenom' | 'nomEntreprise'>): string {
  return c.nomEntreprise ?? `${c.nom} ${c.prenom ?? ''}`.trim()
}

function scopePaths<T extends FieldValues>(path?: string): Record<ScopeKey, Path<T>> {
  const prefix = path && path.length > 0 ? `${path}.` : ''
  return {
    commandeClientIds: `${prefix}commandeClientIds` as Path<T>,
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
  /**
   * Auto-remplissage Client/Plateforme depuis la Commande (ou la Plateforme
   * depuis le Client) lors d'une SÉLECTION utilisateur. Non déclenché sur null.
   */
  setValue?: UseFormSetValue<T>
}

export function DestinationScopeFields<T extends FieldValues>({
  control,
  path,
  commandes,
  clients,
  plateformes,
  setValue,
}: DestinationScopeFieldsProps<T>) {
  const names = scopePaths<T>(path)

  const commandeClientIds = useWatch({ control, name: names.commandeClientIds }) as
    | number[]
    | null
    | undefined
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
    commandeClientIds: commandeClientIds ?? null,
    commandeClientId: commandeClientId ?? null,
    clientId: clientId ?? null,
    plateformeId: plateformeId ?? null,
  })

  const groupeLabel = commandeClientIds && commandeClientIds.length >= 2
    ? commandeClientIds.map(id => {
        const c = commandes?.find(cc => cc.id === id)
        return c ? (c.titreCommande ?? c.numeroCommande ?? `#${id}`) : `#${id}`
      }).join(', ')
    : null
  const commande = commandes?.find((c) => c.id === commandeClientId)
  const client = clients?.find((c) => c.id === clientId)
  const plateforme = plateformes?.find((p) => p.id === plateformeId)

  // Auto-remplissage (Section E) : déclenché SUR SÉLECTION utilisateur uniquement
  // (pas sur reset/édition), pour ne pas écraser les valeurs sauvegardées d'une ligne.
  // Le cast `as never` contourne la contrainte PathValueImpl sur un type T générique ;
  // la valeur écrite reste un number (id), cohérent avec le schéma des champs ciblés.
  const setChamp = (name: Path<T>, value: number) => {
    if (!setValue) return
    setValue(name, value as never)
  }

  const autorenseignerPlateforme = (
    idClient: number | null | undefined,
  ) => {
    if (idClient == null) return
    const cl = clients?.find((c) => c.id === idClient)
    if (!cl) return
    if (cl.plateformeId) setChamp(names.plateformeId, cl.plateformeId)
    else if (cl.plateforme?.id) setChamp(names.plateformeId, cl.plateforme.id)
  }

  const autorenseignerDepuisCommande = (
    idCommande: number | null | undefined,
  ) => {
    if (idCommande == null) return
    const cmd = commandes?.find((c) => c.id === idCommande)
    if (!cmd) return
    // La commande porte un client : on renseigne le client, puis sa plateforme.
    setChamp(names.clientId, cmd.clientId)
    autorenseignerPlateforme(cmd.clientId)
  }

  const effectiveLabel =
    effectif === 'GroupeCommandes'
      ? (groupeLabel ?? `Groupe`)
      : effectif === 'Commande'
        ? `${commande?.titreCommande ?? commande?.numeroCommande ?? `#${commandeClientId}`}`
        : effectif === 'Marque'
          ? (client ? clientLabel(client) : `#${clientId}`)
          : effectif === 'Plateforme'
            ? (plateforme?.nom ?? `Plf #${plateformeId}`)
            : ''

  const secondary: string[] = []
  if (effectif !== 'GroupeCommandes' && commandeClientIds && commandeClientIds.length >= 2)
    secondary.push(`Groupe [${groupeLabel}]`)
  if (effectif !== 'Commande' && commande)
    secondary.push(`Commande ${commande.titreCommande ?? commande.numeroCommande}`)
  if (effectif !== 'Marque' && client) secondary.push(`Client ${clientLabel(client)}`)
  if (effectif !== 'Plateforme' && plateforme) secondary.push(`Plateforme ${plateforme.nom}`)

  return (
    <div className="space-y-3 rounded-md border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Destination (niveaux combinables et indépendants)
      </p>

      {/* Groupe de commandes */}
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground">
          Groupe de commandes <span>(optionnel — multi-sélection ≥ 2)</span>
        </Label>
        <Controller
          name={names.commandeClientIds}
          control={control}
          render={({ field: f }) => (
            <CommandesMultiSelect
              value={f.value ?? []}
              onChange={(ids) => f.onChange(ids)}
              commandes={commandes ?? []}
              placeholder="Aucune commande — sélectionner ≥ 2 commandes…"
            />
          )}
        />
      </div>

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
              onChange={(id) => {
                f.onChange(id)
                autorenseignerDepuisCommande(id)
              }}
              commandes={commandes ?? []}
              placeholder="Aucune commande — sélectionner…"
            />
          )}
        />
      </div>

      {/* Client */}
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground">
          Client <span>(optionnel)</span>
        </Label>
        <Controller
          name={names.clientId}
          control={control}
          render={({ field: f }) => (
            <Select
              value={f.value ? String(f.value) : '0'}
              onValueChange={(v) => {
                const id = v === '0' ? null : Number(v)
                f.onChange(id)
                autorenseignerPlateforme(id)
              }}
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
              effectif === 'GroupeCommandes' || effectif === 'Commande'
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
            Aucun niveau renseigné — la ligne est en stock libre (hors couverture physique).
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