import { Hono } from 'hono'
import db, { queries } from '../db-v2.js'

const licences = new Hono()

// ── List all licences (with car info) ──

licences.get('/', (c) => {
  const { type, is_used } = c.req.query()

  if (!type && is_used === undefined) {
    const rows = queries.listLicences.all()
    return c.json(rows)
  }

  // Build filtered query
  let sql = `
    SELECT l.*,
      c.brand as car_brand, c.model as car_model, c.version as car_version
    FROM licences l
    LEFT JOIN cars c ON c.id = l.car_id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (type) {
    sql += ` AND l.type = ?`
    params.push(type)
  }
  if (is_used !== undefined) {
    sql += ` AND l.is_used = ?`
    params.push(is_used === 'true' ? 1 : 0)
  }

  sql += ` ORDER BY l.id DESC`

  const rows = db.prepare(sql).all(...params)
  return c.json(rows)
})

// ── Available licences by type ──

licences.get('/available/:type', (c) => {
  const type = c.req.param('type')
  const validTypes = ['bootmod3', 'femto', 'xhp']
  if (!validTypes.includes(type)) {
    return c.json({ error: `type must be one of: ${validTypes.join(', ')}` }, 400)
  }

  const rows = queries.getAvailableLicences.all(type)
  return c.json(rows)
})

// ── Get single licence ──

licences.get('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const licence = queries.getLicence.get(id)
  if (!licence) return c.json({ error: 'Licence not found' }, 404)
  return c.json(licence)
})

// ── Create licence ──

licences.post('/', async (c) => {
  const body = await c.req.json()

  const validTypes = ['bootmod3', 'femto', 'xhp']
  if (!body.type || !validTypes.includes(body.type)) {
    return c.json({ error: `type must be one of: ${validTypes.join(', ')}` }, 400)
  }

  if (body.cost === undefined || body.cost === null) {
    return c.json({ error: 'cost is required' }, 400)
  }

  // Validate car_id if provided
  if (body.car_id) {
    const car = queries.getCarById.get(body.car_id)
    if (!car) return c.json({ error: 'Car not found' }, 404)
  }

  try {
    const result = queries.insertLicence.run({
      car_id: body.car_id ?? null,
      order_id: body.order_id ?? null,
      type: body.type,
      code: body.code ?? null,
      cost: Number(body.cost),
      is_used: 0,
      used_at: null,
      is_settled: 0,
      settled_at: null,
      metadata: body.metadata ?? null,
    })

    const created = queries.getLicence.get(Number(result.lastInsertRowid))
    return c.json(created, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Creation failed'
    return c.json({ error: msg }, 400)
  }
})

// ── Update licence ──

licences.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = queries.getLicence.get(id) as Record<string, unknown> | undefined
  if (!existing) return c.json({ error: 'Licence not found' }, 404)

  const body = await c.req.json()

  // Validate type if provided
  if (body.type) {
    const validTypes = ['bootmod3', 'femto', 'xhp']
    if (!validTypes.includes(body.type)) {
      return c.json({ error: `type must be one of: ${validTypes.join(', ')}` }, 400)
    }
  }

  // Validate car_id if provided
  if (body.car_id) {
    const car = queries.getCarById.get(body.car_id)
    if (!car) return c.json({ error: 'Car not found' }, 404)
  }

  queries.updateLicence.run({
    id,
    car_id: body.car_id !== undefined ? body.car_id : existing.car_id,
    order_id: body.order_id !== undefined ? body.order_id : existing.order_id,
    type: body.type ?? existing.type,
    code: body.code !== undefined ? body.code : existing.code,
    cost: body.cost !== undefined ? Number(body.cost) : existing.cost,
    is_used: body.is_used !== undefined ? (body.is_used ? 1 : 0) : existing.is_used,
    used_at: body.used_at !== undefined ? body.used_at : existing.used_at,
    is_settled: body.is_settled !== undefined ? (body.is_settled ? 1 : 0) : existing.is_settled,
    settled_at: body.settled_at !== undefined ? body.settled_at : existing.settled_at,
    metadata: body.metadata !== undefined ? body.metadata : existing.metadata,
  })

  const updated = queries.getLicence.get(id)
  return c.json(updated)
})

// ── Mark licence as used ──

licences.post('/:id/use', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = queries.getLicence.get(id) as Record<string, unknown> | undefined
  if (!existing) return c.json({ error: 'Licence not found' }, 404)

  if (existing.is_used === 1) {
    return c.json({ error: 'Licence is already used' }, 409)
  }

  const body = await c.req.json()

  if (!body.order_id) {
    return c.json({ error: 'order_id is required' }, 400)
  }

  queries.updateLicence.run({
    id,
    car_id: body.car_id !== undefined ? body.car_id : existing.car_id,
    order_id: body.order_id,
    type: existing.type,
    code: existing.code,
    cost: existing.cost,
    is_used: 1,
    used_at: new Date().toISOString(),
    is_settled: existing.is_settled,
    settled_at: existing.settled_at,
    metadata: existing.metadata,
  })

  const updated = queries.getLicence.get(id)
  return c.json(updated)
})

export default licences
