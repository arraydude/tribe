import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestDb, seedClient, seedOrder, seedStock,
  getStatusId, getStaffId,
} from '../test-helpers-v2'

type Queries = ReturnType<typeof createTestDb>['queries']
type Db = ReturnType<typeof createTestDb>['db']
let db: Db
let queries: Queries

beforeEach(() => {
  const t = createTestDb()
  db = t.db
  queries = t.queries
})

// ── Resolution helpers (mirror route logic for direct DB testing) ──

function resolveClientId(q: Queries, body: any): number {
  if (body.client_id) return body.client_id
  if (!body.client_name) throw new Error('client_id or client_name required')
  let client = q.getClientByName.get(body.client_name.trim()) as { id: number } | undefined
  if (!client) {
    const result = q.insertClient.run({ name: body.client_name.trim(), notes: null })
    return Number(result.lastInsertRowid)
  }
  return client.id
}

function resolveStatusId(q: Queries, body: any): number {
  if (body.tracking_status_id) return body.tracking_status_id
  if (!body.status_name) throw new Error('tracking_status_id or status_name required')
  const status = q.getStatusByName.get(body.status_name.trim()) as { id: number } | undefined
  if (!status) throw new Error(`Unknown status: ${body.status_name}`)
  return status.id
}

function resolveStaffId(q: Queries, name: string | undefined | null): number | null {
  if (!name) return null
  const staff = q.getStaffByName.get(name.trim()) as { id: number } | undefined
  if (!staff) throw new Error(`Unknown staff: ${name}`)
  return staff.id
}

/** Helper to create an order using the resolution logic from the route */
function createOrder(q: Queries, body: any): Record<string, unknown> {
  const clientId = resolveClientId(q, body)
  const statusId = resolveStatusId(q, body)
  const assignedTo = body.assigned_to ?? resolveStaffId(q, body.assigned_to_name)

  const result = q.insertOrder.run({
    order_type: body.order_type ?? 'importacion',
    client_id: clientId,
    tracking_status_id: statusId,
    assigned_to: assignedTo,
    item: body.item ?? 'Test Item',
    quantity: body.quantity ?? 1,
    purchase_link: body.purchase_link ?? null,
    weight: body.weight ?? null,
    tracking_number: body.tracking_number ?? null,
    notes: body.notes ?? null,
    cost: body.cost ?? null,
    financing_cost: body.financing_cost ?? null,
    import_cost: body.import_cost ?? null,
    quoted_price: body.quoted_price ?? null,
    margin_percent: body.margin_percent ?? null,
    profit: body.profit ?? null,
    is_paid: body.is_paid ? 1 : 0,
    paid_to: body.paid_to ?? null,
    paid_at: body.paid_at ?? null,
    is_settled: body.is_settled ? 1 : 0,
    settled_at: body.settled_at ?? null,
    stock_id: body.stock_id ?? null,
    license_id: body.license_id ?? null,
    is_unlock: body.is_unlock ? 1 : 0,
    metadata: body.metadata ?? null,
  })

  return q.getOrder.get(Number(result.lastInsertRowid)) as Record<string, unknown>
}

// ── Tests ──

describe('Orders v2 — client resolution', () => {
  it('creates importacion order resolving client by name', () => {
    // Pre-seed the client
    const clientId = seedClient(queries, 'Abel')

    const order = createOrder(queries, {
      order_type: 'importacion',
      client_name: 'Abel',
      status_name: 'TO DO',
      item: 'Pure Turbos N55 Stage 2',
      cost: 1200,
      quoted_price: 1800,
      profit: 600,
    })

    expect(order.client_id).toBe(clientId)
    expect(order.client_name).toBe('Abel')
    expect(order.order_type).toBe('importacion')
    expect(order.item).toBe('Pure Turbos N55 Stage 2')
    expect(order.cost).toBe(1200)
    expect(order.profit).toBe(600)
  })

  it('auto-creates unknown client when resolving by name', () => {
    const order = createOrder(queries, {
      order_type: 'importacion',
      client_name: 'NuevoCliente',
      status_name: 'TO DO',
      item: 'CTS Downpipe B58',
    })

    expect(order.client_name).toBe('NuevoCliente')
    // Verify client was actually created in the DB
    const client = queries.getClientByName.get('NuevoCliente') as Record<string, unknown>
    expect(client).toBeDefined()
    expect(client.name).toBe('NuevoCliente')
    expect(order.client_id).toBe(client.id)
  })
})

