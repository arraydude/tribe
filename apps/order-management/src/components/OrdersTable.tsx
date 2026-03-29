import { useState, useMemo } from 'react'
import {
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { OrderRow } from '@/lib/api'
import { createColumns } from './columns'
import { ConfirmDialog } from './ConfirmDialog'
import { useDeleteOrder } from '@/hooks/useOrders'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

interface OrdersTableProps {
  data: OrderRow[]
  onEdit: (order: OrderRow) => void
}

export function OrdersTable({ data, onEdit }: OrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<OrderRow | null>(null)

  const deleteMutation = useDeleteOrder()

  const columns = useMemo(() => createColumns(onEdit, setDeleteTarget), [onEdit])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, columnFilters, globalFilter },
    initialState: { pagination: { pageSize: 30 } },
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            placeholder="Buscar cliente, item..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 w-64 rounded-md border border-border bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>

        <FilterSelect
          value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
          onChange={(v) => table.getColumn('status')?.setFilterValue(v || undefined)}
          options={[
            { value: '', label: 'Todo estado' },
            { value: 'DONE', label: 'DONE' },
            { value: 'IN PROGRESS', label: 'IN PROGRESS' },
            { value: 'TO DO', label: 'TO DO' },
            { value: 'RECEIVED BAIRES', label: 'RECEIVED BA' },
          ]}
        />

        <FilterSelect
          value={(table.getColumn('is_paid')?.getFilterValue() as string) ?? ''}
          onChange={(v) => table.getColumn('is_paid')?.setFilterValue(v || undefined)}
          options={[
            { value: '', label: 'Saldado' },
            { value: 'SI', label: 'SI' },
            { value: 'NO', label: 'NO' },
          ]}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border bg-card">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-3 py-2.5 whitespace-nowrap">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-muted-foreground/50 text-sm">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
          {table.getFilteredRowModel().rows.length} pedidos
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-7 w-7 rounded flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-20 transition-all"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono tabular-nums text-[11px] text-muted-foreground px-2">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-7 w-7 rounded flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-20 transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar pedido"
        description={`Vas a eliminar "${deleteTarget?.item}" de ${deleteTarget?.cliente}. Esta accion es reversible (soft delete).`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id)
            setDeleteTarget(null)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function FilterSelect({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-border bg-secondary px-2 text-xs text-muted-foreground focus:outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
