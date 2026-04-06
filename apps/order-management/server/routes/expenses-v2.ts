import { Hono } from 'hono'
import { queries } from '../db-v2.js'

const expenses = new Hono()

// ── List all expenses ──

expenses.get('/', (c) => {
  const rows = queries.listExpenses.all()
  return c.json(rows)
})

// ── Get single expense ──

expenses.get('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const expense = queries.getExpense.get(id)
  if (!expense) return c.json({ error: 'Expense not found' }, 404)
  return c.json(expense)
})

// ── Create expense ──

expenses.post('/', async (c) => {
  const body = await c.req.json()

  if (!body.description) return c.json({ error: 'description is required' }, 400)
  if (body.cost === undefined || body.cost === null) {
    return c.json({ error: 'cost is required' }, 400)
  }

  // Resolve paid_by: can be a staff id (number) or name (string)
  let paidBy: number | null = null
  if (body.paid_by !== undefined && body.paid_by !== null) {
    if (typeof body.paid_by === 'string') {
      const staff = queries.getStaffByName.get(body.paid_by.trim()) as { id: number } | undefined
      if (!staff) return c.json({ error: `Unknown staff: ${body.paid_by}` }, 400)
      paidBy = staff.id
    } else {
      const staff = queries.getStaffById.get(body.paid_by)
      if (!staff) return c.json({ error: 'Staff not found' }, 404)
      paidBy = body.paid_by
    }
  }

  try {
    const result = queries.insertExpense.run({
      description: body.description.trim(),
      cost: Number(body.cost),
      paid_by: paidBy,
      paid_at: body.paid_at ?? null,
      is_settled: 0,
      settled_at: null,
    })

    const created = queries.getExpense.get(Number(result.lastInsertRowid))
    return c.json(created, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Creation failed'
    return c.json({ error: msg }, 400)
  }
})

// ── Update expense ──

expenses.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = queries.getExpense.get(id) as Record<string, unknown> | undefined
  if (!existing) return c.json({ error: 'Expense not found' }, 404)

  const body = await c.req.json()

  // Resolve paid_by if provided
  let paidBy = existing.paid_by as number | null
  if (body.paid_by !== undefined) {
    if (body.paid_by === null) {
      paidBy = null
    } else if (typeof body.paid_by === 'string') {
      const staff = queries.getStaffByName.get(body.paid_by.trim()) as { id: number } | undefined
      if (!staff) return c.json({ error: `Unknown staff: ${body.paid_by}` }, 400)
      paidBy = staff.id
    } else {
      const staff = queries.getStaffById.get(body.paid_by)
      if (!staff) return c.json({ error: 'Staff not found' }, 404)
      paidBy = body.paid_by
    }
  }

  queries.updateExpense.run({
    id,
    description: body.description ?? existing.description,
    cost: body.cost !== undefined ? Number(body.cost) : existing.cost,
    paid_by: paidBy,
    paid_at: body.paid_at !== undefined ? body.paid_at : existing.paid_at,
    is_settled: body.is_settled !== undefined ? (body.is_settled ? 1 : 0) : existing.is_settled,
    settled_at: body.settled_at !== undefined ? body.settled_at : existing.settled_at,
  })

  const updated = queries.getExpense.get(id)
  return c.json(updated)
})

export default expenses
