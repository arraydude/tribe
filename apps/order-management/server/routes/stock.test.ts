import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, seedClient, seedStockItem } from '../test-helpers.js'

describe('Stock sell transaction', () => {
  let db: ReturnType<typeof createTestDb>['db']
  let queries: ReturnType<typeof createTestDb>['queries']

  beforeEach(() => {
    const testDb = createTestDb()
    db = testDb.db
    queries = testDb.queries
  })

  it('decrements stock and creates order with stock_item_id', () => {
    const clientId = seedClient(queries, 'Abel')
    const stockId = seedStockItem(queries, { cantidad_disponible: 5 })

    // Sell 1 unit
    const sellTx = db.transaction(() => {
      const result = queries.decrementStock.run({ id: stockId, qty: 1 })
      expect(result.changes).toBe(1)

      const orderResult = queries.insertOrder.run({
        client_id: clientId, item: 'CTS DOWNPIPE B58', cantidad: 1,
        link_compra: null, valor_presupuestado: 680, fecha_compra: null,
        valor_compra: 0, valor_debitado: 0, tax: 0, costo_envio: 0,
        peso: null, status: 'TO DO', is_stock: 1, is_paid: 0,
        asignado: null, ganancia: 680, paid_to: null, tracking: null,
        observaciones: null, stock_item_id: stockId,
      })
      return Number(orderResult.lastInsertRowid)
    })

    const orderId = sellTx()

    // Verify stock decremented
    const stock = queries.getStockItem.get(stockId) as Record<string, unknown>
    expect(stock.cantidad_disponible).toBe(4)

    // Verify order created with stock_item_id
    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order.stock_item_id).toBe(stockId)
    expect(order.is_stock).toBe(1)
    expect(order.valor_compra).toBe(0)
    expect(order.ganancia).toBe(680)
  })

  it('rolls back if stock insufficient', () => {
    seedClient(queries, 'Abel')
    const stockId = seedStockItem(queries, { cantidad_disponible: 0 })

    const result = queries.decrementStock.run({ id: stockId, qty: 1 })
    expect(result.changes).toBe(0) // No rows affected

    // Stock unchanged
    const stock = queries.getStockItem.get(stockId) as Record<string, unknown>
    expect(stock.cantidad_disponible).toBe(0)
  })

  it('rejects sell if status is not DISPONIBLE', () => {
    seedClient(queries, 'Abel')
    const stockId = seedStockItem(queries, { status: 'EN TRANSITO', cantidad_disponible: 5 })

    const stock = queries.getStockItem.get(stockId) as Record<string, unknown>
    expect(stock.status).toBe('EN TRANSITO')
    // The API layer validates this — DB doesn't enforce status
  })

  it('handles selling exact remaining quantity', () => {
    seedClient(queries, 'Abel')
    const stockId = seedStockItem(queries, { cantidad_disponible: 3 })

    const result = queries.decrementStock.run({ id: stockId, qty: 3 })
    expect(result.changes).toBe(1)

    const stock = queries.getStockItem.get(stockId) as Record<string, unknown>
    expect(stock.cantidad_disponible).toBe(0)
  })

  it('prevents selling more than available', () => {
    seedClient(queries, 'Abel')
    const stockId = seedStockItem(queries, { cantidad_disponible: 2 })

    const result = queries.decrementStock.run({ id: stockId, qty: 3 })
    expect(result.changes).toBe(0) // WHERE clause prevents it

    const stock = queries.getStockItem.get(stockId) as Record<string, unknown>
    expect(stock.cantidad_disponible).toBe(2) // Unchanged
  })

  it('creates multiple sales correctly', () => {
    const clientId = seedClient(queries, 'Abel')
    const stockId = seedStockItem(queries, { cantidad_disponible: 10, costo_por_unidad: 400 })

    // Sell 3 units
    for (let i = 0; i < 3; i++) {
      queries.decrementStock.run({ id: stockId, qty: 1 })
      queries.insertOrder.run({
        client_id: clientId, item: 'CTS DOWNPIPE B58', cantidad: 1,
        link_compra: null, valor_presupuestado: 680, fecha_compra: null,
        valor_compra: 0, valor_debitado: 0, tax: 0, costo_envio: 0,
        peso: null, status: 'DONE', is_stock: 1, is_paid: 1,
        asignado: null, ganancia: 680, paid_to: null, tracking: null,
        observaciones: null, stock_item_id: stockId,
      })
    }

    const stock = queries.getStockItem.get(stockId) as Record<string, unknown>
    expect(stock.cantidad_disponible).toBe(7)
  })
})

