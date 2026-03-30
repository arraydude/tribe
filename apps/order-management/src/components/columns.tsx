import type { ColumnDef } from '@tanstack/react-table'
import type { OrderRow } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'

const usd = (val: number | null) =>
  val != null ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'DONE': { variant: 'default' },
  'IN PROGRESS': { variant: 'secondary' },
  'TO DO': { variant: 'outline' },
  'RECEIVED BAIRES': { variant: 'secondary' },
}

function canConvertToStock(order: OrderRow): boolean {
  return (
    !order.stock_item_id &&
    order.is_stock === 0 &&
    (order.valor_presupuestado === 0 || order.valor_presupuestado === null) &&
    (order.status === 'RECEIVED BAIRES' || order.status === 'DONE')
  )
}

export function createColumns(onEdit: (order: OrderRow) => void, onDelete: (order: OrderRow) => void, onConvertToStock?: (order: OrderRow) => void): ColumnDef<OrderRow>[] {
  return [
    {
      accessorKey: 'cliente',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.cliente ?? '—'}</span>,
    },
    {
      accessorKey: 'item',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 max-w-[220px]">
          <span className="truncate text-muted-foreground text-sm">{row.original.item ?? '—'}</span>
          {row.original.stock_item_id && row.original.is_stock === 0 && (
            <Badge variant="outline">STOCK</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'cantidad',
      header: 'Cant.',
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-sm">{row.original.cantidad ?? '—'}</span>,
    },
    {
      accessorKey: 'valor_presupuestado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Presupuesto" />,
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-sm">{usd(row.original.valor_presupuestado)}</span>,
    },
    {
      accessorKey: 'valor_compra',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Compra" />,
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-sm">{usd(row.original.valor_compra)}</span>,
    },
    {
      accessorKey: 'costo_envio',
      header: 'Envio',
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground/50 text-sm">{usd(row.original.costo_envio)}</span>,
    },
    {
      accessorKey: 'ganancia',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ganancia" />,
      cell: ({ row }) => {
        const val = row.original.ganancia
        if (val == null) return <span className="text-muted-foreground/30">—</span>
        return (
          <span className={`font-mono tabular-nums text-sm font-semibold ${val >= 0 ? 'text-foreground' : 'text-destructive'}`}>
            {usd(val)}
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const val = row.original.status
        if (!val) return '—'
        const cfg = statusConfig[val] ?? { variant: 'outline' as const }
        return <Badge variant={cfg.variant}>{val}</Badge>
      },
      filterFn: 'equals',
    },
    {
      accessorKey: 'is_paid',
      header: 'Saldado',
      cell: ({ row }) => {
        return row.original.is_paid
          ? <Badge variant="default">SI</Badge>
          : <span className="text-muted-foreground/40 text-xs">NO</span>
      },
    },
    {
      accessorKey: 'fecha_compra',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-xs">{row.original.fecha_compra ?? '—'}</span>,
    },
    {
      accessorKey: 'asignado',
      header: 'Asignado',
      cell: ({ row }) => {
        const val = row.original.asignado
        return val
          ? <span className="text-primary/60 text-xs uppercase">{val}</span>
          : <span className="text-muted-foreground/20">—</span>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {onConvertToStock && canConvertToStock(row.original) && (
            <Button variant="ghost" size="xs" onClick={() => onConvertToStock(row.original)}>
              → Stock
            </Button>
          )}
          <Button variant="ghost" size="xs" onClick={() => onEdit(row.original)}>
            Editar
          </Button>
          <Button variant="ghost" size="xs" className="text-destructive" onClick={() => onDelete(row.original)}>
            Borrar
          </Button>
        </div>
      ),
    },
  ]
}
