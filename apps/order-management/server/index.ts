import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import orders from './routes/orders.js'
import dashboard from './routes/dashboard.js'
import quotation from './routes/quotation.js'
import stock from './routes/stock.js'
import { queries } from './db.js'

const app = new Hono()

app.use('/*', cors())

app.route('/api/orders', orders)
app.route('/api/dashboard', dashboard)
app.route('/api/quotation', quotation)
app.route('/api/stock', stock)

// Clients endpoint
app.get('/api/clients', (c) => {
  const clients = queries.getAllClients.all()
  return c.json(clients)
})

// Team members endpoint
app.get('/api/team-members', (c) => {
  const members = queries.getAllTeamMembers.all()
  return c.json(members)
})

const port = 3456
console.log(`Tribe API running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })
