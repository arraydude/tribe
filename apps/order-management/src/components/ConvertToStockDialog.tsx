import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useConvertToStock, useStockItems, usePriceTiers } from '@/hooks/useOrders'
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

const DEFAULT_MARGINS: Record<string, number> = {
  lista: 40,
  taller: 30,
  emi: 20,
}

const marginSchema = z.object({
  tier_name: z.string(),
  margin_percent: z.number().min(0, 'Margen debe ser >= 0'),
})

const stockSchema = z.object({
  marca: z.string().min(1, 'Marca es requerida'),
  item: z.string().min(1, 'Item es requerido'),
  variante: z.string(),
  cantidad_invertida: z.string(),
  prices: z.array(marginSchema),
})

type StockFormValues = z.infer<typeof stockSchema>

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function ConvertToStockDialog({ order, open, onClose }: ConvertToStockDialogProps) {
  const convertMutation = useConvertToStock()
  const { data: allStockItems } = useStockItems()
  const { data: priceTiers } = usePriceTiers()

  const uniqueMarcas = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.marca))].sort(), [allStockItems])
  const uniqueItems = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.item))].sort(), [allStockItems])
  const uniqueVariantes = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.variante).filter(Boolean) as string[])].sort(), [allStockItems])

  const costCalc = useMemo(() => {
    if (!order) return { total: 0, perUnit: 0 }
    const cost = Number(order.cost) || 0
    const financingCost = Number(order.financing_cost) || 0
    const importCost = Number(order.import_cost) || 0
    const qty = Number(order.quantity) || 1
    const total = cost + financingCost + importCost
    return { total, perUnit: round2(total / qty) }
  }, [order])

  const defaultPrices = useMemo(() => {
    const tiers = priceTiers ?? []
    return tiers.map((t) => ({
      tier_name: t.name,
      margin_percent: DEFAULT_MARGINS[t.name] ?? 30,
    }))
  }, [priceTiers])

  const { handleSubmit, control, reset, watch, formState: { errors } } = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      marca: '',
      item: order?.item ?? '',
      variante: '',
      cantidad_invertida: String(order?.quantity ?? 1),
      prices: defaultPrices,
    },
  })

  const { fields } = useFieldArray({ control, name: 'prices' })

  useEffect(() => {
    if (order) {
      reset({
        marca: '',
        item: order.item ?? '',
        variante: '',
        cantidad_invertida: String(order.quantity ?? 1),
        prices: defaultPrices,
      })
    }
  }, [order?.id, defaultPrices])

  const watchedPrices = watch('prices')
  const costoPerUnit = costCalc.perUnit

  const computedPrices = useMemo(() => {
    return (watchedPrices ?? []).map((p) => ({
      tier_name: p.tier_name,
      margin_percent: p.margin_percent,
      price: round2(costoPerUnit * (1 + (Number(p.margin_percent) || 0) / 100)),
    }))
  }, [watchedPrices, costoPerUnit])

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
          quantity: Number(data.cantidad_invertida) || 1,
          available: Number(data.cantidad_invertida) || 1,
          cost_per_unit: costoPerUnit,
          prices: data.prices.map((p) => ({
            tier_name: p.tier_name,
            margin_percent: Number(p.margin_percent),
          })),
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
              Costos del pedido: Cost {usd(Number(order?.cost) || 0)} + Financing {usd(Number(order?.financing_cost) || 0)} + Import {usd(Number(order?.import_cost) || 0)} = <strong>{usd(costCalc.total)}</strong>
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
                <Controller
                  control={control}
                  name="cantidad_invertida"
                  render={({ field }) => (
                    <Input type="number" {...field} />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel>Costo/Unidad <Badge variant="secondary" className="ml-auto">auto</Badge></FieldLabel>
                <Input type="number" value={costoPerUnit} disabled />
              </Field>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              {fields.map((field, index) => {
                const computed = computedPrices[index]
                return (
                  <Field key={field.id}>
                    <FieldLabel className="capitalize">
                      P. {field.tier_name}{' '}
                      <Badge variant="secondary" className="ml-auto">
                        {usd(computed?.price ?? 0)}
                      </Badge>
                    </FieldLabel>
                    <Controller
                      control={control}
                      name={`prices.${index}.margin_percent`}
                      render={({ field: marginField }) => (
                        <div className="relative">
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            {...marginField}
                            onChange={(e) => marginField.onChange(Number(e.target.value))}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            %
                          </span>
                        </div>
                      )}
                    />
                    {errors.prices?.[index]?.margin_percent && (
                      <FieldError>{errors.prices[index]!.margin_percent!.message}</FieldError>
                    )}
                  </Field>
                )
              })}
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
