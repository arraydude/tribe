import { Hono } from 'hono'
import db, { queries } from '../db.js'

const stock = new Hono()

// List all stock items
stock.get('/', (c) => {
  const items = queries.listStockItems.all()
  return c.json(items)
})

// Balance por item (inversión vs recuperado)
stock.get('/balance', (c) => {
  const balance = queries.stockBalance.all()
  return c.json(balance)
})

// Get single stock item
stock.get('/:id', (c) => {
  const item = queries.getStockItem.get(Number(c.req.param('id')))
  if (!item) return c.json({ error: 'Stock item not found' }, 404)
  return c.json(item)
})

// Create stock item (investment)
stock.post('/', async (c) => {
  const body = await c.req.json()
  const { marca, item, variante, cantidad_invertida, cantidad_disponible, costo_por_unidad, precio_lista, precio_taller, precio_emi } = body

  if (!marca || !item) {
    return c.json({ error: 'marca and item are required' }, 400)
  }

  const result = queries.insertStockItem.run({
    marca: marca.trim(),
    item: item.trim(),
    variante: variante?.trim() || null,
    cantidad_invertida: Number(cantidad_invertida) || 0,
    cantidad_disponible: Number(cantidad_disponible) || Number(cantidad_invertida) || 0,
    costo_por_unidad: Number(costo_por_unidad) || 0,
    precio_lista: precio_lista != null ? Number(precio_lista) : null,
    precio_taller: precio_taller != null ? Number(precio_taller) : null,
    precio_emi: precio_emi != null ? Number(precio_emi) : null,
    status: body.status || 'DISPONIBLE',
    tracking: body.tracking || null,
    fecha_compra: body.fecha_compra || null,
    fecha_llegada: body.fecha_llegada || null,
    valor_compra_total: body.valor_compra_total != null ? Number(body.valor_compra_total) : null,
    tax: body.tax != null ? Number(body.tax) : null,
    costo_envio: body.costo_envio != null ? Number(body.costo_envio) : null,
  })

  const created = queries.getStockItem.get(result.lastInsertRowid)
  return c.json(created, 201)
})

// Update stock item
stock.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = queries.getStockItem.get(id)
  if (!existing) return c.json({ error: 'Stock item not found' }, 404)

  const body = await c.req.json()
  const ex = existing as Record<string, unknown>

  queries.updateStockItem.run({
    id,
    marca: (body.marca ?? ex.marca as string).trim(),
    item: (body.item ?? ex.item as string).trim(),
    variante: body.variante !== undefined ? body.variante?.trim() || null : ex.variante,
    cantidad_invertida: body.cantidad_invertida != null ? Number(body.cantidad_invertida) : ex.cantidad_invertida,
    cantidad_disponible: body.cantidad_disponible != null ? Number(body.cantidad_disponible) : ex.cantidad_disponible,
    costo_por_unidad: body.costo_por_unidad != null ? Number(body.costo_por_unidad) : ex.costo_por_unidad,
    precio_lista: body.precio_lista !== undefined ? (body.precio_lista != null ? Number(body.precio_lista) : null) : ex.precio_lista,
    precio_taller: body.precio_taller !== undefined ? (body.precio_taller != null ? Number(body.precio_taller) : null) : ex.precio_taller,
    precio_emi: body.precio_emi !== undefined ? (body.precio_emi != null ? Number(body.precio_emi) : null) : ex.precio_emi,
    status: body.status ?? ex.status,
    tracking: body.tracking !== undefined ? body.tracking || null : ex.tracking,
    fecha_compra: body.fecha_compra !== undefined ? body.fecha_compra || null : ex.fecha_compra,
    fecha_llegada: body.fecha_llegada !== undefined ? body.fecha_llegada || null : ex.fecha_llegada,
    valor_compra_total: body.valor_compra_total !== undefined ? (body.valor_compra_total != null ? Number(body.valor_compra_total) : null) : ex.valor_compra_total,
    tax: body.tax !== undefined ? (body.tax != null ? Number(body.tax) : null) : ex.tax,
    costo_envio: body.costo_envio !== undefined ? (body.costo_envio != null ? Number(body.costo_envio) : null) : ex.costo_envio,
  })

  const updated = queries.getStockItem.get(id)
  return c.json(updated)
})

