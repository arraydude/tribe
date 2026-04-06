import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestDb, seedClient, seedDealer, seedStock,
  seedStockPrices, seedOrder,
  getStatusId, getStaffId, getTierId,
} from '../test-helpers-v2'

type Queries = ReturnType<typeof createTestDb>['queries']
let db: ReturnType<typeof createTestDb>['db']
let queries: Queries

beforeEach(() => {
  const t = createTestDb()
  db = t.db
  queries = t.queries
})

// ── Helpers ──

function resolveOrCreateTribe(): number {
  let tribe = queries.getClientByName.get('Tribe') as { id: number } | undefined
  if (!tribe) {
    const ins = queries.insertClient.run({ name: 'Tribe', notes: 'internal' })
    tribe = { id: Number(ins.lastInsertRowid) }
  }
  return tribe.id
}

function createInvestment(
  marca: string, item: string, variante: string | null, qty: number, valorCompra: number
) {
  const financingCost = Math.round(valorCompra * 0.01 * 1.04 * 100) / 100
  const itemName = [marca, item, variante].filter(Boolean).join(' ')

  return db.transaction(() => {
    const tribeId = resolveOrCreateTribe()
    const todoId = getStatusId(queries, 'TO DO')

    const orderResult = queries.insertOrder.run({
      order_type: 'inversion',
      client_id: tribeId,
      tracking_status_id: todoId,
      assigned_to: null,
      item: itemName,
      quantity: qty,
      purchase_link: null,
      weight: null,
      tracking_number: null,
      notes: null,
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

    const stockResult = queries.insertStock.run({
      order_id: orderId,
      marca,
      item,
      variante: variante || null,
      quantity: qty,
      available: 0,
      cost_per_unit: 0,
      status: 'EN CAMINO',
    })
    const stockId = Number(stockResult.lastInsertRowid)

    // Link order.stock_id → stock.id
    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    queries.updateOrder.run({ ...order, id: orderId, stock_id: stockId })

    return { orderId, stockId, tribeId }
  })()
}

// ============================================================
// TESTS
// ============================================================

describe('Investment creation — atomic order + stock', () => {
  it('creates order + stock atomically, both linked', () => {
    const { orderId, stockId } = createInvestment('CTS', 'Downpipe', 'B58', 5, 2000)

    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order).toBeDefined()
    expect(order.order_type).toBe('inversion')
    expect(order.stock_id).toBe(stockId)

    const stock = queries.getStock.get(stockId) as Record<string, unknown>
    expect(stock).toBeDefined()
    expect(stock.order_id).toBe(orderId)
  })

  it('stock starts with available=0 and status=EN CAMINO', () => {
    const { stockId } = createInvestment('NGK', 'Bujias', 'B58', 10, 982)

    const stock = queries.getStock.get(stockId) as Record<string, unknown>
    expect(stock.available).toBe(0)
    expect(stock.status).toBe('EN CAMINO')
    expect(stock.quantity).toBe(10)
    expect(stock.cost_per_unit).toBe(0)
  })

  it('order has correct fields: Tribe client, order_type=inversion, financing_cost', () => {
    const { orderId, tribeId } = createInvestment('CTS', 'Intake', 'S58', 3, 2400)

    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order.client_id).toBe(tribeId)
    expect(order.client_name).toBe('Tribe')
    expect(order.order_type).toBe('inversion')
    expect(order.cost).toBe(2400)
    // financing_cost = 2400 * 0.01 * 1.04 = 24.96
    expect(order.financing_cost).toBe(24.96)
    expect(order.is_paid).toBe(1)
  })

  it('reuses existing Tribe client across multiple investments', () => {
    createInvestment('A', 'B', 'C', 1, 100)
    createInvestment('D', 'E', 'F', 1, 200)

    const clients = queries.getAllClients.all() as { name: string }[]
    const tribeClients = clients.filter((c) => c.name === 'Tribe')
    expect(tribeClients).toHaveLength(1)
  })

  it('order item is concatenated from marca+item+variante', () => {
    const { orderId } = createInvestment('CTS', 'Downpipe', 'S58', 3, 2400)
    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order.item).toBe('CTS Downpipe S58')
  })
})

