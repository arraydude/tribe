import { useMemo, useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClients, useTeamMembers, useStockItems, useSellStockItem } from '@/hooks/useOrders'
import { getStockPrice, getStockDisplayName } from '@/lib/api'
import type { StockItem } from '@/lib/api'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty,
} from '@/components/ui/combobox'
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface StockSaleDialogProps {
  open: boolean
  onClose: () => void
}

const TIERS = ['standard', 'taller', 'emi'] as const
const TIER_LABELS: Record<string, string> = { standard: 'Lista', taller: 'Taller', emi: 'EMI' }

function getTierPrice(item: StockItem, tier: string): number | null {
  switch (tier) {
    case 'taller': return item.precio_taller
    case 'emi': return item.precio_emi
    default: return item.precio_lista
  }
}

const stockSaleSchema = z.object({
  cliente: z.string().min(1, 'Cliente es requerido'),
  stockItemId: z.string().min(1, 'Seleccioná un item de stock'),
  tier: z.string().default('standard'),
  precio: z.string().min(1, 'Ingresá un precio'),
  cantidad: z.string().default('1'),
  asignado: z.string().min(1, 'Asignado es requerido'),
})

type FormValues = z.infer<typeof stockSaleSchema>

export function StockSaleDialog({ open, onClose }: StockSaleDialogProps) {
  const { data: clients } = useClients()
  const { data: teamMembers } = useTeamMembers()
  const { data: stockItems } = useStockItems()
  const sellMutation = useSellStockItem()

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(stockSaleSchema),
    defaultValues: {
      cliente: '',
      stockItemId: '',
      tier: 'standard',
      precio: '',
      cantidad: '1',
      asignado: '',
    },
  })

  const [apiError, setApiError] = useState('')

  const clientNames = useMemo(() => (clients ?? []).map((c) => c.name), [clients])
  const availableItems = useMemo(() => (stockItems ?? []).filter((s) => s.cantidad_disponible > 0 && s.status === 'DISPONIBLE'), [stockItems])

  const watchedCliente = watch('cliente')
  const watchedStockItemId = watch('stockItemId')
  const watchedTier = watch('tier')
  const watchedPrecio = watch('precio')
  const watchedCantidad = watch('cantidad')

  const selectedItem = stockItems?.find((s) => s.id === Number(watchedStockItemId))

  // Auto-select tier when client changes
  useEffect(() => {
    if (!watchedCliente) return
    const clientType = clients?.find((c) => c.name === watchedCliente)?.type
    if (clientType && TIERS.includes(clientType as typeof TIERS[number])) {
      setValue('tier', clientType)
    }
  }, [watchedCliente, clients, setValue])

  // Auto-fill price when tier or item changes
  useEffect(() => {
    if (!selectedItem) return
    const p = getTierPrice(selectedItem, watchedTier)
    if (p != null) setValue('precio', String(p))
  }, [watchedTier, selectedItem, setValue])

  const costoPerUnit = selectedItem?.costo_por_unidad ?? 0
  const qty = Number(watchedCantidad) || 1
  const precioNum = Number(watchedPrecio) || 0
  const ganancia = Math.round((precioNum - costoPerUnit * qty) * 100) / 100

  const onSubmit = async (data: FormValues) => {
    setApiError('')
    const stockId = Number(data.stockItemId)
    const qty = Number(data.cantidad) || 1
    const precioNum = Number(data.precio) || 0

    try {
      const item = stockItems?.find((s) => s.id === stockId)
      await sellMutation.mutateAsync({
        id: stockId,
        qty,
        order_data: {
          cliente: data.cliente.trim(),
          item: item ? getStockDisplayName(item) : '',
          valor_presupuestado: precioNum,
          ganancia: Math.round((precioNum - (item?.costo_por_unidad ?? 0) * qty) * 100) / 100,
          status: 'TO DO',
          asignado: data.asignado || null,
        },
      })
      reset()
      setApiError('')
      onClose()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error al vender')
    }
  }

  const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <>
      {open && <div className="fixed inset-0 z-50 bg-black/50 pointer-events-none supports-backdrop-filter:backdrop-blur-xs" aria-hidden />}
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }} modal={false}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Venta de Stock</DialogTitle>
            <DialogDescription>Vender un item del inventario a un cliente.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            {apiError && (
              <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {apiError}
              </div>
            )}

            <Card>
              <CardContent className="pt-6">
                <FieldGroup>
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

                  <Field data-invalid={!!errors.stockItemId}>
                    <FieldLabel>
                      Item de Stock <span className="text-destructive">*</span>
                      {selectedItem && <Badge variant="secondary" className="ml-auto">{selectedItem.cantidad_disponible} disp.</Badge>}
                    </FieldLabel>
                    <Controller
                      control={control}
                      name="stockItemId"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar del stock..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {availableItems.map((si) => (
                                <SelectItem key={si.id} value={si.id.toString()}>
                                  {getStockDisplayName(si)} ({si.cantidad_disponible})
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.stockItemId && <FieldError>{errors.stockItemId.message}</FieldError>}
                  </Field>

                  <Separator />

                  <Field>
                    <FieldLabel>Tier de Precio</FieldLabel>
                    <Controller
                      control={control}
                      name="tier"
                      render={({ field }) => (
                        <ToggleGroup
                          type="single"
                          value={field.value}
                          onValueChange={(v) => { if (v) field.onChange(v) }}
                          className="w-full"
                        >
                          {TIERS.map((t) => (
                            <ToggleGroupItem key={t} value={t} className="flex-1">
                              {TIER_LABELS[t]}
                              {selectedItem && (
                                <span className="ml-1 text-muted-foreground">
                                  {usd(getTierPrice(selectedItem, t) ?? 0)}
                                </span>
                              )}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      )}
                    />
                    {watchedCliente && (
                      <FieldDescription>
                        Auto-seleccionado: {TIER_LABELS[watchedTier]} (cliente tipo {clients?.find((c) => c.name === watchedCliente)?.type ?? 'standard'})
                      </FieldDescription>
                    )}
                  </Field>

                  <div className="grid grid-cols-3 gap-4">
                    <Field data-invalid={!!errors.precio}>
                      <FieldLabel>Precio</FieldLabel>
                      <Input type="number" step="any" {...register('precio')} />
                      {errors.precio && <FieldError>{errors.precio.message}</FieldError>}
                    </Field>
                    <Field>
                      <FieldLabel>Cantidad</FieldLabel>
                      <Input type="number" {...register('cantidad')} />
                    </Field>
                    <Field>
                      <FieldLabel>Ganancia</FieldLabel>
                      <Input
                        type="number"
                        value={ganancia}
                        disabled
                        className={ganancia < 0 ? 'text-destructive' : ''}
                      />
                    </Field>
                  </div>

                  {selectedItem && (
                    <FieldDescription>
                      Costo: {usd(costoPerUnit)}/u × {qty} = {usd(costoPerUnit * qty)}
                    </FieldDescription>
                  )}

                  <Field data-invalid={!!errors.asignado}>
                    <FieldLabel>Asignado</FieldLabel>
                    <Controller
                      control={control}
                      name="asignado"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {(teamMembers ?? []).map((m) => (
                                <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.asignado && <FieldError>{errors.asignado.message}</FieldError>}
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={sellMutation.isPending}>
                {sellMutation.isPending ? 'Vendiendo...' : 'Vender'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
