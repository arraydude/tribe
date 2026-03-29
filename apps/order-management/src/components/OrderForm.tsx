import { useState, useMemo } from 'react'
import { useCreateOrder, useUpdateOrder, useClients, useTeamMembers } from '@/hooks/useOrders'
import type { OrderRow } from '@/lib/api'
import { cn } from '@/lib/utils'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox'

interface OrderFormProps {
  order: OrderRow | null
  onDone: () => void
  onCancel: () => void
}

const STATUS_OPTIONS = ['TO DO', 'IN PROGRESS', 'RECEIVED BAIRES', 'DONE']
const CALC_FIELDS = [
  'tax',
  'costo_envio',
  'valor_presupuestado',
  'ganancia',
  'valor_debitado',
] as const
type CalcField = (typeof CALC_FIELDS)[number]

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function OrderForm({ order, onDone, onCancel }: OrderFormProps) {
  const isEdit = !!order

  const [form, setForm] = useState({
    cliente: order?.cliente ?? '',
    item: order?.item ?? '',
    cantidad: order?.cantidad ?? 1,
    valor_presupuestado: order?.valor_presupuestado ?? '',
    valor_compra: order?.valor_compra ?? '',
    valor_debitado: order?.valor_debitado ?? '',
    tax: order?.tax ?? '',
    costo_envio: order?.costo_envio ?? '',
    peso: order?.peso ?? '',
    margen: '30',
    status: order?.status ?? 'TO DO',
    is_stock: order?.is_stock === 1,
    is_paid: order?.is_paid === 1,
    asignado: order?.asignado ?? '',
    ganancia: order?.ganancia ?? '',
    paid_to: order?.paid_to ?? '',
    tracking: order?.tracking ?? '',
    link_compra: order?.link_compra ?? '',
    observaciones: order?.observaciones ?? '',
  })

  const [overrides, setOverrides] = useState<Set<CalcField>>(() => {
    if (!order) return new Set<CalcField>()
    const s = new Set<CalcField>()
    for (const f of CALC_FIELDS) {
      if (order[f] != null) s.add(f)
    }
    return s
  })

  const [error, setError] = useState('')
  const createMutation = useCreateOrder()
  const updateMutation = useUpdateOrder()
  const { data: clients } = useClients()
  const { data: teamMembers } = useTeamMembers()

  const clientNames = useMemo(
    () => (clients ?? []).map((c) => c.name),
    [clients]
  )

  const calc = useMemo(() => {
    const compra = Number(form.valor_compra) || 0
    const peso = Number(form.peso) || 0
    const m = Number(form.margen) / 100

    const tax = compra ? round2(compra * 0.04) : null
    const costo_envio = peso ? round2(45 * peso) : null
    const costoTotal = compra
      ? round2(compra + (tax ?? 0) + (costo_envio ?? 0))
      : null
    const valor_presupuestado =
      costoTotal && !isNaN(m) ? round2(costoTotal * (1 + m)) : null
    const ganancia =
      valor_presupuestado && costoTotal
        ? round2(valor_presupuestado - costoTotal)
        : null

    return {
      tax,
      costo_envio,
      valor_debitado: costoTotal,
      valor_presupuestado,
      ganancia,
    }
  }, [form.valor_compra, form.peso, form.margen])

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

    if (!form.cliente.trim() || !form.item.trim()) {
      setError('Cliente e Item son obligatorios')
      return
    }

    const effectiveVal = (field: CalcField) => {
      const v = getCalcValue(field)
      return v !== '' ? Number(v) : null
    }

    const payload: Record<string, unknown> = {
      cliente: form.cliente.trim(),
      item: form.item.trim(),
      cantidad: Number(form.cantidad) || 1,
      valor_presupuestado: effectiveVal('valor_presupuestado'),
      valor_compra:
        form.valor_compra !== '' ? Number(form.valor_compra) : null,
      valor_debitado: effectiveVal('valor_debitado'),
      tax: effectiveVal('tax'),
      costo_envio: effectiveVal('costo_envio'),
      peso: form.peso !== '' ? Number(form.peso) : null,
      status: form.status,
      is_stock: form.is_stock,
      is_paid: form.is_paid,
      asignado: form.asignado || null,
      ganancia: effectiveVal('ganancia'),
      paid_to: form.paid_to || null,
      tracking: form.tracking || null,
      link_compra: form.link_compra || null,
      observaciones: form.observaciones || null,
    }

    try {
      if (isEdit && order) {
        await updateMutation.mutateAsync({ id: order.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onDone()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error guardando pedido'
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

        {/* Pedido */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <h2 className="text-foreground font-semibold">Pedido</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Cliente y producto a importar.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  value={form.cliente}
                  onValueChange={(val) => set('cliente', val ?? '')}
                >
                  <ComboboxInput placeholder="Buscar cliente..." showClear />
                  <ComboboxContent>
                    <ComboboxList>
                      <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                      {clientNames.map((name) => (
                        <ComboboxItem key={name} value={name}>
                          {name}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item">
                  Item <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="item"
                  value={form.item}
                  onChange={(e) => set('item', e.target.value)}
                  placeholder="Producto o parte"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Valores */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <h2 className="text-foreground font-semibold">Valores</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Costos, precios y cálculos automáticos.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Label className="text-muted-foreground text-xs">Margen</Label>
              <ToggleGroup
                type="single"
                value={form.margen}
                onValueChange={(v) => {
                  if (v) setForm((f) => ({ ...f, margen: v }))
                }}
                size="sm"
                variant="outline"
              >
                <ToggleGroupItem value="20">20%</ToggleGroupItem>
                <ToggleGroupItem value="30">30%</ToggleGroupItem>
              </ToggleGroup>
              <Input
                type="number"
                value={form.margen}
                onChange={(e) =>
                  setForm((f) => ({ ...f, margen: e.target.value }))
                }
                className="w-20 text-center text-sm"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="valor_compra">Compra (USD)</Label>
                <Input
                  id="valor_compra"
                  type="number"
                  step="any"
                  value={form.valor_compra}
                  onChange={(e) => set('valor_compra', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="peso">Peso (kg)</Label>
                <Input
                  id="peso"
                  type="number"
                  step="any"
                  value={form.peso}
                  onChange={(e) => set('peso', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cantidad">Cantidad</Label>
                <Input
                  id="cantidad"
                  type="number"
                  step="any"
                  value={form.cantidad}
                  onChange={(e) => set('cantidad', e.target.value)}
                />
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
              <CalcInput
                id="tax"
                label="Tax 4%"
                value={getCalcValue('tax')}
                isAuto={isAutoActive('tax')}
                isOverridden={overrides.has('tax') && String(form.tax) !== ''}
                onChange={(v) => set('tax', v)}
                onReset={() => resetCalcField('tax')}
              />
              <CalcInput
                id="costo_envio"
                label="Envio"
                value={getCalcValue('costo_envio')}
                isAuto={isAutoActive('costo_envio')}
                isOverridden={overrides.has('costo_envio') && String(form.costo_envio) !== ''}
                onChange={(v) => set('costo_envio', v)}
                onReset={() => resetCalcField('costo_envio')}
              />
              <CalcInput
                id="valor_debitado"
                label="Debitado"
                value={getCalcValue('valor_debitado')}
                isAuto={isAutoActive('valor_debitado')}
                isOverridden={overrides.has('valor_debitado') && String(form.valor_debitado) !== ''}
                onChange={(v) => set('valor_debitado', v)}
                onReset={() => resetCalcField('valor_debitado')}
              />
              <CalcInput
                id="valor_presupuestado"
                label="Presup."
                value={getCalcValue('valor_presupuestado')}
                isAuto={isAutoActive('valor_presupuestado')}
                isOverridden={overrides.has('valor_presupuestado') && String(form.valor_presupuestado) !== ''}
                onChange={(v) => set('valor_presupuestado', v)}
                onReset={() => resetCalcField('valor_presupuestado')}
              />
              <CalcInput
                id="ganancia"
                label="Ganancia"
                value={getCalcValue('ganancia')}
                isAuto={isAutoActive('ganancia')}
                isOverridden={overrides.has('ganancia') && String(form.ganancia) !== ''}
                onChange={(v) => set('ganancia', v)}
                onReset={() => resetCalcField('ganancia')}
              />
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Estado */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <h2 className="text-foreground font-semibold">Estado</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Estado actual, asignación y pagos.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set('status', v)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="asignado">Asignado</Label>
                <Select
                  value={form.asignado || undefined}
                  onValueChange={(v) => set('asignado', v)}
                >
                  <SelectTrigger id="asignado">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(teamMembers ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.name}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Stock</Label>
                <Button
                  type="button"
                  variant={form.is_stock ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => set('is_stock', !form.is_stock)}
                >
                  {form.is_stock ? 'SI' : 'NO'}
                </Button>
              </div>
              <div className="grid gap-2">
                <Label>Saldado</Label>
                <Button
                  type="button"
                  variant={form.is_paid ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => set('is_paid', !form.is_paid)}
                >
                  {form.is_paid ? 'SI' : 'NO'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Detalles */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <h2 className="text-foreground font-semibold">Detalles</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Tracking, links y observaciones.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tracking">Tracking</Label>
                <Input
                  id="tracking"
                  value={form.tracking}
                  onChange={(e) => set('tracking', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paid_to">Saldado A</Label>
                <Select
                  value={form.paid_to || undefined}
                  onValueChange={(v) => set('paid_to', v)}
                >
                  <SelectTrigger id="paid_to">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(teamMembers ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.name}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <Label htmlFor="link_compra">Link Compra</Label>
              <Input
                id="link_compra"
                value={form.link_compra}
                onChange={(e) => set('link_compra', e.target.value)}
              />
            </div>
            <div className="mt-4 grid gap-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={form.observaciones}
                onChange={(e) => set('observaciones', e.target.value)}
                rows={4}
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
            {isPending
              ? 'Guardando...'
              : isEdit
                ? 'Guardar Cambios'
                : 'Crear Pedido'}
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
