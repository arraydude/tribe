import { useState, useEffect } from 'react'
import { useOrders, useDashboardStats } from '@/hooks/useOrders'
import { Dashboard } from '@/components/Dashboard'
import { OrdersTable } from '@/components/OrdersTable'
import { OrderForm } from '@/components/OrderForm'
import { QuotationCalc } from '@/components/QuotationCalc'
import { StockDashboard } from '@/components/StockDashboard'
import type { OrderRow } from '@/lib/api'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Moon, Sun } from '@phosphor-icons/react'

type View = 'dashboard' | 'orders' | 'stock' | 'quotation'

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const { data: orders, isLoading: ordersLoading } = useOrders()
  const { data: dashboardData, isLoading: dashLoading } = useDashboardStats()

  const handleNew = () => {
    setEditingOrder(null)
    setFormOpen(true)
  }

  const handleEdit = (order: OrderRow) => {
    setEditingOrder(order)
    setFormOpen(true)
  }

  const handleFormDone = () => {
    setEditingOrder(null)
    setFormOpen(false)
  }

  const handleFormCancel = () => {
    setEditingOrder(null)
    setFormOpen(false)
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
              {(['dashboard', 'orders', 'stock', 'quotation'] as const).map((v) => (
                <Button
                  key={v}
                  variant={view === v ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setView(v)}
                  className="uppercase tracking-wider text-xs"
                >
                  {{ dashboard: 'Dashboard', orders: 'Pedidos', stock: 'Stock', quotation: 'Cotizador' }[v]}
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleNew}>
              + Nuevo
            </Button>
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

        {view === 'quotation' && (
          <div>
            <h2 className="text-lg font-semibold tracking-wider text-foreground mb-6">
              Cotizador
            </h2>
            <QuotationCalc />
          </div>
        )}
      </main>

      {/* Overlay for non-modal dialog */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 pointer-events-none supports-backdrop-filter:backdrop-blur-xs"
          aria-hidden
        />
      )}

      {/* Order Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) handleFormCancel() }} modal={false}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Editar Pedido' : 'Nuevo Pedido'}</DialogTitle>
            <DialogDescription>
              {editingOrder ? 'Modificar los datos del pedido.' : 'Completar los datos para crear un nuevo pedido.'}
            </DialogDescription>
          </DialogHeader>
          <OrderForm
            order={editingOrder}
            onDone={handleFormDone}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
