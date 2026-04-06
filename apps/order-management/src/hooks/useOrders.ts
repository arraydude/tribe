import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Query key factory ──

export const queryKeys = {
  orders: {
    all: ['orders'] as const,
    list: (params?: { search?: string; status?: string; paid?: string; order_type?: string }) =>
      [...queryKeys.orders.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.orders.all, 'detail', id] as const,
  },
  stock: {
    all: ['stock'] as const,
    list: () => [...queryKeys.stock.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.stock.all, 'detail', id] as const,
    balance: () => [...queryKeys.stock.all, 'balance'] as const,
    prices: (id: number) => [...queryKeys.stock.all, 'prices', id] as const,
    sales: (id: number) => [...queryKeys.stock.all, 'sales', id] as const,
  },
  clients: {
    all: ['clients'] as const,
    detail: (id: number) => [...queryKeys.clients.all, 'detail', id] as const,
    dealers: () => [...queryKeys.clients.all, 'dealers'] as const,
  },
  licences: {
    all: ['licences'] as const,
    available: (type: string) => [...queryKeys.licences.all, 'available', type] as const,
  },
  expenses: {
    all: ['expenses'] as const,
  },
  staff: {
    all: ['staff'] as const,
  },
  trackingStatuses: {
    all: ['tracking-statuses'] as const,
  },
  priceTiers: {
    all: ['price-tiers'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
  },
}

// ── Stale times ──

const STALE = {
  orders: 1000 * 60 * 2,
  dashboard: 1000 * 60 * 2,
  clients: 1000 * 60 * 10,
  staff: 1000 * 60 * 30,
  lookups: 1000 * 60 * 30,
  stock: 1000 * 60 * 5,
  licences: 1000 * 60 * 5,
  expenses: 1000 * 60 * 5,
}

// ── Lookups ──

export function useStaff() {
  return useQuery({
    queryKey: queryKeys.staff.all,
    queryFn: () => api.staff.list(),
    staleTime: STALE.staff,
  })
}

export function useTrackingStatuses() {
  return useQuery({
    queryKey: queryKeys.trackingStatuses.all,
    queryFn: () => api.trackingStatuses.list(),
    staleTime: STALE.lookups,
  })
}

export function usePriceTiers() {
  return useQuery({
    queryKey: queryKeys.priceTiers.all,
    queryFn: () => api.priceTiers.list(),
    staleTime: STALE.lookups,
  })
}

// ── Clients ──

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => api.clients.list(),
    staleTime: STALE.clients,
  })
}

export function useClient(id: number | null) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id!),
    queryFn: () => api.clients.get(id!),
    enabled: id !== null,
    staleTime: STALE.clients,
  })
}

export function useDealers() {
  return useQuery({
    queryKey: queryKeys.clients.dealers(),
    queryFn: () => api.clients.dealers(),
    staleTime: STALE.clients,
  })
}

// ── Orders ──

export function useOrders(params?: { search?: string; status?: string; paid?: string; order_type?: string }) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => api.orders.list(params),
    staleTime: STALE.orders,
  })
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id!),
    queryFn: () => api.orders.get(id!),
    enabled: id !== null,
    staleTime: STALE.orders,
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

// ── Stock ──

export function useStockItems() {
  return useQuery({
    queryKey: queryKeys.stock.list(),
    queryFn: () => api.stock.list(),
    staleTime: STALE.stock,
  })
}

export function useStockItem(id: number | null) {
  return useQuery({
    queryKey: queryKeys.stock.detail(id!),
    queryFn: () => api.stock.get(id!),
    enabled: id !== null,
    staleTime: STALE.stock,
  })
}

export function useStockBalance() {
  return useQuery({
    queryKey: queryKeys.stock.balance(),
    queryFn: () => api.stock.balance(),
    staleTime: STALE.stock,
  })
}

export function useStockPrices(id: number | null) {
  return useQuery({
    queryKey: queryKeys.stock.prices(id!),
    queryFn: () => api.stock.prices(id!),
    enabled: id !== null,
    staleTime: STALE.stock,
  })
}

export function useStockSales(id: number | null) {
  return useQuery({
    queryKey: queryKeys.stock.sales(id!),
    queryFn: () => api.stock.sales(id!),
    enabled: id !== null,
    staleTime: STALE.stock,
  })
}

export function useCreateStockItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.stock.create(data),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.stock.all }),
        qc.invalidateQueries({ queryKey: queryKeys.orders.all }),
        qc.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ])
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
    mutationFn: (data: Record<string, unknown>) => {
      const { id, ...rest } = data
      return api.stock.sell(id as number, rest)
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.stock.all }),
        qc.invalidateQueries({ queryKey: queryKeys.orders.all }),
        qc.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ])
    },
  })
}

export function useConvertToStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: number; data: Record<string, unknown> }) =>
      api.stock.fromOrder(orderId, data),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.stock.all }),
        qc.invalidateQueries({ queryKey: queryKeys.orders.all }),
      ])
    },
  })
}

// ── Licences ──

export function useLicences(params?: { type?: string; is_used?: string }) {
  return useQuery({
    queryKey: [...queryKeys.licences.all, params] as const,
    queryFn: () => api.licences.list(params),
    staleTime: STALE.licences,
  })
}

export function useAvailableLicences(type: string) {
  return useQuery({
    queryKey: queryKeys.licences.available(type),
    queryFn: () => api.licences.available(type),
    staleTime: STALE.licences,
  })
}

export function useCreateLicence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.licences.create(data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.licences.all })
    },
  })
}

export function useUpdateLicence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.licences.update(id, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.licences.all })
    },
  })
}

export function useUseLicence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { order_id: number; car_id?: number } }) =>
      api.licences.use(id, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.licences.all })
    },
  })
}

// ── Expenses ──

export function useExpenses() {
  return useQuery({
    queryKey: queryKeys.expenses.all,
    queryFn: () => api.expenses.list(),
    staleTime: STALE.expenses,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.expenses.create(data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.expenses.update(id, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}

// ── Dashboard ──

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => api.dashboard.stats(),
    staleTime: STALE.dashboard,
  })
}

// ── Legacy aliases (for gradual migration) ──

export const useTeamMembers = useStaff
