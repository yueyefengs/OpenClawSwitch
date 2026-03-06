import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { profileApi } from "../lib/api/profile"
import { queryKeys } from "../lib/query"

export function useProfiles() {
  return useQuery({
    queryKey: queryKeys.profiles,
    queryFn: profileApi.list,
  })
}

export function useActivateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => profileApi.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles }),
  })
}

export function useCreateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, config }: { name: string; config: object }) =>
      profileApi.create(name, null, config as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles }),
  })
}

export function useDeleteProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => profileApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles }),
  })
}

export function useRenameProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      profileApi.rename(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles }),
  })
}
