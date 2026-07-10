import React, { useState, useEffect, useRef } from 'react';
import { Dish, Order, OrderStatus, ChatMessage } from './types';
import { DishesList } from './components/DishesList';
import { DishDetailModal } from './components/DishDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { PaymentModal } from './components/PaymentModal';
import { KitchenDashboard } from './components/KitchenDashboard';
import { TableQRGenerator } from './components/TableQRGenerator';
import { GeminiAssistant } from './components/GeminiAssistant';
import { NotificationProvider, useNotifications } from './components/PushNotificationManager';
import { AdminDashboard } from './components/AdminDashboard';
import { AppProvider, useApp } from './context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, 
  ChefHat, 
  QrCode, 
  ShoppingBag, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  Check,
  Globe,
  Settings,
  DollarSign,
  X
} from 'lucide-react';

export interface CartItem {
  dish: Dish;
  quantity: number;
}

function MainAppContent() {
  const { addNotification, playChime } = useNotifications();
  const { language, setLanguage, currency, setCurrency, exchangeRate, setExchangeRate, formatPrice, t, previewImage, setPreviewImage } = useApp();
  const [activeTab, setActiveTab] = useState<'menu' | 'comandas' | 'cocina' | 'qr' | 'admin'>('menu');
  
  // Menu items and Cart
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  
  // Table info bound via QR
  const [tableNumber, setTableNumber] = useState<string>('');
  const [isTableLinkedViaQR, setIsTableLinkedViaQR] = useState<boolean>(false);
  
  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [myOrderIds, setMyOrderIds] = useState<string[]>([]);
  
  // Payment gateway State
  const [paymentDetails, setPaymentDetails] = useState<{
    customerName: string;
    customerPhone: string;
    tableNumber: string;
    paymentMethod: 'transferencia' | 'efectivo_caja' | 'qr_caja' | 'tarjeta_caja' | 'simulado_tarjeta' | 'pago_movil';
    total: number;
  } | null>(null);

  const prevOrdersRef = useRef<Order[]>([]);

  // Parse Table Number from URL Query Params (e.g. ?table=4) to simulate QR scan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
      setTableNumber(tableParam);
      setIsTableLinkedViaQR(true);
      addNotification(
        language === 'en' ? "Table Linked" : "Mesa Vinculada", 
        language === 'en' 
          ? `Welcome! Your device has been linked to Table #${tableParam}.`
          : `¡Bienvenido! Tu dispositivo se ha vinculado a la Mesa #${tableParam}.`, 
        "success"
      );
    }
    
    // Load previously placed order IDs from localStorage
    const savedOrderIds = localStorage.getItem('s_con_proposito_my_orders');
    if (savedOrderIds) {
      try {
        setMyOrderIds(JSON.parse(savedOrderIds));
      } catch (e) {
        console.warn("Failed to parse stored order IDs:", e);
      }
    }
  }, []);

  // Fetch Dishes list
  const fetchDishes = async () => {
    try {
      const res = await fetch('/api/menu-items');
      if (res.ok) {
        const data = await res.json();
        setDishes(data);
      }
    } catch (e) {
      console.error("Failed to fetch dishes menu from Supabase/API:", e);
    }
  };

  // Fetch Orders from Express API
  const fetchOrders = async (silent = false) => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return;
      const latestOrders: Order[] = await res.json();
      
      // Real-time alert trigger logic
      if (prevOrdersRef.current.length > 0) {
        // 1. Detect new orders for the Kitchen sound alert
        if (latestOrders.length > prevOrdersRef.current.length) {
          const newOrders = latestOrders.filter(
            latest => !prevOrdersRef.current.some(prev => prev.id === latest.id)
          );
          newOrders.forEach(order => {
            addNotification(
              language === 'en' ? "NEW ORDER RECEIVED" : "NUEVO PEDIDO RECIBIDO", 
              `Mesa ${order.tableNumber} solicitó: ${order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}.`,
              "kitchen"
            );
          });
        }

        // 2. Detect order status updates for Customer notification chime
        latestOrders.forEach(latest => {
          const prev = prevOrdersRef.current.find(p => p.id === latest.id);
          if (prev && prev.status !== latest.status) {
            // Check if this is a customer-placed order from this browser session
            const isMyOrder = myOrderIds.includes(latest.id);
            
            if (isMyOrder) {
              if (latest.status === 'preparando') {
                addNotification(
                  language === 'en' ? "Your Order is in Kitchen" : "Tu Pedido está en Cocina",
                  language === 'en'
                    ? `Great news! The Chef started preparing your order ${latest.id}.`
                    : `¡Buenas noticias! El Chef empezó a preparar tu pedido ${latest.id}.`,
                  "info"
                );
              } else if (latest.status === 'listo') {
                addNotification(
                  language === 'en' ? "ORDER READY TO PICK UP!" : "¡PEDIDO LISTO PARA RETIRAR!",
                  language === 'en'
                    ? `Your order for Table ${latest.tableNumber} is ready at the bar. Please retrieve it!`
                    : `Tu pedido de la Mesa ${latest.tableNumber} está listo en la barra. ¡Por favor ven a retirarlo!`,
                  "success"
                );
              } else if (latest.status === 'entregado') {
                addNotification(
                  language === 'en' ? "Order Delivered" : "Pedido Entregado",
                  language === 'en'
                    ? "Thank you so much for choosing us! Enjoy your meal."
                    : "¡Muchas gracias por elegirnos! Que tengas un provechoso almuerzo.",
                  "success"
                );
              }
            }
          }
        });
      }

      setOrders(latestOrders);
      prevOrdersRef.current = latestOrders;
    } catch (e) {
      console.error("Failed to sync orders:", e);
    }
  };

  // Initial fetches
  useEffect(() => {
    fetchDishes();
    fetchOrders();

    // Set up 4-second polling to simulate a real-time WebSocket database
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [myOrderIds]);

  // Cart operations
  const handleAddToCart = (dish: Dish, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.dish.id === dish.id);
      if (existing) {
        return prev.map(item => 
          item.dish.id === dish.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { dish, quantity }];
    });
    const dishName = language === 'en' && dish.nameEn ? dish.nameEn : dish.name;
    addNotification(
      language === 'en' ? "Added to Cart" : "Agregado al Carrito", 
      `${quantity}x ${dishName} ${language === 'en' ? 'has been added.' : 'se agregó a tu pedido.'}`, 
      "info"
    );
  };

  const handleUpdateCartQuantity = (dishId: string, quantity: number) => {
    setCart(prev => prev.map(item => 
      item.dish.id === dishId ? { ...item, quantity } : item
    ));
  };

  const handleRemoveFromCart = (dishId: string) => {
    setCart(prev => prev.filter(item => item.dish.id !== dishId));
  };

  // Dispatch Checkout
  const handleCheckoutInit = (details: {
    customerName: string;
    customerPhone: string;
    tableNumber: string;
    paymentMethod: 'transferencia' | 'efectivo_caja' | 'qr_caja' | 'tarjeta_caja' | 'simulado_tarjeta' | 'pago_movil';
  }) => {
    const total = cart.reduce((acc, item) => acc + item.dish.price * item.quantity, 0);
    submitOrderToBackend({
      ...details,
      total
    });
  };

  // Create order in backend Express database
  const submitOrderToBackend = async (details: {
    customerName: string;
    customerPhone: string;
    tableNumber: string;
    paymentMethod: 'transferencia' | 'efectivo_caja' | 'qr_caja' | 'tarjeta_caja' | 'simulado_tarjeta' | 'pago_movil';
    total: number;
  }) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: details.tableNumber,
          customerName: details.customerName,
          customerPhone: details.customerPhone,
          paymentMethod: details.paymentMethod,
          total: details.total,
          items: cart.map(item => ({
            dishId: item.dish.id,
            name: language === 'en' && item.dish.nameEn ? item.dish.nameEn : item.dish.name,
            price: item.dish.price,
            quantity: item.quantity
          }))
        })
      });

      if (response.ok) {
        const createdOrder: Order = await response.json();
        
        // Save order ID locally so client can track progress on the progress tab
        const updatedOrderIds = [...myOrderIds, createdOrder.id];
        setMyOrderIds(updatedOrderIds);
        localStorage.setItem('s_con_proposito_my_orders', JSON.stringify(updatedOrderIds));

        // Clear cart and triggers
        setCart([]);
        setIsCartOpen(false);
        setPaymentDetails(null);
        
        // Fetch fresh dishes menu to update stock levels in UI instantly
        fetchDishes();
        
        // Jump to progress screen
        setActiveTab('comandas');
        
        // Push notification chimes
        playChime('success');
        addNotification(
          language === 'en' ? "Order Placed!" : "¡Pedido Recibido!", 
          language === 'en'
            ? `Your order ${createdOrder.id} is queued at Table #${createdOrder.tableNumber}.`
            : `Tu orden ${createdOrder.id} está en cola de cocina de la Mesa #${createdOrder.tableNumber}.`, 
          "success"
        );
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.error || (language === 'en' ? "Could not register the order. Please try again." : "No se pudo registrar el pedido. Intente nuevamente."));
      }
    } catch (e) {
      console.error("Failed to submit order:", e);
    }
  };

  // Kitchen dashboard: update order status
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchOrders();
        fetchDishes(); // Sync stock in Admin and menu instantly
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  // Cashier dashboard: update payment status
  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: 'pendiente' | 'pagado') => {
    try {
      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus })
      });
      if (response.ok) {
        const updatedOrder = await response.json();
        
        // Safety verification: verify order exists, status is received/preparing/ready, and items array exists and is populated
        const isApproved = updatedOrder && (updatedOrder.status === 'recibido' || updatedOrder.status === 'preparando' || updatedOrder.status === 'listo');
        const hasItems = updatedOrder && updatedOrder.items && updatedOrder.items.length > 0;

        if (isApproved && hasItems) {
          fetchOrders();
          playChime('success');
          addNotification(
            language === 'en' ? "Payment Confirmed!" : "¡Pago Confirmado!", 
            language === 'en'
              ? `Order ${orderId} has been marked as paid and sent to the kitchen.`
              : `El pedido ${orderId} fue marcado como pagado y pasó a la cocina.`, 
            "success"
          );
        } else {
          console.warn("⚠️ Warning: Order status not approved or items missing:", updatedOrder);
          playChime('error');
          addNotification(
            language === 'en' ? "Kitchen Error" : "Error de Envío",
            language === 'en'
              ? "No se pudo enviar el pedido a cocina. Intente nuevamente."
              : "No se pudo enviar el pedido a cocina. Intente nuevamente.",
            "error"
          );
        }
      } else {
        playChime('error');
        addNotification(
          language === 'en' ? "Error" : "Error de Conexión",
          language === 'en'
            ? "No se pudo enviar el pedido a cocina. Intente nuevamente."
            : "No se pudo enviar el pedido a cocina. Intente nuevamente.",
          "error"
        );
      }
    } catch (e) {
      console.error("Failed to update payment status:", e);
      playChime('error');
      addNotification(
        language === 'en' ? "Error" : "Error de Conexión",
        language === 'en'
          ? "No se pudo enviar el pedido a cocina. Intente nuevamente."
          : "No se pudo enviar el pedido a cocina. Intente nuevamente.",
        "error"
      );
    }
  };

  // Kitchen dashboard: clear history
  const handleClearHistory = async (passwordConfirm: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/orders/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: passwordConfirm })
      });
      if (response.ok) {
        setOrders([]);
        prevOrdersRef.current = [];
        addNotification(
          language === 'en' ? "History Reset" : "Historial Reiniciado", 
          language === 'en' ? "All active kitchen orders have been cleared." : "Todas las comandas han sido limpiadas de la cola.", 
          "info"
        );
        return true;
      } else {
        const err = await response.json();
        throw new Error(err.error || "Contraseña incorrecta o sesión inválida.");
      }
    } catch (e: any) {
      console.error(e);
      throw new Error(e.message || "Error de conexión al reiniciar el historial.");
    }
  };

  // Kitchen dashboard: delete individual order
  const handleDeleteOrder = async (orderId: string, passwordConfirm: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: passwordConfirm })
      });
      if (response.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        addNotification(
          language === 'en' ? "Order Deleted" : "Pedido Eliminado",
          language === 'en' 
            ? `Order ${orderId} was successfully removed.`
            : `El pedido ${orderId} fue eliminado exitosamente de la cola.`,
          "info"
        );
        return true;
      } else {
        const err = await response.json();
        throw new Error(err.error || "Contraseña incorrecta o sesión inválida.");
      }
    } catch (e: any) {
      console.error("Failed to delete order:", e);
      throw new Error(e.message || "Error de conexión al eliminar el pedido.");
    }
  };

  // Save exchange rate via config endpoint
  const handleUpdateExchangeRateOnServer = async (newRate: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchangeRate: newRate })
      });
      if (res.ok) {
        setExchangeRate(newRate);
        return true;
      }
    } catch (e) {
      console.error("Failed to post exchange rate:", e);
    }
    return false;
  };

  // Client Chat proxy to Gemini
  const handleChatWithGemini = async (text: string, history: ChatMessage[], useHighThinking: boolean): Promise<string> => {
    try {
      const cartContext = cart.map(item => ({
        name: item.dish.name,
        quantity: item.quantity,
        price: item.dish.price,
        notes: item.notes || ""
      }));

      const activeOrdersContext = orders
        .filter(o => myOrderIds.includes(o.id))
        .map(o => ({
          id: o.id,
          tableNumber: o.tableNumber,
          customerName: o.customerName,
          total: o.total,
          status: o.status,
          paymentStatus: o.paymentStatus,
          createdAt: o.createdAt
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: history, 
          useHighThinking,
          cart: cartContext,
          tableNumber: tableNumber || null,
          activeOrders: activeOrdersContext,
          language
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data.reply;
      }
      return language === 'en' 
        ? "There was a connection issue. Please try again."
        : "Hubo un problema de conexión con Ángel del Sabor. Inténtalo de nuevo.";
    } catch (e) {
      return language === 'en'
        ? "Could not connect to the AI. Please check your internet connection."
        : "No pude contactar a la Inteligencia Artificial. Por favor revisa la conexión.";
    }
  };

  // Derived client-placed orders
  const myActiveOrders = orders.filter(o => myOrderIds.includes(o.id));
  const cartTotal = cart.reduce((acc, item) => acc + item.dish.price * item.quantity, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="flex flex-col font-sans text-white relative min-h-screen antialiased">
      <div className="mesh-bg" id="app-mesh-bg"></div>

      {/* Visual Top Bar / Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0f172a]/40 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 lg:py-4 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 lg:gap-4">
          
          {/* Row 1: Logo & Switchers */}
          <div className="flex flex-row justify-between items-center gap-3 shrink-0">
            {/* Logo & Church name */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-amber-400 p-2 rounded-xl sm:rounded-2xl text-black shadow-md shadow-amber-400/20 animate-pulse-subtle">
                <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base sm:text-xl font-light tracking-tight leading-tight text-white">
                  Buffet <span className="serif text-amber-400 font-normal">Casa de Dios</span>
                </h1>
                <span className="text-[9px] sm:text-[10px] text-white/60 font-semibold uppercase tracking-widest font-mono">
                  {t.appSubtitle}
                </span>
              </div>
            </div>

            {/* Localization & Currency Panel */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Language switch pill */}
              <div className="flex bg-white/5 border border-white/10 p-0.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold font-display uppercase tracking-wide">
                <button
                  onClick={() => setLanguage('es')}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    language === 'es' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>ES</span>
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    language === 'en' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>EN</span>
                </button>
              </div>

              {/* Currency switcher */}
              <div className="flex bg-white/5 border border-white/10 p-0.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold font-mono tracking-wide">
                <button
                  onClick={() => setCurrency('ARS')}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer ${
                    currency === 'ARS' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                  title="Pesos Argentinos"
                >
                  <span>ARS</span>
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer ${
                    currency === 'USD' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                  title="Dólares Estadounidenses"
                >
                  <span>USD</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Table indicator & Navigation */}
          <div className="flex flex-col sm:flex-row justify-between lg:justify-end items-stretch sm:items-center gap-3">
            {/* Locked table indicator */}
            {isTableLinkedViaQR ? (
              <div className="glass-card px-3 py-1 sm:px-4 sm:py-1.5 flex items-center justify-between sm:justify-start gap-3 text-white">
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[8px] sm:text-[9px] uppercase opacity-60">{language === 'en' ? 'Your Table' : 'Tu Mesa'}</span>
                  <span className="font-bold text-xs font-mono text-amber-400">
                    {language === 'en' ? 'TABLE' : 'MESA'} {tableNumber}
                  </span>
                </div>
                <div className="h-6 w-[1px] bg-white/20"></div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] sm:text-[9px] uppercase opacity-60">Status</span>
                  <span className="text-emerald-400 text-xs flex items-center">
                    <span className="status-pulse"></span>{language === 'en' ? 'Linked' : 'Conectado'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="glass-card px-3 py-1 sm:px-4 sm:py-1.5 flex items-center justify-between sm:justify-start gap-3 text-white">
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[8px] sm:text-[9px] uppercase opacity-60">{language === 'en' ? 'Table' : 'Mesa'}</span>
                  <span className="font-bold text-xs text-amber-400">
                    {language === 'en' ? 'Not Linked' : 'No Vinculada'}
                  </span>
                </div>
                <div className="h-6 w-[1px] bg-white/20"></div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] sm:text-[9px] uppercase opacity-60">QR Mode</span>
                  <span className="text-white/80 text-xs font-semibold">
                    {language === 'en' ? 'Mobile Buffet' : 'Buffet Móvil'}
                  </span>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <nav className="flex items-center gap-1 glass-card p-0.5 sm:p-1 border-white/15 overflow-x-auto max-w-full scrollbar-none snap-x whitespace-nowrap">
              <button
                onClick={() => setActiveTab('menu')}
                id="tab-btn-menu"
                className={`px-2 sm:px-3.5 py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 snap-center ${
                  activeTab === 'menu' ? 'bg-amber-400 text-black shadow-md' : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                {t.navMenu}
              </button>
              <button
                onClick={() => setActiveTab('comandas')}
                id="tab-btn-comandas"
                className={`px-2 sm:px-3.5 py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 relative shrink-0 snap-center ${
                  activeTab === 'comandas' ? 'bg-amber-400 text-black shadow-md' : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{t.navMyOrders}</span>
                {myActiveOrders.length > 0 && (
                  <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-rose-500 text-white rounded-full text-[8px] sm:text-[9px] flex items-center justify-center font-bold absolute -top-1 -right-1">
                    {myActiveOrders.filter(o => o.status !== 'entregado').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('cocina')}
                id="tab-btn-cocina"
                className={`px-2 sm:px-3.5 py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0 snap-center ${
                  activeTab === 'cocina' ? 'bg-amber-400 text-black shadow-md' : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <ChefHat className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{t.navKitchen}</span>
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                id="tab-btn-admin"
                className={`px-2 sm:px-3.5 py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0 snap-center ${
                  activeTab === 'admin' ? 'bg-amber-400 text-black shadow-md' : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{t.navAdmin}</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Workspace Stage */}
      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-grow">
        
        {/* Animated active view block */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            {/* 1. MENU VIEW */}
            {activeTab === 'menu' && (
              <div className="flex flex-col gap-6">
                {/* Hero / Motivation Message */}
                <div className="glass-card-heavy p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col gap-3">
                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>
                  
                  <div className="flex items-center gap-2 text-amber-400 z-10">
                    <Sparkles className="w-5 h-5 animate-pulse-subtle" />
                    <span className="text-xs font-bold uppercase tracking-widest font-display">{t.heroBadge}</span>
                  </div>
                  
                  <h2 className="text-2xl md:text-4xl font-display font-bold tracking-tight max-w-xl leading-tight z-10 text-white">
                    {t.heroTitleFirst}<span className="serif text-amber-400 font-normal">{t.heroTitleSecond}</span>
                  </h2>
                  <p className="text-xs md:text-sm text-white/80 max-w-2xl leading-relaxed z-10">
                    {t.heroDescription}
                  </p>
                  
                  <div className="flex gap-4 items-center mt-3 pt-4 border-t border-white/10 z-10">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider font-display">{t.heroTaglineSabor}</span>
                      <span className="text-xs font-semibold text-amber-400">{t.heroTaglineSaborVal}</span>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider font-display">{t.heroTaglineVinculo}</span>
                      <span className="text-xs font-semibold text-amber-400 font-mono">{t.heroTaglineVinculoVal}</span>
                    </div>
                  </div>
                </div>

                <DishesList 
                  dishes={dishes} 
                  onAdd={(dish) => handleAddToCart(dish)} 
                  onSelectDish={(dish) => setSelectedDish(dish)}
                />
              </div>
            )}

            {/* 2. ORDER PROGRESS VIEWER */}
            {activeTab === 'comandas' && (
              <div className="flex flex-col gap-6 max-w-2xl mx-auto">
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-2xl font-bold font-display text-white">{t.ordersTitle}</h2>
                  <p className="text-xs text-white/60">{t.ordersSubtitle}</p>
                </div>

                {myActiveOrders.length > 0 ? (
                  <div className="flex flex-col gap-5">
                    {myActiveOrders.map((order) => (
                      <div key={order.id} className="glass-card p-6 shadow-md flex flex-col gap-5">
                        
                        {/* Summary Header */}
                        <div className="flex justify-between items-start pb-4 border-b border-white/10">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">{t.ordersTicket}</span>
                            <span className="text-base font-extrabold text-amber-400 font-mono">{order.id}</span>
                          </div>
                          
                          <div className="bg-white/10 text-white px-3 py-1.5 rounded-xl text-center border border-white/10">
                            <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400 font-display block">
                              {language === 'en' ? 'Table' : 'Mesa'}
                            </span>
                            <span className="text-base font-black font-mono leading-none">{order.tableNumber}</span>
                          </div>
                        </div>

                        {/* Order items lists */}
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">
                            {language === 'en' ? 'Requested dishes' : 'Platos solicitados'}
                          </span>
                          <div className="flex flex-col gap-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-white/90">
                                <span className="font-semibold">{item.quantity}x {item.name}</span>
                                <span className="font-mono text-white/60">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold text-white border-t border-white/10 pt-2 mt-1">
                              <span>{t.ordersTotalPaid}</span>
                              <span className="font-mono text-amber-400">{formatPrice(order.total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Stepper */}
                        <div className="flex flex-col gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-white/60">{t.ordersProgresso}</span>
                            <span className="font-bold text-amber-400 font-mono animate-pulse-subtle">
                              {order.status === 'recibido' ? t.ordersReceived :
                               order.status === 'preparando' ? t.ordersPreparing :
                               order.status === 'listo' ? t.ordersReady : t.ordersDelivered}
                            </span>
                          </div>

                          {/* Stepper Graphic */}
                          <div className="flex justify-between items-center relative mt-2 px-6">
                            {/* Horizontal Line */}
                            <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 h-0.5 bg-white/10"></div>
                            
                            {/* Line progress */}
                            <div className="absolute left-12 top-1/2 -translate-y-1/2 h-0.5 bg-amber-400 transition-all duration-500" style={{
                              width: order.status === 'recibido' ? '0%' :
                                     order.status === 'preparando' ? '50%' : '100%'
                            }}></div>

                            {/* Stepper Points */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs z-10 transition-colors ${
                              ['recibido', 'preparando', 'listo', 'entregado'].includes(order.status)
                                ? 'bg-amber-400 border-amber-400 text-black'
                                : 'bg-[#0f172a]/60 border-white/10 text-white/40'
                            }`}>
                              {['preparando', 'listo', 'entregado'].includes(order.status) ? <Check className="w-3.5 h-3.5" /> : '1'}
                            </div>

                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs z-10 transition-colors ${
                              ['preparando', 'listo', 'entregado'].includes(order.status)
                                ? 'bg-amber-400 border-amber-400 text-black'
                                : 'bg-[#0f172a]/60 border-white/10 text-white/40'
                            }`}>
                              {['listo', 'entregado'].includes(order.status) ? <Check className="w-3.5 h-3.5" /> : '2'}
                            </div>

                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs z-10 transition-colors ${
                              order.status === 'listo' ? 'bg-emerald-500 border-emerald-500 text-white animate-bounce' :
                              order.status === 'entregado' ? 'bg-amber-400 border-amber-400 text-black' :
                              'bg-[#0f172a]/60 border-white/10 text-white/40'
                            }`}>
                              {order.status === 'entregado' ? <Check className="w-3.5 h-3.5" /> : '3'}
                            </div>
                          </div>

                          <div className="flex justify-between text-[10px] text-white/40 font-bold uppercase px-2 font-display">
                            <span>{language === 'en' ? 'Queued' : 'Recibido'}</span>
                            <span>{language === 'en' ? 'In Kitchen' : 'En Cocina'}</span>
                            <span>{language === 'en' ? 'Ready' : 'Listo barra'}</span>
                          </div>
                        </div>

                        {/* Call-to-action details for client pickup */}
                        {order.status === 'listo' && (
                          <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-4 text-center flex flex-col items-center gap-2 text-white animate-pulse-subtle">
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                            <h4 className="font-bold font-display text-sm text-white">{t.ordersPickupAlertTitle}</h4>
                            <p className="text-xs text-white/90 leading-normal">
                              {language === 'en' 
                                ? `Please come to the buffet counter of the Casa de Dios hall, mention table ${order.tableNumber} and retrieve your warm dishes to enjoy.`
                                : `Por favor, acérquese a la barra de buffet del salón de la Iglesia Casa de Dios, mencione su número de mesa ${order.tableNumber} y retire sus platos calientes para disfrutar.`}
                            </p>
                            <span className="text-[10px] bg-emerald-600 text-white font-mono px-3 py-1 rounded-full uppercase font-bold mt-1">
                              {t.ordersPickupAlertBadge} {order.id}
                            </span>
                          </div>
                        )}
                        
                        {order.paymentStatus === 'pendiente' && (
                          <div className="bg-amber-400/10 border border-amber-400/30 text-white p-3.5 rounded-2xl flex flex-col gap-2 text-xs leading-normal">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-400" />
                              <strong className="text-amber-400 text-sm font-display">
                                {language === 'en' ? 'Pending Payment Approval' : 'Pago Pendiente de Confirmación'}
                              </strong>
                            </div>
                            <p className="text-white/80">
                              {order.paymentMethod === 'transferencia' ? (
                                language === 'en'
                                  ? `Please transfer the total of ${formatPrice(order.total)} to the bank alias casadedios24, and then confirm your payment with the cashier using your order code ${order.id}.`
                                  : `Por favor realiza la transferencia por el total de ${formatPrice(order.total)} al alias bancario casadedios24, y luego confirma tu pago con la cajera indicando tu código de pedido: ${order.id}.`
                              ) : (
                                language === 'en'
                                  ? `Please head to the cashier counter, provide your order code ${order.id}, and pay ${formatPrice(order.total)} (Cash, QR, or Card) to approve and send your order to the kitchen.`
                                  : `Por favor acércate a la caja del buffet, indica tu código de pedido: ${order.id}, y abona un total de ${formatPrice(order.total)} (Efectivo, QR o Tarjeta) para que el cocinero pueda preparar tu pedido.`
                              )}
                            </p>
                            <div className="bg-black/30 p-2 rounded-xl text-[10px] font-mono text-center text-amber-400 border border-amber-400/10">
                              {language === 'en' ? 'Code:' : 'Código de Pedido:'} <span className="font-extrabold text-white text-xs">{order.id}</span>
                            </div>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 glass-card p-8 flex flex-col items-center gap-3">
                    <Clock className="w-12 h-12 text-white/20" />
                    <h3 className="text-lg font-semibold text-white font-display">{t.ordersEmpty}</h3>
                    <p className="text-xs text-white/60 max-w-sm leading-relaxed">
                      {t.ordersEmptyDesc}
                    </p>
                    <button
                      onClick={() => setActiveTab('menu')}
                      className="mt-2 btn-gold px-5 py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                    >
                      {t.ordersEmptyBtn}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. KITCHEN MANAGEMENT BOARD */}
            {activeTab === 'cocina' && (
              <KitchenDashboard 
                orders={orders}
                onUpdateStatus={handleUpdateOrderStatus}
                onClearHistory={handleClearHistory}
                onRefresh={async () => { await fetchOrders(); }}
                onDeleteOrder={handleDeleteOrder}
              />
            )}

            {/* 5. ADMIN CONTROL PANEL (Requested to manage rate, edit name/description/images) */}
            {activeTab === 'admin' && (
              <AdminDashboard
                dishes={dishes}
                onRefreshDishes={fetchDishes}
                exchangeRate={exchangeRate}
                onUpdateExchangeRate={handleUpdateExchangeRateOnServer}
                orders={orders}
                onUpdatePaymentStatus={handleUpdatePaymentStatus}
                onRefreshOrders={fetchOrders}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Shopping Cart Trigger on Menu tab */}
      {activeTab === 'menu' && cartCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          id="floating-cart-trigger"
          className="fixed bottom-5 left-5 z-40 btn-gold px-5 py-3.5 rounded-full shadow-2xl transition-all hover:scale-105 flex items-center gap-2.5 cursor-pointer animate-scale-up"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="font-extrabold text-xs font-mono bg-black text-amber-400 px-2 py-0.5 rounded-full">
            {cartCount}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider pr-1">
            {language === 'en' ? 'View My Order' : 'Ver Mi Pedido'} ({formatPrice(cartTotal)})
          </span>
        </button>
      )}

      {/* Popups & Drawers portals */}

      {/* A. CART DETAIL DRAWER */}
      {isCartOpen && (
        <CartDrawer
          cartItems={cart}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
          onCheckout={handleCheckoutInit}
          onClose={() => setIsCartOpen(false)}
          initialTableNumber={tableNumber}
        />
      )}

      {/* B. SINGLE DISH DETAILED MODAL */}
      {selectedDish && (
        <DishDetailModal
          dish={selectedDish}
          onClose={() => setSelectedDish(null)}
          onAdd={(dish, qty) => handleAddToCart(dish, qty)}
        />
      )}

      {/* C. PAYMENT GATEWAY SIMULATION */}
      {paymentDetails && (
        <PaymentModal
          total={paymentDetails.total}
          paymentMethod={paymentDetails.paymentMethod === 'pago_movil' ? 'pago_movil' : 'simulado_tarjeta'}
          customerName={paymentDetails.customerName}
          onCancel={() => setPaymentDetails(null)}
          onSuccess={() => {
            submitOrderToBackend(paymentDetails);
          }}
        />
      )}

      {/* D. FLOATING GEMINI BOT CHAT */}
      <GeminiAssistant onSendMessage={handleChatWithGemini} />

      {/* E. FULL IMAGE PREVIEW LIGHTBOX */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
          id="image-lightbox-modal"
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all cursor-pointer border border-white/10 z-50 flex items-center justify-center"
              title={language === 'en' ? 'Close' : 'Cerrar'}
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Full screen preview"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NotificationProvider>
        <MainAppContent />
      </NotificationProvider>
    </AppProvider>
  );
}
