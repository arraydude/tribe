/**
 * Seed v2 database from Excel spreadsheet
 * Run: npx tsx server/seed-v2.ts
 */
import XLSX from 'xlsx'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { SCHEMA_V2_SQL, createQueriesV2 } from './schema-v2.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXCEL_PATH = path.join(__dirname, '..', '..', '..', 'ops', 'spreadsheets', 'Seguimiento compras Tribe.xlsx')
const DB_PATH = path.join(__dirname, '..', 'tribe-v2.db')

// ── Helpers ──

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function excelDateToISO(serial: number | undefined | null): string | null {
  if (!serial || typeof serial !== 'number') return null
  const d = new Date((serial - 25569) * 86400 * 1000)
  return d.toISOString().split('T')[0]
}

function normalizeClientName(raw: string): string {
  if (!raw) return ''
  let name = raw.trim()
  // Title case common names
  const lower = name.toLowerCase()
  const MAP: Record<string, string> = {
    'abel': 'Abel',
    'nerf': 'NERF',
    'tribe': 'Tribe',
    'positivo': 'POSITIVO',
  }
  if (MAP[lower]) return MAP[lower]
  // Title-case if all lowercase or all uppercase
  if (name === name.toLowerCase() || name === name.toUpperCase()) {
    return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }
  return name
}

function mapStatus(excelStatus: string | undefined): string {
  if (!excelStatus) return 'TO DO'
  const s = excelStatus.trim().toUpperCase()
  const MAP: Record<string, string> = {
    'DONE': 'DONE',
    'IN PROGRESS': 'IN PROGRESS',
    'RECEIVED BAIRES': 'RECEIVED BAIRES',
    'TO DO': 'TO DO',
    'RECEIVED MIAMI': 'RECEIVED MIAMI',
    'READY TO DELIVER': 'READY TO DELIVER',
  }
  return MAP[s] ?? 'TO DO'
}

// ── Main ──

console.log('Reading Excel:', EXCEL_PATH)
const wb = XLSX.readFile(EXCEL_PATH)

// Init DB
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(SCHEMA_V2_SQL)
const queries = createQueriesV2(db)

// Counters
const counts = { clients: 0, orders: 0, stock: 0, stock_prices: 0, licences: 0, skipped: 0 }

// ── Cache lookups ──
const staffCache = new Map<string, number>()
for (const s of queries.getAllStaff.all() as { id: number; name: string }[]) {
  staffCache.set(s.name.toUpperCase(), s.id)
}

const statusCache = new Map<string, number>()
for (const s of queries.getAllStatuses.all() as { id: number; name: string }[]) {
  statusCache.set(s.name, s.id)
}

const tierCache = new Map<string, number>()
for (const t of queries.getAllTiers.all() as { id: number; name: string }[]) {
  tierCache.set(t.name, t.id)
}

const clientCache = new Map<string, number>()

function resolveClientId(name: string): number {
  const normalized = normalizeClientName(name)
  if (!normalized) throw new Error('Empty client name')
  if (clientCache.has(normalized)) return clientCache.get(normalized)!
  let client = queries.getClientByName.get(normalized) as { id: number } | undefined
  if (!client) {
    const result = queries.insertClient.run({ name: normalized, notes: null })
    const id = Number(result.lastInsertRowid)
    clientCache.set(normalized, id)
    counts.clients++
    return id
  }
  clientCache.set(normalized, client.id)
  return client.id
}

function resolveStaffId(name: string | undefined): number | null {
  if (!name || !name.trim() || name.trim() === 'NADIE') return null
  const key = name.trim().toUpperCase()
  return staffCache.get(key) ?? null
}

function resolveStatusId(name: string): number {
  const mapped = mapStatus(name)
  return statusCache.get(mapped) ?? statusCache.get('TO DO')!
}

// ══════════════════════════════════════
// SEED: SEGUIMIENTO COMPRAS TRIBE
// ══════════════════════════════════════
console.log('\n── Seeding SEGUIMIENTO ──')

const segSheet = wb.Sheets[wb.SheetNames[0]]
const segData = XLSX.utils.sheet_to_json<Record<string, unknown>>(segSheet, { header: 'A', defval: '' })

// Skip header row
const segRows = segData.slice(1)

