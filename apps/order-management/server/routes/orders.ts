import { Hono } from 'hono'
import db, { queries } from '../db.js'

const orders = new Hono()

// List orders
orders.get('/', (c) => {
  const { search, status, paid, sort, dir } = c.req.query()

  let sql = `
    SELECT o.*, c.name as cliente, c.type as client_type
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.deleted_at IS NULL
  `
  const params: unknown[] = []

  if (search) {
    sql += ` AND (c.name LIKE ? OR o.item LIKE ? OR o.observaciones LIKE ?)`
    const term = `%${search}%`
    params.push(term, term, term)
  }
  if (status) {
    sql += ` AND o.status = ?`
    params.push(status)
  }
  if (paid !== undefined) {
    sql += ` AND o.is_paid = ?`
    params.push(paid === 'true' ? 1 : 0)
  }

  const sortCol = sort || 'id'
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC'
  const allowedSorts = ['id', 'item', 'valor_presupuestado', 'ganancia', 'fecha_compra', 'status']
  const safeSort = allowedSorts.includes(sortCol) ? `o.${sortCol}` : 'o.id'
  sql += ` ORDER BY ${safeSort} ${sortDir}`

  const rows = db.prepare(sql).all(...params)
  return c.json(rows)
})

// Get single order
orders.get('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const order = queries.getOrder.get(id)
  if (!order) return c.json({ error: 'Not found' }, 404)
  return c.json(order)
})

// Create order
orders.post('/', async (c) => {
  const body = await c.req.json()

  // Resolve client
  let clientId: number
  if (body.client_id) {
    clientId = body.client_id
  } else if (body.cliente) {
    let client = queries.getClientByName.get(body.cliente) as { id: number } | undefined
    if (!client) {
      const result = queries.insertClient.run(body.cliente, body.client_type || 'standard')
      clientId = Number(result.lastInsertRowid)
    } else {
      clientId = client.id
    }
  } else {
    return c.json({ error: 'client_id or cliente required' }, 400)
  }

  if (!body.item) return c.json({ error: 'item required' }, 400)

  const result = queries.insertOrder.run({
    client_id: clientId,
    item: body.item,
    cantidad: body.cantidad ?? 1,
    link_compra: body.link_compra ?? null,
    valor_presupuestado: body.valor_presupuestado ?? null,
    fecha_compra: body.fecha_compra ?? null,
    valor_compra: body.valor_compra ?? null,
    valor_debitado: body.valor_debitado ?? null,
    tax: body.tax ?? null,
    costo_envio: body.costo_envio ?? null,
    peso: body.peso ?? null,
    status: body.status ?? 'TO DO',
    is_stock: body.is_stock ? 1 : 0,
    is_paid: body.is_paid ? 1 : 0,
    asignado: body.asignado ?? null,
    ganancia: body.ganancia ?? null,
    paid_to: body.paid_to ?? null,
    tracking: body.tracking ?? null,
    observaciones: body.observaciones ?? null,
  })

  const created = queries.getOrder.get(Number(result.lastInsertRowid))
  return c.json(created, 201)
})

// Update order
orders.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = queries.getOrder.get(id) as Record<string, unknown> | undefined
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()

  // Resolve client if name provided
  let clientId = existing.client_id as number
  if (body.cliente && body.cliente !== existing.cliente) {
    let client = queries.getClientByName.get(body.cliente) as { id: number } | undefined
    if (!client) {
      const result = queries.insertClient.run(body.cliente, body.client_type || 'standard')
      clientId = Number(result.lastInsertRowid)
    } else {
      clientId = client.id
    }
  }

  queries.updateOrder.run({
    id,
    client_id: clientId,
    item: body.item ?? existing.item,
    cantidad: body.cantidad ?? existing.cantidad,
    link_compra: body.link_compra ?? existing.link_compra,
    valor_presupuestado: body.valor_presupuestado ?? existing.valor_presupuestado,
    fecha_compra: body.fecha_compra ?? existing.fecha_compra,
    valor_compra: body.valor_compra ?? existing.valor_compra,
    valor_debitado: body.valor_debitado ?? existing.valor_debitado,
    tax: body.tax ?? existing.tax,
    costo_envio: body.costo_envio ?? existing.costo_envio,
    peso: body.peso ?? existing.peso,
    status: body.status ?? existing.status,
    is_stock: body.is_stock !== undefined ? (body.is_stock ? 1 : 0) : existing.is_stock,
    is_paid: body.is_paid !== undefined ? (body.is_paid ? 1 : 0) : existing.is_paid,
    asignado: body.asignado ?? existing.asignado,
    ganancia: body.ganancia ?? existing.ganancia,
    paid_to: body.paid_to ?? existing.paid_to,
    tracking: body.tracking ?? existing.tracking,
    observaciones: body.observaciones ?? existing.observaciones,
  })

  const updated = queries.getOrder.get(id)
  return c.json(updated)
})

// Soft delete
orders.delete('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const result = queries.softDelete.run(id)
  if (result.changes === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

export default orders
