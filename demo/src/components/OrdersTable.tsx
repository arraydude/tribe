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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
          <input
            placeholder="Buscar cliente, item..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 w-64 rounded-md border border-white/8 bg-tribe-surface-2 pl-9 pr-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-tribe-orange/40 focus:ring-1 focus:ring-tribe-orange/20 transition-all"
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
      <div className="rounded-lg border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-white/5 bg-tribe-surface">
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
                  <tr key={row.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-white/20 text-sm">
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
        <span className="data-value text-[11px] text-white/25">
          {table.getFilteredRowModel().rows.length} pedidos
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-7 w-7 rounded flex items-center justify-center border border-white/8 text-white/30 hover:text-white/60 hover:border-white/15 disabled:opacity-20 transition-all"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="data-value text-[11px] text-white/30 px-2">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-7 w-7 rounded flex items-center justify-center border border-white/8 text-white/30 hover:text-white/60 hover:border-white/15 disabled:opacity-20 transition-all"
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
      className="h-8 rounded-md border border-white/8 bg-tribe-surface-2 px-2 text-xs text-white/50 focus:outline-none focus:border-tribe-orange/40 transition-all appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