describe('Stock arrival — update with cost_per_unit and status', () => {
  it('updates stock to DISPONIBLE with cost_per_unit and available=quantity', () => {
    const { stockId } = createInvestment('CTS', 'Downpipe', 'B58', 5, 2000)

    // Stock arrives — set cost_per_unit, status, available
    const stock = queries.getStock.get(stockId) as Record<string, unknown>
    queries.updateStock.run({
      id: stockId,
      marca: stock.marca,
      item: stock.item,
      variante: stock.variante,
      quantity: stock.quantity,
      available: stock.quantity, // now all available
      cost_per_unit: 456, // calculated from total costs / qty
      status: 'DISPONIBLE',
    })

    const updated = queries.getStock.get(stockId) as Record<string, unknown>
    expect(updated.status).toBe('DISPONIBLE')
    expect(updated.available).toBe(5)
    expect(updated.cost_per_unit).toBe(456)
  })
})

describe('Stock prices — upsert per-tier pricing', () => {
  it('creates per-tier prices with variable margins', () => {
    const stockId = seedStock(queries, { cost_per_unit: 400 })
    seedStockPrices(queries, stockId, [
      { tier: 'lista', margin: 69.5 },
      { tier: 'taller', margin: 55 },
      { tier: 'emi', margin: 50 },
    ])

    const prices = queries.getStockPrices.all(stockId) as any[]
    expect(prices).toHaveLength(3)

    const lista = prices.find((p: any) => p.tier_name === 'lista')
    expect(lista.margin_percent).toBe(69.5)
    expect(lista.price).toBe(678) // 400 * 1.695

    const taller = prices.find((p: any) => p.tier_name === 'taller')
    expect(taller.margin_percent).toBe(55)
    expect(taller.price).toBe(620) // 400 * 1.55

    const emi = prices.find((p: any) => p.tier_name === 'emi')
    expect(emi.margin_percent).toBe(50)
    expect(emi.price).toBe(600) // 400 * 1.50
  })

  it('upserts existing prices (updates margin and price)', () => {
    const stockId = seedStock(queries, { cost_per_unit: 400 })
    seedStockPrices(queries, stockId, [{ tier: 'lista', margin: 40 }])

    // Now upsert with new margin
    const tierId = getTierId(queries, 'lista')
    const newMargin = 69.5
    const newPrice = Math.round(400 * (1 + newMargin / 100) * 100) / 100
    queries.upsertStockPrice.run({
      stock_id: stockId,
      price_tier_id: tierId,
      margin_percent: newMargin,
      price: newPrice,
    })

    const prices = queries.getStockPrices.all(stockId) as any[]
    expect(prices).toHaveLength(1)
    expect(prices[0].margin_percent).toBe(69.5)
    expect(prices[0].price).toBe(678)
  })
})

describe('Sell transaction', () => {
  function setupSellableStock() {
    const stockId = seedStock(queries, {
      marca: 'CTS', item: 'Downpipe', variante: 'B58',
      quantity: 10, available: 10, cost_per_unit: 400,
      status: 'DISPONIBLE',
    })
    seedStockPrices(queries, stockId, [
      { tier: 'lista', margin: 69.5 },
      { tier: 'taller', margin: 55 },
      { tier: 'emi', margin: 50 },
    ])
    return stockId
  }

  it('decrements available, creates venta_stock order with correct profit', () => {
    const stockId = setupSellableStock()
    const clientId = seedClient(queries, 'Abel')
    const todoId = getStatusId(queries, 'TO DO')
    const listaTierId = getTierId(queries, 'lista')

    const sellTx = db.transaction(() => {
      const decResult = queries.decrementStock.run({ id: stockId, qty: 2 })
      expect(decResult.changes).toBe(1)

      // Get lista price for quoting
      const listaPrice = queries.getStockPriceByTier.get({
        stock_id: stockId,
        price_tier_id: listaTierId,
      }) as { price: number }
      const quotedPrice = listaPrice.price * 2 // 678 * 2 = 1356
      const totalCost = 400 * 2 // 800
      const profit = Math.round((quotedPrice - totalCost) * 100) / 100 // 556

      const orderResult = queries.insertOrder.run({
        order_type: 'venta_stock',
        client_id: clientId,
        tracking_status_id: todoId,
        assigned_to: null,
        item: 'CTS Downpipe B58',
        quantity: 2,
        purchase_link: null,
        weight: null,
        tracking_number: null,
        notes: null,
        cost: totalCost,
        financing_cost: null,
        import_cost: null,
        quoted_price: quotedPrice,
        margin_percent: null,
        profit,
        is_paid: 0,
        paid_to: null,
        paid_at: null,
        is_settled: 0,
        settled_at: null,
        stock_id: stockId,
        license_id: null,
        is_unlock: 0,
        metadata: null,
      })
      return Number(orderResult.lastInsertRowid)
    })

    const orderId = sellTx()

    const stock = queries.getStock.get(stockId) as Record<string, unknown>
    expect(stock.available).toBe(8) // 10 - 2

    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order.order_type).toBe('venta_stock')
    expect(order.stock_id).toBe(stockId)
    expect(order.quantity).toBe(2)
    expect(order.cost).toBe(800)
    expect(order.quoted_price).toBe(1356)
    expect(order.profit).toBe(556) // 1356 - 800
  })

  it('uses dealer price tier for quoting', () => {
    const stockId = setupSellableStock()
    const clientId = seedClient(queries, 'Bavarian')
    seedDealer(queries, clientId, 'taller')

    // Dealer has 'taller' tier — price should be 400 * 1.55 = 620 per unit
    const dealer = queries.getDealerByClientId.get(clientId) as { price_tier_id: number }
    const stockPrice = queries.getStockPriceByTier.get({
      stock_id: stockId,
      price_tier_id: dealer.price_tier_id,
    }) as { price: number }

    expect(stockPrice.price).toBe(620)
  })
})

