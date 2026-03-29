import type { ColumnDef } from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { OrderRow } from '@/lib/api'
import { Badge } from '@/components/ui/badge'

const usd = (val: number | null) =>
  val != null ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

function SortHeader({ label, column }: { label: string; column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors font-medium"
    >
      {label}
      {sorted === 'asc' ? <ChevronUp className="h-3 w-3" /> : sorted === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
    </button>
  )
}

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'DONE': { variant: 'default' },
  'IN PROGRESS': { variant: 'secondary' },
  'TO DO': { variant: 'outline' },
  'RECEIVED BAIRES': { variant: 'secondary' },
}

export function createColumns(onEdit: (order: OrderRow) => void, onDelete: (order: OrderRow) => void): ColumnDef<OrderRow>[] {
  return [
    {
      accessorKey: 'cliente',
      header: ({ column }) => <SortHeader label="Cliente" column={column} />,
      cell: ({ row }) => <span className="text-foreground/80 font-medium text-sm">{row.original.cliente ?? '—'}</span>,
    },
    {
      accessorKey: 'item',
      header: ({ column }) => <SortHeader label="Item" column={column} />,
      cell: ({ row }) => (
        <span className="max-w-[220px] truncate block text-muted-foreground text-sm">{row.original.item ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'cantidad',
      header: () => <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Cant.</span>,
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground/60 text-sm">{row.original.cantidad ?? '—'}</span>,
    },
    {
      accessorKey: 'valor_presupuestado',
      header: ({ column }) => <SortHeader label="Presupuesto" column={column} />,
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-sm">{usd(row.original.valor_presupuestado)}</span>,
    },
    {
      accessorKey: 'valor_compra',
      header: ({ column }) => <SortHeader label="Compra" column={column} />,
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-sm">{usd(row.original.valor_compra)}</span>,
    },
    {
      accessorKey: 'costo_envio',
      header: () => <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Envio</span>,
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground/50 text-sm">{usd(row.original.costo_envio)}</span>,
    },
    {
      accessorKey: 'ganancia',
      header: ({ column }) => <SortHeader label="Ganancia" column={column} />,
      cell: ({ row }) => {
        const val = row.original.ganancia
        if (val == null) return <span className="text-muted-foreground/30">—</span>
        const positive = val >= 0
        return (
          <span className={`font-mono tabular-nums text-sm font-semibold ${positive ? 'text-foreground' : 'text-destructive'}`}>
            {usd(val)}
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: () => <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Estado</span>,
      cell: ({ row }) => {
        const val = row.original.status
        if (!val) return '—'
        const cfg = statusConfig[val] ?? { variant: 'outline' as const }
        return (
          <Badge variant={cfg.variant}>
            {val}
          </Badge>
        )
      },
      filterFn: 'equals',
    },
    {
      accessorKey: 'is_paid',
      header: () => <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Saldado</span>,
      cell: ({ row }) => {
        return row.original.is_paid
          ? <Badge variant="default">SI</Badge>
          : <span className="text-muted-foreground/40 text-xs">NO</span>
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
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-xs">{row.original.fecha_compra ?? '—'}</span>,
    },
    {
      accessorKey: 'asignado',
      header: () => <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Asignado</span>,
      cell: ({ row }) => {
        const val = row.original.asignado
        return val
          ? <span className="text-primary/60 text-xs uppercase">{val}</span>
          : <span className="text-muted-foreground/20">—</span>
      },
    },
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(row.original)}
            className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(row.original)}
            className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors"
          >
            Borrar
          </button>
        </div>
      ),
    },
  ]
}
