'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  Machine,
  MachineDetail,
  CreateMachinePayload,
  UpdateMachinePayload,
  InterventionMachine,
  CreateInterventionPayload,
} from '@/types/machine'
import type { ApiError } from '@/types'

const KEY = ['machines'] as const

export function useGetMachines() {
  return useQuery<Machine[]>({
    queryKey: KEY,
    queryFn: () => apiClient.get<Machine[]>('/api/Machine'),
  })
}

export function useGetMachine(id: number) {
  return useQuery<MachineDetail>({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<MachineDetail>(`/api/Machine/${id}`),
    enabled: id > 0,
  })
}

export function useGetMachineInterventions(id: number, enabled: boolean) {
  return useQuery<InterventionMachine[]>({
    queryKey: [...KEY, id, 'interventions'],
    queryFn: () => apiClient.get<InterventionMachine[]>(`/api/Machine/${id}/Interventions`),
    enabled: id > 0 && enabled,
  })
}

export function useCreateMachine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMachinePayload) =>
      apiClient.post<Machine>('/api/Machine', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Machine créée avec succès')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la création'),
  })
}

export function useUpdateMachine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateMachinePayload & { id: number }) =>
      apiClient.put<void>(`/api/Machine/${id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id, 'interventions'] })
      toast.success('Machine mise à jour')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de la mise à jour'),
  })
}

export function useDeleteMachine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/Machine/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Machine supprimée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Impossible de supprimer la machine'),
  })
}

export function useCreateIntervention(machineId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInterventionPayload) =>
      apiClient.post<InterventionMachine>(`/api/Machine/${machineId}/Interventions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, machineId] })
      qc.invalidateQueries({ queryKey: [...KEY, machineId, 'interventions'] })
      toast.success('Intervention enregistrée')
    },
    onError: (err: ApiError) => toast.error(err.message ?? 'Erreur lors de l\u2019enregistrement'),
  })
}