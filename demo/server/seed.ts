import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db, { queries } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface RawOrder {
  id: number
  stock: string | null
  cliente: string | null
  item: string | null
  cantidad: number | null
  valorPresupuestado: number | null
  fechaCompra: string | null
  valorCompra: number | null
  valorDebitado: number | null
  tax: number | null
  costoEnvio: number | null
  peso: number | null
  status: string | null
  saldado: string | null
  asignado: string | null
  ganancia: number | null
  saldadoA: string | null
  observaciones: string | null
}

const INTERNAL_CLIENTS = ['TRIBE', 'NERF']

function getClientType(name: string): string {
  const upper = name.toUpperCase()
  if (INTERNAL_CLIENTS.includes(upper)) return 'internal'
  return 'standard'
}

function normalizeClientName(name: string): string {
  // Title-case for consistency
  return name.trim().split(/\s+/).map(w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ')
}

function seed() {
  const jsonPath = path.join(__dirname, '..', 'src', 'data', 'orders.json')
  const raw: RawOrder[] = JSON.parse(readFileSync(jsonPath, 'utf-8'))

  console.log(`Seeding ${raw.length} orders...`)

  // Collect unique clients
  const clientMap = new Map<string, number>()

  const insertClient = db.prepare('INSERT OR IGNORE INTO clients (name, type) VALUES (?, ?)')
  const getClient = db.prepare('SELECT id FROM clients WHERE name = ?')

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      client_id, item, cantidad, link_compra, valor_presupuestado,
      fecha_compra, valor_compra, valor_debitado, tax, costo_envio,
      peso, status, is_stock, is_paid, asignado, ganancia,
      paid_to, tracking, observaciones
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `)

  const transaction = db.transaction(() => {
    // Clear existing data
    db.exec('DELETE FROM orders')
    db.exec('DELETE FROM clients')

    let skipped = 0

    for (const row of raw) {
      if (!row.cliente || !row.item) {
        skipped++
        continue
      }

      const clientName = normalizeClientName(row.cliente)

      if (!clientMap.has(clientName)) {
        insertClient.run(clientName, getClientType(clientName))
        const client = getClient.get(clientName) as { id: number }
        clientMap.set(clientName, client.id)
      }

      const clientId = clientMap.get(clientName)!

      // Normalize status
      let status = row.status?.toUpperCase().trim() || 'TO DO'
      const validStatuses = ['TO DO', 'IN PROGRESS', 'RECEIVED BAIRES', 'DONE']
      if (!validStatuses.includes(status)) status = 'TO DO'

      insertOrder.run(
        clientId,
        row.item,
        row.cantidad ?? 1,
        null, // link_compra not in old data
        row.valorPresupuestado,
        row.fechaCompra,
        row.valorCompra,
        row.valorDebitado,
        row.tax,
        row.costoEnvio,
        row.peso,
        status,
        row.stock?.toUpperCase() === 'SI' ? 1 : 0,
        row.saldado?.toUpperCase() === 'SI' ? 1 : 0,
        row.asignado,
        row.ganancia,
        row.saldadoA,
        null, // tracking not in old data
        row.observaciones,
      )
    }

    console.log(`Imported ${raw.length - skipped} orders (${skipped} skipped)`)
    console.log(`Created ${clientMap.size} clients`)
  })

  transaction()
  console.log('Seed complete!')
}

seed()
