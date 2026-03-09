import { Hono } from 'hono'

const quotation = new Hono()

quotation.post('/calculate', async (c) => {
  const body = await c.req.json()
  const { precio_compra, peso_kg, margen = 0.3 } = body

  if (!precio_compra || !peso_kg) {
    return c.json({ error: 'precio_compra and peso_kg required' }, 400)
  }

  const costoBase = precio_compra * 1.04
  const envioArg = 45 * peso_kg
  const costo = costoBase + envioArg
  const precio = costo * (1 + margen)
  const ganancia = precio - costo

  return c.json({
    costoBase: Math.round(costoBase * 100) / 100,
    envioArg: Math.round(envioArg * 100) / 100,
    costo: Math.round(costo * 100) / 100,
    precio: Math.round(precio * 100) / 100,
    ganancia: Math.round(ganancia * 100) / 100,
    margen,
  })
})

export default quotation
