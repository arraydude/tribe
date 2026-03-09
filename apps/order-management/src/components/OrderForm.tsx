import { useState } from 'react'
import { useCreateOrder, useUpdateOrder } from '@/hooks/useOrders'
import type { OrderRow } from '@/lib/api'

interface OrderFormProps {
  order: OrderRow | null // null = create, object = edit
  onDone: () => void
  onCancel: () => void
}

const STATUS_OPTIONS = ['TO DO', 'IN PROGRESS', 'RECEIVED BAIRES', 'DONE']

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

  const [error, setError] = useState('')

  const createMutation = useCreateOrder()
  const updateMutation = useUpdateOrder()

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.cliente.trim() || !form.item.trim()) {
      setError('Cliente e Item son obligatorios')
      return
    }

    const payload: Record<string, unknown> = {
      cliente: form.cliente.trim(),
      item: form.item.trim(),
      cantidad: Number(form.cantidad) || 1,
      valor_presupuestado: form.valor_presupuestado !== '' ? Number(form.valor_presupuestado) : null,
      valor_compra: form.valor_compra !== '' ? Number(form.valor_compra) : null,
      valor_debitado: form.valor_debitado !== '' ? Number(form.valor_debitado) : null,
      tax: form.tax !== '' ? Number(form.tax) : null,
      costo_envio: form.costo_envio !== '' ? Number(form.costo_envio) : null,
      peso: form.peso !== '' ? Number(form.peso) : null,
      status: form.status,
      is_stock: form.is_stock,
      is_paid: form.is_paid,
      asignado: form.asignado || null,
      ganancia: form.ganancia !== '' ? Number(form.ganancia) : null,
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
      setError(err instanceof Error ? err.message : 'Error guardando pedido')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {error && (
        <div className="rounded-md border border-tribe-red/30 bg-tribe-red/10 px-4 py-2 text-sm text-tribe-red">
          {error}
        </div>
      )}

      {/* Client + Item */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Cliente *" value={form.cliente} onChange={(v) => set('cliente', v)} />
        <Field label="Item *" value={form.item} onChange={(v) => set('item', v)} />
      </div>

      {/* Financials */}
      <div className="rounded-lg border border-white/5 bg-tribe-surface p-4 space-y-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">Valores</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Presupuestado" value={form.valor_presupuestado} onChange={(v) => set('valor_presupuestado', v)} type="number" />
          <Field label="Compra" value={form.valor_compra} onChange={(v) => set('valor_compra', v)} type="number" />
          <Field label="Debitado" value={form.valor_debitado} onChange={(v) => set('valor_debitado', v)} type="number" />
          <Field label="Tax 4%" value={form.tax} onChange={(v) => set('tax', v)} type="number" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Costo Envio" value={form.costo_envio} onChange={(v) => set('costo_envio', v)} type="number" />
          <Field label="Peso (kg)" value={form.peso} onChange={(v) => set('peso', v)} type="number" />
          <Field label="Cantidad" value={form.cantidad} onChange={(v) => set('cantidad', v)} type="number" />
          <Field label="Ganancia" value={form.ganancia} onChange={(v) => set('ganancia', v)} type="number" />
        </div>
      </div>

      {/* Status + toggles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Status</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="w-full h-9 rounded-md border border-white/8 bg-tribe-surface-2 px-3 text-sm text-white/70 focus:outline-none focus:border-tribe-orange/40 transition-all"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <Field label="Asignado" value={form.asignado} onChange={(v) => set('asignado', v)} />
        <Toggle label="Stock" checked={form.is_stock} onChange={(v) => set('is_stock', v)} />
        <Toggle label="Saldado" checked={form.is_paid} onChange={(v) => set('is_paid', v)} />
      </div>

      {/* Extra fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Tracking" value={form.tracking} onChange={(v) => set('tracking', v)} />
        <Field label="Saldado A" value={form.paid_to} onChange={(v) => set('paid_to', v)} />
      </div>
      <Field label="Link Compra" value={form.link_compra} onChange={(v) => set('link_compra', v)} />
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Observaciones</label>
        <textarea
          value={form.observaciones}
          onChange={(e) => set('observaciones', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-white/8 bg-tribe-surface-2 px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-tribe-orange/40 transition-all resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 text-xs uppercase tracking-wider font-semibold bg-tribe-orange text-[#0a0a0a] rounded-md hover:bg-tribe-orange/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Pedido'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 text-xs uppercase tracking-wider text-white/40 border border-white/10 rounded-md hover:bg-white/5 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={type === 'number' ? 'any' : undefined}
        className="w-full h-9 rounded-md border border-white/8 bg-tribe-surface-2 px-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-tribe-orange/40 transition-all"
      />
    </div>
  )
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`h-9 w-full rounded-md border text-sm font-medium transition-all ${
          checked
            ? 'border-tribe-green/30 bg-tribe-green/10 text-tribe-green'
            : 'border-white/8 bg-tribe-surface-2 text-white/30'
        }`}
      >
        {checked ? 'SI' : 'NO'}
      </button>
    </div>
  )
}
