import { useState, useEffect } from 'react'
import { useOrders, useDashboardStats } from '@/hooks/useOrders'
import { Dashboard } from '@/components/Dashboard'
import { OrdersTable } from '@/components/OrdersTable'
import { OrderForm } from '@/components/OrderForm'
import { QuotationCalc } from '@/components/QuotationCalc'
import { StockDashboard } from '@/components/StockDashboard'
import { StockSaleDialog } from '@/components/StockSaleDialog'
import { StockForm } from '@/components/StockForm'
import { LicencesDashboard } from '@/components/LicencesDashboard'
import { ExpensesDashboard } from '@/components/ExpensesDashboard'
import { ClientsDashboard } from '@/components/ClientsDashboard'
import type { OrderRow } from '@/lib/api'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Moon, Sun, Plus } from '@phosphor-icons/react'

type View = 'dashboard' | 'orders' | 'stock' | 'licences' | 'expenses' | 'clients' | 'quotation'

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null)
  const [orderFormOpen, setOrderFormOpen] = useState(false)
  const [stockSaleOpen, setStockSaleOpen] = useState(false)
  const [investmentOpen, setInvestmentOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const { data: orders, isLoading: ordersLoading } = useOrders()
  const { data: dashboardData, isLoading: dashLoading } = useDashboardStats()

  const handleEdit = (order: OrderRow) => {
    setEditingOrder(order)
    setOrderFormOpen(true)
  }

  const handleFormDone = () => {
    setEditingOrder(null)
    setOrderFormOpen(false)
  }

  const handleFormCancel = () => {
    setEditingOrder(null)
    setOrderFormOpen(false)
  }

  const totalOrders = orders?.length ?? 0

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div>
              <h1 className="text-xl font-bold tracking-wider text-foreground">TRIBE SHIPPING</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-medium mt-0.5">Seguimiento de compras</p>
            </div>

            <Separator orientation="vertical" className="hidden h-8 sm:block" />

            <nav className="hidden sm:flex items-center gap-1">
              {(['dashboard', 'orders', 'stock', 'licences', 'expenses', 'clients', 'quotation'] as const).map((v) => (
                <Button
                  key={v}
                  variant={view === v ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setView(v)}
                  className="uppercase tracking-wider text-xs"
                >
                  {{ dashboard: 'Dashboard', orders: 'Pedidos', stock: 'Stock', licences: 'Licencias', expenses: 'Gastos', clients: 'Clientes', quotation: 'Cotizador' }[v]}
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus data-icon="inline-start" />
                  Nuevo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => { setEditingOrder(null); setOrderFormOpen(true) }}>
                  Pedido de Importación
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setStockSaleOpen(true)}>
                  Venta de Stock
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setInvestmentOpen(true)}>
                  Inversión de Stock
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDark((d) => !d)}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Badge variant="outline" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              {totalOrders} registros
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        {view === 'dashboard' && (
          dashLoading ? (
            <p className="text-muted-foreground text-sm text-center py-20">Cargando dashboard...</p>
          ) : dashboardData ? (
            <Dashboard data={dashboardData} />
          ) : null
        )}

        {view === 'orders' && (
          <div>
            <h2 className="text-lg font-semibold tracking-wider text-foreground mb-6">
              Registro de Pedidos
            </h2>
            {ordersLoading ? (
              <p className="text-muted-foreground text-sm text-center py-20">Cargando pedidos...</p>
            ) : (
              <OrdersTable data={orders ?? []} onEdit={handleEdit} />
            )}
          </div>
        )}

        {view === 'stock' && <StockDashboard />}

        {view === 'licences' && <LicencesDashboard />}

        {view === 'expenses' && <ExpensesDashboard />}

        {view === 'clients' && <ClientsDashboard />}

        {view === 'quotation' && (
          <div>
            <h2 className="text-lg font-semibold tracking-wider text-foreground mb-6">
              Cotizador
            </h2>
            <QuotationCalc />
          </div>
        )}
      </main>

      {/* Order Form Dialog (importación + edit) */}
      {orderFormOpen && <div className="fixed inset-0 z-50 bg-black/50 pointer-events-none supports-backdrop-filter:backdrop-blur-xs" aria-hidden />}
      <Dialog open={orderFormOpen} onOpenChange={(open) => { if (!open) handleFormCancel() }} modal={false}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Editar Pedido' : 'Pedido de Importación'}</DialogTitle>
            <DialogDescription>
              {editingOrder ? 'Modificar los datos del pedido.' : 'Importación directa para un cliente.'}
            </DialogDescription>
          </DialogHeader>
          <OrderForm
            order={editingOrder}
            onDone={handleFormDone}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Stock Sale Dialog */}
      <StockSaleDialog open={stockSaleOpen} onClose={() => setStockSaleOpen(false)} />

      {/* Investment Dialog */}
      {investmentOpen && <div className="fixed inset-0 z-50 bg-black/50 pointer-events-none supports-backdrop-filter:backdrop-blur-xs" aria-hidden />}
      <Dialog open={investmentOpen} onOpenChange={(open) => { if (!open) setInvestmentOpen(false) }} modal={false}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Inversión de Stock</DialogTitle>
            <DialogDescription>Registrar una nueva compra para el inventario.</DialogDescription>
          </DialogHeader>
          <StockForm
            stockItem={null}
            onDone={() => setInvestmentOpen(false)}
            onCancel={() => setInvestmentOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
