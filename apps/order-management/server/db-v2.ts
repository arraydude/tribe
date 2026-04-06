import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { SCHEMA_V2_SQL, createQueriesV2 } from './schema-v2.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'tribe-v2.db')

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(SCHEMA_V2_SQL)

export const queries = createQueriesV2(db)

export default db
