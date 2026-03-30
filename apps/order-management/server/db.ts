import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { SCHEMA_SQL, createQueries } from './schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'tribe.db')

const db = new Database(DB_PATH)

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Schema
db.exec(SCHEMA_SQL)

// Seed data (only for production DB, not tests)
db.exec(`
  INSERT OR IGNORE INTO team_members (name) VALUES ('NAHUE');
  INSERT OR IGNORE INTO team_members (name) VALUES ('FEDE');

  INSERT OR IGNORE INTO stock_items (marca, item, variante, cantidad_invertida, cantidad_disponible, costo_por_unidad, precio_lista, precio_taller, precio_emi)
  VALUES
    ('CTS', 'DOWNPIPE', 'B58', 9, 8, 398.00, 674.69, 616.90, 597.00),
    ('CTS', 'DOWNPIPE', 'S58', 4, 1, 781.46, 1324.69, 1211.26, 1054.97),
    ('Infinity Design', 'INTAKE', 'B58 G42', 3, 3, 1158.00, 1712.68, 1528.56, 1464.87),
    ('Infinity Design', 'INTAKE', 'S58', 2, 1, 2225.00, 3115.00, 2781.25, 2670.00),
    ('NGK', 'Bujias', 'B58/S58', 10, 6, 98.20, 149.75, 139.94, 130.12),
    ('Generica', 'Rejillas', 'M2 G87', 5, 4, 80.40, 120.60, 110.15, 100.50);
`)

// Migrations for existing DBs (new columns added after initial schema)
const migrations = [
  'ALTER TABLE orders ADD COLUMN stock_item_id INTEGER REFERENCES stock_items(id)',
  "ALTER TABLE stock_items ADD COLUMN status TEXT DEFAULT 'DISPONIBLE'",
  'ALTER TABLE stock_items ADD COLUMN tracking TEXT',
  'ALTER TABLE stock_items ADD COLUMN fecha_compra TEXT',
  'ALTER TABLE stock_items ADD COLUMN fecha_llegada TEXT',
  'ALTER TABLE stock_items ADD COLUMN valor_compra_total REAL',
  'ALTER TABLE stock_items ADD COLUMN tax REAL',
  'ALTER TABLE stock_items ADD COLUMN costo_envio REAL',
  'ALTER TABLE stock_items ADD COLUMN investment_order_id INTEGER REFERENCES orders(id)',
]
for (const sql of migrations) {
  try { db.exec(sql) } catch { /* column already exists */ }
}

// Prepared statements
export const queries = createQueries(db)

export default db
