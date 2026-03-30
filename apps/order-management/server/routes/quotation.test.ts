import { describe, it, expect } from 'vitest'

// Test the quotation formula directly (same logic as server/routes/quotation.ts)
function calculate(precio_compra: number, peso_kg: number, margen = 0.3) {
  const costoBase = Math.round(precio_compra * 1.04 * 100) / 100
  const envioArg = Math.round(45 * peso_kg * 100) / 100
  const costo = Math.round((costoBase + envioArg) * 100) / 100
  const precio = Math.round(costo * (1 + margen) * 100) / 100
  const ganancia = Math.round((precio - costo) * 100) / 100
  return { costoBase, envioArg, costo, precio, ganancia, margen }
}

describe('Quotation calculation', () => {
  it('applies 4% tax correctly', () => {
    const result = calculate(100, 0, 0)
    expect(result.costoBase).toBe(104) // 100 * 1.04
  })

  it('calculates shipping at $45/kg', () => {
    const result = calculate(0, 2, 0)
    expect(result.envioArg).toBe(90) // 45 * 2
  })

  it('calculates total cost correctly', () => {
    const result = calculate(100, 2, 0)
    expect(result.costoBase).toBe(104)
    expect(result.envioArg).toBe(90)
    expect(result.costo).toBe(194)
  })

  it('applies 30% margin by default', () => {
    const result = calculate(100, 2)
    expect(result.costo).toBe(194)
    expect(result.precio).toBe(252.2) // 194 * 1.3
    expect(result.ganancia).toBe(58.2) // 252.2 - 194
  })

  it('applies 20% margin', () => {
    const result = calculate(100, 2, 0.2)
    expect(result.precio).toBe(232.8) // 194 * 1.2
    expect(result.ganancia).toBe(38.8)
  })

  it('applies 50% margin', () => {
    const result = calculate(100, 2, 0.5)
    expect(result.precio).toBe(291) // 194 * 1.5
    expect(result.ganancia).toBe(97)
  })

  it('rounds to 2 decimal places', () => {
    const result = calculate(333.33, 1.7)
    // costoBase = 333.33 * 1.04 = 346.6632 → 346.66
    expect(result.costoBase).toBe(346.66)
    // envioArg = 45 * 1.7 = 76.5
    expect(result.envioArg).toBe(76.5)
    // costo = 346.66 + 76.5 = 423.16
    expect(result.costo).toBe(423.16)
    // precio = 423.16 * 1.3 = 550.108 → 550.11
    expect(result.precio).toBe(550.11)
    // ganancia = 550.11 - 423.16 = 126.95
    expect(result.ganancia).toBe(126.95)
  })

  it('handles zero values', () => {
    const result = calculate(0, 0, 0.3)
    expect(result.costoBase).toBe(0)
    expect(result.envioArg).toBe(0)
    expect(result.costo).toBe(0)
    expect(result.precio).toBe(0)
    expect(result.ganancia).toBe(0)
  })

  it('handles large values', () => {
    const result = calculate(12000, 15, 0.3)
    // costoBase = 12000 * 1.04 = 12480
    expect(result.costoBase).toBe(12480)
    // envioArg = 45 * 15 = 675
    expect(result.envioArg).toBe(675)
    // costo = 13155
    expect(result.costo).toBe(13155)
    // precio = 13155 * 1.3 = 17101.5
    expect(result.precio).toBe(17101.5)
    // ganancia = 17101.5 - 13155 = 3946.5
    expect(result.ganancia).toBe(3946.5)
  })
})
