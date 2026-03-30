import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateOrder, useUpdateOrder, useClients, useTeamMembers } from '@/hooks/useOrders'
import type { OrderRow } from '@/lib/api'

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

const STATUS_OPTIONS = ['TO DO', 'IN PROGRESS', 'RECEIVED BAIRES', 'DONE']

const orderSchema = z.object({
  cliente: z.string().min(1, 'Cliente es requerido'),
  item: z.string().min(1, 'Item es requerido'),
  cantidad: z.string(),
  link_compra: z.string(),
  status: z.string(),
  asignado: z.string().min(1, 'Asignado es requerido'),
  tracking: z.string(),
  valor_compra: z.string(),
  peso: z.string(),
  margen: z.string(),
  presup_override: z.string(),
  saldado: z.string(),
  observaciones: z.string(),
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

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      cliente: order?.cliente ?? '',
      item: order?.item ?? '',
      cantidad: String(order?.cantidad ?? 1),
      link_compra: order?.link_compra ?? '',
      status: order?.status ?? 'TO DO',
      asignado: order?.asignado ?? '',
      tracking: order?.tracking ?? '',
      valor_compra: order?.valor_compra != null ? String(order.valor_compra) : '',
      peso: order?.peso != null ? String(order.peso) : '',
      margen: '30',
      presup_override: order?.valor_presupuestado != null ? String(order.valor_presupuestado) : '',
      saldado: order?.is_paid && order?.paid_to ? order.paid_to : 'NO',
      observaciones: order?.observaciones ?? '',
    },
  })

  const [presupIsManual, setPresupIsManual] = useState(isEdit && order?.valor_presupuestado != null)
  const [apiError, setApiError] = useState('')
  const createMutation = useCreateOrder()
  const updateMutation = useUpdateOrder()
  const { data: clients } = useClients()
  const { data: teamMembers } = useTeamMembers()

  const clientNames = useMemo(() => (clients ?? []).map((c) => c.name), [clients])

  const valorCompra = watch('valor_compra')
  const peso = watch('peso')
  const margen = watch('margen')
  const presupOverride = watch('presup_override')

  const calc = useMemo(() => {
    const compra = Number(valorCompra) || 0
    const pesoNum = Number(peso) || 0
    const m = Number(margen) / 100

    if (!compra) return null

    const banco = round2(compra * 0.01)
    const debitado = round2(compra + banco)
    const comision = round2(debitado * 0.04)
    const subtotal = round2(debitado + comision)
    const envio = pesoNum ? round2(45 * pesoNum) : 0
    const costoTotal = round2(subtotal + envio)
    const presupAuto = round2(costoTotal * (1 + m))
    const presup = presupIsManual ? (Number(presupOverride) || 0) : presupAuto
    const ganancia = round2(presup - costoTotal)

    return { compra, banco, debitado, comision, subtotal, envio, costoTotal, presupAuto, presup, ganancia }
  }, [valorCompra, peso, margen, presupIsManual, presupOverride])

  const onSubmit = async (data: OrderFormValues) => {
    setApiError('')
    const isPaid = data.saldado !== 'NO'
    const paidTo = isPaid ? data.saldado : null

    const payload: Record<string, unknown> = {
      cliente: data.cliente.trim(),
      item: data.item.trim(),
      cantidad: Number(data.cantidad) || 1,
      valor_compra: data.valor_compra ? Number(data.valor_compra) : null,
      valor_debitado: calc?.debitado ?? null,
      tax: calc?.comision ?? null,
      costo_envio: calc?.envio ?? null,
      peso: data.peso ? Number(data.peso) : null,
      valor_presupuestado: calc?.presup ?? null,
      ganancia: calc?.ganancia ?? null,
      status: data.status,
      is_stock: false,
      is_paid: isPaid,
      asignado: data.asignado || null,
      paid_to: paidTo,
      tracking: data.tracking || null,
      link_compra: data.link_compra || null,
      observaciones: data.observaciones || null,
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
                  <Field data-invalid={!!errors.cliente}>
                    <FieldLabel>Cliente <span className="text-destructive">*</span></FieldLabel>
                    <Controller
                      control={control}
                      name="cliente"
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
                    {errors.cliente && <FieldError>{errors.cliente.message}</FieldError>}
                  </Field>
                  <Field data-invalid={!!errors.item}>
                    <FieldLabel htmlFor="item-import">Item <span className="text-destructive">*</span></FieldLabel>
                    <Input id="item-import" {...register('item')} placeholder="Producto o parte" />
                    {errors.item && <FieldError>{errors.item.message}</FieldError>}
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="cantidad">Cantidad</FieldLabel>
                    <Input id="cantidad" type="number" min="1" {...register('cantidad')} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="link_compra">Link Compra</FieldLabel>
                    <Input id="link_compra" {...register('link_compra')} placeholder="URL del producto" />
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
                    <FieldLabel htmlFor="status">Status</FieldLabel>
                    <Controller
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                  <Field data-invalid={!!errors.asignado}>
                    <FieldLabel htmlFor="asignado">Asignado <span className="text-destructive">*</span></FieldLabel>
                    <Controller
                      control={control}
                      name="asignado"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger id="asignado"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {(teamMembers ?? []).map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.asignado && <FieldError>{errors.asignado.message}</FieldError>}
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="tracking">Tracking</FieldLabel>
                  <Input id="tracking" {...register('tracking')} />
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
                    <FieldLabel htmlFor="valor_compra">Compra (USD)</FieldLabel>
                    <Input id="valor_compra" type="number" step="any" {...register('valor_compra')} placeholder="0.00" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="peso">Peso (kg)</FieldLabel>
                    <Input id="peso" type="number" step="any" {...register('peso')} placeholder="0.00" />
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
                          <BreakdownRow label={`+ Envío ($45 × ${Number(peso)}kg)`} value={calc.envio} muted />
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
                          name="margen"
                          render={({ field }) => (
                            <ToggleGroup type="single" value={field.value} onValueChange={(v) => { if (v) field.onChange(v) }} size="sm" variant="outline">
                              <ToggleGroupItem value="10">10%</ToggleGroupItem>
                              <ToggleGroupItem value="20">20%</ToggleGroupItem>
                              <ToggleGroupItem value="30">30%</ToggleGroupItem>
                            </ToggleGroup>
                          )}
                        />
                        <div className="flex items-center gap-1">
                          <Input type="number" {...register('margen')} className="w-20 text-center text-sm" />
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
                              onClick={() => { setPresupIsManual(false); setValue('presup_override', '') }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              ↺ auto
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setPresupIsManual(true); setValue('presup_override', String(calc.presupAuto)) }}
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
                            {...register('presup_override')}
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
                            {(teamMembers ?? []).map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="observaciones">Observaciones</FieldLabel>
                  <Textarea id="observaciones" {...register('observaciones')} rows={3} />
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