const seedOrders = db.transaction(() => {
  for (let i = 0; i < segRows.length; i++) {
    const r = segRows[i]
    const cliente = String(r.B ?? '').trim()
    const item = String(r.C ?? '').trim()

    if (!cliente || !item) {
      counts.skipped++
      continue
    }

    // Determine order type
    const isStock = String(r.A ?? '').toUpperCase() === 'SI'
    const isInternalClient = ['TRIBE', 'NERF', 'POSITIVO'].includes(cliente.toUpperCase())
    let orderType: string
    if (isStock && isInternalClient) {
      orderType = 'inversion'
    } else if (isStock) {
      orderType = 'venta_stock'
    } else {
      orderType = 'importacion'
    }

    const clientId = resolveClientId(cliente)
    const statusId = resolveStatusId(String(r.M ?? ''))
    const assignedTo = resolveStaffId(String(r.O ?? ''))

    const valorCompra = Number(r.H) || null
    const taxCol = Number(r.J) || null
    const costoEnvio = Number(r.K) || null

    // financing_cost = TAX column - VALOR COMPRA (the financial charges portion)
    let financingCost: number | null = null
    if (valorCompra && taxCol) {
      financingCost = round2(taxCol - valorCompra)
    }

    const isPaid = String(r.N ?? '').toUpperCase() === 'SI' ? 1 : 0
    const paidTo = resolveStaffId(String(r.Q ?? ''))
    const isSettled = String(r.R ?? '').toUpperCase() === 'SI' ? 1 : 0

    // Calculate margin if possible
    const quotedPrice = Number(r.F) || null
    const totalCost = (valorCompra ?? 0) + (financingCost ?? 0) + (costoEnvio ?? 0)
    let marginPercent: number | null = null
    if (quotedPrice && totalCost > 0) {
      marginPercent = round2(((quotedPrice / totalCost) - 1) * 100)
    }

    queries.insertOrder.run({
      order_type: orderType,
      client_id: clientId,
      tracking_status_id: statusId,
      assigned_to: assignedTo,
      item,
      quantity: Number(r.D) || 1,
      purchase_link: String(r.E ?? '').trim() || null,
      weight: Number(r.L) || null,
      tracking_number: String(r.S ?? '').trim() || null,
      notes: String(r.T ?? '').trim() || null,
      cost: valorCompra,
      financing_cost: financingCost,
      import_cost: costoEnvio,
      quoted_price: quotedPrice,
      margin_percent: marginPercent,
      profit: Number(r.P) || null,
      is_paid: isPaid,
      paid_to: paidTo,
      paid_at: excelDateToISO(r.G as number), // use fecha_compra as paid date approximation
      is_settled: isSettled,
      settled_at: isSettled ? excelDateToISO(r.G as number) : null,
      stock_id: null,
      license_id: null,
      is_unlock: 0,
      metadata: null,
    })
    counts.orders++
  }
})

seedOrders()
console.log(`  Orders: ${counts.orders} created, ${counts.skipped} skipped`)
console.log(`  Clients: ${counts.clients} created`)

// ══════════════════════════════════════
// SEED: STOCK
// ══════════════════════════════════════
console.log('\n── Seeding STOCK ──')