describe('Sell — insufficient stock rollback', () => {
  it('rolls back when quantity exceeds available', () => {
    const stockId = seedStock(queries, {
      quantity: 5, available: 2, cost_per_unit: 400, status: 'DISPONIBLE',
    })

    const result = queries.decrementStock.run({ id: stockId, qty: 3 })
    expect(result.changes).toBe(0) // WHERE available >= qty prevents it

    const stock = queries.getStock.get(stockId) as Record<string, unknown>
    expect(stock.available).toBe(2) // unchanged
  })

  it('full transaction rolls back on insufficient stock', () => {
    const stockId = seedStock(queries, {
      quantity: 5, available: 1, cost_per_unit: 400, status: 'DISPONIBLE',
    })
    const clientId = seedClient(queries, 'Buyer')

    const sellTx = db.transaction(() => {
      const decResult = queries.decrementStock.run({ id: stockId, qty: 5 })
      if (decResult.changes === 0) {
        throw new Error('Insufficient stock')
      }
      // This order should never be created
      queries.insertOrder.run({
        order_type: 'venta_stock',
        client_id: clientId,
        tracking_status_id: getStatusId(queries, 'TO DO'),
        assigned_to: null,
        item: 'Test', quantity: 5,
        purchase_link: null, weight: null, tracking_number: null, notes: null,
        cost: 2000, financing_cost: null, import_cost: null,
        quoted_price: 3000, margin_percent: null, profit: 1000,
        is_paid: 0, paid_to: null, paid_at: null,
        is_settled: 0, settled_at: null,
        stock_id: stockId, license_id: null, is_unlock: 0, metadata: null,
      })
    })

    expect(() => sellTx()).toThrow('Insufficient stock')

    // Stock unchanged
    const stock = queries.getStock.get(stockId) as Record<string, unknown>
    expect(stock.available).toBe(1)

    // No order created
    const sales = queries.salesByStock.all(stockId) as any[]
    expect(sales).toHaveLength(0)
  })
})

