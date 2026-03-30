import { useState, useMemo, useEffect } from 'react'
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
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
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

export function StockSaleDialog({ open, onClose }: StockSaleDialogProps) {
  const { data: clients } = useClients()
  const { data: teamMembers } = useTeamMembers()
  const { data: stockItems } = useStockItems()
  const sellMutation = useSellStockItem()

  const [cliente, setCliente] = useState('')
  const [stockItemId, setStockItemId] = useState<number | null>(null)
  const [tier, setTier] = useState<string>('standard')
  const [precio, setPrecio] = useState<string>('')
  const [cantidad, setCantidad] = useState('1')
  const [asignado, setAsignado] = useState('')
  const [error, setError] = useState('')

  const clientNames = useMemo(() => (clients ?? []).map((c) => c.name), [clients])
  const availableItems = useMemo(() => (stockItems ?? []).filter((s) => s.cantidad_disponible > 0 && s.status === 'DISPONIBLE'), [stockItems])
  const selectedItem = stockItems?.find((s) => s.id === stockItemId)

  // Auto-select tier when client changes
  useEffect(() => {
    if (!cliente) return
    const clientType = clients?.find((c) => c.name === cliente)?.type
    if (clientType && TIERS.includes(clientType as typeof TIERS[number])) {
      setTier(clientType)
    }
  }, [cliente, clients])

  // Auto-fill price when tier or item changes
  useEffect(() => {
    if (!selectedItem) return
    const p = getTierPrice(selectedItem, tier)
    if (p != null) setPrecio(String(p))
  }, [tier, selectedItem])

  const costoPerUnit = selectedItem?.costo_por_unidad ?? 0
  const qty = Number(cantidad) || 1
  const precioNum = Number(precio) || 0
  const ganancia = Math.round((precioNum - costoPerUnit * qty) * 100) / 100

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!cliente.trim()) { setError('Seleccioná un cliente'); return }
    if (!stockItemId) { setError('Seleccioná un item de stock'); return }
    if (!precioNum) { setError('Ingresá un precio'); return }

    try {
      await sellMutation.mutateAsync({
        id: stockItemId,
        qty,
        order_data: {
          cliente: cliente.trim(),
          item: selectedItem ? getStockDisplayName(selectedItem) : '',
          valor_presupuestado: precioNum,
          ganancia,
          status: 'TO DO',
          asignado: asignado || null,
        },
      })
      // Reset and close
      setCliente(''); setStockItemId(null); setTier('standard')
      setPrecio(''); setCantidad('1'); setAsignado(''); setError('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al vender')
    }
  }

  const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <>
      {open && <div className="fixed inset-0 z-50 bg-black/50 pointer-events-none supports-backdrop-filter:backdrop-blur-xs" aria-hidden />}
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }} modal={false}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Venta de Stock</DialogTitle>
            <DialogDescription>Vender un item del inventario a un cliente.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Card>
              <CardContent className="pt-6">
                <FieldGroup>
                  <Field>
                    <FieldLabel>Cliente <span className="text-destructive">*</span></FieldLabel>
                    <Combobox items={clientNames} value={cliente || null} onValueChange={(val) => setCliente(val ?? '')}>
                      <ComboboxInput placeholder="Buscar cliente..." showClear />
                      <ComboboxContent>
                        <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                        <ComboboxList>
                          {(name) => <ComboboxItem key={name} value={name}>{name}</ComboboxItem>}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </Field>

                  <Field>
                    <FieldLabel>
                      Item de Stock <span className="text-destructive">*</span>
                      {selectedItem && <Badge variant="secondary" className="ml-auto">{selectedItem.cantidad_disponible} disp.</Badge>}
                    </FieldLabel>
                    <Select value={stockItemId?.toString() ?? undefined} onValueChange={(v) => setStockItemId(Number(v))}>
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
                  </Field>

                  <Separator />

                  <Field>
                    <FieldLabel>Tier de Precio</FieldLabel>
                    <ToggleGroup
                      type="single"
                      value={tier}
                      onValueChange={(v) => { if (v) setTier(v) }}
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
                    {cliente && (
                      <FieldDescription>
                        Auto-seleccionado: {TIER_LABELS[tier]} (cliente tipo {clients?.find((c) => c.name === cliente)?.type ?? 'standard'})
                      </FieldDescription>
                    )}
                  </Field>

                  <div className="grid grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel>Precio</FieldLabel>
                      <Input type="number" step="any" value={precio} onChange={(e) => setPrecio(e.target.value)} />
                    </Field>
                    <Field>
                      <FieldLabel>Cantidad</FieldLabel>
                      <Input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
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

                  <Field>
                    <FieldLabel>Asignado</FieldLabel>
                    <Select value={asignado || undefined} onValueChange={setAsignado}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(teamMembers ?? []).map((m) => (
                            <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
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
