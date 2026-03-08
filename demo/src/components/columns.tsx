import type { ColumnDef } from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { OrderRow } from '@/lib/api'

const usd = (val: number | null) =>
  val != null ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

function SortHeader({ label, column }: { label: string; column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/30 hover:text-tribe-orange transition-colors font-medium"
    >
      {label}
      {sorted === 'asc' ? <ChevronUp className="h-3 w-3" /> : sorted === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
    </button>
  )
}

const statusConfig: Record<string, { bg: string; text: string }> = {
  'DONE': { bg: 'bg-tribe-green/15', text: 'text-tribe-green' },
  'IN PROGRESS': { bg: 'bg-tribe-orange/15', text: 'text-tribe-orange' },
  'TO DO': { bg: 'bg-tribe-amber/15', text: 'text-tribe-amber' },
  'RECEIVED BAIRES': { bg: 'bg-tribe-cyan/15', text: 'text-tribe-cyan' },
}

export function createColumns(onEdit: (order: OrderRow) => void, onDelete: (order: OrderRow) => void): ColumnDef<OrderRow>[] {
  return [
    {
      accessorKey: 'cliente',
      header: ({ column }) => <SortHeader label="Cliente" column={column} />,
      cell: ({ row }) => <span className="text-white/80 font-medium text-sm">{row.original.cliente ?? '—'}</span>,
    },
    {
      accessorKey: 'item',
      header: ({ column }) => <SortHeader label="Item" column={column} />,
      cell: ({ row }) => (
        <span className="max-w-[220px] truncate block text-white/50 text-sm">{row.original.item ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'cantidad',
      header: () => <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">Cant.</span>,
      cell: ({ row }) => <span className="data-value text-white/40 text-sm">{row.original.cantidad ?? '—'}</span>,
    },
    {
      accessorKey: 'valor_presupuestado',
      header: ({ column }) => <SortHeader label="Presupuesto" column={column} />,
      cell: ({ row }) => <span className="data-value text-white/50 text-sm">{usd(row.original.valor_presupuestado)}</span>,
    },
    {
      accessorKey: 'valor_compra',
      header: ({ column }) => <SortHeader label="Compra" column={column} />,
      cell: ({ row }) => <span className="data-value text-white/50 text-sm">{usd(row.original.valor_compra)}</span>,
    },
    {
      accessorKey: 'costo_envio',
      header: () => <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">Envio</span>,
      cell: ({ row }) => <span className="data-value text-white/35 text-sm">{usd(row.original.costo_envio)}</span>,
    },
    {
      accessorKey: 'ganancia',
      header: ({ column }) => <SortHeader label="Ganancia" column={column} />,
      cell: ({ row }) => {
        const val = row.original.ganancia
        if (val == null) return <span className="text-white/20">—</span>
        const positive = val >= 0
        return (
          <span className={`data-value text-sm font-semibold ${positive ? 'text-tribe-green' : 'text-tribe-red'}`}>
            {usd(val)}
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: () => <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">Estado</span>,
      cell: ({ row }) => {
        const val = row.original.status
        if (!val) return '—'
        const cfg = statusConfig[val] ?? { bg: 'bg-white/5', text: 'text-white/40' }
        return (
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium ${cfg.bg} ${cfg.text}`}>
            {val}
          </span>
        )
      },
      filterFn: 'equals',
    },
    {
      accessorKey: 'is_paid',
      header: () => <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">Saldado</span>,
      cell: ({ row }) => {
        return row.original.is_paid
          ? <span className="inline-flex items-center gap-1 text-tribe-green text-xs"><span className="w-1.5 h-1.5 rounded-full bg-tribe-green" />SI</span>
          : <span className="text-white/25 text-xs">NO</span>
      },
      filterFn: (row, _, value) => {
        if (value === 'SI') return row.original.is_paid === 1
        if (value === 'NO') return row.original.is_paid === 0
        return true
      },
    },
    {
      accessorKey: 'fecha_compra',
      header: ({ column }) => <SortHeader label="Fecha" column={column} />,
      cell: ({ row }) => <span className="data-value text-white/30 text-xs">{row.original.fecha_compra ?? '—'}</span>,
    },
    {
      accessorKey: 'asignado',
      header: () => <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">Asignado</span>,
      cell: ({ row }) => {
        const val = row.original.asignado
        return val
          ? <span className="text-tribe-orange/60 text-xs uppercase">{val}</span>
          : <span className="text-white/15">—</span>
      },
    },
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(row.original)}
            className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/30 hover:text-tribe-orange transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(row.original)}
            className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/30 hover:text-tribe-red transition-colors"
          >
            Borrar
          </button>
        </div>
      ),
    },
  ]
}
