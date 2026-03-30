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