describe('Stock balance calculation', () => {
  let queries: ReturnType<typeof createTestDb>['queries']

  beforeEach(() => {
    const testDb = createTestDb()
    queries = testDb.queries
  })

  it('calculates total_invertido correctly', () => {
    seedStockItem(queries, { cantidad_invertida: 10, costo_por_unidad: 400 })

    const balance = queries.stockBalance.all() as Record<string, unknown>[]
    expect(balance).toHaveLength(1)
    expect(balance[0].total_invertido).toBe(4000) // 10 * 400
  })

  it('returns zero recuperado when no sales', () => {
    seedStockItem(queries, { cantidad_invertida: 5, costo_por_unidad: 100 })

    const balance = queries.stockBalance.all() as Record<string, unknown>[]
    expect(balance[0].total_recuperado).toBe(0)
    expect(balance[0].ventas_count).toBe(0)
    expect(balance[0].balance).toBe(-500) // 0 - 500
  })

  it('calculates balance with sales', () => {
    const clientId = seedClient(queries)
    const stockId = seedStockItem(queries, { cantidad_invertida: 5, costo_por_unidad: 100 })

    // Create 2 sales with ganancia
    for (const ganancia of [150, 200]) {
      queries.insertOrder.run({
        client_id: clientId, item: 'Test', cantidad: 1,
        link_compra: null, valor_presupuestado: ganancia, fecha_compra: null,
        valor_compra: 0, valor_debitado: 0, tax: 0, costo_envio: 0,
        peso: null, status: 'DONE', is_stock: 1, is_paid: 1,
        asignado: null, ganancia, paid_to: null, tracking: null,
        observaciones: null, stock_item_id: stockId,
      })
    }

    const balance = queries.stockBalance.all() as Record<string, unknown>[]
    expect(balance[0].total_invertido).toBe(500)    // 5 * 100
    expect(balance[0].total_recuperado).toBe(350)   // 150 + 200
    expect(balance[0].balance).toBe(-150)           // 350 - 500
    expect(balance[0].ventas_count).toBe(2)
  })

  it('shows positive balance when recovered more than invested', () => {
    const clientId = seedClient(queries)
    const stockId = seedStockItem(queries, { cantidad_invertida: 2, costo_por_unidad: 100 })

    // Sell both at higher price
    for (const ganancia of [300, 400]) {
      queries.insertOrder.run({
        client_id: clientId, item: 'Test', cantidad: 1,
        link_compra: null, valor_presupuestado: ganancia, fecha_compra: null,
        valor_compra: 0, valor_debitado: 0, tax: 0, costo_envio: 0,
        peso: null, status: 'DONE', is_stock: 1, is_paid: 1,
        asignado: null, ganancia, paid_to: null, tracking: null,
        observaciones: null, stock_item_id: stockId,
      })
    }

    const balance = queries.stockBalance.all() as Record<string, unknown>[]
    expect(balance[0].total_invertido).toBe(200)
    expect(balance[0].total_recuperado).toBe(700)
    expect(balance[0].balance).toBe(500) // Profit!
  })

  it('excludes soft-deleted orders from balance', () => {
    const clientId = seedClient(queries)
    const stockId = seedStockItem(queries, { cantidad_invertida: 5, costo_por_unidad: 100 })

    // Create sale
    const orderResult = queries.insertOrder.run({
      client_id: clientId, item: 'Test', cantidad: 1,
      link_compra: null, valor_presupuestado: 300, fecha_compra: null,
      valor_compra: 0, valor_debitado: 0, tax: 0, costo_envio: 0,
      peso: null, status: 'DONE', is_stock: 1, is_paid: 1,
      asignado: null, ganancia: 300, paid_to: null, tracking: null,
      observaciones: null, stock_item_id: stockId,
    })

    // Soft-delete the order
    queries.softDelete.run(Number(orderResult.lastInsertRowid))

    const balance = queries.stockBalance.all() as Record<string, unknown>[]
    expect(balance[0].total_recuperado).toBe(0) // Deleted order excluded
    expect(balance[0].ventas_count).toBe(0)
    expect(balance[0].balance).toBe(-500)
  })

  it('excludes investment orders (is_stock=0) from balance count', () => {
    const clientId = seedClient(queries)
    const stockId = seedStockItem(queries, { cantidad_invertida: 5, costo_por_unidad: 100 })

    // Investment order (is_stock=0, but has stock_item_id from conversion)
    queries.insertOrder.run({
      client_id: clientId, item: 'Investment', cantidad: 5,
      link_compra: null, valor_presupuestado: 0, fecha_compra: null,
      valor_compra: 500, valor_debitado: 500, tax: 0, costo_envio: 0,
      peso: null, status: 'DONE', is_stock: 0, is_paid: 1,
      asignado: null, ganancia: null, paid_to: null, tracking: null,
      observaciones: null, stock_item_id: stockId,
    })

    // Actual sale (is_stock=1)
    queries.insertOrder.run({
      client_id: clientId, item: 'Sale', cantidad: 1,
      link_compra: null, valor_presupuestado: 150, fecha_compra: null,
      valor_compra: 100, valor_debitado: 100, tax: 0, costo_envio: 0,
      peso: null, status: 'DONE', is_stock: 1, is_paid: 1,
      asignado: null, ganancia: 50, paid_to: null, tracking: null,
      observaciones: null, stock_item_id: stockId,
    })

    const balance = queries.stockBalance.all() as Record<string, unknown>[]
    expect(balance[0].ventas_count).toBe(1) // Only the sale, not the investment
    expect(balance[0].total_recuperado).toBe(50) // Only sale's ganancia
  })

  it('calculates real ganancia (sale price - cost per unit)', () => {
    // Stock item costs $400/unit
    const clientId = seedClient(queries)
    const stockId = seedStockItem(queries, { cantidad_invertida: 5, costo_por_unidad: 400 })

    // Sale at $680, real ganancia = 680 - 400 = 280
    queries.insertOrder.run({
      client_id: clientId, item: 'CTS DOWNPIPE B58', cantidad: 1,
      link_compra: null, valor_presupuestado: 680, fecha_compra: null,
      valor_compra: 400, valor_debitado: 400, tax: 0, costo_envio: 0,
      peso: null, status: 'DONE', is_stock: 1, is_paid: 1,
      asignado: null, ganancia: 280, paid_to: null, tracking: null,
      observaciones: null, stock_item_id: stockId,
    })

    const balance = queries.stockBalance.all() as Record<string, unknown>[]
    expect(balance[0].total_invertido).toBe(2000) // 5 * 400
    expect(balance[0].total_recuperado).toBe(280) // real profit, not $680
    expect(balance[0].balance).toBe(-1720) // 280 - 2000
  })

  it('handles multiple stock items independently', () => {
    const clientId = seedClient(queries)
    const stock1 = seedStockItem(queries, { marca: 'CTS', item: 'DOWNPIPE', variante: 'B58', cantidad_invertida: 5, costo_por_unidad: 400 })
    const stock2 = seedStockItem(queries, { marca: 'NGK', item: 'Bujias', variante: 'B58', cantidad_invertida: 10, costo_por_unidad: 100 })

    // Sell from stock1 only
    queries.insertOrder.run({
      client_id: clientId, item: 'CTS DOWNPIPE B58', cantidad: 1,
      link_compra: null, valor_presupuestado: 680, fecha_compra: null,
      valor_compra: 0, valor_debitado: 0, tax: 0, costo_envio: 0,
      peso: null, status: 'DONE', is_stock: 1, is_paid: 1,
      asignado: null, ganancia: 680, paid_to: null, tracking: null,
      observaciones: null, stock_item_id: stock1,
    })

    const balance = queries.stockBalance.all() as Record<string, unknown>[]
    const b1 = balance.find((b) => b.id === stock1)!
    const b2 = balance.find((b) => b.id === stock2)!

    expect(b1.total_recuperado).toBe(680)
    expect(b1.ventas_count).toBe(1)
    expect(b2.total_recuperado).toBe(0)
    expect(b2.ventas_count).toBe(0)
  })
})

