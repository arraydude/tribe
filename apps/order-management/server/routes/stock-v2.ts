import { Hono } from 'hono'
import db, { queries } from '../db-v2.js'

const stock = new Hono()

// ── GET / — List all stock items ──
stock.get('/', (c) => {
  const items = queries.listStock.all()
  return c.json(items)
})

// ── GET /balance — Balance report (total_invertido vs total_recuperado per item) ──
stock.get('/balance', (c) => {
  const balance = queries.stockBalance.all()
  return c.json(balance)
})

// ── GET /:id — Single stock item + its stock_prices ──
stock.get('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const item = queries.getStock.get(id) as Record<string, unknown> | undefined
  if (!item) return c.json({ error: 'Stock item not found' }, 404)
  const prices = queries.getStockPrices.all(id)
  return c.json({ ...item, prices })
})

// ── GET /:id/sales — Sales history for a stock item ──
stock.get('/:id/sales', (c) => {
  const id = Number(c.req.param('id'))
  const sales = queries.salesByStock.all(id)
  return c.json(sales)
})

// ── GET /:id/prices — Get stock_prices for item ──
stock.get('/:id/prices', (c) => {
  const id = Number(c.req.param('id'))
  const prices = queries.getStockPrices.all(id)
  return c.json(prices)
})

// ── POST / — Create investment (atomic transaction) ──
stock.post('/', async (c) => {
  const body = await c.req.json()
  const { marca, item, variante, quantity } = body

  if (!marca || !item) {
    return c.json({ error: 'marca and item are required' }, 400)
  }

  const valorCompra = Number(body.valor_compra) || 0
  const qty = Number(quantity) || 1
  const financingCost = Math.round(valorCompra * 0.01 * 1.04 * 100) / 100
  const itemName = [marca.trim(), item.trim(), variante?.trim()].filter(Boolean).join(' ')

  const createTx = db.transaction(() => {
    // Resolve or create "Tribe" client
    let tribeClient = queries.getClientByName.get('Tribe') as { id: number } | undefined
    if (!tribeClient) {
      const ins = queries.insertClient.run({ name: 'Tribe', notes: 'internal' })
      tribeClient = { id: Number(ins.lastInsertRowid) }
    }

    // Resolve "TO DO" status
    const todoStatus = queries.getStatusByName.get('TO DO') as { id: number }

    // Create investment order
    const orderResult = queries.insertOrder.run({
      order_type: 'inversion',
      client_id: tribeClient.id,
      tracking_status_id: todoStatus.id,
      assigned_to: null,
      item: itemName,
      quantity: qty,
      purchase_link: body.purchase_link ?? null,
      weight: null,
      tracking_number: null,
      notes: body.notes ?? null,
      cost: valorCompra,
      financing_cost: financingCost,
      import_cost: null,
      quoted_price: null,
      margin_percent: null,
      profit: null,
      is_paid: 1,
      paid_to: null,
      paid_at: null,
      is_settled: 0,
      settled_at: null,
      stock_id: null,
      license_id: null,
      is_unlock: 0,
      metadata: null,
    })
    const orderId = Number(orderResult.lastInsertRowid)

    // Create stock (EN CAMINO, available=0, cost_per_unit=0)
    const stockResult = queries.insertStock.run({
      order_id: orderId,
      marca: marca.trim(),
      item: item.trim(),
      variante: variante?.trim() || null,
      quantity: qty,
      available: 0,
      cost_per_unit: 0,
      status: 'EN CAMINO',
    })
    const stockId = Number(stockResult.lastInsertRowid)

    // Link order.stock_id → stock.id
    queries.updateOrder.run({
      ...(queries.getOrder.get(orderId) as Record<string, unknown>),
      id: orderId,
      stock_id: stockId,
    })

    // Link stock.order_id → order.id (already set in insertStock)

    const stockRow = queries.getStock.get(stockId)
    const orderRow = queries.getOrder.get(orderId)
    return { stock: stockRow, order: orderRow }
  })

  try {
    const result = createTx()
    return c.json(result, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Creation failed'
    return c.json({ error: msg }, 400)
  }
})

// ── PUT /:id — Update stock item (+ optional prices array) ──
stock.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = queries.getStock.get(id) as Record<string, unknown> | undefined
  if (!existing) return c.json({ error: 'Stock item not found' }, 404)

  const body = await c.req.json()
  const { prices, ...fields } = body

  const updateTx = db.transaction(() => {
    // Update stock fields
    queries.updateStock.run({
      id,
      marca: (fields.marca ?? existing.marca as string),
      item: (fields.item ?? existing.item as string),
      variante: fields.variante !== undefined ? (fields.variante || null) : existing.variante,
      quantity: fields.quantity != null ? Number(fields.quantity) : existing.quantity,
      available: fields.available != null ? Number(fields.available) : existing.available,
      cost_per_unit: fields.cost_per_unit != null ? Number(fields.cost_per_unit) : existing.cost_per_unit,
      status: fields.status ?? existing.status,
    })

    // Upsert stock_prices if provided
    if (Array.isArray(prices)) {
      const updatedStock = queries.getStock.get(id) as { cost_per_unit: number }
      for (const p of prices) {
        const tier = queries.getTierByName.get(p.tier_name) as { id: number } | undefined
        if (!tier) continue
        const price = Math.round(updatedStock.cost_per_unit * (1 + p.margin_percent / 100) * 100) / 100
        queries.upsertStockPrice.run({
          stock_id: id,
          price_tier_id: tier.id,
          margin_percent: p.margin_percent,
          price,
        })
      }
    }

    const updated = queries.getStock.get(id)
    const stockPrices = queries.getStockPrices.all(id)
    return { ...updated as Record<string, unknown>, prices: stockPrices }
  })

  try {
    const result = updateTx()
    return c.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed'
    return c.json({ error: msg }, 400)
  }
})

