import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateStockItem, useUpdateStockItem, useStockItems } from '@/hooks/useOrders'
import type { StockItem } from '@/lib/api'
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
  Combobox,
  ComboboxInput,
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

const CALC_FIELDS = ['precio_lista', 'precio_taller', 'precio_emi'] as const
type CalcField = (typeof CALC_FIELDS)[number]

const STATUS_OPTIONS = ['EN TRANSITO', 'RECIBIDO', 'DISPONIBLE'] as const

const stockSchema = z.object({
  marca: z.string().min(1, 'Marca es requerida'),
  item: z.string().min(1, 'Item es requerido'),
  variante: z.string(),
  cantidad_invertida: z.string(),
  costo_por_unidad: z.string(),
  precio_lista: z.string(),
  precio_taller: z.string(),
  precio_emi: z.string(),
  status: z.string(),
  tracking: z.string(),
  fecha_compra: z.string(),
  fecha_llegada: z.string(),
  valor_compra_total: z.string(),
  tax: z.string(),
  costo_envio: z.string(),
})

type StockFormValues = z.infer<typeof stockSchema>

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function StockForm({ stockItem, onDone, onCancel }: StockFormProps) {
  const isEdit = !!stockItem
  const { data: allStockItems } = useStockItems()

  const uniqueMarcas = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.marca))].sort(), [allStockItems])
  const uniqueItems = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.item))].sort(), [allStockItems])
  const uniqueVariantes = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.variante).filter(Boolean) as string[])].sort(), [allStockItems])

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      marca: stockItem?.marca ?? '',
      item: stockItem?.item ?? '',
      variante: stockItem?.variante ?? '',
      cantidad_invertida: stockItem?.cantidad_invertida != null ? String(stockItem.cantidad_invertida) : '0',
      costo_por_unidad: stockItem?.costo_por_unidad != null ? String(stockItem.costo_por_unidad) : '',
      precio_lista: stockItem?.precio_lista != null ? String(stockItem.precio_lista) : '',
      precio_taller: stockItem?.precio_taller != null ? String(stockItem.precio_taller) : '',
      precio_emi: stockItem?.precio_emi != null ? String(stockItem.precio_emi) : '',
      status: stockItem?.status ?? 'EN TRANSITO',
      tracking: stockItem?.tracking ?? '',
      fecha_compra: stockItem?.fecha_compra ?? '',
      fecha_llegada: stockItem?.fecha_llegada ?? '',
      valor_compra_total: stockItem?.valor_compra_total != null ? String(stockItem.valor_compra_total) : '',
      tax: stockItem?.tax != null ? String(stockItem.tax) : '',
      costo_envio: stockItem?.costo_envio != null ? String(stockItem.costo_envio) : '',
    },
  })

  const [overrides, setOverrides] = useState<Set<CalcField>>(() => {
    if (!stockItem) return new Set<CalcField>()
    const s = new Set<CalcField>()
    for (const f of CALC_FIELDS) {
      if (stockItem[f] != null) s.add(f)
    }
    return s
  })

  const [costoOverride, setCostoOverride] = useState(false)

  const [apiError, setApiError] = useState('')
  const createMutation = useCreateStockItem()
  const updateMutation = useUpdateStockItem()

  const valorCompraTotal = watch('valor_compra_total')
  const tax = watch('tax')
  const costoEnvio = watch('costo_envio')
  const cantidadInvertida = watch('cantidad_invertida')
  const costoPorunidad = watch('costo_por_unidad')

  const costoPorUnidadAuto = useMemo(() => {
    const total = Number(valorCompraTotal) || 0
    const taxVal = Number(tax) || 0
    const envio = Number(costoEnvio) || 0
    const qty = Number(cantidadInvertida) || 0
    if (qty <= 0) return null
    const sum = total + taxVal + envio
    if (sum <= 0) return null
    return round2(sum / qty)
  }, [valorCompraTotal, tax, costoEnvio, cantidadInvertida])

  const effectiveCosto = useMemo(() => {
    if (costoOverride) return Number(costoPorunidad) || 0
    return costoPorUnidadAuto ?? (Number(costoPorunidad) || 0)
  }, [costoOverride, costoPorunidad, costoPorUnidadAuto])

  const calc = useMemo(() => {
    const costo = effectiveCosto
    return {
      precio_lista: costo ? round2(costo * 1.4) : null,
      precio_taller: costo ? round2(costo * 1.3) : null,
      precio_emi: costo ? round2(costo * 1.2) : null,
    }
  }, [effectiveCosto])

  const watchedPrecioLista = watch('precio_lista')
  const watchedPrecioTaller = watch('precio_taller')
  const watchedPrecioEmi = watch('precio_emi')

  const getCalcValue = (field: CalcField): string | number => {
    if (overrides.has(field)) {
      if (field === 'precio_lista') return watchedPrecioLista
      if (field === 'precio_taller') return watchedPrecioTaller
      return watchedPrecioEmi
    }
    return calc[field] ?? ''
  }

  const isAutoActive = (field: CalcField) =>
    !overrides.has(field) && calc[field] != null

  const setCalcField = (field: CalcField, value: string) => {
    setValue(field, value)
    setOverrides((s) => new Set(s).add(field))
  }

  const resetCalcField = (field: CalcField) => {
    setOverrides((s) => {
      const next = new Set(s)
      next.delete(field)
      return next
    })
    setValue(field, '')
  }

  const handleCostoChange = (value: string) => {
    setValue('costo_por_unidad', value)
    setCostoOverride(true)
  }

  const resetCostoOverride = () => {
    setCostoOverride(false)
    setValue('costo_por_unidad', '')
  }

  const onSubmit = async (data: StockFormValues) => {
    setApiError('')

    const effectiveVal = (field: CalcField) => {
      const v = getCalcValue(field)
      return v !== '' ? Number(v) : null
    }

    const payload: Record<string, unknown> = {
      marca: data.marca.trim(),
      item: data.item.trim(),
      variante: data.variante.trim() || null,
      cantidad_invertida: Number(data.cantidad_invertida) || 0,
      cantidad_disponible: data.status === 'EN TRANSITO' ? 0 : Number(data.cantidad_invertida) || 0,
      costo_por_unidad: effectiveCosto,
      precio_lista: effectiveVal('precio_lista'),
      precio_taller: effectiveVal('precio_taller'),
      precio_emi: effectiveVal('precio_emi'),
      status: data.status,
      tracking: data.tracking.trim() || null,
      fecha_compra: data.fecha_compra || null,
      fecha_llegada: data.fecha_llegada || null,
      valor_compra_total:
        data.valor_compra_total !== '' ? Number(data.valor_compra_total) : null,
      tax: data.tax !== '' ? Number(data.tax) : null,
      costo_envio:
        data.costo_envio !== '' ? Number(data.costo_envio) : null,
    }

    try {
      if (isEdit && stockItem) {
        await updateMutation.mutateAsync({ id: stockItem.id, data: payload })
      } else {
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

  const isCostoAutoActive = !costoOverride && costoPorUnidadAuto != null

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
                    <Combobox items={uniqueMarcas} value={field.value || null} onValueChange={(val) => field.onChange(val ?? '')}>
                      <ComboboxInput placeholder="Ej: CTS Turbo" showClear />
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
                <FieldLabel>
                  Item <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="item"
                  render={({ field }) => (
                    <Combobox items={uniqueItems} value={field.value || null} onValueChange={(val) => field.onChange(val ?? '')}>
                      <ComboboxInput placeholder="Ej: Intercooler" showClear />
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
              <Field className="sm:col-span-2">
                <FieldLabel>Variante</FieldLabel>
                <Controller
                  control={control}
                  name="variante"
                  render={({ field }) => (
                    <Combobox items={uniqueVariantes} value={field.value || null} onValueChange={(val) => field.onChange(val ?? '')}>
                      <ComboboxInput placeholder="Ej: B58 Gen 1" showClear />
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
          </FieldGroup>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Cantidad + Valor compra (always shown) */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-foreground font-semibold">{isEdit ? 'Inventario' : 'Inversión'}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {isEdit ? 'Cantidades invertidas.' : 'Cantidad y valor de la compra.'}
          </p>
        </div>
        <div className="md:col-span-2">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cantidad_invertida">Cantidad</FieldLabel>
                <Input
                  id="cantidad_invertida"
                  type="number"
                  step="any"
                  {...register('cantidad_invertida')}
                />
              </Field>
              {!isEdit && (
                <Field>
                  <FieldLabel htmlFor="valor_compra_total_create">Valor Compra Total (USD)</FieldLabel>
                  <Input
                    id="valor_compra_total_create"
                    type="number"
                    step="any"
                    {...register('valor_compra_total')}
                  />
                </Field>
              )}
            </div>
          </FieldGroup>
        </div>
      </div>

      {isEdit && (<>
      <Separator className="my-8" />

      {/* Importacion */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-foreground font-semibold">Importaci&oacute;n</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Estado, tracking y fechas de la importaci&oacute;n.
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
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="tracking">Tracking</FieldLabel>
                <Input
                  id="tracking"
                  {...register('tracking')}
                  placeholder="Ej: 1Z999AA10123456784"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="fecha_compra">Fecha Compra</FieldLabel>
                <Input
                  id="fecha_compra"
                  type="date"
                  {...register('fecha_compra')}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="fecha_llegada">Fecha Llegada</FieldLabel>
                <Input
                  id="fecha_llegada"
                  type="date"
                  {...register('fecha_llegada')}
                />
              </Field>
            </div>
          </FieldGroup>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Costos de Importacion */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-foreground font-semibold">
            Costos de Importaci&oacute;n
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Valor de compra, impuestos y env&iacute;o. El costo por unidad se
            calcula autom&aacute;ticamente.
          </p>
        </div>
        <div className="md:col-span-2">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="valor_compra_total">Valor Compra Total</FieldLabel>
                <Input
                  id="valor_compra_total"
                  type="number"
                  step="any"
                  {...register('valor_compra_total')}
                  placeholder="USD"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tax">Tax</FieldLabel>
                <Input
                  id="tax"
                  type="number"
                  step="any"
                  {...register('tax')}
                  placeholder="USD"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="costo_envio">Costo Env&iacute;o</FieldLabel>
                <Input
                  id="costo_envio"
                  type="number"
                  step="any"
                  {...register('costo_envio')}
                  placeholder="USD"
                />
              </Field>
              <Field className="sm:col-span-3">
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="costo_por_unidad">Costo por Unidad USD</FieldLabel>
                  {isCostoAutoActive && (
                    <Badge variant="secondary">auto</Badge>
                  )}
                  {costoOverride && String(costoPorunidad) !== '' && (
                    <button
                      type="button"
                      onClick={resetCostoOverride}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ↺ auto
                    </button>
                  )}
                </div>
                <Input
                  id="costo_por_unidad"
                  type="number"
                  step="any"
                  value={
                    costoOverride
                      ? costoPorunidad
                      : costoPorUnidadAuto ?? costoPorunidad
                  }
                  onChange={(e) => handleCostoChange(e.target.value)}
                  className={cn(isCostoAutoActive && 'border-ring/30 bg-accent')}
                />
                {isCostoAutoActive && (
                  <p className="text-xs text-muted-foreground">
                    ({Number(valorCompraTotal) || 0} +{' '}
                    {Number(tax) || 0} + {Number(costoEnvio) || 0}) /{' '}
                    {Number(cantidadInvertida) || 0} ={' '}
                    {costoPorUnidadAuto}
                  </p>
                )}
              </Field>
            </div>
          </FieldGroup>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Precios Sugeridos */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-foreground font-semibold">Precios Sugeridos</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Calculados autom&aacute;ticamente desde el costo unitario.
            Pod&eacute;s sobreescribirlos manualmente.
          </p>
        </div>
        <div className="md:col-span-2">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <CalcInput
                id="precio_lista"
                label="Precio Lista"
                value={getCalcValue('precio_lista')}
                isAuto={isAutoActive('precio_lista')}
                isOverridden={
                  overrides.has('precio_lista') &&
                  String(watchedPrecioLista) !== ''
                }
                onChange={(v) => setCalcField('precio_lista', v)}
                onReset={() => resetCalcField('precio_lista')}
              />
              <CalcInput
                id="precio_taller"
                label="Precio Taller"
                value={getCalcValue('precio_taller')}
                isAuto={isAutoActive('precio_taller')}
                isOverridden={
                  overrides.has('precio_taller') &&
                  String(watchedPrecioTaller) !== ''
                }
                onChange={(v) => setCalcField('precio_taller', v)}
                onReset={() => resetCalcField('precio_taller')}
              />
              <CalcInput
                id="precio_emi"
                label="Precio EMI"
                value={getCalcValue('precio_emi')}
                isAuto={isAutoActive('precio_emi')}
                isOverridden={
                  overrides.has('precio_emi') && String(watchedPrecioEmi) !== ''
                }
                onChange={(v) => setCalcField('precio_emi', v)}
                onReset={() => resetCalcField('precio_emi')}
              />
            </div>
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

function CalcInput({
  id,
  label,
  value,
  isAuto,
  isOverridden,
  onChange,
  onReset,
}: {
  id: string
  label: string
  value: string | number
  isAuto: boolean
  isOverridden: boolean
  onChange: (v: string) => void
  onReset: () => void
}) {
  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {isAuto && <Badge variant="secondary">auto</Badge>}
        {isOverridden && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ↺ auto
          </button>
        )}
      </div>
      <Input
        id={id}
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(isAuto && 'border-ring/30 bg-accent')}
      />
    </Field>
  )
}
