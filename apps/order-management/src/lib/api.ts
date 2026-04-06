const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

// ── Types ──

export interface StaffMember {
  id: number
  name: string
}

export interface TrackingStatus {
  id: number
  name: string
  sort_order: number
}

export interface PriceTier {
  id: number
  name: string
}

export interface Client {
  id: number
  name: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Car {
  id: number
  brand: string
  model: string
  version: string | null
  vin: string | null
  is_current?: number
}

export interface Dealer {
  id: number
  client_id: number
  price_tier_id: number
  client_name: string
  tier_name: string
}

export interface OrderRow {
  id: number
  order_type: 'importacion' | 'inversion' | 'venta_stock' | 'repro'
  client_id: number
  client_name: string
  tracking_status_id: number
  status_name: string
  status_sort?: number
  assigned_to: number | null
  assigned_to_name: string | null
  item: string
  quantity: number
  purchase_link: string | null
  weight: number | null
  tracking_number: string | null
  notes: string | null
  cost: number | null
  financing_cost: number | null
  import_cost: number | null
  quoted_price: number | null
  margin_percent: number | null
  profit: number | null
  is_paid: number
  paid_to: number | null
  paid_to_name: string | null
  paid_at: string | null
  is_settled: number
  settled_at: string | null
  stock_id: number | null
  license_id: number | null
  is_unlock: number
  metadata: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface OrderBreakdown {
  id: number
  order_id: number
  description: string
  cost: number
  tracking_number: string | null
  metadata: string | null
}

export interface StockPrice {
  id: number
  stock_id: number
  price_tier_id: number
  tier_name: string
  margin_percent: number
  price: number
}

export interface StockItem {
  id: number
  order_id: number | null
  marca: string
  item: string
  variante: string | null
  quantity: number
  available: number
  cost_per_unit: number
  status: string
  created_at: string
  updated_at: string
  prices?: StockPrice[]
}

export interface StockBalance {
  id: number
  marca: string
  item: string
  variante: string | null
  quantity: number
  available: number
  cost_per_unit: number
  status: string
  total_invertido: number
  total_recuperado: number
  balance: number
  ventas_count: number
}

export interface Licence {
  id: number
  car_id: number | null
  order_id: number | null
  type: string
  code: string | null
  cost: number
  is_used: number
  used_at: string | null
  is_settled: number
  settled_at: string | null
  metadata: string | null
  car_brand?: string
  car_model?: string
  car_version?: string
}

export interface Expense {
  id: number
  description: string
  cost: number
  paid_by: number | null
  paid_by_name: string | null
  paid_at: string | null
  is_settled: number
  settled_at: string | null
}

export interface DashboardStats {
  stats: {
    total_orders: number
    done_count: number
    in_progress_count: number
    todo_count: number
    received_count: number
  }
  profit: {
    total_profit: number
    avg_profit: number
    total_revenue: number
    total_cost: number
  }
  topClients: { name: string; total_profit: number; order_count: number }[]
  monthly: { month: string; profit: number; orders: number }[]
  statusDist: { status: string; count: number }[]
  best: (OrderRow & { client_name: string }) | null
  worst: (OrderRow & { client_name: string }) | null
}

export interface QuotationResult {
  cost: number
  financing_cost: number
  import_cost: number
  total_cost: number
  quoted_price: number
  profit: number
  margin_percent: number
}

// ── Helpers ──

export function getStockDisplayName(item: StockItem | StockBalance): string {
  return [item.marca, item.item, item.variante].filter(Boolean).join(' ')
}

export function getStockPriceForTier(prices: StockPrice[], tierName: string): StockPrice | undefined {
  return prices.find(p => p.tier_name === tierName)
}

// ── API ──

export const api = {
  orders: {
    list: (params?: { search?: string; status?: string; paid?: string; order_type?: string }) => {
      const qs = new URLSearchParams()
      if (params?.search) qs.set('search', params.search)
      if (params?.status) qs.set('status', params.status)
      if (params?.paid) qs.set('paid', params.paid)
      if (params?.order_type) qs.set('order_type', params.order_type)
      const query = qs.toString()
      return request<OrderRow[]>(`/orders${query ? `?${query}` : ''}`)
    },
    get: (id: number) => request<OrderRow>(`/orders/${id}`),
    create: (data: Record<string, unknown>) =>
      request<OrderRow>('/orders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      request<OrderRow>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ ok: boolean }>(`/orders/${id}`, { method: 'DELETE' }),
  },

  stock: {
    list: () => request<StockItem[]>('/stock'),
    balance: () => request<StockBalance[]>('/stock/balance'),
    get: (id: number) => request<StockItem & { prices: StockPrice[] }>(`/stock/${id}`),
    prices: (id: number) => request<StockPrice[]>(`/stock/${id}/prices`),
    create: (data: Record<string, unknown>) =>
      request<{ stock: StockItem; order: OrderRow }>('/stock', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      request<StockItem & { prices: StockPrice[] }>(`/stock/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    sell: (id: number, data: Record<string, unknown>) =>
      request<{ order: OrderRow; stock: StockItem }>(`/stock/${id}/sell`, { method: 'POST', body: JSON.stringify(data) }),
    sales: (id: number) => request<OrderRow[]>(`/stock/${id}/sales`),
    fromOrder: (orderId: number, data: Record<string, unknown>) =>
      request<{ stock: StockItem; order: OrderRow }>(`/stock/from-order/${orderId}`, { method: 'POST', body: JSON.stringify(data) }),
  },

  clients: {
    list: () => request<Client[]>('/clients'),
    get: (id: number) => request<Client & { cars: Car[]; dealer: Dealer | null }>(`/clients/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    cars: (id: number) => request<Car[]>(`/clients/${id}/cars`),
    dealers: () => request<Dealer[]>('/clients/dealers'),
  },

  licences: {
    list: (params?: { type?: string; is_used?: string }) => {
      const qs = new URLSearchParams()
      if (params?.type) qs.set('type', params.type)
      if (params?.is_used) qs.set('is_used', params.is_used)
      const query = qs.toString()
      return request<Licence[]>(`/licences${query ? `?${query}` : ''}`)
    },
    available: (type: string) => request<Licence[]>(`/licences/available/${type}`),
    get: (id: number) => request<Licence>(`/licences/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Licence>('/licences', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      request<Licence>(`/licences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    use: (id: number, data: { order_id: number; car_id?: number }) =>
      request<Licence>(`/licences/${id}/use`, { method: 'POST', body: JSON.stringify(data) }),
  },

  expenses: {
    list: () => request<Expense[]>('/expenses'),
    get: (id: number) => request<Expense>(`/expenses/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      request<Expense>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  staff: {
    list: () => request<StaffMember[]>('/staff'),
  },

  trackingStatuses: {
    list: () => request<TrackingStatus[]>('/tracking-statuses'),
  },

  priceTiers: {
    list: () => request<PriceTier[]>('/price-tiers'),
  },

  dashboard: {
    stats: () => request<DashboardStats>('/dashboard/stats'),
  },

  quotation: {
    calculate: (data: { cost: number; weight: number; margin_percent?: number }) =>
      request<QuotationResult>('/quotation/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
}