const stockSheet = wb.Sheets['STOCK']
if (stockSheet) {
  const stockData = XLSX.utils.sheet_to_json<Record<string, unknown>>(stockSheet, { header: 'A', defval: '' })
  // Row 0 = merge row ("SUGERIDOS"), Row 1 = headers, Rows 2+ = data
  const stockRows = stockData.slice(2)

  // Use upsert to handle duplicate SKUs (same marca+item+variante = different batch)
  const upsertStock = db.prepare(`
    INSERT INTO stock (order_id, marca, item, variante, quantity, available, cost_per_unit, status)
    VALUES (@order_id, @marca, @item, @variante, @quantity, @available, @cost_per_unit, @status)
    ON CONFLICT(marca, item, variante) DO UPDATE SET
      quantity = @quantity, available = @available,
      cost_per_unit = @cost_per_unit, status = @status,
      updated_at = datetime('now')
  `)

  const seedStock = db.transaction(() => {
    for (const r of stockRows) {
      const marca = String(r.C ?? '').trim()
      const item = String(r.D ?? '').trim()
      const variante = String(r.E ?? '').trim() || null

      if (!marca || !item) continue
      if (marca.toLowerCase().startsWith('caja')) continue

      const quantity = Number(r.F) || 0
      const available = Number(r.G) || 0
      const costPerUnit = Number(r.H) || 0
      const status = available > 0 ? 'DISPONIBLE' : 'SOLD OUT'

      upsertStock.run({
        order_id: null,
        marca,
        item,
        variante,
        quantity,
        available,
        cost_per_unit: costPerUnit,
        status,
      })

      // Get the stock id (might be existing row from upsert)
      const stockRow = db.prepare('SELECT id FROM stock WHERE marca = ? AND item = ? AND (variante = ? OR (variante IS NULL AND ? IS NULL))').get(marca, item, variante, variante) as { id: number }
      const stockId = stockRow.id
      counts.stock++

      // Tier prices
      const margins = [
        { tier: 'lista', margin: Number(r.I) || 0 },
        { tier: 'emi', margin: Number(r.K) || 0 },
        { tier: 'taller', margin: Number(r.M) || 0 },
      ]

      for (const m of margins) {
        const tierId = tierCache.get(m.tier)
        if (!tierId) continue
        // Excel stores as decimal (0.695 = 69.5%)
        const marginPct = m.margin > 1 ? m.margin : round2(m.margin * 100)
        const price = round2(costPerUnit * (1 + marginPct / 100))
        queries.upsertStockPrice.run({
          stock_id: stockId,
          price_tier_id: tierId,
          margin_percent: marginPct,
          price,
        })
        counts.stock_prices++
      }
    }
  })

  seedStock()
  console.log(`  Stock items: ${counts.stock} created`)
  console.log(`  Stock prices: ${counts.stock_prices} created`)
} else {
  console.log('  STOCK sheet not found')
}

// ══════════════════════════════════════
// SEED: REPRO (Licences)
// ══════════════════════════════════════
console.log('\n── Seeding REPRO ──')

const reproSheet = wb.Sheets['REPRO']
if (reproSheet) {
  const reproData = XLSX.utils.sheet_to_json<Record<string, unknown>>(reproSheet, { header: 'A', defval: '' })
  const reproRows = reproData.slice(1) // skip header

  const seedLicences = db.transaction(() => {
    for (const r of reproRows) {
      const code = String(r.B ?? '').trim()
      const cost = Number(r.C) || 0

      if (!code || cost === 0) continue

      const isUsed = r.E === true || String(r.E ?? '').toLowerCase() === 'true' ? 1 : 0
      const isSettled = String(r.I ?? '').toUpperCase() === 'SI' ? 1 : 0
      const cliente = String(r.F ?? '').trim()

      // Determine licence type from code
      let licType = 'bootmod3'
      const codeLower = code.toLowerCase()
      if (codeLower === 'mhd' || codeLower.includes('mhd')) licType = 'bootmod3' // map MHD to bootmod3 for now

      const metadata: Record<string, unknown> = {}
      if (cliente) metadata.cliente = cliente
      const precio = r.D
      if (precio && precio !== 'N/A' && precio !== 'n/a') metadata.precio = Number(precio) || precio
      const abonadaA = String(r.J ?? '').trim()
      if (abonadaA) metadata.abonada_a = abonadaA

      queries.insertLicence.run({
        car_id: null,
        order_id: null,
        type: licType,
        code,
        cost,
        is_used: isUsed,
        used_at: isUsed ? excelDateToISO(r.A as number) : null,
        is_settled: isSettled,
        settled_at: isSettled ? excelDateToISO(r.A as number) : null,
        metadata: JSON.stringify(metadata),
      })
      counts.licences++
    }
  })

  seedLicences()
  console.log(`  Licences: ${counts.licences} created`)
} else {
  console.log('  REPRO sheet not found')
}

// ── Summary ──
console.log('\n══ SEED COMPLETE ══')
console.log(`  Clients:      ${counts.clients}`)
console.log(`  Orders:       ${counts.orders}`)
console.log(`  Stock items:  ${counts.stock}`)
console.log(`  Stock prices: ${counts.stock_prices}`)
console.log(`  Licences:     ${counts.licences}`)
console.log(`  Skipped rows: ${counts.skipped}`)
console.log(`  DB: ${DB_PATH}`)

db.close()
