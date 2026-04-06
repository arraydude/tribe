import Database from 'better-sqlite3'

// ============================================================
// SCHEMA V2
// ============================================================

export const SCHEMA_V2_SQL = `
  -- Lookups
  CREATE TABLE IF NOT EXISTS staff (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tracking_statuses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS price_tiers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Clients & Cars
  CREATE TABLE IF NOT EXISTS clients (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    notes      TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cars (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    brand      TEXT NOT NULL,
    model      TEXT NOT NULL,
    version    TEXT,
    vin        TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS client_cars (
    client_id  INTEGER NOT NULL REFERENCES clients(id),
    car_id     INTEGER NOT NULL REFERENCES cars(id),
    is_current INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (client_id, car_id)
  );

  CREATE TABLE IF NOT EXISTS dealers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id     INTEGER NOT NULL UNIQUE REFERENCES clients(id),
    price_tier_id INTEGER NOT NULL REFERENCES price_tiers(id),
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  -- Stock & Pricing (before orders, since orders FK → stock)
  CREATE TABLE IF NOT EXISTS stock (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    marca         TEXT NOT NULL,
    item          TEXT NOT NULL,
    variante      TEXT,
    quantity      INTEGER NOT NULL DEFAULT 0,
    available     INTEGER NOT NULL DEFAULT 0,
    cost_per_unit REAL NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'EN CAMINO'
                  CHECK(status IN ('EN CAMINO','DISPONIBLE','SOLD OUT')),
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now')),
    UNIQUE(marca, item, variante)
  );

  CREATE TABLE IF NOT EXISTS stock_prices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id        INTEGER NOT NULL REFERENCES stock(id),
    price_tier_id   INTEGER NOT NULL REFERENCES price_tiers(id),
    margin_percent  REAL NOT NULL DEFAULT 0,
    price           REAL NOT NULL DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now')),
    UNIQUE(stock_id, price_tier_id)
  );

  -- Licences (before orders, since orders FK → licences)
  CREATE TABLE IF NOT EXISTS licences (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id       INTEGER REFERENCES cars(id),
    order_id     INTEGER,
    type         TEXT NOT NULL CHECK(type IN ('bootmod3','femto','xhp')),
    code         TEXT,
    cost         REAL NOT NULL DEFAULT 0,
    is_used      INTEGER NOT NULL DEFAULT 0,
    used_at      TEXT,
    is_settled   INTEGER NOT NULL DEFAULT 0,
    settled_at   TEXT,
    metadata     TEXT,
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  -- Orders
  CREATE TABLE IF NOT EXISTS orders (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    order_type         TEXT NOT NULL CHECK(order_type IN ('importacion','inversion','venta_stock','repro')),
    client_id          INTEGER NOT NULL REFERENCES clients(id),
    tracking_status_id INTEGER NOT NULL REFERENCES tracking_statuses(id),
    assigned_to        INTEGER REFERENCES staff(id),

    item               TEXT NOT NULL,
    quantity           INTEGER NOT NULL DEFAULT 1,
    purchase_link      TEXT,
    weight             REAL,
    tracking_number    TEXT,
    notes              TEXT,

    cost               REAL,
    financing_cost     REAL,
    import_cost        REAL,
    quoted_price       REAL,
    margin_percent     REAL,
    profit             REAL,

    is_paid            INTEGER NOT NULL DEFAULT 0,
    paid_to            INTEGER REFERENCES staff(id),
    paid_at            TEXT,

    is_settled         INTEGER NOT NULL DEFAULT 0,
    settled_at         TEXT,

    stock_id           INTEGER REFERENCES stock(id),
    license_id         INTEGER REFERENCES licences(id),
    is_unlock          INTEGER NOT NULL DEFAULT 0,

    metadata           TEXT,
    created_at         TEXT DEFAULT (datetime('now')),
    updated_at         TEXT DEFAULT (datetime('now')),
    deleted_at         TEXT
  );

  -- Add FK from stock → orders (investment order) and licences → orders
  -- SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we use a column
  -- stock.order_id is added below via migration-style approach

  CREATE TABLE IF NOT EXISTS order_breakdowns (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id        INTEGER NOT NULL REFERENCES orders(id),
    description     TEXT NOT NULL,
    cost            REAL NOT NULL DEFAULT 0,
    tracking_number TEXT,
    metadata        TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  -- Expenses
  CREATE TABLE IF NOT EXISTS expenses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    description  TEXT NOT NULL,
    cost         REAL NOT NULL DEFAULT 0,
    paid_by      INTEGER REFERENCES staff(id),
    paid_at      TEXT,
    is_settled   INTEGER NOT NULL DEFAULT 0,
    settled_at   TEXT,
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  -- Seed lookup data
  INSERT OR IGNORE INTO staff (name) VALUES ('Nahue'), ('Fede');

  INSERT OR IGNORE INTO tracking_statuses (name, sort_order) VALUES
    ('TO DO', 1), ('IN PROGRESS', 2), ('RECEIVED MIAMI', 3),
    ('RECEIVED BAIRES', 4), ('READY TO DELIVER', 5), ('DONE', 6);

  INSERT OR IGNORE INTO price_tiers (name) VALUES ('lista'), ('taller'), ('emi');
`

