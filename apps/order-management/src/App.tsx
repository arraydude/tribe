import { useState } from 'react'
import { useOrders, useDashboardStats } from '@/hooks/useOrders'
import { Dashboard } from '@/components/Dashboard'
import { OrdersTable } from '@/components/OrdersTable'
import { OrderForm } from '@/components/OrderForm'
import { QuotationCalc } from '@/components/QuotationCalc'
import { Plus, Calculator } from 'lucide-react'
import type { OrderRow } from '@/lib/api'

type View = 'dashboard' | 'orders' | 'new-order' | 'edit-order' | 'quotation'

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null)
  const { data: orders, isLoading: ordersLoading } = useOrders()
  const { data: dashboardData, isLoading: dashLoading } = useDashboardStats()

  const handleEdit = (order: OrderRow) => {
    setEditingOrder(order)
    setView('edit-order')
  }

  const handleFormDone = () => {
    setEditingOrder(null)
    setView('orders')
  }

  const totalOrders = orders?.length ?? 0

  return (
    <div className="min-h-screen bg-[#0a0a0a] noise-overlay">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-tribe-orange rounded-sm flex items-center justify-center">
                <span className="display-heading text-[#0a0a0a] text-lg leading-none">T</span>
              </div>
              <div>
                <h1 className="display-heading text-2xl text-white leading-none tracking-wider">TRIBE SHIPPING</h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-tribe-orange/70 font-medium mt-0.5">Seguimiento de compras</p>
              </div>
            </div>

            <div className="h-8 w-px bg-white/10 hidden sm:block" />

            <nav className="hidden sm:flex items-center gap-1">
              {(['dashboard', 'orders', 'quotation'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 text-xs font-medium uppercase tracking-wider rounded-sm transition-all ${
                    (v === 'orders' && (view === 'orders' || view === 'new-order' || view === 'edit-order'))
                      ? 'bg-tribe-orange/15 text-tribe-orange'
                      : view === v
                        ? 'bg-tribe-orange/15 text-tribe-orange'
                        : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {v === 'dashboard' ? 'Dashboard' : v === 'orders' ? 'Pedidos' : 'Cotizador'}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {view === 'orders' && (
              <button
                onClick={() => setView('new-order')}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-tribe-orange text-[#0a0a0a] text-xs font-semibold uppercase tracking-wider hover:bg-tribe-orange/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-tribe-green animate-pulse" />
              <span className="data-value text-[11px] text-white/40">{totalOrders} registros</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        {view === 'dashboard' && (
          dashLoading ? (
            <div className="text-white/30 text-sm text-center py-20">Cargando dashboard...</div>
          ) : dashboardData ? (
            <Dashboard data={dashboardData} />
          ) : null
        )}

        {view === 'orders' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-5 bg-tribe-orange rounded-full" />
              <h2 className="display-heading text-xl text-white/90 tracking-wider">REGISTRO DE PEDIDOS</h2>
            </div>
            {ordersLoading ? (
              <div className="text-white/30 text-sm text-center py-20">Cargando pedidos...</div>
            ) : (
              <OrdersTable data={orders ?? []} onEdit={handleEdit} />
            )}
          </div>
        )}

        {(view === 'new-order' || view === 'edit-order') && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-5 bg-tribe-orange rounded-full" />
              <h2 className="display-heading text-xl text-white/90 tracking-wider">
                {view === 'new-order' ? 'NUEVO PEDIDO' : 'EDITAR PEDIDO'}
              </h2>
            </div>
            <OrderForm
              order={editingOrder}
              onDone={handleFormDone}
              onCancel={() => { setEditingOrder(null); setView('orders') }}
            />
          </div>
        )}

        {view === 'quotation' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-5 bg-tribe-cyan rounded-full" />
              <h2 className="display-heading text-xl text-white/90 tracking-wider">COTIZADOR</h2>
            </div>
            <QuotationCalc />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