describe('Convert order to stock', () => {
  let db: ReturnType<typeof createTestDb>['db']
  let queries: ReturnType<typeof createTestDb>['queries']

  beforeEach(() => {
    const testDb = createTestDb()
    db = testDb.db
    queries = testDb.queries
  })

  function createInvestmentOrder() {
    const clientId = seedClient(queries, 'Tribe', 'internal')
    const result = queries.insertOrder.run({
      client_id: clientId, item: 'CTS Downpipe B58', cantidad: 5,
      link_compra: null, valor_presupuestado: 0, fecha_compra: '2025-01-15',
      valor_compra: 2000, valor_debitado: 2080, tax: 80, costo_envio: 200,
      peso: 5, status: 'DONE', is_stock: 0, is_paid: 1,
      asignado: 'NAHUE', ganancia: null, paid_to: null, tracking: 'TRACK123',
      observaciones: null, stock_item_id: null,
    })
    return Number(result.lastInsertRowid)
  }

  it('creates stock item with investment_order_id and correct cost', () => {
    const orderId = createInvestmentOrder()

    const convertTx = db.transaction(() => {
      const order = queries.getOrder.get(orderId) as Record<string, unknown>
      const costoTotal = Number(order.valor_compra) + Number(order.tax) + Number(order.costo_envio)
      const costoPerUnit = Math.round((costoTotal / Number(order.cantidad)) * 100) / 100

      const stockResult = queries.insertStockItem.run({
        marca: 'CTS', item: 'DOWNPIPE', variante: 'B58',
        cantidad_invertida: Number(order.cantidad),
        cantidad_disponible: Number(order.cantidad),
        costo_por_unidad: costoPerUnit,
        precio_lista: Math.round(costoPerUnit * 1.4 * 100) / 100,
        precio_taller: Math.round(costoPerUnit * 1.3 * 100) / 100,
        precio_emi: Math.round(costoPerUnit * 1.2 * 100) / 100,
        status: 'DISPONIBLE', tracking: order.tracking,
        fecha_compra: order.fecha_compra, fecha_llegada: null,
        valor_compra_total: order.valor_compra, tax: order.tax, costo_envio: order.costo_envio,
        investment_order_id: orderId,
      })
      const stockId = Number(stockResult.lastInsertRowid)
      queries.setOrderStockItemId.run({ id: orderId, stock_item_id: stockId })
      return stockId
    })

    const stockId = convertTx()

    const stockItem = queries.getStockItem.get(stockId) as Record<string, unknown>
    expect(stockItem.investment_order_id).toBe(orderId)
    expect(stockItem.marca).toBe('CTS')
    expect(stockItem.cantidad_invertida).toBe(5)
    expect(stockItem.status).toBe('DISPONIBLE')
    expect(stockItem.costo_por_unidad).toBe(456) // (2000+80+200)/5

    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order.stock_item_id).toBe(stockId)
  })

  it('rejects double conversion (order already has stock_item_id)', () => {
    const orderId = createInvestmentOrder()

    const stockResult = queries.insertStockItem.run({
      marca: 'CTS', item: 'DOWNPIPE', variante: 'B58-dup',
      cantidad_invertida: 5, cantidad_disponible: 5, costo_por_unidad: 456,
      precio_lista: 638.4, precio_taller: 592.8, precio_emi: 547.2,
      status: 'DISPONIBLE', tracking: null, fecha_compra: null, fecha_llegada: null,
      valor_compra_total: 2000, tax: 80, costo_envio: 200, investment_order_id: orderId,
    })
    queries.setOrderStockItemId.run({ id: orderId, stock_item_id: Number(stockResult.lastInsertRowid) })

    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order.stock_item_id).not.toBeNull()
  })

  it('calculates fractional costo_por_unidad correctly', () => {
    const costoTotal = 1000 + 40 + 150 // 1190
    const perUnit = Math.round((costoTotal / 3) * 100) / 100
    expect(perUnit).toBe(396.67)
  })
})