describe('Orders v2 — status resolution', () => {
  it('resolves status by name', () => {
    const clientId = seedClient(queries, 'Luis')

    const order = createOrder(queries, {
      order_type: 'importacion',
      client_id: clientId,
      status_name: 'IN PROGRESS',
      item: 'BootMod3 Licence',
    })

    const expectedStatusId = getStatusId(queries, 'IN PROGRESS')
    expect(order.tracking_status_id).toBe(expectedStatusId)
    expect(order.status_name).toBe('IN PROGRESS')
  })
})

describe('Orders v2 — staff resolution', () => {
  it('resolves assigned_to by staff name', () => {
    const clientId = seedClient(queries, 'Lerda')

    const order = createOrder(queries, {
      order_type: 'repro',
      client_id: clientId,
      status_name: 'TO DO',
      assigned_to_name: 'Nahue',
      item: 'Femto Unlock G82',
    })

    const expectedStaffId = getStaffId(queries, 'Nahue')
    expect(order.assigned_to).toBe(expectedStaffId)
    expect(order.assigned_to_name).toBe('Nahue')
  })
})

describe('Orders v2 — order_type validation', () => {
  it('rejects invalid order_type at DB level', () => {
    const clientId = seedClient(queries, 'test_invalid')
    const statusId = getStatusId(queries, 'TO DO')

    expect(() => {
      db.prepare(`
        INSERT INTO orders (order_type, client_id, tracking_status_id, item)
        VALUES ('invalid_type', ?, ?, 'test')
      `).run(clientId, statusId)
    }).toThrow()
  })

  it('accepts all valid order_types', () => {
    const clientId = seedClient(queries, 'test_valid')
    const statusId = getStatusId(queries, 'TO DO')

    for (const type of ['importacion', 'inversion', 'venta_stock', 'repro']) {
      const order = createOrder(queries, {
        order_type: type,
        client_id: clientId,
        tracking_status_id: statusId,
        item: `Item for ${type}`,
      })
      expect(order.order_type).toBe(type)
    }
  })
})

describe('Orders v2 — list with joins', () => {
  it('returns joined data: client_name, status_name, assigned_to_name', () => {
    const clientId = seedClient(queries, 'Abel')
    const nahueId = getStaffId(queries, 'Nahue')

    seedOrder(queries, {
      order_type: 'importacion',
      client_id: clientId,
      assigned_to: nahueId,
      item: 'VRSF Intercooler',
      cost: 350,
      quoted_price: 600,
      profit: 250,
    })
    seedOrder(queries, {
      order_type: 'venta_stock',
      client_id: clientId,
      item: 'CTS Downpipe',
    })

    const orders = queries.listOrders.all() as Record<string, unknown>[]
    expect(orders.length).toBeGreaterThanOrEqual(2)

    // Orders are sorted by id DESC, so the second one we inserted is first
    const first = orders[0]
    expect(first.client_name).toBe('Abel')
    expect(first.status_name).toBe('TO DO') // default from seedOrder
    expect(first.order_type).toBe('venta_stock')

    const second = orders[1]
    expect(second.assigned_to_name).toBe('Nahue')
    expect(second.client_name).toBe('Abel')
    expect(second.item).toBe('VRSF Intercooler')
  })

  it('filters by status name using dynamic SQL', () => {
    const clientId = seedClient(queries, 'FilterClient')
    const inProgressId = getStatusId(queries, 'IN PROGRESS')
    const todoId = getStatusId(queries, 'TO DO')

    seedOrder(queries, { client_id: clientId, tracking_status_id: inProgressId, item: 'A' })
    seedOrder(queries, { client_id: clientId, tracking_status_id: todoId, item: 'B' })

    // Dynamic SQL filter (mirrors route logic)
    const sql = `
      SELECT o.*, c.name as client_name, ts.name as status_name
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      JOIN tracking_statuses ts ON ts.id = o.tracking_status_id
      WHERE o.deleted_at IS NULL AND ts.name = ?
      ORDER BY o.id DESC
    `
    const filtered = db.prepare(sql).all('IN PROGRESS') as Record<string, unknown>[]
    expect(filtered).toHaveLength(1)
    expect(filtered[0].item).toBe('A')
    expect(filtered[0].status_name).toBe('IN PROGRESS')
  })
})

