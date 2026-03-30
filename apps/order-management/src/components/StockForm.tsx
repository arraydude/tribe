import { useState, useMemo } from 'react'
import { useCreateStockItem, useUpdateStockItem, useStockItems } from '@/hooks/useOrders'
import type { StockItem } from '@/lib/api'
import { cn } from '@/lib/utils'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface StockFormProps {
  stockItem: StockItem | null
  onDone: () => void
  onCancel: () => void
}

const CALC_FIELDS = ['precio_lista', 'precio_taller', 'precio_emi'] as const
type CalcField = (typeof CALC_FIELDS)[number]

const STATUS_OPTIONS = ['EN TRANSITO', 'RECIBIDO', 'DISPONIBLE'] as const

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function StockForm({ stockItem, onDone, onCancel }: StockFormProps) {
  const isEdit = !!stockItem
  const { data: allStockItems } = useStockItems()

  const uniqueMarcas = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.marca))].sort(), [allStockItems])
  const uniqueItems = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.item))].sort(), [allStockItems])
  const uniqueVariantes = useMemo(() => [...new Set((allStockItems ?? []).map((s) => s.variante).filter(Boolean) as string[])].sort(), [allStockItems])

  const [form, setForm] = useState({
    marca: stockItem?.marca ?? '',
    item: stockItem?.item ?? '',
    variante: stockItem?.variante ?? '',
    cantidad_invertida: stockItem?.cantidad_invertida ?? 0,
    cantidad_disponible: stockItem?.cantidad_disponible ?? 0, // auto-calc from status
    costo_por_unidad: stockItem?.costo_por_unidad ?? '',
    precio_lista: stockItem?.precio_lista ?? '',
    precio_taller: stockItem?.precio_taller ?? '',
    precio_emi: stockItem?.precio_emi ?? '',
    status: stockItem?.status ?? 'EN TRANSITO',
    tracking: stockItem?.tracking ?? '',
    fecha_compra: stockItem?.fecha_compra ?? '',
    fecha_llegada: stockItem?.fecha_llegada ?? '',
    valor_compra_total: stockItem?.valor_compra_total ?? '',
    tax: stockItem?.tax ?? '',
    costo_envio: stockItem?.costo_envio ?? '',
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

  const [error, setError] = useState('')
  const createMutation = useCreateStockItem()
  const updateMutation = useUpdateStockItem()

  const costoPorUnidadAuto = useMemo(() => {
    const total = Number(form.valor_compra_total) || 0
    const taxVal = Number(form.tax) || 0
    const envio = Number(form.costo_envio) || 0
    const qty = Number(form.cantidad_invertida) || 0
    if (qty <= 0) return null
    const sum = total + taxVal + envio
    if (sum <= 0) return null
    return round2(sum / qty)
  }, [form.valor_compra_total, form.tax, form.costo_envio, form.cantidad_invertida])

  const effectiveCosto = useMemo(() => {
    if (costoOverride) return Number(form.costo_por_unidad) || 0
    return costoPorUnidadAuto ?? (Number(form.costo_por_unidad) || 0)
  }, [costoOverride, form.costo_por_unidad, costoPorUnidadAuto])

  const calc = useMemo(() => {
    const costo = effectiveCosto
    return {
      precio_lista: costo ? round2(costo * 1.4) : null,
      precio_taller: costo ? round2(costo * 1.3) : null,
      precio_emi: costo ? round2(costo * 1.2) : null,
    }
  }, [effectiveCosto])

  const getCalcValue = (field: CalcField): string | number => {
    if (overrides.has(field)) return form[field]
    return calc[field] ?? ''
  }

  const isAutoActive = (field: CalcField) =>
    !overrides.has(field) && calc[field] != null

  const set = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }))
    if ((CALC_FIELDS as readonly string[]).includes(key)) {
      setOverrides((s) => new Set(s).add(key as CalcField))
    }
    if (key === 'costo_por_unidad') {
      setCostoOverride(true)
    }
  }

  const resetCalcField = (field: CalcField) => {
    setOverrides((s) => {
      const next = new Set(s)
      next.delete(field)
      return next
    })
    setForm((f) => ({ ...f, [field]: '' }))
  }

  const resetCostoOverride = () => {
    setCostoOverride(false)
    setForm((f) => ({ ...f, costo_por_unidad: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.marca.trim() || !form.item.trim()) {
      setError('Marca e Item son obligatorios')
      return
    }

    const effectiveVal = (field: CalcField) => {
      const v = getCalcValue(field)
      return v !== '' ? Number(v) : null
    }

    const payload: Record<string, unknown> = {
      marca: form.marca.trim(),
      item: form.item.trim(),
      variante: form.variante.trim() || null,
      cantidad_invertida: Number(form.cantidad_invertida) || 0,
      cantidad_disponible: form.status === 'EN TRANSITO' ? 0 : Number(form.cantidad_invertida) || 0,
      costo_por_unidad: effectiveCosto,
      precio_lista: effectiveVal('precio_lista'),
      precio_taller: effectiveVal('precio_taller'),
      precio_emi: effectiveVal('precio_emi'),
      status: form.status,
      tracking: form.tracking.trim() || null,
      fecha_compra: form.fecha_compra || null,
      fecha_llegada: form.fecha_llegada || null,
      valor_compra_total:
        form.valor_compra_total !== '' ? Number(form.valor_compra_total) : null,
      tax: form.tax !== '' ? Number(form.tax) : null,
      costo_envio:
        form.costo_envio !== '' ? Number(form.costo_envio) : null,
    }

    try {
      if (isEdit && stockItem) {
        await updateMutation.mutateAsync({ id: stockItem.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onDone()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error guardando item de stock'
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const isCostoAutoActive = !costoOverride && costoPorUnidadAuto != null

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>
                Marca <span className="text-destructive">*</span>
              </Label>
              <Combobox items={uniqueMarcas} value={form.marca || null} onValueChange={(val) => set('marca', val ?? '')}>
                <ComboboxInput placeholder="Ej: CTS Turbo" showClear />
                <ComboboxContent>
                  <ComboboxEmpty>Nueva marca</ComboboxEmpty>
                  <ComboboxList>
                    {(m) => <ComboboxItem key={m} value={m}>{m}</ComboboxItem>}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
            <div className="grid gap-2">
              <Label>
                Item <span className="text-destructive">*</span>
              </Label>
              <Combobox items={uniqueItems} value={form.item || null} onValueChange={(val) => set('item', val ?? '')}>
                <ComboboxInput placeholder="Ej: Intercooler" showClear />
                <ComboboxContent>
                  <ComboboxEmpty>Nuevo item</ComboboxEmpty>
                  <ComboboxList>
                    {(i) => <ComboboxItem key={i} value={i}>{i}</ComboboxItem>}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Variante</Label>
              <Combobox items={uniqueVariantes} value={form.variante || null} onValueChange={(val) => set('variante', val ?? '')}>
                <ComboboxInput placeholder="Ej: B58 Gen 1" showClear />
                <ComboboxContent>
                  <ComboboxEmpty>Nueva variante</ComboboxEmpty>
                  <ComboboxList>
                    {(v) => <ComboboxItem key={v} value={v}>{v}</ComboboxItem>}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cantidad_invertida">Cantidad</Label>
              <Input
                id="cantidad_invertida"
                type="number"
                step="any"
                value={form.cantidad_invertida}
                onChange={(e) => set('cantidad_invertida', e.target.value)}
              />
            </div>
            {!isEdit && (
              <div className="grid gap-2">
                <Label htmlFor="valor_compra_total_create">Valor Compra Total (USD)</Label>
                <Input
                  id="valor_compra_total_create"
                  type="number"
                  step="any"
                  value={form.valor_compra_total}
                  onChange={(e) => set('valor_compra_total', e.target.value)}
                />
              </div>
            )}
          </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set('status', v)}
              >
                <SelectTrigger className="w-full">
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
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="tracking">Tracking</Label>
              <Input
                id="tracking"
                value={form.tracking}
                onChange={(e) => set('tracking', e.target.value)}
                placeholder="Ej: 1Z999AA10123456784"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fecha_compra">Fecha Compra</Label>
              <Input
                id="fecha_compra"
                type="date"
                value={form.fecha_compra}
                onChange={(e) => set('fecha_compra', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fecha_llegada">Fecha Llegada</Label>
              <Input
                id="fecha_llegada"
                type="date"
                value={form.fecha_llegada}
                onChange={(e) => set('fecha_llegada', e.target.value)}
              />
            </div>
          </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="valor_compra_total">Valor Compra Total</Label>
              <Input
                id="valor_compra_total"
                type="number"
                step="any"
                value={form.valor_compra_total}
                onChange={(e) => set('valor_compra_total', e.target.value)}
                placeholder="USD"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tax">Tax</Label>
              <Input
                id="tax"
                type="number"
                step="any"
                value={form.tax}
                onChange={(e) => set('tax', e.target.value)}
                placeholder="USD"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="costo_envio">Costo Env&iacute;o</Label>
              <Input
                id="costo_envio"
                type="number"
                step="any"
                value={form.costo_envio}
                onChange={(e) => set('costo_envio', e.target.value)}
                placeholder="USD"
              />
            </div>
            <div className="grid gap-2 sm:col-span-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="costo_por_unidad">Costo por Unidad USD</Label>
                {isCostoAutoActive && (
                  <Badge variant="secondary">auto</Badge>
                )}
                {costoOverride && String(form.costo_por_unidad) !== '' && (
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
                    ? form.costo_por_unidad
                    : costoPorUnidadAuto ?? form.costo_por_unidad
                }
                onChange={(e) => set('costo_por_unidad', e.target.value)}
                className={cn(isCostoAutoActive && 'border-ring/30 bg-accent')}
              />
              {isCostoAutoActive && (
                <p className="text-xs text-muted-foreground">
                  ({Number(form.valor_compra_total) || 0} +{' '}
                  {Number(form.tax) || 0} + {Number(form.costo_envio) || 0}) /{' '}
                  {Number(form.cantidad_invertida) || 0} ={' '}
                  {costoPorUnidadAuto}
                </p>
              )}
            </div>
          </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CalcInput
              id="precio_lista"
              label="Precio Lista"
              value={getCalcValue('precio_lista')}
              isAuto={isAutoActive('precio_lista')}
              isOverridden={
                overrides.has('precio_lista') &&
                String(form.precio_lista) !== ''
              }
              onChange={(v) => set('precio_lista', v)}
              onReset={() => resetCalcField('precio_lista')}
            />
            <CalcInput
              id="precio_taller"
              label="Precio Taller"
              value={getCalcValue('precio_taller')}
              isAuto={isAutoActive('precio_taller')}
              isOverridden={
                overrides.has('precio_taller') &&
                String(form.precio_taller) !== ''
              }
              onChange={(v) => set('precio_taller', v)}
              onReset={() => resetCalcField('precio_taller')}
            />
            <CalcInput
              id="precio_emi"
              label="Precio EMI"
              value={getCalcValue('precio_emi')}
              isAuto={isAutoActive('precio_emi')}
              isOverridden={
                overrides.has('precio_emi') && String(form.precio_emi) !== ''
              }
              onChange={(v) => set('precio_emi', v)}
              onReset={() => resetCalcField('precio_emi')}
            />
          </div>
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
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
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
    </div>
  )
}
