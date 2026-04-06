import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateOrder, useUpdateOrder, useClients, useStaff, useTrackingStatuses } from '@/hooks/useOrders'
import type { OrderRow, StaffMember, TrackingStatus } from '@/lib/api'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Card, CardContent } from '@/components/ui/card'
import { DialogFooter } from '@/components/ui/dialog'
import {
  Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty,
} from '@/components/ui/combobox'
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'

interface OrderFormProps {
  order: OrderRow | null
  onDone: () => void
  onCancel: () => void
}

const orderSchema = z.object({
  client_name: z.string().min(1, 'Cliente es requerido'),
  item: z.string().min(1, 'Item es requerido'),
  quantity: z.string(),
  purchase_link: z.string(),
  tracking_status_id: z.string(),
  assigned_to: z.string().min(1, 'Asignado es requerido'),
  tracking_number: z.string(),
  cost: z.string(),
  weight: z.string(),
  margin_percent: z.string(),
  quoted_price_override: z.string(),
  saldado: z.string(),
  notes: z.string(),
})

type OrderFormValues = z.infer<typeof orderSchema>

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function fmtUSD(n: number | null): string {
  if (n == null || isNaN(n)) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function OrderForm({ order, onDone, onCancel }: OrderFormProps) {
  const isEdit = !!order

  const { data: staffList } = useStaff()
  const { data: trackingStatuses } = useTrackingStatuses()

  // Find the default tracking status id (first one by sort_order, or fallback)
  const defaultStatusId = useMemo(() => {
    if (!trackingStatuses?.length) return ''
    const sorted = [...trackingStatuses].sort((a, b) => a.sort_order - b.sort_order)
    return String(sorted[0].id)
  }, [trackingStatuses])

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      client_name: order?.client_name ?? '',
      item: order?.item ?? '',
      quantity: String(order?.quantity ?? 1),
      purchase_link: order?.purchase_link ?? '',
      tracking_status_id: order?.tracking_status_id != null ? String(order.tracking_status_id) : defaultStatusId,
      assigned_to: order?.assigned_to != null ? String(order.assigned_to) : '',
      tracking_number: order?.tracking_number ?? '',
      cost: order?.cost != null ? String(order.cost) : '',
      weight: order?.weight != null ? String(order.weight) : '',
      margin_percent: order?.margin_percent != null ? String(order.margin_percent) : '30',
      quoted_price_override: order?.quoted_price != null ? String(order.quoted_price) : '',
      saldado: order?.is_paid && order?.paid_to ? String(order.paid_to) : 'NO',
      notes: order?.notes ?? '',
    },
  })

  const [presupIsManual, setPresupIsManual] = useState(isEdit && order?.quoted_price != null)
  const [apiError, setApiError] = useState('')
  const createMutation = useCreateOrder()
  const updateMutation = useUpdateOrder()
  const { data: clients } = useClients()

  const clientNames = useMemo(() => (clients ?? []).map((c) => c.name), [clients])

  const costVal = watch('cost')
  const weightVal = watch('weight')
  const marginVal = watch('margin_percent')
  const presupOverride = watch('quoted_price_override')

  const calc = useMemo(() => {
    const compra = Number(costVal) || 0
    const pesoNum = Number(weightVal) || 0
    const m = Number(marginVal) / 100

    if (!compra) return null

    const banco = round2(compra * 0.01)
    const debitado = round2(compra + banco)
    const comision = round2(debitado * 0.04)
    const financingCost = round2(banco + comision)
    const subtotal = round2(debitado + comision)
    const envio = pesoNum ? round2(45 * pesoNum) : 0
    const costoTotal = round2(subtotal + envio)
    const presupAuto = round2(costoTotal * (1 + m))
    const presup = presupIsManual ? (Number(presupOverride) || 0) : presupAuto
    const ganancia = round2(presup - costoTotal)

    return { compra, banco, debitado, comision, financingCost, subtotal, envio, costoTotal, presupAuto, presup, ganancia }
  }, [costVal, weightVal, marginVal, presupIsManual, presupOverride])

  const onSubmit = async (data: OrderFormValues) => {
    setApiError('')
    const isPaid = data.saldado !== 'NO'
    const paidTo = isPaid ? Number(data.saldado) : null

    const cost = data.cost ? Number(data.cost) : null
    const weight = data.weight ? Number(data.weight) : null
    const financingCost = calc?.financingCost ?? null
    const importCost = calc?.envio ?? null
    const quotedPrice = calc?.presup ?? null
    const marginPercent = Number(data.margin_percent) || null
    const profit = calc?.ganancia ?? null

    const payload: Record<string, unknown> = {
      order_type: 'importacion',
      client_name: data.client_name.trim(),
      item: data.item.trim(),
      quantity: Number(data.quantity) || 1,
      purchase_link: data.purchase_link || null,
      tracking_status_id: Number(data.tracking_status_id),
      assigned_to: Number(data.assigned_to) || null,
      tracking_number: data.tracking_number || null,
      notes: data.notes || null,
      cost,
      financing_cost: financingCost,
      import_cost: importCost,
      quoted_price: quotedPrice,
      margin_percent: marginPercent,
      profit,
      weight,
      is_paid: isPaid ? 1 : 0,
      paid_to: paidTo,
      paid_at: isPaid ? new Date().toISOString() : null,
      is_settled: 0,
      settled_at: null,
    }

    try {
      if (isEdit && order) {
        await updateMutation.mutateAsync({ id: order.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onDone()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error guardando pedido')
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

      <Card>
        <CardContent className="flex flex-col gap-8 pt-6">
          {/* Pedido */}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div>
              <h2 className="font-semibold">Pedido</h2>
              <FieldDescription>Importación directa para el cliente.</FieldDescription>
            </div>
            <div className="md:col-span-2">
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field data-invalid={!!errors.client_name}>
                    <FieldLabel>Cliente <span className="text-destructive">*</span></FieldLabel>
                    <Controller
                      control={control}
                      name="client_name"
                      render={({ field }) => (
                        <Combobox items={clientNames} value={field.value || null} onValueChange={(val) => field.onChange(val ?? '')}>
                          <ComboboxInput placeholder="Buscar cliente..." showClear />
                          <ComboboxContent>
                            <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                            <ComboboxList>
                              {(name) => <ComboboxItem key={name} value={name}>{name}</ComboboxItem>}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      )}
                    />
                    {errors.client_name && <FieldError>{errors.client_name.message}</FieldError>}
                  </Field>
                  <Field data-invalid={!!errors.item}>
                    <FieldLabel htmlFor="item-import">Item <span className="text-destructive">*</span></FieldLabel>
                    <Input id="item-import" {...register('item')} placeholder="Producto o parte" />
                    {errors.item && <FieldError>{errors.item.message}</FieldError>}
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="quantity">Cantidad</FieldLabel>
                    <Input id="quantity" type="number" min="1" {...register('quantity')} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="purchase_link">Link Compra</FieldLabel>
                    <Input id="purchase_link" {...register('purchase_link')} placeholder="URL del producto" />
                  </Field>
                </div>
              </FieldGroup>
            </div>
          </div>

          <Separator />

          {/* Estado */}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div>
              <h2 className="font-semibold">Estado</h2>
              <FieldDescription>Progreso, asignación y seguimiento.</FieldDescription>
            </div>
            <div className="md:col-span-2">
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="tracking_status_id">Status</FieldLabel>
                    <Controller
                      control={control}
                      name="tracking_status_id"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="tracking_status_id"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {(trackingStatuses ?? []).map((s: TrackingStatus) => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                  <Field data-invalid={!!errors.assigned_to}>
                    <FieldLabel htmlFor="assigned_to">Asignado <span className="text-destructive">*</span></FieldLabel>
                    <Controller
                      control={control}
                      name="assigned_to"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger id="assigned_to"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {(staffList ?? []).map((m: StaffMember) => (
                                <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.assigned_to && <FieldError>{errors.assigned_to.message}</FieldError>}
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="tracking_number">Tracking</FieldLabel>
                  <Input id="tracking_number" {...register('tracking_number')} />
                </Field>
              </FieldGroup>
            </div>
          </div>

          <Separator />

          {/* Costos */}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div>
              <h2 className="font-semibold">Costos</h2>
              <FieldDescription>Ingresá compra y peso, el resto se calcula.</FieldDescription>
            </div>
            <div className="md:col-span-2">
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="cost">Compra (USD)</FieldLabel>
                    <Input id="cost" type="number" step="any" {...register('cost')} placeholder="0.00" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="weight">Peso (kg)</FieldLabel>
                    <Input id="weight" type="number" step="any" {...register('weight')} placeholder="0.00" />
                  </Field>
                </div>

                {/* Desglose */}
                {calc && (
                  <>
                    <div className="rounded-md border p-4">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Desglose</p>
                      <div className="space-y-1 font-mono text-sm">
                        <BreakdownRow label="Compra" value={calc.compra} />
                        <BreakdownRow label="+ Banco (1%)" value={calc.banco} muted />
                        <BreakdownRow label="= Debitado" value={calc.debitado} bold />
                        <BreakdownRow label="+ Comisión (4%)" value={calc.comision} muted />
                        <BreakdownRow label="= Subtotal" value={calc.subtotal} bold />
                        {calc.envio > 0 && (
                          <BreakdownRow label={`+ Envío ($45 × ${Number(weightVal)}kg)`} value={calc.envio} muted />
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between pt-1 text-base font-bold">
                          <span>Costo Total</span>
                          <span>{fmtUSD(calc.costoTotal)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Margen + Presupuestado + Ganancia */}
                    <Field>
                      <FieldLabel>Margen</FieldLabel>
                      <div className="flex items-center gap-3">
                        <Controller
                          control={control}
                          name="margin_percent"
                          render={({ field }) => (
                            <ToggleGroup type="single" value={field.value} onValueChange={(v) => { if (v) field.onChange(v) }} size="sm" variant="outline">
                              <ToggleGroupItem value="10">10%</ToggleGroupItem>
                              <ToggleGroupItem value="20">20%</ToggleGroupItem>
                              <ToggleGroupItem value="30">30%</ToggleGroupItem>
                            </ToggleGroup>
                          )}
                        />
                        <div className="flex items-center gap-1">
                          <Input type="number" {...register('margin_percent')} className="w-20 text-center text-sm" />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Presupuestado</span>
                          {presupIsManual ? (
                            <button
                              type="button"
                              onClick={() => { setPresupIsManual(false); setValue('quoted_price_override', '') }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              ↺ auto
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setPresupIsManual(true); setValue('quoted_price_override', String(calc.presupAuto)) }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              editar
                            </button>
                          )}
                        </div>
                        {presupIsManual ? (
                          <Input
                            type="number"
                            step="any"
                            {...register('quoted_price_override')}
                            className="mt-1"
                            autoFocus
                          />
                        ) : (
                          <div className="mt-1 text-lg font-semibold">{fmtUSD(calc.presupAuto)}</div>
                        )}
                      </div>
                      <div className="rounded-md border bg-muted/30 p-3">
                        <span className="text-sm text-muted-foreground">Ganancia</span>
                        <div className="mt-1 text-lg font-semibold">{fmtUSD(calc.ganancia)}</div>
                      </div>
                    </div>
                  </>
                )}
              </FieldGroup>
            </div>
          </div>

          <Separator />

          {/* Más opciones */}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div>
              <h2 className="font-semibold">Más opciones</h2>
              <FieldDescription>Pagos y observaciones.</FieldDescription>
            </div>
            <div className="md:col-span-2">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="saldado">Saldado</FieldLabel>
                  <Controller
                    control={control}
                    name="saldado"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="saldado"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="NO">NO</SelectItem>
                            {(staffList ?? []).map((m: StaffMember) => (
                              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="notes">Observaciones</FieldLabel>
                  <Textarea id="notes" {...register('notes')} rows={3} />
                </Field>
              </FieldGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      <DialogFooter className="mt-6">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Pedido'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function BreakdownRow({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''} ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span>{fmtUSD(value)}</span>
    </div>
  )
}
