import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestDb, seedClient, seedDealer, seedCar, seedStock,
  seedStockPrices, seedOrder, seedLicence,
  getStatusId, getStaffId, getTierId,
} from './test-helpers-v2'

type Queries = ReturnType<typeof createTestDb>['queries']
let db: ReturnType<typeof createTestDb>['db']
let queries: Queries

beforeEach(() => {
  const t = createTestDb()
  db = t.db
  queries = t.queries
})

describe('Schema v2 — tables and seed data', () => {
  it('seeds staff: Nahue and Fede', () => {
    const staff = queries.getAllStaff.all()
    expect(staff).toHaveLength(2)
    expect(staff.map((s: any) => s.name)).toEqual(['Fede', 'Nahue'])
  })

  it('seeds 6 tracking statuses in order', () => {
    const statuses = queries.getAllStatuses.all() as any[]
    expect(statuses).toHaveLength(6)
    expect(statuses.map((s) => s.name)).toEqual([
      'TO DO', 'IN PROGRESS', 'RECEIVED MIAMI',
      'RECEIVED BAIRES', 'READY TO DELIVER', 'DONE',
    ])
  })

  it('seeds 3 price tiers', () => {
    const tiers = queries.getAllTiers.all() as any[]
    expect(tiers).toHaveLength(3)
    expect(tiers.map((t) => t.name)).toEqual(['lista', 'taller', 'emi'])
  })
})

describe('Schema v2 — CHECK constraints', () => {
  it('rejects invalid order_type', () => {
    const clientId = seedClient(queries, 'test')
    const statusId = getStatusId(queries, 'TO DO')
    expect(() => {
      db.prepare(`
        INSERT INTO orders (order_type, client_id, tracking_status_id, item)
        VALUES ('invalid', ?, ?, 'test')
      `).run(clientId, statusId)
    }).toThrow()
  })

  it('accepts valid order_types', () => {
    const clientId = seedClient(queries, 'test')
    const statusId = getStatusId(queries, 'TO DO')
    for (const type of ['importacion', 'inversion', 'venta_stock', 'repro']) {
      expect(() => {
        db.prepare(`
          INSERT INTO orders (order_type, client_id, tracking_status_id, item)
          VALUES (?, ?, ?, 'test')
        `).run(type, clientId, statusId)
      }).not.toThrow()
    }
  })

  it('rejects invalid stock status', () => {
    expect(() => {
      db.prepare(`
        INSERT INTO stock (marca, item, status) VALUES ('X', 'Y', 'INVALID')
      `).run()
    }).toThrow()
  })

  it('accepts valid stock statuses', () => {
    for (const [i, status] of ['EN CAMINO', 'DISPONIBLE', 'SOLD OUT'].entries()) {
      expect(() => {
        db.prepare(`
          INSERT INTO stock (marca, item, variante, status) VALUES ('X', 'Y', ?, ?)
        `).run(`v${i}`, status)
      }).not.toThrow()
    }
  })

  it('rejects invalid licence type', () => {
    expect(() => {
      db.prepare(`
        INSERT INTO licences (type, cost) VALUES ('invalid', 100)
      `).run()
    }).toThrow()
  })

  it('accepts valid licence types', () => {
    for (const type of ['bootmod3', 'femto', 'xhp']) {
      expect(() => {
        db.prepare(`INSERT INTO licences (type, cost) VALUES (?, 100)`).run(type)
      }).not.toThrow()
    }
  })
})

describe('Schema v2 — foreign keys', () => {
  it('rejects order with non-existent client_id', () => {
    const statusId = getStatusId(queries, 'TO DO')
    expect(() => {
      db.prepare(`
        INSERT INTO orders (order_type, client_id, tracking_status_id, item)
        VALUES ('importacion', 9999, ?, 'test')
      `).run(statusId)
    }).toThrow()
  })

  it('rejects order with non-existent tracking_status_id', () => {
    const clientId = seedClient(queries, 'test')
    expect(() => {
      db.prepare(`
        INSERT INTO orders (order_type, client_id, tracking_status_id, item)
        VALUES ('importacion', ?, 9999, 'test')
      `).run(clientId)
    }).toThrow()
  })

  it('rejects dealer with non-existent client_id', () => {
    const tierId = getTierId(queries, 'lista')
    expect(() => {
      queries.insertDealer.run({ client_id: 9999, price_tier_id: tierId })
    }).toThrow()
  })

  it('enforces unique dealer per client', () => {
    const clientId = seedClient(queries, 'dealer_test')
    const tierId = getTierId(queries, 'lista')
    queries.insertDealer.run({ client_id: clientId, price_tier_id: tierId })
    expect(() => {
      queries.insertDealer.run({ client_id: clientId, price_tier_id: tierId })
    }).toThrow()
  })
})