// ── POST /:id/sell — Sell from stock (atomic transaction) ──
stock.post('/:id/sell', async (c) => {
  const stockId = Number(c.req.param('id'))
  const body = await c.req.json()
  const { qty, cliente, client_id } = body

  if (!qty || qty < 1) return c.json({ error: 'qty must be >= 1' }, 400)

  const stockItem = queries.getStock.get(stockId) as Record<string, unknown> | undefined
  if (!stockItem) return c.json({ error: 'Stock item not found' }, 404)
  if (stockItem.status !== 'DISPONIBLE') {
    return c.json({ error: `Stock item not available for sale (status: ${stockItem.status})` }, 409)
  }

  const sellTx = db.transaction(() => {
    // Decrement available (WHERE available >= qty)
    const decResult = queries.decrementStock.run({ id: stockId, qty: Number(qty) })
    if (decResult.changes === 0) {
      throw new Error('Insufficient stock')
    }

    // Resolve client (auto-create if needed)
    let resolvedClientId: number
    if (client_id) {
      resolvedClientId = Number(client_id)
    } else if (cliente) {
      const existing = queries.getClientByName.get(cliente.trim()) as { id: number } | undefined
      if (existing) {
        resolvedClientId = existing.id
      } else {
        const ins = queries.insertClient.run({ name: cliente.trim(), notes: null })
        resolvedClientId = Number(ins.lastInsertRowid)
      }
    } else {
      throw new Error('cliente or client_id required')
    }

    // Look up price tier for this buyer (via dealers table)
    const costPerUnit = Number(stockItem.cost_per_unit) || 0
    let quotedPrice: number
    const dealer = queries.getDealerByClientId.get(resolvedClientId) as { price_tier_id: number } | undefined
    if (dealer) {
      const stockPrice = queries.getStockPriceByTier.get({
        stock_id: stockId,
        price_tier_id: dealer.price_tier_id,
      }) as { price: number } | undefined
      quotedPrice = stockPrice ? stockPrice.price * Number(qty) : costPerUnit * Number(qty)
    } else {
      // Default to 'lista' tier
      const listaTier = queries.getTierByName.get('lista') as { id: number }
      const stockPrice = queries.getStockPriceByTier.get({
        stock_id: stockId,
        price_tier_id: listaTier.id,
      }) as { price: number } | undefined
      quotedPrice = stockPrice ? stockPrice.price * Number(qty) : costPerUnit * Number(qty)
    }

    // Override with explicit quoted_price if provided
    if (body.quoted_price != null) {
      quotedPrice = Number(body.quoted_price)
    }

    const totalCost = Math.round(costPerUnit * Number(qty) * 100) / 100
    const profit = Math.round((quotedPrice - totalCost) * 100) / 100

    // Resolve status
    const todoStatus = queries.getStatusByName.get('TO DO') as { id: number }

    // Create order
    const orderResult = queries.insertOrder.run({
      order_type: 'venta_stock',
      client_id: resolvedClientId,
      tracking_status_id: body.tracking_status_id ?? todoStatus.id,
      assigned_to: body.assigned_to ?? null,
      item: body.item ?? `${stockItem.marca} ${stockItem.item}${stockItem.variante ? ' ' + stockItem.variante : ''}`,
      quantity: Number(qty),
      purchase_link: null,
      weight: null,
      tracking_number: null,
      notes: body.notes ?? null,
      cost: totalCost,
      financing_cost: null,
      import_cost: null,
      quoted_price: quotedPrice,
      margin_percent: costPerUnit > 0 ? Math.round(((quotedPrice / Number(qty) - costPerUnit) / costPerUnit) * 10000) / 100 : null,
      profit,
      is_paid: body.is_paid ? 1 : 0,
      paid_to: body.paid_to ?? null,
      paid_at: body.paid_at ?? null,
      is_settled: 0,
      settled_at: null,
      stock_id: stockId,
      license_id: null,
      is_unlock: 0,
      metadata: null,
    })

    // If available becomes 0, set status = SOLD OUT
    const updatedStock = queries.getStock.get(stockId) as Record<string, unknown>
    if (Number(updatedStock.available) === 0) {
      queries.updateStock.run({
        ...(updatedStock as any),
        id: stockId,
        status: 'SOLD OUT',
      })
    }

    const order = queries.getOrder.get(Number(orderResult.lastInsertRowid))
    const finalStock = queries.getStock.get(stockId)
    return { order, stock: finalStock }
  })

  try {
    const result = sellTx()
    return c.json(result, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sell failed'
    const status = msg === 'Insufficient stock' ? 409 : 400
    return c.json({ error: msg }, status)
  }
})

// ── POST /from-order/:orderId — Convert order to stock ──
stock.post('/from-order/:orderId', async (c) => {
  const orderId = Number(c.req.param('orderId'))
  const body = await c.req.json()

  const { marca, item, variante, quantity } = body
  if (!marca || !item) return c.json({ error: 'marca and item are required' }, 400)

  const convertTx = db.transaction(() => {
    const order = queries.getOrder.get(orderId) as Record<string, unknown> | undefined
    if (!order) throw new Error('Order not found')
    if (order.stock_id) throw new Error('Order already converted to stock')

    const cost = Number(order.cost) || 0
    const financingCost = Number(order.financing_cost) || 0
    const importCost = Number(order.import_cost) || 0
    const qty = Number(quantity) || Number(order.quantity) || 1
    const costPerUnit = body.cost_per_unit != null
      ? Number(body.cost_per_unit)
      : Math.round(((cost + financingCost + importCost) / qty) * 100) / 100

    // Create stock
    const stockResult = queries.insertStock.run({
      order_id: orderId,
      marca: marca.trim(),
      item: item.trim(),
      variante: variante?.trim() || null,
      quantity: qty,
      available: body.available != null ? Number(body.available) : qty,
      cost_per_unit: costPerUnit,
      status: body.status ?? 'DISPONIBLE',
    })
    const stockId = Number(stockResult.lastInsertRowid)

    // Create stock_prices with default margins if cost_per_unit > 0
    if (costPerUnit > 0) {
      const defaultMargins = [
        { tier: 'lista', margin: 40 },
        { tier: 'taller', margin: 30 },
        { tier: 'emi', margin: 20 },
      ]
      const priceOverrides = body.prices as { tier_name: string; margin_percent: number }[] | undefined
      const margins = priceOverrides
        ? priceOverrides.map((p) => ({ tier: p.tier_name, margin: p.margin_percent }))
        : defaultMargins

      for (const m of margins) {
        const tier = queries.getTierByName.get(m.tier) as { id: number } | undefined
        if (!tier) continue
        const price = Math.round(costPerUnit * (1 + m.margin / 100) * 100) / 100
        queries.upsertStockPrice.run({
          stock_id: stockId,
          price_tier_id: tier.id,
          margin_percent: m.margin,
          price,
        })
      }
    }

    // Link order.stock_id → stock.id
    queries.updateOrder.run({
      ...(order as any),
      id: orderId,
      stock_id: stockId,
    })

    const stockRow = queries.getStock.get(stockId)
    const orderRow = queries.getOrder.get(orderId)
    const stockPrices = queries.getStockPrices.all(stockId)
    return { stock: { ...(stockRow as Record<string, unknown>), prices: stockPrices }, order: orderRow }
  })

  try {
    const result = convertTx()
    return c.json(result, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Conversion failed'
    const status = msg === 'Order not found' ? 404 : msg === 'Order already converted to stock' ? 409 : 400
    return c.json({ error: msg }, status)
  }
})

export default stock
