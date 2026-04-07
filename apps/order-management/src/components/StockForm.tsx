import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateStockItem, useUpdateStockItem, useStockItems, usePriceTiers, useStockPrices } from '@/hooks/useOrders'
import type { StockItem, StockPrice, PriceTier } from '@/lib/api'
import { cn } from '@/lib/utils'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ComboboxCreatable,
  ComboboxCreatableInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox'
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field'

interface StockFormProps {
  stockItem: StockItem | null
  onDone: () => void
  onCancel: () => void
}

const STATUS_OPTIONS = ['EN CAMINO', 'DISPONIBLE', 'SOLD OUT'] as const

const stockSchema = z.object({
  marca: z.string().min(1, 'Marca es requerida'),
  item: z.string().min(1, 'Item es requerido'),
  variante: z.string(),
  quantity: z.string(),
  cost_per_unit: z.string(),
  status: z.string(),
})

type StockFormValues = z.infer<typeof stockSchema>

interface TierMarginState {
  [tierName: string]: string // margin_percent as string for input binding
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function StockForm({ stockItem, onDone, onCancel }: StockFormProps) {
  const isEdit = !!stockItem
  const { data: allStockItems } = useStockItems()
  const { data: priceTiers } = usePriceTiers()
  const { data: existingPrices } = useStockPrices(stockItem?.id ?? null)

  const uniqueMarcas = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.marca))].sort(), [allStockItems])
  const uniqueItems = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.item))].sort(), [allStockItems])
  const uniqueVariantes = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.variante).filter(Boolean) as string[])].sort(), [allStockItems])

  // Initialize tier margins from existing stock_prices
  const [tierMargins, setTierMargins] = useState<TierMarginState>(() => {
    const margins: TierMarginState = {}
    if (existingPrices) {
      for (const sp of existingPrices) {
        margins[sp.tier_name] = String(sp.margin_percent)
      }
    }
    return margins
  })

  // Update tier margins when existingPrices loads (async)
  const [pricesInitialized, setPricesInitialized] = useState(false)
  if (existingPrices && !pricesInitialized) {
    const margins: TierMarginState = {}
    for (const sp of existingPrices) {
      margins[sp.tier_name] = String(sp.margin_percent)
    }
    setTierMargins(margins)
    setPricesInitialized(true)
  }

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      marca: stockItem?.marca ?? '',
      item: stockItem?.item ?? '',
      variante: stockItem?.variante ?? '',
      quantity: stockItem?.quantity != null ? String(stockItem.quantity) : '0',
      cost_per_unit: stockItem?.cost_per_unit != null ? String(stockItem.cost_per_unit) : '',
      status: stockItem?.status ?? 'EN CAMINO',
    },
  })

  const [apiError, setApiError] = useState('')
  const createMutation = useCreateStockItem()
  const updateMutation = useUpdateStockItem()

  const costPerUnit = watch('cost_per_unit')
  const effectiveCost = useMemo(() => Number(costPerUnit) || 0, [costPerUnit])

  // Calculate price for a tier from its margin
  const calcTierPrice = (marginStr: string): number | null => {
    const margin = Number(marginStr)
    if (isNaN(margin) || effectiveCost <= 0) return null
    return round2(effectiveCost * (1 + margin / 100))
  }

  const setTierMargin = (tierName: string, value: string) => {
    setTierMargins((prev) => ({ ...prev, [tierName]: value }))
  }

  const onSubmit = async (data: StockFormValues) => {
    setApiError('')

    try {
      if (isEdit && stockItem) {
        // Build prices array from tier margins
        const prices: { tier_name: string; margin_percent: number }[] = []
        if (priceTiers) {
          for (const tier of priceTiers) {
            const marginStr = tierMargins[tier.name]
            if (marginStr != null && marginStr !== '') {
              prices.push({
                tier_name: tier.name,
                margin_percent: Number(marginStr),
              })
            }
          }
        }

        const payload: Record<string, unknown> = {
          marca: data.marca.trim(),
          item: data.item.trim(),
          variante: data.variante.trim() || null,
          quantity: Number(data.quantity) || 0,
          available: data.status === 'EN CAMINO' ? 0 : Number(data.quantity) || 0,
          cost_per_unit: effectiveCost,
          status: data.status,
          prices,
        }

        await updateMutation.mutateAsync({ id: stockItem.id, data: payload })
      } else {
        // Create mode: marca, item, variante, quantity, valor_compra
        const payload: Record<string, unknown> = {
          marca: data.marca.trim(),
          item: data.item.trim(),
          variante: data.variante.trim() || null,
          quantity: Number(data.quantity) || 1,
          valor_compra: data.cost_per_unit !== '' ? Number(data.cost_per_unit) : 0,
        }

        await createMutation.mutateAsync(payload)
      }
      onDone()
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Error guardando item de stock'
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {apiError && (
        <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {apiError}
        </div>
      )}

      {/* Producto */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-foreground font-semibold">Producto</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Marca, nombre y variante del producto.
          </p>
        </div>
        <div className="md:col-span-2">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.marca}>
                <FieldLabel>
                  Marca <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="marca"
                  render={({ field }) => (
                    <ComboboxCreatable items={uniqueMarcas} value={field.value || null} onValueChange={(val) => field.onChange(val ?? '')}>
                      <ComboboxCreatableInput placeholder="Ej: CTS Turbo" showClear />
                      <ComboboxContent>
                        <ComboboxEmpty>Nueva marca</ComboboxEmpty>
                        <ComboboxList>
                          {(m) => <ComboboxItem key={m} value={m}>{m}</ComboboxItem>}
                        </ComboboxList>
                      </ComboboxContent>
                    </ComboboxCreatable>
                  )}
                />
                {errors.marca && <FieldError>{errors.marca.message}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.item}>
                <FieldLabel>
                  Item <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="item"
                  render={({ field }) => (
                    <ComboboxCreatable items={uniqueItems} value={field.value || null} onValueChange={(val) => field.onChange(val ?? '')}>
                      <ComboboxCreatableInput placeholder="Ej: Intercooler" showClear />
                      <ComboboxContent>
                        <ComboboxEmpty>Nuevo item</ComboboxEmpty>
                        <ComboboxList>
                          {(i) => <ComboboxItem key={i} value={i}>{i}</ComboboxItem>}
                        </ComboboxList>
                      </ComboboxContent>
                    </ComboboxCreatable>
                  )}
                />
                {errors.item && <FieldError>{errors.item.message}</FieldError>}
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel>Variante</FieldLabel>
                <Controller
                  control={control}
                  name="variante"
                  render={({ field }) => (
                    <ComboboxCreatable items={uniqueVariantes} value={field.value || null} onValueChange={(val) => field.onChange(val ?? '')}>
                      <ComboboxCreatableInput placeholder="Ej: B58 Gen 1" showClear />
                      <ComboboxContent>
                        <ComboboxEmpty>Nueva variante</ComboboxEmpty>
                        <ComboboxList>
                          {(v) => <ComboboxItem key={v} value={v}>{v}</ComboboxItem>}
                        </ComboboxList>
                      </ComboboxContent>
                    </ComboboxCreatable>
                  )}
                />
              </Field>
            </div>
          </FieldGroup>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Cantidad + Valor compra (create) / Inventario (edit) */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-foreground font-semibold">{isEdit ? 'Inventario' : 'Inversi\u00f3n'}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {isEdit ? 'Cantidades y costo unitario.' : 'Cantidad y valor de la compra.'}
          </p>
        </div>
        <div className="md:col-span-2">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="quantity">Cantidad</FieldLabel>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  {...register('quantity')}
                />
              </Field>
              {!isEdit && (
                <Field>
                  <FieldLabel htmlFor="valor_compra_create">Valor Compra Total (USD)</FieldLabel>
                  <Input
                    id="valor_compra_create"
                    type="number"
                    step="any"
                    {...register('cost_per_unit')}
                  />
                </Field>
              )}
            </div>
          </FieldGroup>
        </div>
      </div>

      {isEdit && (<>
      <Separator className="my-8" />

      {/* Status */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-foreground font-semibold">Estado</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Estado actual del stock.
          </p>
        </div>
        <div className="md:col-span-2">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="status" className="w-full">
                        <SelectValue placeholder="Seleccionar status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </FieldGroup>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Costo por Unidad */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-foreground font-semibold">Costos</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Costo unitario del producto en USD.
          </p>
        </div>
        <div className="md:col-span-2">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cost_per_unit">Costo por Unidad USD</FieldLabel>
                <Input
                  id="cost_per_unit"
                  type="number"
                  step="any"
                  {...register('cost_per_unit')}
                  placeholder="USD"
                />
              </Field>
            </div>
          </FieldGroup>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Precios por Tier */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-foreground font-semibold">Precios</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Margen y precio por tier. El precio se calcula
            autom&aacute;ticamente desde el costo unitario y el margen.
          </p>
        </div>
        <div className="md:col-span-2">
          <FieldGroup>
            {priceTiers && priceTiers.length > 0 ? (
              <div className="space-y-4">
                {/* Header row */}
                <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
                  <span>Tier</span>
                  <span>Margen %</span>
                  <span>Precio USD</span>
                </div>
                {priceTiers.map((tier) => (
                  <TierPriceRow
                    key={tier.id}
                    tier={tier}
                    marginValue={tierMargins[tier.name] ?? ''}
                    calculatedPrice={calcTierPrice(tierMargins[tier.name] ?? '')}
                    onMarginChange={(val) => setTierMargin(tier.name, val)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay tiers de precio configurados.
              </p>
            )}
          </FieldGroup>
        </div>
      </div>
      </>)}

      <Separator className="my-8" />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}

function TierPriceRow({
  tier,
  marginValue,
  calculatedPrice,
  onMarginChange,
}: {
  tier: PriceTier
  marginValue: string
  calculatedPrice: number | null
  onMarginChange: (value: string) => void
}) {
  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <span className="text-sm font-medium capitalize">{tier.name}</span>
      <Field>
        <Input
          type="number"
          step="any"
          placeholder="Ej: 40"
          value={marginValue}
          onChange={(e) => onMarginChange(e.target.value)}
        />
      </Field>
      <div className="flex items-center gap-2">
        <span className={cn(
          'text-sm tabular-nums',
          calculatedPrice != null ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {calculatedPrice != null ? `$${calculatedPrice.toFixed(2)}` : '--'}
        </span>
        {calculatedPrice != null && (
          <Badge variant="secondary" className="text-xs">auto</Badge>
        )}
      </div>
    </div>
  )
}