describe('Schema v2 — UNIQUE constraints', () => {
  it('enforces unique client name', () => {
    seedClient(queries, 'unique_test')
    expect(() => seedClient(queries, 'unique_test')).toThrow()
  })

  it('enforces unique stock (marca, item, variante)', () => {
    seedStock(queries, { marca: 'CTS', item: 'Downpipe', variante: 'B58' })
    expect(() => {
      seedStock(queries, { marca: 'CTS', item: 'Downpipe', variante: 'B58' })
    }).toThrow()
  })

  it('enforces unique stock_prices (stock_id, price_tier_id)', () => {
    const stockId = seedStock(queries)
    const tierId = getTierId(queries, 'lista')
    queries.upsertStockPrice.run({ stock_id: stockId, price_tier_id: tierId, margin_percent: 40, price: 560 })
    // upsert should update, not fail
    queries.upsertStockPrice.run({ stock_id: stockId, price_tier_id: tierId, margin_percent: 50, price: 600 })
    const prices = queries.getStockPrices.all(stockId) as any[]
    expect(prices).toHaveLength(1)
    expect(prices[0].margin_percent).toBe(50)
  })
})

describe('Schema v2 — seed helpers', () => {
  it('seedClient creates a client and returns id', () => {
    const id = seedClient(queries, 'Abel')
    const client = queries.getClientById.get(id) as any
    expect(client.name).toBe('Abel')
  })

  it('seedDealer creates a dealer linked to client + tier', () => {
    const clientId = seedClient(queries, 'Bavarian')
    const dealerId = seedDealer(queries, clientId, 'taller')
    const dealer = queries.getDealerByClientId.get(clientId) as any
    expect(dealer.id).toBe(dealerId)
  })

  it('seedCar creates a car', () => {
    const carId = seedCar(queries, { brand: 'BMW', model: 'M2', version: 'CS' })
    const car = queries.getCarById.get(carId) as any
    expect(car.brand).toBe('BMW')
    expect(car.model).toBe('M2')
    expect(car.version).toBe('CS')
  })

  it('seedStock + seedStockPrices creates stock with per-tier pricing', () => {
    const stockId = seedStock(queries, { cost_per_unit: 400 })
    seedStockPrices(queries, stockId, [
      { tier: 'lista', margin: 69.5 },
      { tier: 'emi', margin: 50 },
      { tier: 'taller', margin: 55 },
    ])
    const prices = queries.getStockPrices.all(stockId) as any[]
    expect(prices).toHaveLength(3)
    const lista = prices.find((p: any) => p.tier_name === 'lista')
    expect(lista.margin_percent).toBe(69.5)
    expect(lista.price).toBe(678) // 400 × 1.695
  })

  it('seedOrder creates an order with correct defaults', () => {
    const id = seedOrder(queries, { item: 'Intercooler' })
    const order = queries.getOrder.get(id) as any
    expect(order.item).toBe('Intercooler')
    expect(order.order_type).toBe('importacion')
    expect(order.status_name).toBe('TO DO')
  })

  it('seedLicence creates a licence', () => {
    const id = seedLicence(queries, { type: 'bootmod3', code: 'ABC-123', cost: 424 })
    const licence = queries.getLicence.get(id) as any
    expect(licence.type).toBe('bootmod3')
    expect(licence.code).toBe('ABC-123')
    expect(licence.cost).toBe(424)
    expect(licence.is_used).toBe(0)
  })
})

describe('Schema v2 — client_cars M2M', () => {
  it('links a car to a client', () => {
    const clientId = seedClient(queries, 'Abel')
    const carId = seedCar(queries, { brand: 'BMW', model: 'M2', version: 'CS' })
    queries.linkCarToClient.run({ client_id: clientId, car_id: carId, is_current: 1 })
    const cars = queries.getCarsByClient.all(clientId) as any[]
    expect(cars).toHaveLength(1)
    expect(cars[0].brand).toBe('BMW')
    expect(cars[0].is_current).toBe(1)
  })

  it('same car can belong to multiple clients', () => {
    const client1 = seedClient(queries, 'Abel')
    const client2 = seedClient(queries, 'Luis')
    const carId = seedCar(queries, { brand: 'BMW', model: 'M5' })

    queries.linkCarToClient.run({ client_id: client1, car_id: carId, is_current: 0 })
    queries.linkCarToClient.run({ client_id: client2, car_id: carId, is_current: 1 })

    const cars1 = queries.getCarsByClient.all(client1) as any[]
    const cars2 = queries.getCarsByClient.all(client2) as any[]
    expect(cars1).toHaveLength(1)
    expect(cars2).toHaveLength(1)
    expect(cars1[0].is_current).toBe(0)
    expect(cars2[0].is_current).toBe(1)
  })
})

describe('Schema v2 — stock balance query', () => {
  it('calculates balance from venta_stock orders only', () => {
    const stockId = seedStock(queries, { quantity: 10, available: 8, cost_per_unit: 400 })
    const clientId = seedClient(queries, 'buyer')

    // Two sales
    seedOrder(queries, {
      order_type: 'venta_stock', client_id: clientId,
      stock_id: stockId, quoted_price: 600, profit: 200,
    })
    seedOrder(queries, {
      order_type: 'venta_stock', client_id: clientId,
      stock_id: stockId, quoted_price: 600, profit: 200,
    })
    // Investment order should NOT count
    seedOrder(queries, {
      order_type: 'inversion', client_id: clientId,
      stock_id: stockId, profit: 0,
    })

    const balance = queries.stockBalance.all() as any[]
    const item = balance.find((b: any) => b.id === stockId)
    expect(item.total_invertido).toBe(4000) // 10 × 400
    expect(item.total_recuperado).toBe(400) // 200 + 200 (only venta_stock)
    expect(item.balance).toBe(-3600) // 400 - 4000
    expect(item.ventas_count).toBe(2)
  })
})
