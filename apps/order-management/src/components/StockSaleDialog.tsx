import { useMemo, useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClients, useDealers, useStaff, useStockItems, useStockItem, useSellStockItem } from '@/hooks/useOrders'
import { getStockDisplayName } from '@/lib/api'
import type { StockPrice } from '@/lib/api'

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

const TIERS = ['lista', 'taller', 'emi'] as const
const TIER_LABELS: Record<string, string> = { lista: 'Lista', taller: 'Taller', emi: 'EMI' }

function getTierPrice(prices: StockPrice[] | undefined, tierName: string): number | null {
  const match = prices?.find((p) => p.tier_name === tierName)
  return match ? match.price : null
}

const stockSaleSchema = z.object({
  cliente: z.string().min(1, 'Cliente es requerido'),
  stockItemId: z.string().min(1, 'Seleccioná un item de stock'),
  tier: z.string().default('lista'),
  precio: z.string().min(1, 'Ingresá un precio'),
  cantidad: z.string().default('1'),
  asignado: z.string().min(1, 'Asignado es requerido'),
})

type FormValues = z.infer<typeof stockSaleSchema>

export function StockSaleDialog({ open, onClose }: StockSaleDialogProps) {
  const { data: clients } = useClients()
  const { data: dealers } = useDealers()
  const { data: staff } = useStaff()
  const { data: stockItems } = useStockItems()
  const sellMutation = useSellStockItem()

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(stockSaleSchema),
    defaultValues: {
      cliente: '',
      stockItemId: '',
      tier: 'lista',
      precio: '',
      cantidad: '1',
      asignado: '',
    },
  })

  const [apiError, setApiError] = useState('')

  const clientNames = useMemo(() => (clients ?? []).map((c) => c.name), [clients])
  const availableItems = useMemo(() => (stockItems ?? []).filter((s) => s.available > 0 && s.status === 'DISPONIBLE'), [stockItems])

  const watchedCliente = watch('cliente')
  const watchedStockItemId = watch('stockItemId')
  const watchedTier = watch('tier')
  const watchedPrecio = watch('precio')
  const watchedCantidad = watch('cantidad')

  const selectedItemId = watchedStockItemId ? Number(watchedStockItemId) : null
  const { data: selectedItemDetail } = useStockItem(selectedItemId)

  // Fallback to list item for basic fields (display name, available count)
  const selectedItemBasic = stockItems?.find((s) => s.id === selectedItemId)

  // Use detail (with prices) when available, otherwise basic
  const selectedItem = selectedItemDetail ?? selectedItemBasic

  // Auto-select tier when client changes (via dealers lookup)
  useEffect(() => {
    if (!watchedCliente) return
    const client = clients?.find((c) => c.name === watchedCliente)
    if (!client) return
    const dealer = dealers?.find((d) => d.client_id === client.id)
    if (dealer?.tier_name && TIERS.includes(dealer.tier_name as typeof TIERS[number])) {
      setValue('tier', dealer.tier_name)
    }
  }, [watchedCliente, clients, dealers, setValue])

  // Auto-fill price when tier or item changes
  useEffect(() => {
    if (!selectedItemDetail?.prices) return
    const p = getTierPrice(selectedItemDetail.prices, watchedTier)
    if (p != null) setValue('precio', String(p))
  }, [watchedTier, selectedItemDetail, setValue])

  const costoPerUnit = selectedItem?.cost_per_unit ?? 0
  const qty = Number(watchedCantidad) || 1
  const precioNum = Number(watchedPrecio) || 0
  const ganancia = Math.round((precioNum - costoPerUnit * qty) * 100) / 100

  const onSubmit = async (data: FormValues) => {
    setApiError('')
    const stockId = Number(data.stockItemId)
    const qty = Number(data.cantidad) || 1
    const precioNum = Number(data.precio) || 0

    // Resolve staff id from name
    const staffMember = staff?.find((m) => m.name === data.asignado)

    try {
      await sellMutation.mutateAsync({
        id: stockId,
        qty,
        cliente: data.cliente.trim(),
        quoted_price: precioNum,
        assigned_to: staffMember?.id ?? null,
      })
      reset()
      setApiError('')
      onClose()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error al vender')
    }
  }

  const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Determine dealer info for description
  const selectedClient = clients?.find((c) => c.name === watchedCliente)
  const clientDealer = selectedClient ? dealers?.find((d) => d.client_id === selectedClient.id) : undefined

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
                      {selectedItem && <Badge variant="secondary" className="ml-auto">{selectedItem.available} disp.</Badge>}
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
                                  {getStockDisplayName(si)} ({si.available})
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
                              {selectedItemDetail?.prices && (
                                <span className="ml-1 text-muted-foreground">
                                  {usd(getTierPrice(selectedItemDetail.prices, t) ?? 0)}
                                </span>
                              )}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      )}
                    />
                    {watchedCliente && (
                      <FieldDescription>
                        Auto-seleccionado: {TIER_LABELS[watchedTier]} {clientDealer ? `(dealer: ${clientDealer.tier_name})` : '(cliente standard)'}
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
                              {(staff ?? []).map((m) => (
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
