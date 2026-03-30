import Database from 'better-sqlite3'

export const SCHEMA_SQL = `
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
    status              TEXT DEFAULT 'DISPONIBLE',
    tracking            TEXT,
    fecha_compra        TEXT,
    fecha_llegada       TEXT,
    valor_compra_total  REAL,
    tax                 REAL,
    costo_envio         REAL,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now')),
    investment_order_id INTEGER REFERENCES orders(id),
    UNIQUE(marca, item, variante)
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
    stock_item_id       INTEGER REFERENCES stock_items(id),
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now')),
    deleted_at          TEXT
  );
`

export function createQueries(db: Database.Database) {
  return {
    // Stock items
    listStockItems: db.prepare('SELECT * FROM stock_items ORDER BY marca, item, variante'),
    getStockItem: db.prepare('SELECT * FROM stock_items WHERE id = ?'),
    insertStockItem: db.prepare(`
      INSERT INTO stock_items (marca, item, variante, cantidad_invertida, cantidad_disponible, costo_por_unidad,
        precio_lista, precio_taller, precio_emi, status, tracking, fecha_compra, fecha_llegada,
        valor_compra_total, tax, costo_envio, investment_order_id)
      VALUES (@marca, @item, @variante, @cantidad_invertida, @cantidad_disponible, @costo_por_unidad,
        @precio_lista, @precio_taller, @precio_emi, @status, @tracking, @fecha_compra, @fecha_llegada,
        @valor_compra_total, @tax, @costo_envio, @investment_order_id)
    `),
    updateStockItem: db.prepare(`
      UPDATE stock_items SET
        marca = @marca, item = @item, variante = @variante,
        cantidad_invertida = @cantidad_invertida, cantidad_disponible = @cantidad_disponible,
        costo_por_unidad = @costo_por_unidad, precio_lista = @precio_lista,
        precio_taller = @precio_taller, precio_emi = @precio_emi,
        status = @status, tracking = @tracking, fecha_compra = @fecha_compra,
        fecha_llegada = @fecha_llegada, valor_compra_total = @valor_compra_total,
        tax = @tax, costo_envio = @costo_envio,
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
    getStockItemByInvestmentOrderId: db.prepare('SELECT * FROM stock_items WHERE investment_order_id = ?'),
    ordersByStockItemId: db.prepare(`
      SELECT o.*, c.name as cliente, c.type as client_type
      FROM orders o JOIN clients c ON o.client_id = c.id
      WHERE o.stock_item_id = ? AND o.deleted_at IS NULL AND o.is_stock = 1
      ORDER BY o.id DESC
    `),

    stockBalance: db.prepare(`
      SELECT
        si.id, si.marca, si.item, si.variante,
        si.cantidad_invertida, si.cantidad_disponible, si.costo_por_unidad, si.status,
        (si.cantidad_invertida * si.costo_por_unidad) as total_invertido,
        COALESCE(SUM(o.ganancia), 0) as total_recuperado,
        COALESCE(SUM(o.ganancia), 0) - (si.cantidad_invertida * si.costo_por_unidad) as balance,
        COUNT(o.id) as ventas_count
      FROM stock_items si
      LEFT JOIN orders o ON o.stock_item_id = si.id AND o.deleted_at IS NULL AND o.is_stock = 1
      GROUP BY si.id
      ORDER BY si.marca, si.item
    `),

    // Team members
    getAllTeamMembers: db.prepare('SELECT * FROM team_members ORDER BY name'),

    // Clients
    getClientByName: db.prepare('SELECT * FROM clients WHERE name = ?'),
    getClientById: db.prepare('SELECT * FROM clients WHERE id = ?'),
    getAllClients: db.prepare('SELECT * FROM clients ORDER BY name'),
    insertClient: db.prepare('INSERT INTO clients (name, type) VALUES (?, ?)'),

    // Orders
    listOrders: db.prepare(`
      SELECT o.*, c.name as cliente, c.type as client_type
      FROM orders o JOIN clients c ON o.client_id = c.id
      WHERE o.deleted_at IS NULL ORDER BY o.id DESC
    `),
    getOrder: db.prepare(`
      SELECT o.*, c.name as cliente, c.type as client_type
      FROM orders o JOIN clients c ON o.client_id = c.id
      WHERE o.id = ? AND o.deleted_at IS NULL
    `),
    insertOrder: db.prepare(`
      INSERT INTO orders (
        client_id, item, cantidad, link_compra, valor_presupuestado,
        fecha_compra, valor_compra, valor_debitado, tax, costo_envio,
        peso, status, is_stock, is_paid, asignado, ganancia,
        paid_to, tracking, observaciones, stock_item_id
      ) VALUES (
        @client_id, @item, @cantidad, @link_compra, @valor_presupuestado,
        @fecha_compra, @valor_compra, @valor_debitado, @tax, @costo_envio,
        @peso, @status, @is_stock, @is_paid, @asignado, @ganancia,
        @paid_to, @tracking, @observaciones, @stock_item_id
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
    setOrderStockItemId: db.prepare(`
      UPDATE orders SET stock_item_id = @stock_item_id, updated_at = datetime('now')
      WHERE id = @id AND deleted_at IS NULL
    `),
    softDelete: db.prepare(`
      UPDATE orders SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND deleted_at IS NULL
    `),

    // Dashboard stats
    dashboardStats: db.prepare(`
      SELECT COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) as done_count,
        SUM(CASE WHEN status = 'IN PROGRESS' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'TO DO' THEN 1 ELSE 0 END) as todo_count,
        SUM(CASE WHEN status = 'RECEIVED BAIRES' THEN 1 ELSE 0 END) as received_count
      FROM orders o JOIN clients c ON o.client_id = c.id WHERE o.deleted_at IS NULL
    `),
    profitStats: db.prepare(`
      SELECT SUM(ganancia) as total_profit, AVG(ganancia) as avg_profit,
        SUM(valor_presupuestado) as total_revenue, SUM(valor_compra) as total_cost
      FROM orders o JOIN clients c ON o.client_id = c.id
      WHERE o.deleted_at IS NULL AND o.status = 'DONE' AND o.is_paid = 1
        AND c.type != 'internal' AND o.ganancia IS NOT NULL
    `),
    topClients: db.prepare(`
      SELECT c.name, SUM(o.ganancia) as total_profit, COUNT(o.id) as order_count
      FROM orders o JOIN clients c ON o.client_id = c.id
      WHERE o.deleted_at IS NULL AND c.type != 'internal' AND o.ganancia IS NOT NULL
      GROUP BY c.id ORDER BY total_profit DESC LIMIT 10
    `),
    monthlyData: db.prepare(`
      SELECT substr(fecha_compra, 1, 7) as month, SUM(ganancia) as profit, COUNT(*) as orders
      FROM orders o JOIN clients c ON o.client_id = c.id
      WHERE o.deleted_at IS NULL AND fecha_compra IS NOT NULL AND c.type != 'internal'
      GROUP BY substr(fecha_compra, 1, 7) ORDER BY month
    `),
    statusDistribution: db.prepare(`
      SELECT status, COUNT(*) as count FROM orders WHERE deleted_at IS NULL GROUP BY status
    `),
    bestOrder: db.prepare(`
      SELECT o.*, c.name as cliente FROM orders o JOIN clients c ON o.client_id = c.id
      WHERE o.deleted_at IS NULL AND c.type != 'internal' AND o.status = 'DONE' AND o.is_paid = 1
      ORDER BY o.ganancia DESC LIMIT 1
    `),
    worstOrder: db.prepare(`
      SELECT o.*, c.name as cliente FROM orders o JOIN clients c ON o.client_id = c.id
      WHERE o.deleted_at IS NULL AND c.type != 'internal' AND o.status = 'DONE' AND o.is_paid = 1
      ORDER BY o.ganancia ASC LIMIT 1
    `),
  }
}
