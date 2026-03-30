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
  stock: {
    all: ['stock'] as const,
    list: () => [...queryKeys.stock.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.stock.all, 'detail', id] as const,
  },
}

// Stale time constants
const STALE_TIME = {
  orders: 1000 * 60 * 2,      // 2 min — changes often
  dashboard: 1000 * 60 * 2,   // 2 min — derived from orders
  clients: 1000 * 60 * 10,    // 10 min — rarely changes
  teamMembers: 1000 * 60 * 30, // 30 min — almost never changes
  stock: 1000 * 60 * 5,       // 5 min — changes less than orders
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

export function useStockItems() {
  return useQuery({
    queryKey: queryKeys.stock.list(),
    queryFn: () => api.stock.list(),
    staleTime: STALE_TIME.stock,
  })
}

export function useStockBalance() {
  return useQuery({
    queryKey: [...queryKeys.stock.all, 'balance'] as const,
    queryFn: () => api.stock.balance(),
    staleTime: STALE_TIME.stock,
  })
}

export function useCreateStockItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.stock.create(data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.stock.all })
    },
  })
}

export function useUpdateStockItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.stock.update(id, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.stock.all })
    },
  })
}

export function useSellStockItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, qty, order_data }: { id: number; qty: number; order_data: Record<string, unknown> }) =>
      api.stock.sell(id, { qty, order_data }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.stock.all }),
        qc.invalidateQueries({ queryKey: queryKeys.orders.all }),
        qc.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ])
    },
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