// Sell from stock — transactional: decrement stock + create order
stock.post('/:id/sell', async (c) => {
  const stockId = Number(c.req.param('id'))
  const body = await c.req.json()
  const { qty, order_data } = body

  if (!qty || qty < 1) return c.json({ error: 'qty must be >= 1' }, 400)
  if (!order_data) return c.json({ error: 'order_data is required' }, 400)

  // Validate stock item is available for sale
  const stockItem = queries.getStockItem.get(stockId) as Record<string, unknown> | undefined
  if (!stockItem) return c.json({ error: 'Stock item not found' }, 404)
  if (stockItem.status !== 'DISPONIBLE') return c.json({ error: 'Stock item not available for sale (status: ' + stockItem.status + ')' }, 409)

  const sellTransaction = db.transaction(() => {
    // Decrement stock
    const result = queries.decrementStock.run({ id: stockId, qty: Number(qty) })
    if (result.changes === 0) {
      throw new Error('Insufficient stock')
    }

    // Resolve client
    let clientId: number
    if (order_data.client_id) {
      clientId = Number(order_data.client_id)
    } else if (order_data.cliente) {
      const existing = queries.getClientByName.get(order_data.cliente.trim()) as { id: number } | undefined
      if (existing) {
        clientId = existing.id
      } else {
        const ins = queries.insertClient.run(order_data.cliente.trim(), order_data.client_type || 'standard')
        clientId = Number(ins.lastInsertRowid)
      }
    } else {
      throw new Error('cliente or client_id required')
    }

    // Create order
    const orderResult = queries.insertOrder.run({
      client_id: clientId,
      item: order_data.item || '',
      cantidad: Number(qty),
      link_compra: order_data.link_compra || null,
      valor_presupuestado: order_data.valor_presupuestado != null ? Number(order_data.valor_presupuestado) : null,
      fecha_compra: order_data.fecha_compra || null,
      valor_compra: 0,
      valor_debitado: 0,
      tax: 0,
      costo_envio: 0,
      peso: null,
      status: order_data.status || 'TO DO',
      is_stock: 1,
      is_paid: order_data.is_paid ? 1 : 0,
      asignado: order_data.asignado || null,
      ganancia: order_data.ganancia != null ? Number(order_data.ganancia) : null,
      paid_to: order_data.paid_to || null,
      tracking: null,
      observaciones: order_data.observaciones || null,
      stock_item_id: stockId,
    })

    const order = queries.getOrder.get(Number(orderResult.lastInsertRowid))
    const stockItem = queries.getStockItem.get(stockId)

    return { order, stock_item: stockItem }
  })

  try {
    const result = sellTransaction()
    return c.json(result, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sell failed'
    const status = msg === 'Insufficient stock' ? 409 : 400
    return c.json({ error: msg }, status)
  }
})

// Convert investment order → stock item
stock.post('/from-order/:orderId', async (c) => {
  const orderId = Number(c.req.param('orderId'))
  const body = await c.req.json()

  const { marca, item, variante, cantidad_invertida, cantidad_disponible } = body
  if (!marca || !item) return c.json({ error: 'marca and item are required' }, 400)
  if (!cantidad_invertida || cantidad_invertida < 1) return c.json({ error: 'cantidad_invertida must be >= 1' }, 400)

  const convertTx = db.transaction(() => {
    const order = queries.getOrder.get(orderId) as Record<string, unknown> | undefined
    if (!order) throw new Error('Order not found')
    if (order.stock_item_id) throw new Error('Order already converted to stock')

    const valorCompra = Number(order.valor_compra) || 0
    const tax = Number(order.tax) || 0
    const costoEnvio = Number(order.costo_envio) || 0
    const qty = Number(cantidad_invertida)
    const costoPerUnit = body.costo_por_unidad != null
      ? Number(body.costo_por_unidad)
      : Math.round(((valorCompra + tax + costoEnvio) / qty) * 100) / 100

    const stockResult = queries.insertStockItem.run({
      marca: marca.trim(),
      item: item.trim(),
      variante: variante?.trim() || null,
      cantidad_invertida: qty,
      cantidad_disponible: Number(cantidad_disponible) ?? qty,
      costo_por_unidad: costoPerUnit,
      precio_lista: body.precio_lista != null ? Number(body.precio_lista) : Math.round(costoPerUnit * 1.4 * 100) / 100,
      precio_taller: body.precio_taller != null ? Number(body.precio_taller) : Math.round(costoPerUnit * 1.3 * 100) / 100,
      precio_emi: body.precio_emi != null ? Number(body.precio_emi) : Math.round(costoPerUnit * 1.2 * 100) / 100,
      status: 'DISPONIBLE',
      tracking: (order.tracking as string) || null,
      fecha_compra: (order.fecha_compra as string) || null,
      fecha_llegada: null,
      valor_compra_total: valorCompra,
      tax,
      costo_envio: costoEnvio,
      investment_order_id: orderId,
    })

    const stockId = Number(stockResult.lastInsertRowid)
    queries.setOrderStockItemId.run({ id: orderId, stock_item_id: stockId })

    return {
      stock_item: queries.getStockItem.get(stockId),
      order: queries.getOrder.get(orderId),
    }
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
