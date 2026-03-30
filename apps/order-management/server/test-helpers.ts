import Database from 'better-sqlite3'
import { SCHEMA_SQL, createQueries } from './schema.js'

export function createTestDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_SQL)
  const queries = createQueries(db)
  return { db, queries }
}

export function seedClient(queries: ReturnType<typeof createQueries>, name = 'Test Client', type = 'standard') {
  const result = queries.insertClient.run(name, type)
  return Number(result.lastInsertRowid)
}

export function seedStockItem(queries: ReturnType<typeof createQueries>, overrides: Partial<{
  marca: string; item: string; variante: string | null
  cantidad_invertida: number; cantidad_disponible: number; costo_por_unidad: number
  precio_lista: number | null; precio_taller: number | null; precio_emi: number | null
  status: string; tracking: string | null
  fecha_compra: string | null; fecha_llegada: string | null
  valor_compra_total: number | null; tax: number | null; costo_envio: number | null
  investment_order_id: number | null
}> = {}) {
  const defaults = {
    marca: 'CTS', item: 'DOWNPIPE', variante: 'B58',
    cantidad_invertida: 10, cantidad_disponible: 10, costo_por_unidad: 400,
    precio_lista: 680, precio_taller: 620, precio_emi: 600,
    status: 'DISPONIBLE', tracking: null,
    fecha_compra: null, fecha_llegada: null,
    valor_compra_total: null, tax: null, costo_envio: null,
    investment_order_id: null,
  }
  const data = { ...defaults, ...overrides }
  const result = queries.insertStockItem.run(data)
  return Number(result.lastInsertRowid)
}
