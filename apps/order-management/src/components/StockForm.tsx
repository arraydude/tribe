import { useState, useMemo } from 'react'
import { useCreateStockItem, useUpdateStockItem } from '@/hooks/useOrders'
import type { StockItem } from '@/lib/api'
import { cn } from '@/lib/utils'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface StockFormProps {
  stockItem: StockItem | null
  onDone: () => void
  onCancel: () => void
}

const CALC_FIELDS = ['precio_lista', 'precio_taller', 'precio_emi'] as const
type CalcField = (typeof CALC_FIELDS)[number]

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function StockForm({ stockItem, onDone, onCancel }: StockFormProps) {
  const isEdit = !!stockItem

  const [form, setForm] = useState({
    marca: stockItem?.marca ?? '',
    item: stockItem?.item ?? '',
    variante: stockItem?.variante ?? '',
    cantidad_invertida: stockItem?.cantidad_invertida ?? 0,
    cantidad_disponible: stockItem?.cantidad_disponible ?? 0,
    costo_por_unidad: stockItem?.costo_por_unidad ?? '',
    precio_lista: stockItem?.precio_lista ?? '',
    precio_taller: stockItem?.precio_taller ?? '',
    precio_emi: stockItem?.precio_emi ?? '',
  })

  const [overrides, setOverrides] = useState<Set<CalcField>>(() => {
    if (!stockItem) return new Set<CalcField>()
    const s = new Set<CalcField>()
    for (const f of CALC_FIELDS) {
      if (stockItem[f] != null) s.add(f)
    }
    return s
  })

  const [error, setError] = useState('')
  const createMutation = useCreateStockItem()
  const updateMutation = useUpdateStockItem()

  const calc = useMemo(() => {
    const costo = Number(form.costo_por_unidad) || 0
    return {
      precio_lista: costo ? round2(costo * 1.4) : null,
      precio_taller: costo ? round2(costo * 1.3) : null,
      precio_emi: costo ? round2(costo * 1.2) : null,
    }
  }, [form.costo_por_unidad])

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
  }

  const resetCalcField = (field: CalcField) => {
    setOverrides((s) => {
      const next = new Set(s)
      next.delete(field)
      return next
    })
    setForm((f) => ({ ...f, [field]: '' }))
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
      cantidad_disponible: Number(form.cantidad_disponible) || 0,
      costo_por_unidad:
        form.costo_por_unidad !== '' ? Number(form.costo_por_unidad) : 0,
      precio_lista: effectiveVal('precio_lista'),
      precio_taller: effectiveVal('precio_taller'),
      precio_emi: effectiveVal('precio_emi'),
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
              <Label htmlFor="marca">
                Marca <span className="text-destructive">*</span>
              </Label>
              <Input
                id="marca"
                value={form.marca}
                onChange={(e) => set('marca', e.target.value)}
                placeholder="Ej: CTS Turbo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item">
                Item <span className="text-destructive">*</span>
              </Label>
              <Input
                id="item"
                value={form.item}
                onChange={(e) => set('item', e.target.value)}
                placeholder="Ej: Intercooler"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="variante">Variante</Label>
              <Input
                id="variante"
                value={form.variante}
                onChange={(e) => set('variante', e.target.value)}
                placeholder="Ej: B58 Gen 1"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Inventario */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-foreground font-semibold">Inventario</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Cantidades y costo unitario de la inversión.
          </p>
        </div>
        <div className="md:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="cantidad_invertida">Cantidad Invertida</Label>
              <Input
                id="cantidad_invertida"
                type="number"
                step="any"
                value={form.cantidad_invertida}
                onChange={(e) => set('cantidad_invertida', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cantidad_disponible">Cantidad Disponible</Label>
              <Input
                id="cantidad_disponible"
                type="number"
                step="any"
                value={form.cantidad_disponible}
                onChange={(e) => set('cantidad_disponible', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="costo_por_unidad">Costo por Unidad USD</Label>
              <Input
                id="costo_por_unidad"
                type="number"
                step="any"
                value={form.costo_por_unidad}
                onChange={(e) => set('costo_por_unidad', e.target.value)}
              />
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
            Calculados automáticamente desde el costo unitario. Podés
            sobreescribirlos manualmente.
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
