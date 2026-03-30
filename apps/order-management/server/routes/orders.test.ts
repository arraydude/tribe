import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, seedClient } from '../test-helpers.js'

describe('Orders CRUD', () => {
  let queries: ReturnType<typeof createTestDb>['queries']

  beforeEach(() => {
    const testDb = createTestDb()
    queries = testDb.queries
  })

  it('creates order with existing client', () => {
    const clientId = seedClient(queries, 'Abel')

    const result = queries.insertOrder.run({
      client_id: clientId, item: 'Downpipe B58', cantidad: 1,
      link_compra: 'https://example.com', valor_presupuestado: 680,
      fecha_compra: '2025-01-15', valor_compra: 398, valor_debitado: 414,
      tax: 16, costo_envio: 90, peso: 2, status: 'TO DO',
      is_stock: 0, is_paid: 0, asignado: 'NAHUE', ganancia: 266,
      paid_to: null, tracking: null, observaciones: null, stock_item_id: null,
    })

    const order = queries.getOrder.get(Number(result.lastInsertRowid)) as Record<string, unknown>
    expect(order.cliente).toBe('Abel')
    expect(order.item).toBe('Downpipe B58')
    expect(order.valor_compra).toBe(398)
    expect(order.ganancia).toBe(266)
    expect(order.is_stock).toBe(0)
    expect(order.stock_item_id).toBeNull()
  })

  it('creates client if not exists', () => {
    const result = queries.insertClient.run('Nuevo Cliente', 'standard')
    const clientId = Number(result.lastInsertRowid)

    const client = queries.getClientById.get(clientId) as Record<string, unknown>
    expect(client.name).toBe('Nuevo Cliente')
    expect(client.type).toBe('standard')
  })

  it('resolves client by name', () => {
    seedClient(queries, 'Abel')
    const found = queries.getClientByName.get('Abel') as Record<string, unknown>
    expect(found).toBeDefined()
    expect(found.name).toBe('Abel')
  })

  it('soft deletes order (sets deleted_at)', () => {
    const clientId = seedClient(queries)
    const result = queries.insertOrder.run({
      client_id: clientId, item: 'Test Item', cantidad: 1,
      link_compra: null, valor_presupuestado: 100, fecha_compra: null,
      valor_compra: 50, valor_debitado: 52, tax: 2, costo_envio: 0,
      peso: null, status: 'DONE', is_stock: 0, is_paid: 1,
      asignado: null, ganancia: 50, paid_to: null, tracking: null,
      observaciones: null, stock_item_id: null,
    })
    const orderId = Number(result.lastInsertRowid)

    // Soft delete
    queries.softDelete.run(orderId)

    // Should not appear in list
    const orders = queries.listOrders.all() as Record<string, unknown>[]
    expect(orders.find((o) => o.id === orderId)).toBeUndefined()

    // Should not appear in get
    const order = queries.getOrder.get(orderId)
    expect(order).toBeUndefined()
  })

  it('lists only non-deleted orders', () => {
    const clientId = seedClient(queries)

    // Create 3 orders
    for (let i = 0; i < 3; i++) {
      queries.insertOrder.run({
        client_id: clientId, item: `Item ${i}`, cantidad: 1,
        link_compra: null, valor_presupuestado: 100, fecha_compra: null,
        valor_compra: 50, valor_debitado: 52, tax: 2, costo_envio: 0,
        peso: null, status: 'TO DO', is_stock: 0, is_paid: 0,
        asignado: null, ganancia: 50, paid_to: null, tracking: null,
        observaciones: null, stock_item_id: null,
      })
    }

    // Delete one
    queries.softDelete.run(1)

    const orders = queries.listOrders.all() as Record<string, unknown>[]
    expect(orders).toHaveLength(2)
  })

  it('preserves stock_item_id on order', () => {
    const clientId = seedClient(queries)
    // We need a stock item first
    const stockResult = queries.insertStockItem.run({
      marca: 'CTS', item: 'DOWNPIPE', variante: 'B58',
      cantidad_invertida: 5, cantidad_disponible: 5, costo_por_unidad: 400,
      precio_lista: 680, precio_taller: 620, precio_emi: 600,
      status: 'DISPONIBLE', tracking: null,
      fecha_compra: null, fecha_llegada: null,
      valor_compra_total: null, tax: null, costo_envio: null,
      investment_order_id: null,
    })
    const stockId = Number(stockResult.lastInsertRowid)

    const orderResult = queries.insertOrder.run({
      client_id: clientId, item: 'CTS DOWNPIPE B58', cantidad: 1,
      link_compra: null, valor_presupuestado: 680, fecha_compra: null,
      valor_compra: 0, valor_debitado: 0, tax: 0, costo_envio: 0,
      peso: null, status: 'TO DO', is_stock: 1, is_paid: 0,
      asignado: null, ganancia: 680, paid_to: null, tracking: null,
      observaciones: null, stock_item_id: stockId,
    })

    const order = queries.getOrder.get(Number(orderResult.lastInsertRowid)) as Record<string, unknown>
    expect(order.stock_item_id).toBe(stockId)
    expect(order.is_stock).toBe(1)
  })
})
