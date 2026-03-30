import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useConvertToStock, useStockItems } from '@/hooks/useOrders'
import type { OrderRow } from '@/lib/api'

import { Input } from '@/components/ui/input'
import {
  Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty,
} from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'

interface ConvertToStockDialogProps {
  order: OrderRow | null
  open: boolean
  onClose: () => void
}

const stockSchema = z.object({
  marca: z.string().min(1, 'Marca es requerida'),
  item: z.string().min(1, 'Item es requerido'),
  variante: z.string(),
  cantidad_invertida: z.string(),
})

type StockFormValues = z.infer<typeof stockSchema>

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function ConvertToStockDialog({ order, open, onClose }: ConvertToStockDialogProps) {
  const convertMutation = useConvertToStock()
  const { data: allStockItems } = useStockItems()

  const uniqueMarcas = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.marca))].sort(), [allStockItems])
  const uniqueItems = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.item))].sort(), [allStockItems])
  const uniqueVariantes = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.variante).filter(Boolean) as string[])].sort(), [allStockItems])

  const costCalc = useMemo(() => {
    if (!order) return { total: 0, perUnit: 0 }
    const compra = Number(order.valor_compra) || 0
    const tax = Number(order.tax) || 0
    const envio = Number(order.costo_envio) || 0
    const qty = Number(order.cantidad) || 1
    const total = compra + tax + envio
    return { total, perUnit: round2(total / qty) }
  }, [order])

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      marca: '',
      item: order?.item ?? '',
      variante: '',
      cantidad_invertida: String(order?.cantidad ?? 1),
    },
  })

  useEffect(() => {
    if (order) {
      reset({
        marca: '',
        item: order.item ?? '',
        variante: '',
        cantidad_invertida: String(order.cantidad ?? 1),
      })
    }
  }, [order?.id])

  const costoPerUnit = costCalc.perUnit
  const precioLista = round2(costoPerUnit * 1.4)
  const precioTaller = round2(costoPerUnit * 1.3)
  const precioEmi = round2(costoPerUnit * 1.2)

  const [apiError, setApiError] = useState('')

  const onSubmit = async (data: StockFormValues) => {
    setApiError('')
    if (!order) return

    try {
      await convertMutation.mutateAsync({
        orderId: order.id,
        data: {
          marca: data.marca.trim(),
          item: data.item.trim(),
          variante: data.variante.trim() || null,
          cantidad_invertida: Number(data.cantidad_invertida) || 1,
          cantidad_disponible: Number(data.cantidad_invertida) || 1,
          costo_por_unidad: costoPerUnit,
          precio_lista: precioLista,
          precio_taller: precioTaller,
          precio_emi: precioEmi,
        },
      })
      onClose()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error convirtiendo a stock')
    }
  }

  const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }} modal={false}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Convertir a Stock</DialogTitle>
          <DialogDescription>
            Crear item de stock a partir del pedido "{order?.item}".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          {apiError && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {apiError}
            </div>
          )}

          <FieldGroup>
            <FieldDescription>
              Costos del pedido: Compra {usd(Number(order?.valor_compra) || 0)} + Tax {usd(Number(order?.tax) || 0)} + Envío {usd(Number(order?.costo_envio) || 0)} = <strong>{usd(costCalc.total)}</strong>
            </FieldDescription>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <Field data-invalid={!!errors.marca}>
                <FieldLabel>Marca <span className="text-destructive">*</span></FieldLabel>
                <Controller
                  control={control}
                  name="marca"
                  render={({ field }) => (
                    <Combobox items={uniqueMarcas} value={field.value || null} onValueChange={(val) => field.onChange(val ?? '')}>
                      <ComboboxInput placeholder="CTS" showClear />
                      <ComboboxContent>
                        <ComboboxEmpty>Nueva marca</ComboboxEmpty>
                        <ComboboxList>
                          {(m) => <ComboboxItem key={m} value={m}>{m}</ComboboxItem>}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}
                />
                {errors.marca && <FieldError>{errors.marca.message}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.item}>
                <FieldLabel>Item <span className="text-destructive">*</span></FieldLabel>
                <Controller
                  control={control}
                  name="item"
                  render={({ field }) => (
                    <Combobox items={uniqueItems} value={field.value || null} onValueChange={(val) => field.onChange(val ?? '')}>
                      <ComboboxInput showClear />
                      <ComboboxContent>
                        <ComboboxEmpty>Nuevo item</ComboboxEmpty>
                        <ComboboxList>
                          {(i) => <ComboboxItem key={i} value={i}>{i}</ComboboxItem>}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}
                />
                {errors.item && <FieldError>{errors.item.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Variante</FieldLabel>
                <Controller
                  control={control}
                  name="variante"
                  render={({ field }) => (
                    <Combobox items={uniqueVariantes} value={field.value || null} onValueChange={(val) => field.onChange(val ?? '')}>
                      <ComboboxInput placeholder="B58" showClear />
                      <ComboboxContent>
                        <ComboboxEmpty>Nueva variante</ComboboxEmpty>
                        <ComboboxList>
                          {(v) => <ComboboxItem key={v} value={v}>{v}</ComboboxItem>}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Cantidad</FieldLabel>
                <Input type="number" {...register('cantidad_invertida')} />
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