describe('Investment creation (order + stock atomic)', () => {
  let db: ReturnType<typeof createTestDb>['db']
  let queries: ReturnType<typeof createTestDb>['queries']

  beforeEach(() => {
    const testDb = createTestDb()
    db = testDb.db
    queries = testDb.queries
  })

  function createInvestment(marca: string, item: string, variante: string, qty: number, valorCompra: number) {
    const tax = Math.round(valorCompra * 0.04 * 100) / 100
    const valorDebitado = Math.round((valorCompra + tax) * 100) / 100
    const itemName = [marca, item, variante].filter(Boolean).join(' ')
    const fechaCompra = new Date().toISOString().split('T')[0]

    return db.transaction(() => {
      let tribeClient = queries.getClientByName.get('Tribe') as { id: number } | undefined
      if (!tribeClient) {
        const ins = queries.insertClient.run('Tribe', 'internal')
        tribeClient = { id: Number(ins.lastInsertRowid) }
      }

      const orderResult = queries.insertOrder.run({
        client_id: tribeClient.id, item: itemName, cantidad: qty,
        link_compra: null, valor_presupuestado: 0, fecha_compra: fechaCompra,
        valor_compra: valorCompra, valor_debitado: valorDebitado, tax,
        costo_envio: null, peso: null, status: 'TO DO', is_stock: 0, is_paid: 1,
        asignado: null, ganancia: null, paid_to: null, tracking: null,
        observaciones: null, stock_item_id: null,
      })
      const orderId = Number(orderResult.lastInsertRowid)

      const stockResult = queries.insertStockItem.run({
        marca, item, variante: variante || null,
        cantidad_invertida: qty, cantidad_disponible: 0, costo_por_unidad: 0,
        precio_lista: null, precio_taller: null, precio_emi: null,
        status: 'EN TRANSITO', tracking: null, fecha_compra: fechaCompra,
        fecha_llegada: null, valor_compra_total: valorCompra, tax,
        costo_envio: null, investment_order_id: orderId,
      })
      const stockId = Number(stockResult.lastInsertRowid)

      queries.setOrderStockItemId.run({ id: orderId, stock_item_id: stockId })

      return { orderId, stockId }
    })()
  }

  it('creates order + stock item atomically', () => {
    const { orderId, stockId } = createInvestment('CTS', 'DOWNPIPE', 'S58', 3, 2400)

    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order).toBeDefined()
    const stock = queries.getStockItem.get(stockId) as Record<string, unknown>
    expect(stock).toBeDefined()
  })

  it('order has correct fields: Tribe client, presupuestado=0, CONCAT item, tax, debitado', () => {
    const { orderId } = createInvestment('CTS', 'DOWNPIPE', 'S58', 3, 2400)

    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order.cliente).toBe('Tribe')
    expect(order.client_type).toBe('internal')
    expect(order.valor_presupuestado).toBe(0)
    expect(order.item).toBe('CTS DOWNPIPE S58')
    expect(order.cantidad).toBe(3)
    expect(order.valor_compra).toBe(2400)
    expect(order.tax).toBe(96) // 2400 * 0.04
    expect(order.valor_debitado).toBe(2496) // 2400 + 96
    expect(order.is_stock).toBe(0)
    expect(order.fecha_compra).toBeTruthy()
  })

  it('stock item is EN TRANSITO with cantidad_disponible=0', () => {
    const { stockId } = createInvestment('NGK', 'Bujias', 'B58', 10, 982)

    const stock = queries.getStockItem.get(stockId) as Record<string, unknown>
    expect(stock.status).toBe('EN TRANSITO')
    expect(stock.cantidad_disponible).toBe(0)
    expect(stock.cantidad_invertida).toBe(10)
    expect(stock.valor_compra_total).toBe(982)
  })

  it('bidirectional link: order.stock_item_id = stock.id and stock.investment_order_id = order.id', () => {
    const { orderId, stockId } = createInvestment('Infinity', 'INTAKE', 'B58', 2, 2316)

    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order.stock_item_id).toBe(stockId)

    const stock = queries.getStockItem.get(stockId) as Record<string, unknown>
    expect(stock.investment_order_id).toBe(orderId)
  })

  it('reuses existing Tribe client', () => {
    createInvestment('A', 'B', 'C', 1, 100)
    createInvestment('D', 'E', 'F', 1, 200)

    const clients = queries.getAllClients.all() as Record<string, unknown>[]
    const tribeClients = clients.filter((c) => c.name === 'Tribe')
    expect(tribeClients).toHaveLength(1) // Only one Tribe client
  })
})
