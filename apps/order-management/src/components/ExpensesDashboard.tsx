import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useExpenses } from '@/hooks/useOrders'
import type { Expense } from '@/lib/api'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'

const usd = (val: number | null) =>
  val != null ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

function createExpenseColumns(): ColumnDef<Expense>[] {
  return [
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.description}</span>,
    },
    {
      accessorKey: 'cost',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Costo ($)" />,
      cell: ({ row }) => <span className="font-mono tabular-nums text-sm">{usd(row.original.cost)}</span>,
    },
    {
      accessorKey: 'paid_by_name',
      header: 'Pagado Por',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.paid_by_name ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'paid_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-muted-foreground text-xs">
          {row.original.paid_at ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'is_settled',
      header: 'Liquidado',
      cell: ({ row }) => {
        return row.original.is_settled
          ? <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" title="Liquidado" />
          : <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground/20" title="Pendiente" />
      },
    },
  ]
}

export function ExpensesDashboard() {
  const { data: expenses, isLoading } = useExpenses()

  const columns = useMemo(() => createExpenseColumns(), [])

  const kpis = useMemo(() => {
    if (!expenses) return { total: 0, nahue: 0, fede: 0, pendientes: 0 }
    return {
      total: expenses.reduce((sum, e) => sum + e.cost, 0),
      nahue: expenses
        .filter((e) => e.paid_by_name === 'Nahue')
        .reduce((sum, e) => sum + e.cost, 0),
      fede: expenses
        .filter((e) => e.paid_by_name === 'Fede')
        .reduce((sum, e) => sum + e.cost, 0),
      pendientes: expenses.filter((e) => !e.is_settled).length,
    }
  }, [expenses])

  if (isLoading) {
    return <p className="text-muted-foreground text-sm text-center py-20">Cargando gastos...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-wider text-foreground">
          Gastos
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Total Gastos</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{usd(kpis.total)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Gastos Nahue</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{usd(kpis.nahue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Gastos Fede</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{usd(kpis.fede)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Pendientes de Liquidar</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{kpis.pendientes}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={expenses ?? []}
        searchKey="description"
        searchPlaceholder="Buscar por descripción..."
      />
    </div>
  )
}
