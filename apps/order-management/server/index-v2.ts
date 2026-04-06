import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import orders from './routes/orders-v2.js'
import stock from './routes/stock-v2.js'
import clients from './routes/clients-v2.js'
import licences from './routes/licences-v2.js'
import expenses from './routes/expenses-v2.js'
import { queries } from './db-v2.js'

const app = new Hono()
app.use('/*', cors())

app.route('/api/orders', orders)
app.route('/api/stock', stock)
app.route('/api/clients', clients)
app.route('/api/licences', licences)
app.route('/api/expenses', expenses)

// Lookups
app.get('/api/staff', (c) => c.json(queries.getAllStaff.all()))
app.get('/api/tracking-statuses', (c) => c.json(queries.getAllStatuses.all()))
app.get('/api/price-tiers', (c) => c.json(queries.getAllTiers.all()))

// Dashboard
app.get('/api/dashboard/stats', (c) => {
  const stats = queries.dashboardStats.get()
  const profit = queries.profitStats.get()
  const topClients = queries.topClients.all()
  const monthly = queries.monthlyData.all()
  const statusDist = queries.statusDistribution.all()
  const best = queries.bestOrder.get()
  const worst = queries.worstOrder.get()
  return c.json({ stats, profit, topClients, monthly, statusDist, best, worst })
})

// Quotation calculator
app.post('/api/quotation/calculate', async (c) => {
  const { cost, weight, margin_percent } = await c.req.json()
  const compra = Number(cost) || 0
  const peso = Number(weight) || 0
  const margen = Number(margin_percent) || 30

  const financingCost = Math.round((compra * 1.01 * 1.04 - compra) * 100) / 100
  const importCost = Math.round(peso * 45 * 100) / 100
  const totalCost = Math.round((compra + financingCost + importCost) * 100) / 100
  const quotedPrice = Math.round(totalCost * (1 + margen / 100) * 100) / 100
  const profit = Math.round((quotedPrice - totalCost) * 100) / 100

  return c.json({ cost: compra, financing_cost: financingCost, import_cost: importCost, total_cost: totalCost, quoted_price: quotedPrice, profit, margin_percent: margen })
})

const port = 3456
console.log(`Tribe v2 API running on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
