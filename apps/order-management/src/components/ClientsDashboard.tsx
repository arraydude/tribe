import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useClients, useDealers } from '@/hooks/useOrders'
import type { Client, Dealer } from '@/lib/api'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'

type ClientRow = Client & { dealer: Dealer | null }

function createColumns(): ColumnDef<ClientRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.name}</span>,
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) =>
        row.original.dealer ? (
          <Badge variant="secondary">{row.original.dealer.tier_name}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">&mdash;</span>
        ),
    },
    {
      accessorKey: 'notes',
      header: 'Notas',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.notes ?? '—'}
        </span>
      ),
    },
  ]
}

export function ClientsDashboard() {
  const { data: clients, isLoading: clientsLoading } = useClients()
  const { data: dealers, isLoading: dealersLoading } = useDealers()

  const columns = useMemo(() => createColumns(), [])

  const rows: ClientRow[] = useMemo(() => {
    if (!clients) return []
    const dealerMap = new Map<number, Dealer>()
    if (dealers) {
      for (const d of dealers) {
        dealerMap.set(d.client_id, d)
      }
    }
    return clients.map((c) => ({
      ...c,
      dealer: dealerMap.get(c.id) ?? null,
    }))
  }, [clients, dealers])

  const kpis = useMemo(() => {
    return {
      totalClients: rows.length,
      totalDealers: rows.filter((r) => r.dealer !== null).length,
    }
  }, [rows])

  const isLoading = clientsLoading || dealersLoading

  if (isLoading) {
    return <p className="text-muted-foreground text-sm text-center py-20">Cargando clientes...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-wider text-foreground">
          Clientes
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Total Clientes</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{kpis.totalClients}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Dealers</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{kpis.totalDealers}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchKey="name"
        searchPlaceholder="Buscar por nombre..."
      />
    </div>
  )
}