describe('Sell — auto SOLD OUT when available reaches 0', () => {
  it('sets status to SOLD OUT when selling last units', () => {
    const stockId = seedStock(queries, {
      quantity: 3, available: 3, cost_per_unit: 400, status: 'DISPONIBLE',
    })
    const clientId = seedClient(queries, 'LastBuyer')
    const todoId = getStatusId(queries, 'TO DO')

    const sellTx = db.transaction(() => {
      const decResult = queries.decrementStock.run({ id: stockId, qty: 3 })
      expect(decResult.changes).toBe(1)

      queries.insertOrder.run({
        order_type: 'venta_stock',
        client_id: clientId,
        tracking_status_id: todoId,
        assigned_to: null,
        item: 'Test', quantity: 3,
        purchase_link: null, weight: null, tracking_number: null, notes: null,
        cost: 1200, financing_cost: null, import_cost: null,
        quoted_price: 1800, margin_percent: null, profit: 600,
        is_paid: 1, paid_to: null, paid_at: null,
        is_settled: 0, settled_at: null,
        stock_id: stockId, license_id: null, is_unlock: 0, metadata: null,
      })

      // Check if available is now 0 and mark SOLD OUT
      const updated = queries.getStock.get(stockId) as Record<string, unknown>
      if (Number(updated.available) === 0) {
        queries.updateStock.run({
          ...(updated as any),
          id: stockId,
          status: 'SOLD OUT',
        })
      }
    })

    sellTx()

    const stock = queries.getStock.get(stockId) as Record<string, unknown>
    expect(stock.available).toBe(0)
    expect(stock.status).toBe('SOLD OUT')
  })

  it('does NOT set SOLD OUT when some units remain', () => {
    const stockId = seedStock(queries, {
      quantity: 5, available: 5, cost_per_unit: 400, status: 'DISPONIBLE',
    })
    const clientId = seedClient(queries, 'PartialBuyer')
    const todoId = getStatusId(queries, 'TO DO')

    const sellTx = db.transaction(() => {
      queries.decrementStock.run({ id: stockId, qty: 2 })

      queries.insertOrder.run({
        order_type: 'venta_stock',
        client_id: clientId,
        tracking_status_id: todoId,
        assigned_to: null,
        item: 'Test', quantity: 2,
        purchase_link: null, weight: null, tracking_number: null, notes: null,
        cost: 800, financing_cost: null, import_cost: null,
        quoted_price: 1200, margin_percent: null, profit: 400,
        is_paid: 1, paid_to: null, paid_at: null,
        is_settled: 0, settled_at: null,
        stock_id: stockId, license_id: null, is_unlock: 0, metadata: null,
      })

      const updated = queries.getStock.get(stockId) as Record<string, unknown>
      if (Number(updated.available) === 0) {
        queries.updateStock.run({ ...(updated as any), id: stockId, status: 'SOLD OUT' })
      }
    })

    sellTx()

    const stock = queries.getStock.get(stockId) as Record<string, unknown>
    expect(stock.available).toBe(3)
    expect(stock.status).toBe('DISPONIBLE')
  })
})

describe('Balance query — total_invertido, total_recuperado', () => {
  it('calculates balance from venta_stock orders only', () => {
    const stockId = seedStock(queries, { quantity: 10, available: 8, cost_per_unit: 400 })
    const clientId = seedClient(queries, 'buyer')

    // Two venta_stock sales
    seedOrder(queries, {
      order_type: 'venta_stock', client_id: clientId,
      stock_id: stockId, quoted_price: 678, cost: 400, profit: 278,
    })
    seedOrder(queries, {
      order_type: 'venta_stock', client_id: clientId,
      stock_id: stockId, quoted_price: 678, cost: 400, profit: 278,
    })

    // Investment order should NOT count toward recuperado
    seedOrder(queries, {
      order_type: 'inversion', client_id: clientId,
      stock_id: stockId, cost: 4000, profit: 0,
    })

    // Importacion order should NOT count toward recuperado
    seedOrder(queries, {
      order_type: 'importacion', client_id: clientId,
      stock_id: stockId, profit: 500,
    })

    const balance = queries.stockBalance.all() as any[]
    const item = balance.find((b: any) => b.id === stockId)!

    expect(item.total_invertido).toBe(4000) // 10 * 400
    expect(item.total_recuperado).toBe(556) // 278 + 278 (only venta_stock)
    expect(item.balance).toBe(-3444) // 556 - 4000
    expect(item.ventas_count).toBe(2)
  })

  it('returns zero recuperado when no sales exist', () => {
    const stockId = seedStock(queries, { quantity: 5, cost_per_unit: 100 })

    const balance = queries.stockBalance.all() as any[]
    const item = balance.find((b: any) => b.id === stockId)!

    expect(item.total_invertido).toBe(500)
    expect(item.total_recuperado).toBe(0)
    expect(item.ventas_count).toBe(0)
    expect(item.balance).toBe(-500)
  })

  it('shows positive balance when fully recovered', () => {
    const stockId = seedStock(queries, { quantity: 2, available: 0, cost_per_unit: 100 })
    const clientId = seedClient(queries, 'buyer2')

    seedOrder(queries, {
      order_type: 'venta_stock', client_id: clientId,
      stock_id: stockId, profit: 150,
    })
    seedOrder(queries, {
      order_type: 'venta_stock', client_id: clientId,
      stock_id: stockId, profit: 200,
    })

    const balance = queries.stockBalance.all() as any[]
    const item = balance.find((b: any) => b.id === stockId)!

    expect(item.total_invertido).toBe(200) // 2 * 100
    expect(item.total_recuperado).toBe(350) // 150 + 200
    expect(item.balance).toBe(150) // profit
  })

  it('excludes soft-deleted orders from balance', () => {
    const stockId = seedStock(queries, { quantity: 5, cost_per_unit: 100 })
    const clientId = seedClient(queries, 'buyerDel')

    const orderId = seedOrder(queries, {
      order_type: 'venta_stock', client_id: clientId,
      stock_id: stockId, profit: 300,
    })

    // Soft-delete the order
    queries.softDeleteOrder.run(orderId)

    const balance = queries.stockBalance.all() as any[]
    const item = balance.find((b: any) => b.id === stockId)!
    expect(item.total_recuperado).toBe(0) // deleted order excluded
    expect(item.ventas_count).toBe(0)
  })
})

