import { Hono } from 'hono'
import db, { queries } from '../db-v2.js'

const clients = new Hono()

// ── List all clients ──

clients.get('/', (c) => {
  const rows = queries.getAllClients.all()
  return c.json(rows)
})

// ── Get single client with cars and dealer info ──

clients.get('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const client = queries.getClientById.get(id)
  if (!client) return c.json({ error: 'Client not found' }, 404)

  const cars = queries.getCarsByClient.all(id)
  const dealer = queries.getDealerByClientId.get(id) ?? null

  return c.json({ ...client as object, cars, dealer })
})

// ── Create client ──

clients.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.name) return c.json({ error: 'name is required' }, 400)

  try {
    const result = queries.insertClient.run({
      name: body.name.trim(),
      notes: body.notes ?? null,
    })
    const created = queries.getClientById.get(Number(result.lastInsertRowid))
    return c.json(created, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Creation failed'
    if (msg.includes('UNIQUE')) {
      return c.json({ error: 'Client with that name already exists' }, 409)
    }
    return c.json({ error: msg }, 400)
  }
})

// ── Update client ──

clients.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = queries.getClientById.get(id) as Record<string, unknown> | undefined
  if (!existing) return c.json({ error: 'Client not found' }, 404)

  const body = await c.req.json()

  queries.updateClient.run({
    id,
    name: body.name ?? existing.name,
    notes: body.notes !== undefined ? body.notes : existing.notes,
  })

  const updated = queries.getClientById.get(id)
  return c.json(updated)
})

// ── Cars for client ──

clients.get('/:id/cars', (c) => {
  const id = Number(c.req.param('id'))
  const client = queries.getClientById.get(id)
  if (!client) return c.json({ error: 'Client not found' }, 404)

  const cars = queries.getCarsByClient.all(id)
  return c.json(cars)
})

// ── Link car to client OR create new car ──

clients.post('/:id/cars', async (c) => {
  const clientId = Number(c.req.param('id'))
  const client = queries.getClientById.get(clientId)
  if (!client) return c.json({ error: 'Client not found' }, 404)

  const body = await c.req.json()

  if (body.car_id) {
    // Link existing car
    const car = queries.getCarById.get(body.car_id)
    if (!car) return c.json({ error: 'Car not found' }, 404)

    queries.linkCarToClient.run({
      client_id: clientId,
      car_id: body.car_id,
      is_current: body.is_current !== undefined ? (body.is_current ? 1 : 0) : 1,
    })

    const cars = queries.getCarsByClient.all(clientId)
    return c.json(cars, 201)
  }

  // Create new car and link it
  if (!body.brand || !body.model) {
    return c.json({ error: 'car_id, or brand + model required' }, 400)
  }

  try {
    const carResult = queries.insertCar.run({
      brand: body.brand.trim(),
      model: body.model.trim(),
      version: body.version?.trim() ?? null,
      vin: body.vin?.trim() ?? null,
    })
    const carId = Number(carResult.lastInsertRowid)

    queries.linkCarToClient.run({
      client_id: clientId,
      car_id: carId,
      is_current: body.is_current !== undefined ? (body.is_current ? 1 : 0) : 1,
    })

    const car = queries.getCarById.get(carId)
    return c.json(car, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Creation failed'
    return c.json({ error: msg }, 400)
  }
})

// ── List all dealers ──

clients.get('/dealers', (c) => {
  const rows = queries.getAllDealers.all()
  return c.json(rows)
})

// ── Create dealer ──

clients.post('/dealers', async (c) => {
  const body = await c.req.json()

  let clientId: number
  let priceTierId: number

  // Resolve client
  if (body.client_id) {
    const client = queries.getClientById.get(body.client_id)
    if (!client) return c.json({ error: 'Client not found' }, 404)
    clientId = body.client_id
  } else if (body.client_name) {
    let client = queries.getClientByName.get(body.client_name.trim()) as { id: number } | undefined
    if (!client) {
      const result = queries.insertClient.run({
        name: body.client_name.trim(),
        notes: null,
      })
      clientId = Number(result.lastInsertRowid)
    } else {
      clientId = client.id
    }
  } else {
    return c.json({ error: 'client_id or client_name required' }, 400)
  }

  // Resolve price tier
  if (body.price_tier_id) {
    const tier = queries.getTierById.get(body.price_tier_id)
    if (!tier) return c.json({ error: 'Price tier not found' }, 404)
    priceTierId = body.price_tier_id
  } else if (body.tier_name) {
    const tier = queries.getTierByName.get(body.tier_name.trim()) as { id: number } | undefined
    if (!tier) return c.json({ error: `Unknown tier: ${body.tier_name}` }, 400)
    priceTierId = tier.id
  } else {
    return c.json({ error: 'price_tier_id or tier_name required' }, 400)
  }

  // Check if dealer already exists for this client
  const existingDealer = queries.getDealerByClientId.get(clientId)
  if (existingDealer) {
    return c.json({ error: 'Dealer already exists for this client' }, 409)
  }

  try {
    const result = queries.insertDealer.run({
      client_id: clientId,
      price_tier_id: priceTierId,
    })
    const dealers = queries.getAllDealers.all() as any[]
    const created = dealers.find((d) => d.id === Number(result.lastInsertRowid))
    return c.json(created, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Creation failed'
    return c.json({ error: msg }, 400)
  }
})

export default clients
