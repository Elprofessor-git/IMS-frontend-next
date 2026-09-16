export const TYPE_MACHINE_VALUES = [
  'Piqueuse',
  'Surjeteuse',
  'Recouvreuse',
  'Boutonniere',
  'Repasseuse',
  'Coupe',
  'Autre',
] as const
export type TypeMachine = (typeof TYPE_MACHINE_VALUES)[number]

export const STATUT_MACHINE_VALUES = [
  'EnService',
  'EnMaintenance',
  'HorsService',
  'Reforme',
] as const
export type StatutMachine = (typeof STATUT_MACHINE_VALUES)[number]

export const TYPE_INTERVENTION_VALUES = ['Preventive', 'Corrective'] as const
export type TypeIntervention = (typeof TYPE_INTERVENTION_VALUES)[number]

export type Machine = {
  id: number
  codeMachine: string
  marque: string | null
  modele: string | null
  numeroSerie: string | null
  typeMachine: TypeMachine
  dateAcquisition: string | null
  emplacement: string | null
  statut: StatutMachine
  notes: string | null
  nombreInterventions: number
}

export type MachineDetail = Machine & {
  interventions: InterventionMachine[]
}

export type CreateMachinePayload = {
  codeMachine: string
  marque?: string | null
  modele?: string | null
  numeroSerie?: string | null
  typeMachine: TypeMachine
  dateAcquisition?: string | null
  emplacement?: string | null
  statut?: StatutMachine
  notes?: string | null
}

export type UpdateMachinePayload = Partial<CreateMachinePayload>

export type InterventionMachine = {
  id: number
  machineId: number
  typeIntervention: TypeIntervention
  dateIntervention: string
  description: string
  pannneConstatee: string | null
  piecesRemplacees: string | null
  coutIntervention: number | null
  dureeImmobilisationHeures: number | null
  effectuePar: string | null
  prochaineDateMaintenance: string | null
  notes: string | null
}

export type CreateInterventionPayload = {
  typeIntervention: TypeIntervention
  dateIntervention?: string
  description: string
  pannneConstatee?: string | null
  piecesRemplacees?: string | null
  coutIntervention?: number | null
  dureeImmobilisationHeures?: number | null
  effectuePar?: string | null
  prochaineDateMaintenance?: string | null
  notes?: string | null
}