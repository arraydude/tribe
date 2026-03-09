import { Hono } from 'hono'
import { queries } from '../db.js'

const dashboard = new Hono()

dashboard.get('/stats', (c) => {
  const counts = queries.dashboardStats.get() as Record<string, number>
  const profit = queries.profitStats.get() as Record<string, number>
  const topClients = queries.topClients.all()
  const monthly = queries.monthlyData.all()
  const statusDist = queries.statusDistribution.all()
  const best = queries.bestOrder.get()
  const worst = queries.worstOrder.get()

  return c.json({
    counts,
    profit,
    topClients,
    monthly,
    statusDistribution: statusDist,
    bestOrder: best,
    worstOrder: worst,
  })
})

export default dashboard
