import { Hono } from 'hono'
import db, { queries } from '../db-v2.js'

const ordersV2 = new Hono()

// ── Resolution helpers ──

function resolveClientId(body: any): number {
  if (body.client_id) return body.client_id
  if (!body.client_name) throw new Error('client_id or client_name required')
  let client = queries.getClientByName.get(body.client_name.trim()) as { id: number } | undefined
  if (!client) {
    const result = queries.insertClient.run({ name: body.client_name.trim(), notes: null })
    return Number(result.lastInsertRowid)
  }
  return client.id
}

function resolveStatusId(body: any): number {
  if (body.tracking_status_id) return body.tracking_status_id
  if (!body.status_name) throw new Error('tracking_status_id or status_name required')
  const status = queries.getStatusByName.get(body.status_name.trim()) as { id: number } | undefined
  if (!status) throw new Error(`Unknown status: ${body.status_name}`)
  return status.id
}

function resolveStaffId(name: string | undefined | null): number | null {
  if (!name) return null
  const staff = queries.getStaffByName.get(name.trim()) as { id: number } | undefined
  if (!staff) throw new Error(`Unknown staff: ${name}`)
  return staff.id
}

// ── List orders ──

ordersV2.get('/', (c) => {
  const { search, status, paid, order_type, sort, dir } = c.req.query()

  let sql = `
    SELECT o.*,
      c.name as client_name,
      ts.name as status_name,
      ts.sort_order as status_sort,
      sa.name as assigned_to_name,
      sp.name as paid_to_name
    FROM orders o
    JOIN clients c ON c.id = o.client_id
    JOIN tracking_statuses ts ON ts.id = o.tracking_status_id
    LEFT JOIN staff sa ON sa.id = o.assigned_to
    LEFT JOIN staff sp ON sp.id = o.paid_to
    WHERE o.deleted_at IS NULL
  `
  const params: unknown[] = []

  if (search) {
    sql += ` AND (c.name LIKE ? OR o.item LIKE ? OR o.notes LIKE ?)`
    const term = `%${search}%`
    params.push(term, term, term)
  }
  if (status) {
    sql += ` AND ts.name = ?`
    params.push(status)
  }
  if (paid !== undefined) {
    sql += ` AND o.is_paid = ?`
    params.push(paid === 'true' ? 1 : 0)
  }
  if (order_type) {
    sql += ` AND o.order_type = ?`
    params.push(order_type)
  }

  const sortCol = sort || 'id'
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC'
  const allowedSorts = [
    'id', 'item', 'quoted_price', 'profit', 'created_at',
    'cost', 'quantity', 'order_type',
  ]
  const safeSort = allowedSorts.includes(sortCol) ? `o.${sortCol}` : 'o.id'
  sql += ` ORDER BY ${safeSort} ${sortDir}`

  const rows = db.prepare(sql).all(...params)
  return c.json(rows)
})

// ── Get single order ──

ordersV2.get('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const order = queries.getOrder.get(id)
  if (!order) return c.json({ error: 'Not found' }, 404)
  return c.json(order)
})

// ── Create order ──

ordersV2.post('/', async (c) => {
  const body = await c.req.json()

  // Validate order_type
  const validTypes = ['importacion', 'inversion', 'venta_stock', 'repro']
  if (!body.order_type || !validTypes.includes(body.order_type)) {
    return c.json({ error: `order_type must be one of: ${validTypes.join(', ')}` }, 400)
  }

  if (!body.item) return c.json({ error: 'item required' }, 400)

  let clientId: number
  try {
    clientId = resolveClientId(body)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }

  let statusId: number
  try {
    statusId = resolveStatusId(body)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }

  let assignedTo: number | null = null
  try {
    assignedTo = body.assigned_to ?? resolveStaffId(body.assigned_to_name)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }

  let paidTo: number | null = null
  try {
    paidTo = body.paid_to ?? resolveStaffId(body.paid_to_name)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }

  const result = queries.insertOrder.run({
    order_type: body.order_type,
    client_id: clientId,
    tracking_status_id: statusId,
    assigned_to: assignedTo,
    item: body.item,
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
    paid_to: paidTo,
    paid_at: body.paid_at ?? null,
    is_settled: body.is_settled ? 1 : 0,
    settled_at: body.settled_at ?? null,
    stock_id: body.stock_id ?? null,
    license_id: body.license_id ?? null,
    is_unlock: body.is_unlock ? 1 : 0,
    metadata: body.metadata ?? null,
  })

  const created = queries.getOrder.get(Number(result.lastInsertRowid))
  return c.json(created, 201)
})

