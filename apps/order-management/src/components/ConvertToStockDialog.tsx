import { useState, useMemo } from 'react'
import { useConvertToStock } from '@/hooks/useOrders'
import type { OrderRow } from '@/lib/api'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel, FieldDescription as FieldDesc } from '@/components/ui/field'

interface ConvertToStockDialogProps {
  order: OrderRow | null
  open: boolean
  onClose: () => void
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function ConvertToStockDialog({ order, open, onClose }: ConvertToStockDialogProps) {
  const convertMutation = useConvertToStock()

  const costCalc = useMemo(() => {
    if (!order) return { total: 0, perUnit: 0 }
    const compra = Number(order.valor_compra) || 0
    const tax = Number(order.tax) || 0
    const envio = Number(order.costo_envio) || 0
    const qty = Number(order.cantidad) || 1
    const total = compra + tax + envio
    return { total, perUnit: round2(total / qty) }
  }, [order])

  const [form, setForm] = useState({
    marca: '', item: '', variante: '',
    cantidad_invertida: order?.cantidad?.toString() ?? '1',
  })

  // Reset form when order changes
  const [lastOrderId, setLastOrderId] = useState<number | null>(null)
  if (order && order.id !== lastOrderId) {
    setLastOrderId(order.id)
    setForm({
      marca: '', item: order.item ?? '', variante: '',
      cantidad_invertida: order.cantidad?.toString() ?? '1',
    })
  }

  const costoPerUnit = costCalc.perUnit
  const precioLista = round2(costoPerUnit * 1.4)
  const precioTaller = round2(costoPerUnit * 1.3)
  const precioEmi = round2(costoPerUnit * 1.2)

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.marca.trim() || !form.item.trim()) {
      setError('Marca e Item son obligatorios')
      return
    }
    if (!order) return

    try {
      await convertMutation.mutateAsync({
        orderId: order.id,
        data: {
          marca: form.marca.trim(),
          item: form.item.trim(),
          variante: form.variante.trim() || null,
          cantidad_invertida: Number(form.cantidad_invertida) || 1,
          cantidad_disponible: Number(form.cantidad_invertida) || 1,
          costo_por_unidad: costoPerUnit,
          precio_lista: precioLista,
          precio_taller: precioTaller,
          precio_emi: precioEmi,
        },
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error convirtiendo a stock')
    }
  }

  const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }} modal={false}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convertir a Stock</DialogTitle>
          <DialogDescription>
            Crear item de stock a partir del pedido "{order?.item}".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <FieldGroup>
            <FieldDesc>
              Costos del pedido: Compra {usd(Number(order?.valor_compra) || 0)} + Tax {usd(Number(order?.tax) || 0)} + Envío {usd(Number(order?.costo_envio) || 0)} = <strong>{usd(costCalc.total)}</strong>
            </FieldDesc>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel>Marca <span className="text-destructive">*</span></FieldLabel>
                <Input value={form.marca} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} placeholder="CTS" />
              </Field>
              <Field>
                <FieldLabel>Item <span className="text-destructive">*</span></FieldLabel>
                <Input value={form.item} onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Variante</FieldLabel>
                <Input value={form.variante} onChange={(e) => setForm((f) => ({ ...f, variante: e.target.value }))} placeholder="B58" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Cantidad</FieldLabel>
                <Input type="number" value={form.cantidad_invertida} onChange={(e) => setForm((f) => ({ ...f, cantidad_invertida: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Costo/Unidad <Badge variant="secondary" className="ml-auto">auto</Badge></FieldLabel>
                <Input type="number" value={costoPerUnit} disabled />
              </Field>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel>P. Lista <Badge variant="secondary" className="ml-auto">×1.4</Badge></FieldLabel>
                <Input type="number" value={precioLista} disabled />
              </Field>
              <Field>
                <FieldLabel>P. Taller <Badge variant="secondary" className="ml-auto">×1.3</Badge></FieldLabel>
                <Input type="number" value={precioTaller} disabled />
              </Field>
              <Field>
                <FieldLabel>P. EMI <Badge variant="secondary" className="ml-auto">×1.2</Badge></FieldLabel>
                <Input type="number" value={precioEmi} disabled />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={convertMutation.isPending}>
              {convertMutation.isPending ? 'Convirtiendo...' : 'Convertir a Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
