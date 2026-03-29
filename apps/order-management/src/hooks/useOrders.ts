import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Query key factory — generic to specific
export const queryKeys = {
  orders: {
    all: ['orders'] as const,
    list: (params?: { search?: string; status?: string; paid?: string }) =>
      [...queryKeys.orders.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.orders.all, 'detail', id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
  },
  clients: {
    all: ['clients'] as const,
  },
  teamMembers: {
    all: ['team-members'] as const,
  },
}

// Stale time constants
const STALE_TIME = {
  orders: 1000 * 60 * 2,      // 2 min — changes often
  dashboard: 1000 * 60 * 2,   // 2 min — derived from orders
  clients: 1000 * 60 * 10,    // 10 min — rarely changes
  teamMembers: 1000 * 60 * 30, // 30 min — almost never changes
}

export function useOrders(params?: { search?: string; status?: string; paid?: string }) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => api.orders.list(params),
    staleTime: STALE_TIME.orders,
  })
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id!),
    queryFn: () => api.orders.get(id!),
    enabled: id !== null,
    staleTime: STALE_TIME.orders,
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => api.dashboard.stats(),
    staleTime: STALE_TIME.dashboard,
  })
}

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => api.clients.list(),
    staleTime: STALE_TIME.clients,
  })
}

export function useTeamMembers() {
  return useQuery({
    queryKey: queryKeys.teamMembers.all,
    queryFn: () => api.teamMembers.list(),
    staleTime: STALE_TIME.teamMembers,
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.orders.create(data),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.orders.all }),
        qc.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ])
    },
  })
}

export function useUpdateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.orders.update(id, data),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.orders.all }),
        qc.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ])
    },
  })
}

export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.orders.delete(id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.orders.all }),
        qc.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ])
    },
  })
}