// ── Update order ──

ordersV2.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = queries.getOrder.get(id) as Record<string, unknown> | undefined
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()

  // Validate order_type if provided
  const validTypes = ['importacion', 'inversion', 'venta_stock', 'repro']
  if (body.order_type && !validTypes.includes(body.order_type)) {
    return c.json({ error: `order_type must be one of: ${validTypes.join(', ')}` }, 400)
  }

  // Resolve client
  let clientId = existing.client_id as number
  if (body.client_name) {
    try {
      clientId = resolveClientId(body)
    } catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  } else if (body.client_id) {
    clientId = body.client_id
  }

  // Resolve status
  let statusId = existing.tracking_status_id as number
  if (body.status_name) {
    try {
      statusId = resolveStatusId(body)
    } catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  } else if (body.tracking_status_id) {
    statusId = body.tracking_status_id
  }

  // Resolve assigned_to
  let assignedTo = existing.assigned_to as number | null
  if (body.assigned_to_name !== undefined) {
    try {
      assignedTo = resolveStaffId(body.assigned_to_name)
    } catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  } else if (body.assigned_to !== undefined) {
    assignedTo = body.assigned_to
  }

  // Resolve paid_to
  let paidTo = existing.paid_to as number | null
  if (body.paid_to_name !== undefined) {
    try {
      paidTo = resolveStaffId(body.paid_to_name)
    } catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  } else if (body.paid_to !== undefined) {
    paidTo = body.paid_to
  }

  queries.updateOrder.run({
    id,
    order_type: body.order_type ?? existing.order_type,
    client_id: clientId,
    tracking_status_id: statusId,
    assigned_to: assignedTo,
    item: body.item ?? existing.item,
    quantity: body.quantity ?? existing.quantity,
    purchase_link: body.purchase_link ?? existing.purchase_link,
    weight: body.weight ?? existing.weight,
    tracking_number: body.tracking_number ?? existing.tracking_number,
    notes: body.notes ?? existing.notes,
    cost: body.cost ?? existing.cost,
    financing_cost: body.financing_cost ?? existing.financing_cost,
    import_cost: body.import_cost ?? existing.import_cost,
    quoted_price: body.quoted_price ?? existing.quoted_price,
    margin_percent: body.margin_percent ?? existing.margin_percent,
    profit: body.profit ?? existing.profit,
    is_paid: body.is_paid !== undefined ? (body.is_paid ? 1 : 0) : existing.is_paid,
    paid_to: paidTo,
    paid_at: body.paid_at ?? existing.paid_at,
    is_settled: body.is_settled !== undefined ? (body.is_settled ? 1 : 0) : existing.is_settled,
    settled_at: body.settled_at ?? existing.settled_at,
    stock_id: body.stock_id ?? existing.stock_id,
    license_id: body.license_id ?? existing.license_id,
    is_unlock: body.is_unlock !== undefined ? (body.is_unlock ? 1 : 0) : existing.is_unlock,
    metadata: body.metadata ?? existing.metadata,
  })

  const updated = queries.getOrder.get(id)
  return c.json(updated)
})

// ── Soft delete ──

ordersV2.delete('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const result = queries.softDeleteOrder.run(id)
  if (result.changes === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

export default ordersV2