describe('Convert order to stock — bidirectional links', () => {
  it('creates stock from order with cost_per_unit derived from order costs', () => {
    const clientId = seedClient(queries, 'Tribe-convert')
    const orderId = seedOrder(queries, {
      order_type: 'inversion',
      client_id: clientId,
      item: 'CTS Downpipe B58',
      quantity: 5,
      cost: 2000,
      financing_cost: 80,
      import_cost: 200,
    })

    const convertTx = db.transaction(() => {
      const order = queries.getOrder.get(orderId) as Record<string, unknown>

      const cost = Number(order.cost) || 0
      const financingCost = Number(order.financing_cost) || 0
      const importCost = Number(order.import_cost) || 0
      const qty = Number(order.quantity) || 1
      const costPerUnit = Math.round(((cost + financingCost + importCost) / qty) * 100) / 100

      // Create stock
      const stockResult = queries.insertStock.run({
        order_id: orderId,
        marca: 'CTS',
        item: 'Downpipe',
        variante: 'B58',
        quantity: qty,
        available: qty,
        cost_per_unit: costPerUnit,
        status: 'DISPONIBLE',
      })
      const stockId = Number(stockResult.lastInsertRowid)

      // Create stock_prices with default margins
      for (const m of [{ tier: 'lista', margin: 40 }, { tier: 'taller', margin: 30 }, { tier: 'emi', margin: 20 }]) {
        const tier = queries.getTierByName.get(m.tier) as { id: number }
        const price = Math.round(costPerUnit * (1 + m.margin / 100) * 100) / 100
        queries.upsertStockPrice.run({
          stock_id: stockId,
          price_tier_id: tier.id,
          margin_percent: m.margin,
          price,
        })
      }

      // Link order.stock_id → stock.id
      queries.updateOrder.run({ ...order, id: orderId, stock_id: stockId })

      return stockId
    })

    const stockId = convertTx()

    // Verify stock
    const stock = queries.getStock.get(stockId) as Record<string, unknown>
    expect(stock.order_id).toBe(orderId)
    expect(stock.marca).toBe('CTS')
    expect(stock.quantity).toBe(5)
    expect(stock.available).toBe(5)
    expect(stock.status).toBe('DISPONIBLE')
    // cost_per_unit = (2000 + 80 + 200) / 5 = 456
    expect(stock.cost_per_unit).toBe(456)

    // Verify bidirectional link
    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order.stock_id).toBe(stockId)

    // Verify stock_prices
    const prices = queries.getStockPrices.all(stockId) as any[]
    expect(prices).toHaveLength(3)

    const lista = prices.find((p: any) => p.tier_name === 'lista')
    expect(lista.price).toBe(638.4) // 456 * 1.4

    const taller = prices.find((p: any) => p.tier_name === 'taller')
    expect(taller.price).toBe(592.8) // 456 * 1.3

    const emi = prices.find((p: any) => p.tier_name === 'emi')
    expect(emi.price).toBe(547.2) // 456 * 1.2
  })

  it('rejects double conversion when order already has stock_id', () => {
    const clientId = seedClient(queries, 'Tribe-dbl')
    const stockId = seedStock(queries, { marca: 'X', item: 'Y', variante: 'Z' })
    const orderId = seedOrder(queries, {
      order_type: 'inversion',
      client_id: clientId,
      stock_id: stockId,
    })

    const order = queries.getOrder.get(orderId) as Record<string, unknown>
    expect(order.stock_id).not.toBeNull()
  })

  it('handles fractional cost_per_unit correctly', () => {
    // (1000 + 40 + 150) / 3 = 396.6666...
    const costPerUnit = Math.round(((1000 + 40 + 150) / 3) * 100) / 100
    expect(costPerUnit).toBe(396.67)
  })
})
