import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'tribe.db')

const db = new Database(DB_PATH)

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    type        TEXT DEFAULT 'standard' CHECK(type IN ('standard','taller','emi','internal')),
    notes       TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id           INTEGER NOT NULL REFERENCES clients(id),
    item                TEXT NOT NULL,
    cantidad            REAL DEFAULT 1,
    link_compra         TEXT,
    valor_presupuestado REAL,
    fecha_compra        TEXT,
    valor_compra        REAL,
    valor_debitado      REAL,
    tax                 REAL,
    costo_envio         REAL,
    peso                REAL,
    status              TEXT DEFAULT 'TO DO' CHECK(status IN ('TO DO','IN PROGRESS','RECEIVED BAIRES','DONE')),
    is_stock            INTEGER DEFAULT 0,
    is_paid             INTEGER DEFAULT 0,
    asignado            TEXT,
    ganancia            REAL,
    paid_to             TEXT,
    tracking            TEXT,
    observaciones       TEXT,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now')),
    deleted_at          TEXT
  );
`)

// Prepared statements
export const queries = {
  // Clients
  getClientByName: db.prepare('SELECT * FROM clients WHERE name = ?'),
  getClientById: db.prepare('SELECT * FROM clients WHERE id = ?'),
  getAllClients: db.prepare('SELECT * FROM clients ORDER BY name'),
  insertClient: db.prepare('INSERT INTO clients (name, type) VALUES (?, ?)'),

  // Orders - list (excludes soft-deleted)
  listOrders: db.prepare(`
    SELECT o.*, c.name as cliente, c.type as client_type
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.deleted_at IS NULL
    ORDER BY o.id DESC
  `),

  getOrder: db.prepare(`
    SELECT o.*, c.name as cliente, c.type as client_type
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.id = ? AND o.deleted_at IS NULL
  `),

  insertOrder: db.prepare(`
    INSERT INTO orders (
      client_id, item, cantidad, link_compra, valor_presupuestado,
      fecha_compra, valor_compra, valor_debitado, tax, costo_envio,
      peso, status, is_stock, is_paid, asignado, ganancia,
      paid_to, tracking, observaciones
    ) VALUES (
      @client_id, @item, @cantidad, @link_compra, @valor_presupuestado,
      @fecha_compra, @valor_compra, @valor_debitado, @tax, @costo_envio,
      @peso, @status, @is_stock, @is_paid, @asignado, @ganancia,
      @paid_to, @tracking, @observaciones
    )
  `),

  updateOrder: db.prepare(`
    UPDATE orders SET
      client_id = @client_id, item = @item, cantidad = @cantidad,
      link_compra = @link_compra, valor_presupuestado = @valor_presupuestado,
      fecha_compra = @fecha_compra, valor_compra = @valor_compra,
      valor_debitado = @valor_debitado, tax = @tax, costo_envio = @costo_envio,
      peso = @peso, status = @status, is_stock = @is_stock, is_paid = @is_paid,
      asignado = @asignado, ganancia = @ganancia, paid_to = @paid_to,
      tracking = @tracking, observaciones = @observaciones,
      updated_at = datetime('now')
    WHERE id = @id AND deleted_at IS NULL
  `),

  softDelete: db.prepare(`
    UPDATE orders SET deleted_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ? AND deleted_at IS NULL
  `),

  // Dashboard stats
  dashboardStats: db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) as done_count,
      SUM(CASE WHEN status = 'IN PROGRESS' THEN 1 ELSE 0 END) as in_progress_count,
      SUM(CASE WHEN status = 'TO DO' THEN 1 ELSE 0 END) as todo_count,
      SUM(CASE WHEN status = 'RECEIVED BAIRES' THEN 1 ELSE 0 END) as received_count
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.deleted_at IS NULL
  `),

  profitStats: db.prepare(`
    SELECT
      SUM(ganancia) as total_profit,
      AVG(ganancia) as avg_profit,
      SUM(valor_presupuestado) as total_revenue,
      SUM(valor_compra) as total_cost
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.deleted_at IS NULL
      AND o.status = 'DONE' AND o.is_paid = 1
      AND c.type != 'internal'
      AND o.ganancia IS NOT NULL
  `),

  topClients: db.prepare(`
    SELECT c.name, SUM(o.ganancia) as total_profit, COUNT(o.id) as order_count
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.deleted_at IS NULL AND c.type != 'internal' AND o.ganancia IS NOT NULL
    GROUP BY c.id
    ORDER BY total_profit DESC
    LIMIT 10
  `),

  monthlyData: db.prepare(`
    SELECT
      substr(fecha_compra, 1, 7) as month,
      SUM(ganancia) as profit,
      COUNT(*) as orders
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.deleted_at IS NULL AND fecha_compra IS NOT NULL AND c.type != 'internal'
    GROUP BY substr(fecha_compra, 1, 7)
    ORDER BY month
  `),

  statusDistribution: db.prepare(`
    SELECT status, COUNT(*) as count
    FROM orders
    WHERE deleted_at IS NULL
    GROUP BY status
  `),

  bestOrder: db.prepare(`
    SELECT o.*, c.name as cliente
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.deleted_at IS NULL AND c.type != 'internal'
      AND o.status = 'DONE' AND o.is_paid = 1
    ORDER BY o.ganancia DESC LIMIT 1
  `),

  worstOrder: db.prepare(`
    SELECT o.*, c.name as cliente
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.deleted_at IS NULL AND c.type != 'internal'
      AND o.status = 'DONE' AND o.is_paid = 1
    ORDER BY o.ganancia ASC LIMIT 1
  `),
}

export default db
