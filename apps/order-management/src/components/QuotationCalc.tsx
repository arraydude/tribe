import { useState, useMemo } from 'react'

import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function fmtUSD(n: number | null): string {
  if (n == null || isNaN(n)) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function QuotationCalc() {
  const [precioCompra, setPrecioCompra] = useState('')
  const [pesoKg, setPesoKg] = useState('')
  const [margen, setMargen] = useState('30')

  const calc = useMemo(() => {
    const compra = Number(precioCompra) || 0
    const peso = Number(pesoKg) || 0
    const m = Number(margen) / 100

    if (!compra) return null

    const banco = round2(compra * 0.01)
    const debitado = round2(compra + banco)
    const comision = round2(debitado * 0.04)
    const subtotal = round2(debitado + comision)
    const envio = peso ? round2(45 * peso) : 0
    const costoTotal = round2(subtotal + envio)
    const precio = round2(costoTotal * (1 + m))
    const ganancia = round2(precio - costoTotal)

    return { compra, banco, debitado, comision, subtotal, envio, costoTotal, precio, ganancia }
  }, [precioCompra, pesoKg, margen])

  return (
    <div className="max-w-xl space-y-6">
      <FieldDescription>
        Compra × 1.01 (banco) × 1.04 (comisión) + envío ($45/kg) = costo total × (1 + margen) = precio
      </FieldDescription>

      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="q-compra">Compra (USD)</FieldLabel>
                <Input id="q-compra" type="number" step="any" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} placeholder="0.00" />
              </Field>
              <Field>
                <FieldLabel htmlFor="q-peso">Peso (kg)</FieldLabel>
                <Input id="q-peso" type="number" step="any" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} placeholder="0.0" />
              </Field>
            </div>

            <Field>
              <FieldLabel>Margen</FieldLabel>
              <div className="flex items-center gap-3">
                <ToggleGroup type="single" value={margen} onValueChange={(v) => { if (v) setMargen(v) }} size="sm" variant="outline">
                  <ToggleGroupItem value="10">10%</ToggleGroupItem>
                  <ToggleGroupItem value="20">20%</ToggleGroupItem>
                  <ToggleGroupItem value="30">30%</ToggleGroupItem>
                </ToggleGroup>
                <div className="flex items-center gap-1">
                  <Input type="number" value={margen} onChange={(e) => setMargen(e.target.value)} className="w-20 text-center text-sm" />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </Field>
          </FieldGroup>

          {calc && (
            <>
              <Separator />

              <div className="rounded-md border p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Desglose</p>
                <div className="space-y-1 font-mono text-sm">
                  <Row label="Compra" value={calc.compra} />
                  <Row label="+ Banco (1%)" value={calc.banco} muted />
                  <Row label="= Debitado" value={calc.debitado} bold />
                  <Row label="+ Comisión (4%)" value={calc.comision} muted />
                  <Row label="= Subtotal" value={calc.subtotal} bold />
                  {calc.envio > 0 && (
                    <Row label={`+ Envío ($45 × ${Number(pesoKg)}kg)`} value={calc.envio} muted />
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between pt-1 text-base font-bold">
                    <span>Costo Total</span>
                    <span>{fmtUSD(calc.costoTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border p-3">
                  <span className="text-sm text-muted-foreground">Precio al Cliente</span>
                  <div className="mt-1 text-lg font-semibold">{fmtUSD(calc.precio)}</div>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <span className="text-sm text-muted-foreground">Ganancia</span>
                  <div className="mt-1 text-lg font-semibold">{fmtUSD(calc.ganancia)}</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''} ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span>{fmtUSD(value)}</span>
    </div>
  )
}
