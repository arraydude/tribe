import Database from 'better-sqlite3'
import { SCHEMA_V2_SQL, createQueriesV2 } from './schema-v2'

export function createTestDb() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_V2_SQL)
  const queries = createQueriesV2(db)
  return { db, queries }
}

// ── Lookup helpers ──

export function getStatusId(queries: ReturnType<typeof createQueriesV2>, name: string): number {
  const row = queries.getStatusByName.get(name) as { id: number } | undefined
  if (!row) throw new Error(`Status "${name}" not found`)
  return row.id
}

export function getStaffId(queries: ReturnType<typeof createQueriesV2>, name: string): number {
  const row = queries.getStaffByName.get(name) as { id: number } | undefined
  if (!row) throw new Error(`Staff "${name}" not found`)
  return row.id
}

export function getTierId(queries: ReturnType<typeof createQueriesV2>, name: string): number {
  const row = queries.getTierByName.get(name) as { id: number } | undefined
  if (!row) throw new Error(`Tier "${name}" not found`)
  return row.id
}

// ── Seed helpers ──

export function seedClient(
  queries: ReturnType<typeof createQueriesV2>,
  name: string,
  notes?: string
): number {
  const result = queries.insertClient.run({ name, notes: notes ?? null })
  return Number(result.lastInsertRowid)
}

export function seedDealer(
  queries: ReturnType<typeof createQueriesV2>,
  clientId: number,
  tierName: string
): number {
  const tierId = getTierId(queries, tierName)
  const result = queries.insertDealer.run({ client_id: clientId, price_tier_id: tierId })
  return Number(result.lastInsertRowid)
}

export function seedCar(
  queries: ReturnType<typeof createQueriesV2>,
  overrides: Partial<{ brand: string; model: string; version: string; vin: string }> = {}
): number {
  const result = queries.insertCar.run({
    brand: overrides.brand ?? 'BMW',
    model: overrides.model ?? 'M2',
    version: overrides.version ?? null,
    vin: overrides.vin ?? null,
  })
  return Number(result.lastInsertRowid)
}

export function seedStock(
  queries: ReturnType<typeof createQueriesV2>,
  overrides: Partial<{
    order_id: number | null; marca: string; item: string; variante: string | null
    quantity: number; available: number; cost_per_unit: number; status: string
  }> = {}
): number {
  const result = queries.insertStock.run({
    order_id: overrides.order_id ?? null,
    marca: overrides.marca ?? 'CTS',
    item: overrides.item ?? 'Downpipe',
    variante: overrides.variante ?? 'B58',
    quantity: overrides.quantity ?? 10,
    available: overrides.available ?? 10,
    cost_per_unit: overrides.cost_per_unit ?? 400,
    status: overrides.status ?? 'DISPONIBLE',
  })
  return Number(result.lastInsertRowid)
}

export function seedStockPrices(
  queries: ReturnType<typeof createQueriesV2>,
  stockId: number,
  prices: { tier: string; margin: number }[] = [
    { tier: 'lista', margin: 40 },
    { tier: 'taller', margin: 30 },
    { tier: 'emi', margin: 20 },
  ]
) {
  const stock = queries.getStock.get(stockId) as { cost_per_unit: number }
  for (const p of prices) {
    const tierId = getTierId(queries, p.tier)
    const price = Math.round(stock.cost_per_unit * (1 + p.margin / 100) * 100) / 100
    queries.upsertStockPrice.run({
      stock_id: stockId,
      price_tier_id: tierId,
      margin_percent: p.margin,
      price,
    })
  }
}

export function seedOrder(
  queries: ReturnType<typeof createQueriesV2>,
  overrides: Partial<{
    order_type: string; client_id: number; tracking_status_id: number; assigned_to: number | null
    item: string; quantity: number; purchase_link: string | null; weight: number | null
    tracking_number: string | null; notes: string | null
    cost: number | null; financing_cost: number | null; import_cost: number | null
    quoted_price: number | null; margin_percent: number | null; profit: number | null
    is_paid: number; paid_to: number | null; paid_at: string | null
    is_settled: number; settled_at: string | null
    stock_id: number | null; license_id: number | null; is_unlock: number
    metadata: string | null
  }> = {}
): number {
  const statusId = overrides.tracking_status_id ?? getStatusId(queries, 'TO DO')
  const clientId = overrides.client_id ?? seedClient(queries, `client_${Date.now()}`)

  const result = queries.insertOrder.run({
    order_type: overrides.order_type ?? 'importacion',
    client_id: clientId,
    tracking_status_id: statusId,
    assigned_to: overrides.assigned_to ?? null,
    item: overrides.item ?? 'Test Item',
    quantity: overrides.quantity ?? 1,
    purchase_link: overrides.purchase_link ?? null,
    weight: overrides.weight ?? null,
    tracking_number: overrides.tracking_number ?? null,
    notes: overrides.notes ?? null,
    cost: overrides.cost ?? null,
    financing_cost: overrides.financing_cost ?? null,
    import_cost: overrides.import_cost ?? null,
    quoted_price: overrides.quoted_price ?? null,
    margin_percent: overrides.margin_percent ?? null,
    profit: overrides.profit ?? null,
    is_paid: overrides.is_paid ?? 0,
    paid_to: overrides.paid_to ?? null,
    paid_at: overrides.paid_at ?? null,
    is_settled: overrides.is_settled ?? 0,
    settled_at: overrides.settled_at ?? null,
    stock_id: overrides.stock_id ?? null,
    license_id: overrides.license_id ?? null,
    is_unlock: overrides.is_unlock ?? 0,
    metadata: overrides.metadata ?? null,
  })
  return Number(result.lastInsertRowid)
}

export function seedLicence(
  queries: ReturnType<typeof createQueriesV2>,
  overrides: Partial<{
    car_id: number | null; order_id: number | null; type: string; code: string | null
    cost: number; is_used: number; metadata: string | null
  }> = {}
): number {
  const result = queries.insertLicence.run({
    car_id: overrides.car_id ?? null,
    order_id: overrides.order_id ?? null,
    type: overrides.type ?? 'bootmod3',
    code: overrides.code ?? null,
    cost: overrides.cost ?? 424,
    is_used: overrides.is_used ?? 0,
    used_at: null,
    is_settled: 0,
    settled_at: null,
    metadata: overrides.metadata ?? null,
  })
  return Number(result.lastInsertRowid)
}
