import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { 
  ChefHat, 
  Table, 
  Clock, 
  Check, 
  Bell, 
  RefreshCw, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  HelpCircle, 
  Trash2, 
  X, 
  Lock 
} from 'lucide-react';

interface KitchenDashboardProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onClearHistory: (passwordConfirm: string) => Promise<boolean> | void;
  onRefresh: () => Promise<void> | void;
  onDeleteOrder: (orderId: string, passwordConfirm: string) => Promise<boolean>;
}

export const KitchenDashboard: React.FC<KitchenDashboardProps> = ({
  orders,
  onUpdateStatus,
  onClearHistory,
  onRefresh,
  onDeleteOrder
}) => {
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Custom Confirmation Modal States
  const [modalType, setModalType] = useState<'delete_order' | 'clear_all' | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Filter orders that are paid or already in the kitchen cycle
  const paidOrders = orders.filter(o => o.paymentStatus === 'pagado' || o.status === 'preparando' || o.status === 'listo');

  const filteredOrders = paidOrders.filter(o => {
    if (filter === 'todos') return o.status !== 'entregado'; // Default to active orders
    return o.status === filter;
  });

  // Calculate stats
  const pendingCount = paidOrders.filter(o => o.status === 'recibido').length;
  const cookingCount = paidOrders.filter(o => o.status === 'preparando').length;
  const readyCount = paidOrders.filter(o => o.status === 'listo').length;

  // Visual Diagnostic numbers
  const totalReceivedAPI = orders.length;
  const ordersApprovedCount = orders.filter(o => o.paymentStatus === 'pagado' && o.status === 'recibido').length;
  const ordersPreparingCount = orders.filter(o => o.status === 'preparando').length;
  const ordersHiddenCount = orders.filter(o => o.paymentStatus !== 'pagado' && o.status === 'recibido').length;

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'recibido': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'preparando': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'listo': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse-subtle';
      case 'entregado': return 'bg-white/5 text-white/50 border-white/10';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'recibido': return 'Recibido en Cola';
      case 'preparando': return 'En Cocina / Preparación';
      case 'listo': return 'Listo para Retiro (Barra)';
      case 'entregado': return 'Entregado a Mesa';
    }
  };

  const getElapsedTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Hace un instante';
    return `Hace ${diffMins} min`;
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      console.error("Refresh failed:", e);
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const handleOpenModal = (type: 'delete_order' | 'clear_all', orderId?: string) => {
    setModalType(type);
    setSelectedOrderId(orderId || null);
    setAdminPassword('');
    setModalError('');
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedOrderId(null);
    setAdminPassword('');
    setModalError('');
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!adminPassword.trim()) {
      setModalError('Por favor, ingrese la contraseña de administrador.');
      return;
    }

    setModalSubmitting(true);
    try {
      if (modalType === 'delete_order' && selectedOrderId) {
        await onDeleteOrder(selectedOrderId, adminPassword);
        handleCloseModal();
      } else if (modalType === 'clear_all') {
        await onClearHistory(adminPassword);
        handleCloseModal();
      }
    } catch (err: any) {
      console.error("Modal confirmation failed:", err);
      setModalError(err.message || 'Contraseña incorrecta o sesión inválida.');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6" id="kitchen-dashboard">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Queued orders count */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Por Atender</span>
            <span className="text-2xl font-black text-rose-400 font-mono">{pendingCount}</span>
            <span className="text-[10px] text-white/50">Pedidos recibidos esperando</span>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
        </div>

        {/* Preparing count */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">En Preparación</span>
            <span className="text-2xl font-black text-amber-400 font-mono">{cookingCount}</span>
            <span className="text-[10px] text-white/50">Platos cocinándose ahora</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <ChefHat className="w-6 h-6" />
          </div>
        </div>

        {/* Ready to be picked up */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Listos para barra</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{readyCount}</span>
            <span className="text-[10px] text-white/50">Esperando entrega</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <Check className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Diagnostics Panel (Temporary) */}
      <div className="bg-[#0f172a]/80 border border-slate-700/50 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-white font-display">Panel de Diagnóstico de Flujo (Caja → Cocina)</span>
        </div>
        <div className="flex flex-wrap gap-4 font-mono">
          <div>Pedidos recibidos desde API: <span className="font-bold text-white">{totalReceivedAPI}</span></div>
          <div className="text-emerald-400">Approved/Pagados: <span className="font-bold">{ordersApprovedCount}</span></div>
          <div className="text-amber-400">Preparing: <span className="font-bold">{ordersPreparingCount}</span></div>
          <div className="text-rose-400 font-bold">Ocultos (No Pagados): <span className="font-bold">{ordersHiddenCount}</span></div>
        </div>
      </div>

      {/* Control filters bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilter('todos')}
            id="filter-kitchen-active"
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
              filter === 'todos' ? 'bg-amber-400 text-black font-extrabold shadow-md' : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
            }`}
          >
            Activos en Cocina ({paidOrders.filter(o => o.status !== 'entregado').length})
          </button>
          
          <button
            onClick={() => setFilter('recibido')}
            id="filter-kitchen-received"
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
              filter === 'recibido' ? 'bg-rose-500 text-white font-extrabold' : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
            }`}
          >
            Nuevos ({pendingCount})
          </button>

          <button
            onClick={() => setFilter('preparando')}
            id="filter-kitchen-cooking"
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
              filter === 'preparando' ? 'bg-amber-500 text-black font-extrabold' : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
            }`}
          >
            En Preparación ({cookingCount})
          </button>

          <button
            onClick={() => setFilter('listo')}
            id="filter-kitchen-ready"
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
              filter === 'listo' ? 'bg-emerald-500 text-white font-extrabold' : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
            }`}
          >
            Listo Barra ({readyCount})
          </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleRefreshClick}
            id="refresh-kitchen-btn"
            disabled={isRefreshing}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            title="Sincronizar pedidos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Actualizar'}</span>
          </button>
          
          <button
            onClick={() => handleOpenModal('clear_all')}
            id="clear-kitchen-btn"
            className="px-3 py-2.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Limpiar Pedidos</span>
          </button>
        </div>
      </div>

      {/* Orders tickets list */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              id={`kitchen-ticket-${order.id}`}
              className={`glass-card overflow-hidden flex flex-col justify-between transition-all duration-300 border-y-0 border-r-0 border-l-4 ${
                order.status === 'recibido' ? 'border-l-rose-500 shadow-rose-500/5' :
                order.status === 'preparando' ? 'border-l-amber-500 shadow-amber-500/5' :
                'border-l-emerald-500 shadow-emerald-500/5'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-start">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">{order.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 font-medium mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-white/30" />
                    <span>Entró: {getElapsedTime(order.createdAt)}</span>
                  </div>
                </div>

                <div className="bg-amber-400 text-black px-3 py-2 rounded-2xl flex flex-col items-center shadow-sm font-bold">
                  <span className="text-[9px] font-extrabold uppercase leading-none font-display font-bold">Mesa</span>
                  <span className="text-lg font-black font-mono leading-none mt-0.5">{order.tableNumber}</span>
                </div>
              </div>

              {/* Items Detail */}
              <div className="p-5 flex-grow flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-display font-semibold">Platillos a Preparar</span>
                  <div className="flex flex-col gap-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 text-white font-extrabold flex items-center justify-center font-mono">
                            {item.quantity}
                          </span>
                          <span className="font-semibold text-white/90 leading-normal">{item.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Details */}
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-xs flex flex-col gap-1 mt-auto">
                  <div className="flex justify-between">
                    <span className="text-white/40">Cliente:</span>
                    <span className="font-bold text-white">{order.customerName}</span>
                  </div>
                  {order.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Contacto:</span>
                      <span className="font-semibold text-white/80 font-mono">{order.customerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                    <span className="text-white/40">Medio de Pago:</span>
                    <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                      {order.paymentMethod === 'simulado_tarjeta' ? '💳 Tarjeta' : 
                       order.paymentMethod === 'pago_movil' ? '📱 Pago Móvil' : '💵 Caja (Pte)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Operations footer */}
              <div className="p-4 bg-white/5 border-t border-white/10 flex gap-2 items-center">
                {order.status === 'recibido' && (
                  <button
                    onClick={() => onUpdateStatus(order.id, 'preparando')}
                    id={`btn-kitchen-cook-${order.id}`}
                    className="flex-grow bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>Empezar Preparación</span>
                  </button>
                )}
                {order.status === 'preparando' && (
                  <button
                    onClick={() => onUpdateStatus(order.id, 'listo')}
                    id={`btn-kitchen-ready-${order.id}`}
                    className="flex-grow bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Marcar Listo (Notificar)</span>
                  </button>
                )}
                {order.status === 'listo' && (
                  <button
                    onClick={() => onUpdateStatus(order.id, 'entregado')}
                    id={`btn-kitchen-deliver-${order.id}`}
                    className="flex-grow btn-gold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer text-xs font-bold"
                  >
                    <span>Entregado</span>
                  </button>
                )}

                {/* Individual Delete Action with password safety guard */}
                <button
                  onClick={() => handleOpenModal('delete_order', order.id)}
                  id={`btn-kitchen-delete-${order.id}`}
                  className="p-2.5 border border-rose-500/20 text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/50 rounded-xl transition-all cursor-pointer shrink-0"
                  title="Eliminar comanda de la cola"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 glass-card flex flex-col items-center justify-center p-8 gap-3">
          <ChefHat className="w-12 h-12 text-white/20" />
          <h3 className="text-lg font-semibold text-white font-display">No hay comandas activas</h3>
          <p className="text-xs text-white/60 max-w-sm">
            No hay comandas que requieran preparación en este momento bajo el filtro de "{filter}". ¡Gran trabajo equipo!
          </p>
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="mt-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Actualizar Cola</span>
          </button>
        </div>
      )}

      {/* Admin Password Confirmation Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative flex flex-col gap-4 animate-scale-up">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1.5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-display font-bold text-base text-white">
                  {modalType === 'delete_order' ? 'Confirmar Eliminación' : 'Vaciar Cola de Comandas'}
                </h3>
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono font-semibold">
                  Se requiere autorización de administrador
                </span>
              </div>
            </div>

            <div className="text-xs text-white/70 leading-relaxed font-sans">
              {modalType === 'delete_order' ? (
                <p>
                  Está a punto de eliminar permanentemente el pedido <strong className="text-amber-400 font-mono">{selectedOrderId}</strong>. Esta acción no se puede deshacer.
                </p>
              ) : (
                <p>
                  Está a punto de vaciar <strong className="text-rose-400 font-mono">TODAS</strong> las comandas de cocina activas. Esta acción es definitiva.
                </p>
              )}
            </div>

            <form onSubmit={handleConfirmAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-display">
                  Contraseña Administrativa
                </label>
                <input
                  type="password"
                  placeholder="Ingrese contraseña de admin"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                  autoFocus
                />
                {modalError && (
                  <span className="text-[10px] text-rose-400 font-bold font-sans mt-1 block">
                    ⚠️ {modalError}
                  </span>
                )}
              </div>

              <div className="flex gap-2.5 border-t border-white/5 pt-4 mt-1">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-1/2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-600/10 flex items-center justify-center gap-1.5"
                >
                  {modalSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{modalType === 'delete_order' ? 'Confirmar y Eliminar' : 'Confirmar y Vaciar'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