// Note: stock.order_id can't be a FK in CREATE TABLE because orders references stock
// and stock references orders (circular). We handle this with a nullable column added
// after both tables exist. In SQLite, the FK is advisory anyway when using
// PRAGMA foreign_keys = ON — the column just holds the integer.
export const STOCK_ORDER_FK_SQL = `
  -- Add order_id column to stock if not exists (for investment order link)
  -- SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we catch the error
`

// ============================================================
// PREPARED QUERIES
// ============================================================

export function createQueriesV2(db: Database.Database) {
  // Ensure stock has order_id column (circular FK workaround)
  try {
    db.exec('ALTER TABLE stock ADD COLUMN order_id INTEGER REFERENCES orders(id)')
  } catch {
    // Column already exists
  }

  return {
    // ── Staff ──
    getAllStaff: db.prepare('SELECT * FROM staff ORDER BY name'),
    getStaffByName: db.prepare('SELECT * FROM staff WHERE name = ?'),
    getStaffById: db.prepare('SELECT * FROM staff WHERE id = ?'),

    // ── Tracking Statuses ──
    getAllStatuses: db.prepare('SELECT * FROM tracking_statuses ORDER BY sort_order'),
    getStatusByName: db.prepare('SELECT * FROM tracking_statuses WHERE name = ?'),
    getStatusById: db.prepare('SELECT * FROM tracking_statuses WHERE id = ?'),

    // ── Price Tiers ──
    getAllTiers: db.prepare('SELECT * FROM price_tiers ORDER BY id'),
    getTierByName: db.prepare('SELECT * FROM price_tiers WHERE name = ?'),
    getTierById: db.prepare('SELECT * FROM price_tiers WHERE id = ?'),

    // ── Clients ──
    getAllClients: db.prepare('SELECT * FROM clients ORDER BY name'),
    getClientByName: db.prepare('SELECT * FROM clients WHERE name = ?'),
    getClientById: db.prepare('SELECT * FROM clients WHERE id = ?'),
    insertClient: db.prepare('INSERT INTO clients (name, notes) VALUES (@name, @notes)'),
    updateClient: db.prepare(`
      UPDATE clients SET name = @name, notes = @notes, updated_at = datetime('now')
      WHERE id = @id
    `),

    // ── Cars ──
    getAllCars: db.prepare('SELECT * FROM cars ORDER BY brand, model'),
    getCarById: db.prepare('SELECT * FROM cars WHERE id = ?'),
    insertCar: db.prepare(`
      INSERT INTO cars (brand, model, version, vin)
      VALUES (@brand, @model, @version, @vin)
    `),
    getCarsByClient: db.prepare(`
      SELECT c.*, cc.is_current FROM cars c
      JOIN client_cars cc ON cc.car_id = c.id
      WHERE cc.client_id = ? ORDER BY cc.is_current DESC, c.brand
    `),
    linkCarToClient: db.prepare(`
      INSERT OR REPLACE INTO client_cars (client_id, car_id, is_current)
      VALUES (@client_id, @car_id, @is_current)
    `),

    // ── Dealers ──
    getAllDealers: db.prepare(`
      SELECT d.*, c.name as client_name, pt.name as tier_name
      FROM dealers d
      JOIN clients c ON c.id = d.client_id
      JOIN price_tiers pt ON pt.id = d.price_tier_id
      ORDER BY c.name
    `),
    getDealerByClientId: db.prepare('SELECT * FROM dealers WHERE client_id = ?'),
    insertDealer: db.prepare(`
      INSERT INTO dealers (client_id, price_tier_id)
      VALUES (@client_id, @price_tier_id)
    `),
    updateDealer: db.prepare(`
      UPDATE dealers SET price_tier_id = @price_tier_id, updated_at = datetime('now')
      WHERE id = @id
    `),

    // ── Orders ──
    listOrders: db.prepare(`
      SELECT o.*,
        c.name as client_name,
        ts.name as status_name,
        ts.sort_order as status_sort,
        sa.name as assigned_to_name,
        sp.name as paid_to_name
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      JOIN tracking_statuses ts ON ts.id = o.tracking_status_id
      LEFT JOIN staff sa ON sa.id = o.assigned_to
      LEFT JOIN staff sp ON sp.id = o.paid_to
      WHERE o.deleted_at IS NULL
      ORDER BY o.id DESC
    `),
    getOrder: db.prepare(`
      SELECT o.*,
        c.name as client_name,
        ts.name as status_name,
        sa.name as assigned_to_name,
        sp.name as paid_to_name
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      JOIN tracking_statuses ts ON ts.id = o.tracking_status_id
      LEFT JOIN staff sa ON sa.id = o.assigned_to
      LEFT JOIN staff sp ON sp.id = o.paid_to
      WHERE o.id = ? AND o.deleted_at IS NULL
    `),
    insertOrder: db.prepare(`
      INSERT INTO orders (
        order_type, client_id, tracking_status_id, assigned_to,
        item, quantity, purchase_link, weight, tracking_number, notes,
        cost, financing_cost, import_cost,
        quoted_price, margin_percent, profit,
        is_paid, paid_to, paid_at,
        is_settled, settled_at,
        stock_id, license_id, is_unlock, metadata
      ) VALUES (
        @order_type, @client_id, @tracking_status_id, @assigned_to,
        @item, @quantity, @purchase_link, @weight, @tracking_number, @notes,
        @cost, @financing_cost, @import_cost,
        @quoted_price, @margin_percent, @profit,
        @is_paid, @paid_to, @paid_at,
        @is_settled, @settled_at,
        @stock_id, @license_id, @is_unlock, @metadata
      )
    `),
    updateOrder: db.prepare(`
      UPDATE orders SET
        order_type = @order_type, client_id = @client_id,
        tracking_status_id = @tracking_status_id, assigned_to = @assigned_to,
        item = @item, quantity = @quantity, purchase_link = @purchase_link,
        weight = @weight, tracking_number = @tracking_number, notes = @notes,
        cost = @cost, financing_cost = @financing_cost, import_cost = @import_cost,
        quoted_price = @quoted_price, margin_percent = @margin_percent, profit = @profit,
        is_paid = @is_paid, paid_to = @paid_to, paid_at = @paid_at,
        is_settled = @is_settled, settled_at = @settled_at,
        stock_id = @stock_id, license_id = @license_id, is_unlock = @is_unlock,
        metadata = @metadata, updated_at = datetime('now')
      WHERE id = @id AND deleted_at IS NULL
    `),
    softDeleteOrder: db.prepare(`
      UPDATE orders SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND deleted_at IS NULL
    `),

    // ── Order Breakdowns ──
    getBreakdownsByOrder: db.prepare(
      'SELECT * FROM order_breakdowns WHERE order_id = ? ORDER BY id'
    ),
    insertBreakdown: db.prepare(`
      INSERT INTO order_breakdowns (order_id, description, cost, tracking_number, metadata)
      VALUES (@order_id, @description, @cost, @tracking_number, @metadata)
    `),
    updateBreakdown: db.prepare(`
      UPDATE order_breakdowns SET
        description = @description, cost = @cost,
        tracking_number = @tracking_number, metadata = @metadata,
        updated_at = datetime('now')
      WHERE id = @id
    `),
    deleteBreakdown: db.prepare('DELETE FROM order_breakdowns WHERE id = ?'),

    // ── Stock ──
    listStock: db.prepare('SELECT * FROM stock ORDER BY marca, item, variante'),
    getStock: db.prepare('SELECT * FROM stock WHERE id = ?'),
    insertStock: db.prepare(`
      INSERT INTO stock (order_id, marca, item, variante, quantity, available, cost_per_unit, status)
      VALUES (@order_id, @marca, @item, @variante, @quantity, @available, @cost_per_unit, @status)
    `),
    updateStock: db.prepare(`
      UPDATE stock SET
        marca = @marca, item = @item, variante = @variante,
        quantity = @quantity, available = @available,
        cost_per_unit = @cost_per_unit, status = @status,
        updated_at = datetime('now')
      WHERE id = @id
    `),
    setStockOrderId: db.prepare(`
      UPDATE stock SET order_id = @order_id, updated_at = datetime('now')
      WHERE id = @id
    `),
    decrementStock: db.prepare(`
      UPDATE stock SET
        available = available - @qty,
        updated_at = datetime('now')
      WHERE id = @id AND available >= @qty
    `),
    incrementStock: db.prepare(`
      UPDATE stock SET
        available = available + @qty,
        updated_at = datetime('now')
      WHERE id = @id
    `),

    // ── Stock Prices ──
    getStockPrices: db.prepare(`
      SELECT sp.*, pt.name as tier_name
      FROM stock_prices sp
      JOIN price_tiers pt ON pt.id = sp.price_tier_id
      WHERE sp.stock_id = ?
      ORDER BY pt.id
    `),
    upsertStockPrice: db.prepare(`
      INSERT INTO stock_prices (stock_id, price_tier_id, margin_percent, price)
      VALUES (@stock_id, @price_tier_id, @margin_percent, @price)
      ON CONFLICT(stock_id, price_tier_id) DO UPDATE SET
        margin_percent = @margin_percent, price = @price,
        updated_at = datetime('now')
    `),
    getStockPriceByTier: db.prepare(`
      SELECT sp.*, pt.name as tier_name
      FROM stock_prices sp
      JOIN price_tiers pt ON pt.id = sp.price_tier_id
      WHERE sp.stock_id = @stock_id AND sp.price_tier_id = @price_tier_id
    `),

    // ── Stock Balance ──
    stockBalance: db.prepare(`
      SELECT
        s.id, s.marca, s.item, s.variante,
        s.quantity, s.available, s.cost_per_unit, s.status,
        (s.quantity * s.cost_per_unit) as total_invertido,
        COALESCE(SUM(o.profit), 0) as total_recuperado,
        COALESCE(SUM(o.profit), 0) - (s.quantity * s.cost_per_unit) as balance,
        COUNT(o.id) as ventas_count
      FROM stock s
      LEFT JOIN orders o ON o.stock_id = s.id
        AND o.deleted_at IS NULL
        AND o.order_type = 'venta_stock'
      GROUP BY s.id
      ORDER BY s.marca, s.item
    `),

    // ── Sales by Stock Item ──
    salesByStock: db.prepare(`
      SELECT o.*, c.name as client_name,
        sa.name as assigned_to_name
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      LEFT JOIN staff sa ON sa.id = o.assigned_to
      WHERE o.stock_id = ? AND o.deleted_at IS NULL AND o.order_type = 'venta_stock'
      ORDER BY o.id DESC
    `),

    // ── Licences ──
    listLicences: db.prepare(`
      SELECT l.*,
        c.brand as car_brand, c.model as car_model, c.version as car_version
      FROM licences l
      LEFT JOIN cars c ON c.id = l.car_id
      ORDER BY l.id DESC
    `),
    getLicence: db.prepare('SELECT * FROM licences WHERE id = ?'),
    insertLicence: db.prepare(`
      INSERT INTO licences (car_id, order_id, type, code, cost, is_used, used_at, is_settled, settled_at, metadata)
      VALUES (@car_id, @order_id, @type, @code, @cost, @is_used, @used_at, @is_settled, @settled_at, @metadata)
    `),
    updateLicence: db.prepare(`
      UPDATE licences SET
        car_id = @car_id, order_id = @order_id, type = @type,
        code = @code, cost = @cost,
        is_used = @is_used, used_at = @used_at,
        is_settled = @is_settled, settled_at = @settled_at,
        metadata = @metadata, updated_at = datetime('now')
      WHERE id = @id
    `),
    getAvailableLicences: db.prepare(`
      SELECT * FROM licences WHERE type = ? AND is_used = 0 ORDER BY id
    `),

    // ── Expenses ──
    listExpenses: db.prepare(`
      SELECT e.*, s.name as paid_by_name
      FROM expenses e
      LEFT JOIN staff s ON s.id = e.paid_by
      ORDER BY e.id DESC
    `),
    getExpense: db.prepare('SELECT * FROM expenses WHERE id = ?'),
    insertExpense: db.prepare(`
      INSERT INTO expenses (description, cost, paid_by, paid_at, is_settled, settled_at)
      VALUES (@description, @cost, @paid_by, @paid_at, @is_settled, @settled_at)
    `),
    updateExpense: db.prepare(`
      UPDATE expenses SET
        description = @description, cost = @cost,
        paid_by = @paid_by, paid_at = @paid_at,
        is_settled = @is_settled, settled_at = @settled_at,
        updated_at = datetime('now')
      WHERE id = @id
    `),

    // ── Dashboard Stats ──
    dashboardStats: db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN ts.name = 'DONE' THEN 1 ELSE 0 END) as done_count,
        SUM(CASE WHEN ts.name = 'IN PROGRESS' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN ts.name = 'TO DO' THEN 1 ELSE 0 END) as todo_count,
        SUM(CASE WHEN ts.name IN ('RECEIVED MIAMI','RECEIVED BAIRES','READY TO DELIVER') THEN 1 ELSE 0 END) as received_count
      FROM orders o
      JOIN tracking_statuses ts ON ts.id = o.tracking_status_id
      WHERE o.deleted_at IS NULL
    `),
    profitStats: db.prepare(`
      SELECT
        SUM(profit) as total_profit,
        AVG(profit) as avg_profit,
        SUM(quoted_price) as total_revenue,
        SUM(cost) as total_cost
      FROM orders
      WHERE deleted_at IS NULL AND order_type != 'inversion'
        AND is_paid = 1 AND profit IS NOT NULL
    `),
    topClients: db.prepare(`
      SELECT c.name, SUM(o.profit) as total_profit, COUNT(o.id) as order_count
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      WHERE o.deleted_at IS NULL AND o.order_type != 'inversion' AND o.profit IS NOT NULL
      GROUP BY c.id ORDER BY total_profit DESC LIMIT 10
    `),
    monthlyData: db.prepare(`
      SELECT substr(created_at, 1, 7) as month,
        SUM(profit) as profit, COUNT(*) as orders
      FROM orders
      WHERE deleted_at IS NULL AND order_type != 'inversion'
      GROUP BY substr(created_at, 1, 7) ORDER BY month
    `),
    statusDistribution: db.prepare(`
      SELECT ts.name as status, COUNT(*) as count
      FROM orders o
      JOIN tracking_statuses ts ON ts.id = o.tracking_status_id
      WHERE o.deleted_at IS NULL
      GROUP BY ts.name
    `),
    bestOrder: db.prepare(`
      SELECT o.*, c.name as client_name
      FROM orders o JOIN clients c ON c.id = o.client_id
      WHERE o.deleted_at IS NULL AND o.order_type != 'inversion'
        AND o.is_paid = 1
      ORDER BY o.profit DESC LIMIT 1
    `),
    worstOrder: db.prepare(`
      SELECT o.*, c.name as client_name
      FROM orders o JOIN clients c ON c.id = o.client_id
      WHERE o.deleted_at IS NULL AND o.order_type != 'inversion'
        AND o.is_paid = 1
      ORDER BY o.profit ASC LIMIT 1
    `),

    // ── Settlement ──
    unsettledOrders: db.prepare(`
      SELECT o.*, c.name as client_name
      FROM orders o JOIN clients c ON c.id = o.client_id
      WHERE o.deleted_at IS NULL AND o.is_paid = 1 AND o.is_settled = 0
      ORDER BY o.id
    `),
    settleOrders: db.prepare(`
      UPDATE orders SET is_settled = 1, settled_at = datetime('now'), updated_at = datetime('now')
      WHERE id = @id AND deleted_at IS NULL
    `),
  }
}
