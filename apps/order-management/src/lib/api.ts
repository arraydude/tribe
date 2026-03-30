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

export interface OrderRow {
  id: number
  client_id: number
  cliente: string
  client_type: string
  item: string
  cantidad: number
  link_compra: string | null
  valor_presupuestado: number | null
  fecha_compra: string | null
  valor_compra: number | null
  valor_debitado: number | null
  tax: number | null
  costo_envio: number | null
  peso: number | null
  status: string
  is_stock: number
  is_paid: number
  asignado: string | null
  ganancia: number | null
  paid_to: string | null
  tracking: string | null
  observaciones: string | null
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  counts: {
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
  statusDistribution: { status: string; count: number }[]
  bestOrder: OrderRow | null
  worstOrder: OrderRow | null
}

export interface QuotationResult {
  costoBase: number
  envioArg: number
  costo: number
  precio: number
  ganancia: number
  margen: number
}

export interface Client {
  id: number
  name: string
  type: string
  notes: string | null
}

export interface TeamMember {
  id: number
  name: string
}

export interface StockItem {
  id: number
  marca: string
  item: string
  variante: string | null
  cantidad_invertida: number
  cantidad_disponible: number
  costo_por_unidad: number
  precio_lista: number | null
  precio_taller: number | null
  precio_emi: number | null
  created_at: string
  updated_at: string
}

export function getStockPrice(item: StockItem, clientType: string): number | null {
  switch (clientType) {
    case 'taller': return item.precio_taller
    case 'emi': return item.precio_emi
    case 'internal': return 0
    default: return item.precio_lista
  }
}

export function getStockDisplayName(item: StockItem): string {
  return [item.marca, item.item, item.variante].filter(Boolean).join(' ')
}

// Orders
export const api = {
  orders: {
    list: (params?: { search?: string; status?: string; paid?: string }) => {
      const qs = new URLSearchParams()
      if (params?.search) qs.set('search', params.search)
      if (params?.status) qs.set('status', params.status)
      if (params?.paid) qs.set('paid', params.paid)
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
  dashboard: {
    stats: () => request<DashboardStats>('/dashboard/stats'),
  },
  quotation: {
    calculate: (data: { precio_compra: number; peso_kg: number; margen?: number }) =>
      request<QuotationResult>('/quotation/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  clients: {
    list: () => request<Client[]>('/clients'),
  },
  teamMembers: {
    list: () => request<TeamMember[]>('/team-members'),
  },
  stock: {
    list: () => request<StockItem[]>('/stock'),
    get: (id: number) => request<StockItem>(`/stock/${id}`),
    create: (data: Record<string, unknown>) =>
      request<StockItem>('/stock', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      request<StockItem>(`/stock/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    sell: (id: number, data: { qty: number; order_data: Record<string, unknown> }) =>
      request<{ order: OrderRow; stock_item: StockItem }>(`/stock/${id}/sell`, {
        method: 'POST', body: JSON.stringify(data),
      }),
  },
}