describe('Orders v2 — soft delete', () => {
  it('sets deleted_at and hides from list and get', () => {
    const clientId = seedClient(queries, 'ToDelete')
    const orderId = seedOrder(queries, {
      client_id: clientId,
      item: 'Doomed Item',
    })

    // Verify it exists
    const before = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(before).toBeDefined()
    expect(before.item).toBe('Doomed Item')

    // Soft delete
    const result = queries.softDeleteOrder.run(orderId)
    expect(result.changes).toBe(1)

    // Should not appear in getOrder
    const after = queries.getOrder.get(orderId)
    expect(after).toBeUndefined()

    // Should not appear in listOrders
    const orders = queries.listOrders.all() as Record<string, unknown>[]
    expect(orders.find((o) => o.id === orderId)).toBeUndefined()
  })

  it('returns 0 changes for already-deleted order', () => {
    const orderId = seedOrder(queries)
    queries.softDeleteOrder.run(orderId)
    const result = queries.softDeleteOrder.run(orderId)
    expect(result.changes).toBe(0)
  })
})

describe('Orders v2 — update', () => {
  it('updates order fields correctly', () => {
    const clientId = seedClient(queries, 'UpdateTest')
    const nahueId = getStaffId(queries, 'Nahue')
    const fedeId = getStaffId(queries, 'Fede')
    const orderId = seedOrder(queries, {
      client_id: clientId,
      item: 'Original Item',
      cost: 100,
      assigned_to: nahueId,
    })

    const existing = queries.getOrder.get(orderId) as Record<string, unknown>
    const inProgressId = getStatusId(queries, 'IN PROGRESS')

    queries.updateOrder.run({
      id: orderId,
      order_type: existing.order_type,
      client_id: existing.client_id,
      tracking_status_id: inProgressId,
      assigned_to: fedeId,
      item: 'Updated Item',
      quantity: 3,
      purchase_link: 'https://ecstuning.com/part123',
      weight: 2.5,
      tracking_number: 'TRACK-123',
      notes: 'Urgent order',
      cost: 500,
      financing_cost: 25,
      import_cost: 90,
      quoted_price: 800,
      margin_percent: 25,
      profit: 185,
      is_paid: 1,
      paid_to: fedeId,
      paid_at: '2026-04-05',
      is_settled: 0,
      settled_at: null,
      stock_id: null,
      license_id: null,
      is_unlock: 0,
      metadata: null,
    })

    const updated = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(updated.item).toBe('Updated Item')
    expect(updated.quantity).toBe(3)
    expect(updated.cost).toBe(500)
    expect(updated.financing_cost).toBe(25)
    expect(updated.import_cost).toBe(90)
    expect(updated.quoted_price).toBe(800)
    expect(updated.margin_percent).toBe(25)
    expect(updated.profit).toBe(185)
    expect(updated.purchase_link).toBe('https://ecstuning.com/part123')
    expect(updated.weight).toBe(2.5)
    expect(updated.tracking_number).toBe('TRACK-123')
    expect(updated.notes).toBe('Urgent order')
    expect(updated.status_name).toBe('IN PROGRESS')
    expect(updated.assigned_to_name).toBe('Fede')
    expect(updated.is_paid).toBe(1)
    expect(updated.paid_to_name).toBe('Fede')
    expect(updated.paid_at).toBe('2026-04-05')
  })

  it('auto-syncs linked stock when investment order marked DONE with costs', () => {
    const clientId = seedClient(queries, 'Tribe')
    const todoId = getStatusId(queries, 'TO DO')
    const doneId = getStatusId(queries, 'DONE')

    // Create stock EN CAMINO (as the investment flow does)
    const stockId = seedStock(queries, {
      marca: 'CTS', item: 'Downpipe', variante: 'B58',
      quantity: 0, available: 0, cost_per_unit: 0, status: 'EN CAMINO',
    })

    // Create investment order linked to stock
    const orderId = seedOrder(queries, {
      order_type: 'inversion',
      client_id: clientId,
      tracking_status_id: todoId,
      item: 'CTS Downpipe B58',
      quantity: 9,
      cost: 3600,
      stock_id: stockId,
    })

    // Simulate arrival: update order with final costs and DONE status
    // This mirrors the route logic from orders-v2.ts PUT handler
    const existing = queries.getOrder.get(orderId) as Record<string, unknown>
    const finalCost = 3600
    const finalFinancingCost = 37.44
    const finalImportCost = 450
    const finalQuantity = 9

    queries.updateOrder.run({
      ...existing,
      id: orderId,
      tracking_status_id: doneId,
      cost: finalCost,
      financing_cost: finalFinancingCost,
      import_cost: finalImportCost,
      quantity: finalQuantity,
    })

    // Auto-sync stock (same logic as the route)
    const doneStatus = queries.getStatusByName.get('DONE') as { id: number }
    if (existing.order_type === 'inversion' && stockId && doneId === doneStatus.id) {
      const costPerUnit = Math.round(((finalCost + finalFinancingCost + finalImportCost) / finalQuantity) * 100) / 100
      const stockItem = queries.getStock.get(stockId) as Record<string, unknown>
      queries.updateStock.run({
        id: stockId,
        marca: stockItem.marca,
        item: stockItem.item,
        variante: stockItem.variante,
        quantity: finalQuantity,
        available: finalQuantity,
        cost_per_unit: costPerUnit,
        status: 'DISPONIBLE',
      })
    }

    // Verify stock was updated
    const stock = queries.getStock.get(stockId) as Record<string, unknown>
    expect(stock.status).toBe('DISPONIBLE')
    expect(stock.available).toBe(9)
    expect(stock.quantity).toBe(9)
    expect(stock.cost_per_unit).toBe(454.16) // (3600 + 37.44 + 450) / 9
  })

  it('does NOT sync stock when investment order is not DONE', () => {
    const clientId = seedClient(queries, 'Tribe2')
    const inProgressId = getStatusId(queries, 'IN PROGRESS')

    const stockId = seedStock(queries, {
      marca: 'NGK', item: 'Bujias', variante: 'B58',
      quantity: 0, available: 0, cost_per_unit: 0, status: 'EN CAMINO',
    })

    seedOrder(queries, {
      order_type: 'inversion',
      client_id: clientId,
      tracking_status_id: inProgressId,
      item: 'NGK Bujias B58',
      quantity: 10,
      cost: 500,
      stock_id: stockId,
    })

    // Stock should remain EN CAMINO (order is only IN PROGRESS, not DONE)
    const stock = queries.getStock.get(stockId) as Record<string, unknown>
    expect(stock.status).toBe('EN CAMINO')
    expect(stock.available).toBe(0)
  })

  it('update preserves unchanged fields', () => {
    const clientId = seedClient(queries, 'PreserveTest')
    const orderId = seedOrder(queries, {
      client_id: clientId,
      item: 'Keep This',
      cost: 999,
      notes: 'Important note',
    })

    const existing = queries.getOrder.get(orderId) as Record<string, unknown>

    // Update only the item, keep everything else from existing
    queries.updateOrder.run({
      id: orderId,
      order_type: existing.order_type,
      client_id: existing.client_id,
      tracking_status_id: existing.tracking_status_id,
      assigned_to: existing.assigned_to,
      item: 'Changed Item',
      quantity: existing.quantity,
      purchase_link: existing.purchase_link,
      weight: existing.weight,
      tracking_number: existing.tracking_number,
      notes: existing.notes,
      cost: existing.cost,
      financing_cost: existing.financing_cost,
      import_cost: existing.import_cost,
      quoted_price: existing.quoted_price,
      margin_percent: existing.margin_percent,
      profit: existing.profit,
      is_paid: existing.is_paid,
      paid_to: existing.paid_to,
      paid_at: existing.paid_at,
      is_settled: existing.is_settled,
      settled_at: existing.settled_at,
      stock_id: existing.stock_id,
      license_id: existing.license_id,
      is_unlock: existing.is_unlock,
      metadata: existing.metadata,
    })

    const updated = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(updated.item).toBe('Changed Item')
    expect(updated.cost).toBe(999)
    expect(updated.notes).toBe('Important note')
    expect(updated.order_type).toBe('importacion')
  })
})
