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

  CREATE TABLE IF NOT EXISTS team_members (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO team_members (name) VALUES ('NAHUE');
  INSERT OR IGNORE INTO team_members (name) VALUES ('FEDE');

  CREATE TABLE IF NOT EXISTS stock_items (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    marca               TEXT NOT NULL,
    item                TEXT NOT NULL,
    variante            TEXT,
    cantidad_invertida  INTEGER NOT NULL DEFAULT 0,
    cantidad_disponible INTEGER NOT NULL DEFAULT 0,
    costo_por_unidad    REAL NOT NULL DEFAULT 0,
    precio_lista        REAL,
    precio_taller       REAL,
    precio_emi          REAL,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now')),
    UNIQUE(marca, item, variante)
  );

  INSERT OR IGNORE INTO stock_items (marca, item, variante, cantidad_invertida, cantidad_disponible, costo_por_unidad, precio_lista, precio_taller, precio_emi)
  VALUES
    ('CTS', 'DOWNPIPE', 'B58', 9, 8, 398.00, 674.69, 616.90, 597.00),
    ('CTS', 'DOWNPIPE', 'S58', 4, 1, 781.46, 1324.69, 1211.26, 1054.97),
    ('Infinity Design', 'INTAKE', 'B58 G42', 3, 3, 1158.00, 1712.68, 1528.56, 1464.87),
    ('Infinity Design', 'INTAKE', 'S58', 2, 1, 2225.00, 3115.00, 2781.25, 2670.00),
    ('NGK', 'Bujias', 'B58/S58', 10, 6, 98.20, 149.75, 139.94, 130.12),
    ('Generica', 'Rejillas', 'M2 G87', 5, 4, 80.40, 120.60, 110.15, 100.50);

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

// Add stock_item_id to orders if missing (migration guard)
try {
  db.exec('ALTER TABLE orders ADD COLUMN stock_item_id INTEGER REFERENCES stock_items(id)')
} catch {
  // column already exists
}

// Prepared statements
export const queries = {
  // Stock items
  listStockItems: db.prepare('SELECT * FROM stock_items ORDER BY marca, item, variante'),
  getStockItem: db.prepare('SELECT * FROM stock_items WHERE id = ?'),
  insertStockItem: db.prepare(`
    INSERT INTO stock_items (marca, item, variante, cantidad_invertida, cantidad_disponible, costo_por_unidad, precio_lista, precio_taller, precio_emi)
    VALUES (@marca, @item, @variante, @cantidad_invertida, @cantidad_disponible, @costo_por_unidad, @precio_lista, @precio_taller, @precio_emi)
  `),
  updateStockItem: db.prepare(`
    UPDATE stock_items SET
      marca = @marca, item = @item, variante = @variante,
      cantidad_invertida = @cantidad_invertida, cantidad_disponible = @cantidad_disponible,
      costo_por_unidad = @costo_por_unidad, precio_lista = @precio_lista,
      precio_taller = @precio_taller, precio_emi = @precio_emi,
      updated_at = datetime('now')
    WHERE id = @id
  `),
  decrementStock: db.prepare(`
    UPDATE stock_items SET
      cantidad_disponible = cantidad_disponible - @qty,
      updated_at = datetime('now')
    WHERE id = @id AND cantidad_disponible >= @qty
  `),
  incrementStock: db.prepare(`
    UPDATE stock_items SET
      cantidad_disponible = cantidad_disponible + @qty,
      updated_at = datetime('now')
    WHERE id = @id
  `),

  // Team members
  getAllTeamMembers: db.prepare('SELECT * FROM team_members ORDER BY name'),

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
