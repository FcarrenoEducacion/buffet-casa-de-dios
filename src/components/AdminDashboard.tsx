import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Dish, Order, OrderStatus } from '../types';
import { TableQRGenerator } from './TableQRGenerator';
import { 
  Lock, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  X, 
  Sparkles, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  DollarSign, 
  RefreshCw, 
  Globe,
  AlertTriangle,
  Search,
  Receipt,
  Coins,
  QrCode,
  Landmark,
  Check,
  CheckSquare,
  CreditCard,
  Copy,
  Clock,
  FileText,
  Calendar,
  Printer,
  TrendingUp,
  Database,
  Server
} from 'lucide-react';

interface AdminDashboardProps {
  dishes: Dish[];
  onRefreshDishes: () => void;
  exchangeRate: number;
  onUpdateExchangeRate: (rate: number) => Promise<boolean>;
  orders?: Order[];
  onUpdatePaymentStatus?: (orderId: string, paymentStatus: 'pendiente' | 'pagado') => void;
  onRefreshOrders?: () => void;
}

const PRESET_IMAGES = [
  { label: "☕ Café con Leche", url: "https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?w=600&auto=format&fit=crop&q=80" },
  { label: "🍔 Hamburguesa", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80" },
  { label: "🍕 Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80" },
  { label: "🥗 Ensalada", url: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&auto=format&fit=crop&q=80" },
  { label: "🥤 Gaseosa / Coca", url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80" },
  { label: "💧 Agua Mineral", url: "https://images.unsplash.com/photo-1608885898957-a599fb1b1494?w=600&auto=format&fit=crop&q=80" },
  { label: "🥟 Empanadas", url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80" },
  { label: "🍪 Galletitas / Oreo", url: "https://images.unsplash.com/photo-1558961309-dbdf717d13d7?w=600&auto=format&fit=crop&q=80" }
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  dishes, 
  onRefreshDishes, 
  exchangeRate, 
  onUpdateExchangeRate,
  orders = [],
  onUpdatePaymentStatus,
  onRefreshOrders
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // --- CAJA & ARQUEO STATES ---
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState<boolean>(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState<boolean>(false);
  const [isAddManualOrderOpen, setIsAddManualOrderOpen] = useState<boolean>(false);
  const [sessionReport, setSessionReport] = useState<any>(null);
  const [isViewReportOpen, setIsViewReportOpen] = useState<boolean>(false);
  const [selectedPayOrder, setSelectedPayOrder] = useState<any>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [dismissingOrderId, setDismissingOrderId] = useState<string | null>(null);

  // Manual Order Form States
  const [manualCustomer, setManualCustomer] = useState<string>('');
  const [manualPhone, setManualPhone] = useState<string>('');
  const [manualTable, setManualTable] = useState<string>('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'efectivo' | 'transferencia' | 'qr' | 'tarjeta'>('efectivo');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [manualCart, setManualCart] = useState<{ dishId: string; name: string; price: number; quantity: number; notes?: string }[]>([]);

  // Apertura Form States
  const [openingResponsible, setOpeningResponsible] = useState<string>('Rita');
  const [openingAmount, setOpeningAmount] = useState<string>('2500');
  const [openingNote, setOpeningNote] = useState<string>('Cambio dejado del día anterior');

  // Cierre Form States
  const [closingResponsible, setClosingResponsible] = useState<string>('Rita');
  const [countedCash, setCountedCash] = useState<string>('');
  const [totalTransferInformed, setTotalTransferInformed] = useState<string>('');
  const [totalQrInformed, setTotalQrInformed] = useState<string>('');
  const [totalCardInformed, setTotalCardInformed] = useState<string>('');
  const [closingNote, setClosingNote] = useState<string>('');
  const [showDifferencesWarning, setShowDifferencesWarning] = useState<boolean>(false);
  const [differencesDetails, setDifferencesDetails] = useState<any>(null);

  // Tab state for the admin section
  const [adminTab, setAdminTab] = useState<'caja' | 'menu' | 'qr' | 'supabase'>('caja');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'todos' | 'pendiente' | 'pagado'>('pendiente');

  // UI state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [dishToDelete, setDishToDelete] = useState<{ id: string; name: string } | null>(null);
  const [rateInput, setRateInput] = useState<string>(String(exchangeRate));
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [checkingSupabase, setCheckingSupabase] = useState<boolean>(false);

  const fetchSupabaseStatus = async (recheck = false) => {
    setCheckingSupabase(true);
    try {
      const response = await fetch(`/api/supabase-status${recheck ? '?recheck=true' : ''}`);
      if (response.ok) {
        const data = await response.json();
        setSupabaseStatus(data);
      }
    } catch (err) {
      console.error("Error fetching Supabase status:", err);
    } finally {
      setCheckingSupabase(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type on client
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      alert("Formato de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WEBP, GIF).");
      return;
    }

    // Validate size on client (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen es demasiado grande. El límite es de 5MB.");
      return;
    }

    setUploadingImage(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        try {
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file: base64String,
              fileName: file.name,
              fileType: file.type,
              adminPassword: password
            })
          });

          const data = await response.json();
          if (response.ok && data.success) {
            setImage(data.url);
          } else {
            console.error(`Error de subida del servidor:`, data.error);
            alert("No se pudo subir la imagen. Intente nuevamente.");
          }
        } catch (err) {
          console.error(`Error de red al subir imagen:`, err);
          alert("No se pudo subir la imagen. Intente nuevamente.");
        } finally {
          setUploadingImage(false);
        }
      };

      reader.onerror = () => {
        alert("Fallo al leer el archivo local.");
        setUploadingImage(false);
      };

      reader.readAsDataURL(file);

    } catch (err) {
      console.error(err);
      alert("No se pudo subir la imagen. Intente nuevamente.");
      setUploadingImage(false);
    }
  };

  // Form Fields
  const [name, setName] = useState<string>('');
  const [nameEn, setNameEn] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [descriptionEn, setDescriptionEn] = useState<string>('');
  const [price, setPrice] = useState<number>(1000);
  const [category, setCategory] = useState<string>('Platos Fuertes');
  const [image, setImage] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('Especial');
  const [purpose, setPurpose] = useState<string>('');
  const [purposeEn, setPurposeEn] = useState<string>('');
  const [available, setAvailable] = useState<boolean>(true);
  const [stock, setStock] = useState<number>(20);
  const [imageFit, setImageFit] = useState<'cover' | 'contain'>('cover');
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // AI Autocomplete and translation
  const handleAIGenerateAndTranslate = async () => {
    if (!name.trim()) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/process-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.description) setDescription(data.description);
        if (data.purpose) setPurpose(data.purpose);
        if (data.nameEn) setNameEn(data.nameEn);
        if (data.descriptionEn) setDescriptionEn(data.descriptionEn);
        if (data.purposeEn) setPurposeEn(data.purposeEn);
      } else {
        const err = await response.json();
        alert(`Error de IA: ${err.error || "No se pudo generar"}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error al conectarse con el Asistente IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAITranslateOnly = async () => {
    if (!name.trim() && !description.trim() && !purpose.trim()) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/process-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          description: description.trim(),
          purpose: purpose.trim()
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.nameEn) setNameEn(data.nameEn);
        if (data.descriptionEn) setDescriptionEn(data.descriptionEn);
        if (data.purposeEn) setPurposeEn(data.purposeEn);
      } else {
        const err = await response.json();
        alert(`Error de traducción: ${err.error || "No se pudo traducir"}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error al conectarse con el Asistente de traducción.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleFieldBlur = async (field: 'name' | 'description' | 'purpose', value: string) => {
    if (!value.trim()) return;
    
    // Determine if the English equivalent is already filled
    const englishEquivalent = field === 'name' ? nameEn : field === 'description' ? descriptionEn : purposeEn;
    if (englishEquivalent.trim()) return; // Don't overwrite if already filled

    try {
      const response = await fetch('/api/ai/process-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: field === 'name' ? value : name,
          category,
          description: field === 'description' ? value : description,
          purpose: field === 'purpose' ? value : purpose
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (field === 'name' && data.nameEn) setNameEn(data.nameEn);
        if (field === 'description' && data.descriptionEn) setDescriptionEn(data.descriptionEn);
        if (field === 'purpose' && data.purposeEn) setPurposeEn(data.purposeEn);
      }
    } catch (e) {
      console.error("Auto-translation on blur failed:", e);
    }
  };

  useEffect(() => {
    setRateInput(String(exchangeRate));
  }, [exchangeRate]);

  useEffect(() => {
    const adminSessionToken = sessionStorage.getItem('sabores_admin_session_token');
    if (adminSessionToken === 'sabores-pos-admin-session-active-token') {
      setIsAuthenticated(true);
      setPassword('sabores-pos-admin-session-active-token');
    }
  }, []);

  const fetchCurrentSession = async () => {
    setIsLoadingSession(true);
    try {
      const res = await fetch('/api/cash-session/current');
      if (res.ok) {
        const data = await res.json();
        setCurrentSession(data.session);
      }
    } catch (err) {
      console.error("Error fetching current session:", err);
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentSession();
      fetchSupabaseStatus();
    }
  }, [isAuthenticated]);

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingResponsible.trim()) {
      alert("Por favor ingrese el nombre de la cajera responsable.");
      return;
    }
    try {
      const res = await fetch('/api/cash-session/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openedBy: openingResponsible.trim(),
          openingAmount: Number(openingAmount) || 0,
          openingNote: openingNote.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentSession(data.session);
        setIsOpeningModalOpen(false);
        alert("¡Caja abierta exitosamente!");
      } else {
        alert(data.error || "Fallo al abrir caja.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al abrir caja.");
    }
  };

  const handleCloseSession = async (e?: React.FormEvent, forceClose: boolean = false) => {
    if (e) e.preventDefault();
    if (!closingResponsible.trim()) {
      alert("Por favor ingrese el nombre del responsable del cierre.");
      return;
    }

    const expected_cash = currentSession?.expectedCash || 0;
    const expected_transfer = currentSession?.totalTransfer || 0;
    const expected_qr = currentSession?.totalQr || 0;
    const expected_card = currentSession?.totalCard || 0;

    const counted_cash = Number(countedCash) || 0;
    const dec_transfer = Number(totalTransferInformed) || 0;
    const dec_qr = Number(totalQrInformed) || 0;
    const dec_card = Number(totalCardInformed) || 0;

    const difference_cash = counted_cash - expected_cash;
    const difference_transfer = dec_transfer - expected_transfer;
    const difference_qr = dec_qr - expected_qr;
    const difference_card = dec_card - expected_card;

    const hasDiffs = difference_cash !== 0 || difference_transfer !== 0 || difference_qr !== 0 || difference_card !== 0;

    if (hasDiffs && !forceClose) {
      setDifferencesDetails({
        cash: { expected: expected_cash, declared: counted_cash, diff: difference_cash },
        transfer: { expected: expected_transfer, declared: dec_transfer, diff: difference_transfer },
        qr: { expected: expected_qr, declared: dec_qr, diff: difference_qr },
        card: { expected: expected_card, declared: dec_card, diff: difference_card }
      });
      setShowDifferencesWarning(true);
      return;
    }

    if (hasDiffs && !closingNote.trim()) {
      alert("Para cerrar la caja con diferencias, es obligatorio ingresar una observación justificando los motivos.");
      return;
    }

    try {
      const res = await fetch('/api/cash-session/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closedBy: closingResponsible.trim(),
          countedCash: counted_cash,
          totalTransfer: dec_transfer,
          totalQr: dec_qr,
          totalCard: dec_card,
          closingNote: closingNote.trim(),
          closingResult: hasDiffs ? 'with_differences' : 'perfect'
        })
      });
      const data = await res.json();
      if (res.ok) {
        const closedSess = data.session;
        // Fetch full report immediately to show summary modal
        const repRes = await fetch(`/api/cash-session/${closedSess.id}/report`);
        if (repRes.ok) {
          const repData = await repRes.json();
          setSessionReport(repData);
          setIsViewReportOpen(true);
        }
        setCurrentSession(null);
        setIsClosingModalOpen(false);
        setShowDifferencesWarning(false);
        setDifferencesDetails(null);
        // Reset closure inputs
        setCountedCash('');
        setTotalTransferInformed('');
        setTotalQrInformed('');
        setTotalCardInformed('');
        setClosingNote('');
        alert("¡Caja cerrada exitosamente!");
      } else {
        alert(data.error || "Fallo al cerrar caja.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al cerrar caja.");
    }
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCustomer.trim()) {
      alert("Por favor ingrese el nombre del cliente.");
      return;
    }
    if (manualCart.length === 0) {
      alert("Debe agregar al menos un plato al pedido.");
      return;
    }

    const total = manualCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
      const res = await fetch('/api/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: manualCustomer.trim(),
          customerPhone: manualPhone.trim(),
          tableNumber: manualTable.trim() || 'Mostrador',
          paymentMethod: manualPaymentMethod,
          notes: manualNotes.trim(),
          items: manualCart,
          total
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`¡Pedido manual ${data.id} creado con éxito y enviado a cocina!`);
        // Refresh session to reflect new sales on UI
        fetchCurrentSession();
        // Clear form
        setManualCustomer('');
        setManualPhone('');
        setManualTable('');
        setManualNotes('');
        setManualCart([]);
        setIsAddManualOrderOpen(false);
        // Refresh parent dishes in case stock changed
        onRefreshDishes();
        // Refresh parent orders
        if (onRefreshOrders) {
          onRefreshOrders();
        }
      } else {
        alert(data.error || "Fallo al crear pedido manual.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al crear pedido manual.");
    }
  };

  const handlePayOrder = async (orderId: string, method: string) => {
    if (payingOrderId) return;

    setPayingOrderId(orderId);
    try {
      // Refrescamos la caja antes de cobrar, porque en Vercel el estado puede quedar viejo en el navegador.
      let activeSession = currentSession;
      try {
        const sessionRes = await fetch('/api/cash-session/current');
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          activeSession = sessionData.session || sessionData;
          if (activeSession?.id) setCurrentSession(activeSession);
        }
      } catch (sessionErr) {
        console.warn('No se pudo refrescar la caja antes de cobrar:', sessionErr);
      }

      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: method,
          cashierName: activeSession?.openedBy || currentSession?.openedBy || 'Rita',
          cashSessionId: activeSession?.id || currentSession?.id || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (data?.alreadyPaid) {
          alert(`El pedido ${orderId} ya estaba cobrado. No se duplicó la venta.`);
        } else {
          alert(`¡Pedido ${orderId} cobrado exitosamente con ${method}!`);
        }

        fetchCurrentSession();
        setSelectedPayOrder(null);
        if (onUpdatePaymentStatus) {
          onUpdatePaymentStatus(orderId, 'pagado');
        }
        if (onRefreshOrders) {
          onRefreshOrders();
        }
      } else {
        alert(data.error || "Fallo al registrar pago.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al cobrar pedido.");
    } finally {
      setPayingOrderId(null);
    }
  };

  const handleDismissOrder = async (order: any) => {
    if (dismissingOrderId) return;

    const adminPassword = window.prompt(`Ingrese la clave administrativa para desestimar el pedido ${order.id}:`);
    if (!adminPassword) return;

    const reason = window.prompt('Motivo de desestimación del pedido:', 'Cliente desistió / pedido cargado por error') || '';

    setDismissingOrderId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword,
          reason,
          dismissedBy: currentSession?.openedBy || 'Rita'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Pedido ${order.id} desestimado correctamente.`);
        if (onRefreshOrders) onRefreshOrders();
        fetchCurrentSession();
      } else {
        alert(data.error || 'No se pudo desestimar el pedido.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al desestimar pedido.');
    } finally {
      setDismissingOrderId(null);
    }
  };

  const handleViewSessionReport = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/cash-session/${sessionId}/report`);
      if (res.ok) {
        const data = await res.json();
        setSessionReport(data);
        setIsViewReportOpen(true);
      } else {
        alert("No se pudo obtener el informe de caja.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al obtener el informe.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setLoginError('Por favor ingrese usuario y contraseña.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('sabores_admin_session_token', data.token);
        setPassword(data.token);
        setLoginError('');
        // Fetch session upon successful authentication
        fetchCurrentSession();
      } else {
        setLoginError(data.error || 'Usuario o contraseña incorrectos');
      }
    } catch (err) {
      console.error('Error during admin login:', err);
      setLoginError('Error de conexión con el servidor.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sabores_admin_session_token');
    setIsAuthenticated(false);
    setPassword('');
    setUsername('');
    setCurrentSession(null);
  };

  const openAddModal = () => {
    setEditingDish(null);
    setName('');
    setNameEn('');
    setDescription('');
    setDescriptionEn('');
    setPrice(1000);
    setCategory('Platos Fuertes');
    setImage(PRESET_IMAGES[0].url);
    setTagsInput('Recomendado');
    setPurpose('La ofrenda de este plato apoya a los comedores sociales de la Iglesia.');
    setPurposeEn('The offering for this dish supports the social soup kitchens of the Church.');
    setAvailable(true);
    setStock(20);
    setImageFit('cover');
    setIsModalOpen(true);
  };

  const openEditModal = (dish: Dish) => {
    setEditingDish(dish);
    setName(dish.name);
    setNameEn(dish.nameEn || '');
    setDescription(dish.description);
    setDescriptionEn(dish.descriptionEn || '');
    setPrice(dish.price);
    setCategory(dish.category);
    setImage(dish.image);
    setTagsInput(dish.tags.join(', '));
    setPurpose(dish.purpose);
    setPurposeEn(dish.purposeEn || '');
    setAvailable(dish.available);
    setStock(dish.stock !== undefined ? dish.stock : 20);
    setImageFit(dish.imageFit || 'cover');
    setIsModalOpen(true);
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !price || !image.trim() || !purpose.trim() || stock === undefined || stock < 0) {
      alert("Por favor complete los campos obligatorios y asegúrese de que el stock sea un número válido mayor o igual a 0.");
      return;
    }

    setSubmitting(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    const dishData = {
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      description: description.trim(),
      descriptionEn: descriptionEn.trim() || undefined,
      price: Number(price),
      category,
      image: image.trim(),
      tags,
      purpose: purpose.trim(),
      purposeEn: purposeEn.trim() || undefined,
      available,
      stock: Number(stock),
      imageFit
    };

    try {
      let response;
      if (editingDish) {
        // Update
        response = await fetch(`/api/menu-items/${editingDish.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dishData)
        });
      } else {
        // Create
        response = await fetch('/api/menu-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dishData)
        });
      }

      if (response.ok) {
        setMessage({
          text: editingDish ? "Platillo actualizado con éxito" : "Platillo agregado con éxito",
          type: 'success'
        });
        setIsModalOpen(false);
        onRefreshDishes();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const err = await response.json();
        alert(`Error al guardar: ${err.error || "error desconocido"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Ocurrió un error al contactar al servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDish = (id: string, name: string) => {
    setDishToDelete({ id, name });
  };

  const confirmDeleteDish = async () => {
    if (!dishToDelete) return;
    const { id, name } = dishToDelete;
    setDishToDelete(null);

    try {
      const response = await fetch(`/api/menu-items/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setMessage({ text: "Producto eliminado exitosamente", type: 'success' });
        onRefreshDishes();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || "error desconocido";
        alert(`No se pudo eliminar el producto: ${errorMsg}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Ocurrió un error al intentar eliminar: ${e.message || e}`);
    }
  };

  const handleUpdateRate = async () => {
    const rateVal = Number(rateInput);
    if (!rateVal || rateVal <= 0) {
      alert("Por favor ingrese un tipo de cambio válido superior a 0.");
      return;
    }

    const success = await onUpdateExchangeRate(rateVal);
    if (success) {
      setMessage({ text: "Tipo de cambio actualizado exitosamente", type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      alert("No se pudo guardar la tasa de conversión.");
    }
  };

  const toggleAvailability = async (dish: Dish) => {
    try {
      const response = await fetch(`/api/menu-items/${dish.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dish, available: !dish.available })
      });
      if (response.ok) {
        onRefreshDishes();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`No se pudo actualizar la disponibilidad: ${errorData.error || "error desconocido"}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Ocurrió un error al actualizar disponibilidad: ${e.message || e}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12" id="admin-login-screen">
        <div className="glass-card p-8 flex flex-col gap-6 text-center text-white">
          <div className="mx-auto bg-amber-400 p-4 rounded-full text-black shadow-lg shadow-amber-400/20">
            <Lock className="w-8 h-8" />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold font-display">Sección Administrativa</h2>
            <p className="text-xs text-white/60">
              Inicie sesión para agregar nuevos platos, editar precios y ajustar la cotización del dólar.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">Usuario</label>
              <input
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white placeholder-white/20"
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">Contraseña</label>
              <input
                type="password"
                placeholder="Ingrese contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white placeholder-white/20"
                required
              />
            </div>

            {loginError && (
              <span className="text-xs text-rose-400 font-medium text-center">{loginError}</span>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full btn-gold py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Ingresando...</span>
                </>
              ) : (
                <span>Ingresar al Panel</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const getBillingReports = () => {
    const paidOrders = orders.filter(o => o.paymentStatus === 'pagado');

    const isToday = (dateStr?: string) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      const today = new Date();
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };

    const isThisWeek = (dateStr?: string) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - d.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    };

    const isThisMonth = (dateStr?: string) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      const today = new Date();
      return d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };

    const dailyOrders = paidOrders.filter(o => isToday(o.createdAt));
    const weeklyOrders = paidOrders.filter(o => isThisWeek(o.createdAt));
    const monthlyOrders = paidOrders.filter(o => isThisMonth(o.createdAt));

    const calculateTotals = (list: typeof orders) => {
      let cash = 0;
      let transfer = 0;
      let qr = 0;
      let card = 0;

      list.forEach(o => {
        const method = o.paymentMethod;
        if (method === 'efectivo_caja') {
          cash += o.total;
        } else if (method === 'transferencia' || method === 'pago_movil') {
          transfer += o.total;
        } else if (method === 'qr_caja') {
          qr += o.total;
        } else if (method === 'tarjeta_caja' || method === 'simulado_tarjeta') {
          card += o.total;
        } else {
          cash += o.total;
        }
      });

      return { cash, transfer, qr, card, total: cash + transfer + qr + card };
    };

    return {
      daily: {
        orders: dailyOrders,
        breakdown: calculateTotals(dailyOrders)
      },
      weekly: {
        orders: weeklyOrders,
        breakdown: calculateTotals(weeklyOrders)
      },
      monthly: {
        orders: monthlyOrders,
        breakdown: calculateTotals(monthlyOrders)
      }
    };
  };

  const getPeriodStats = (selectedPeriod: 'daily' | 'weekly' | 'monthly') => {
    const reports = getBillingReports();
    const periodData = selectedPeriod === 'daily' 
      ? reports.daily 
      : selectedPeriod === 'weekly' 
        ? reports.weekly 
        : reports.monthly;
        
    const periodOrders = periodData.orders;
    
    // Calculate stock consumed (item volumes)
    const stockConsumed: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    periodOrders.forEach(o => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const key = item.dishId || item.name;
          if (!stockConsumed[key]) {
            stockConsumed[key] = { name: item.name, quantity: 0, revenue: 0 };
          }
          stockConsumed[key].quantity += Number(item.quantity || 1);
          stockConsumed[key].revenue += Number(item.price || 0) * Number(item.quantity || 1);
        });
      }
    });
    
    // Sort consumed stock by quantity descending
    const stockList = Object.values(stockConsumed).sort((a, b) => b.quantity - a.quantity);
    const bestseller = stockList[0] || null;
    
    // Group client information for follow-up (tracking)
    const clientMap: { [key: string]: { name: string; phone: string; totalSpent: number; orderCount: number; dishes: { [name: string]: number }; lastOrder: string } } = {};
    periodOrders.forEach(o => {
      const phoneKey = o.customerPhone ? o.customerPhone.trim() : '';
      const key = phoneKey || o.customerName.trim().toLowerCase();
      if (!clientMap[key]) {
        clientMap[key] = {
          name: o.customerName,
          phone: phoneKey,
          totalSpent: 0,
          orderCount: 0,
          dishes: {},
          lastOrder: o.createdAt || new Date().toISOString()
        };
      }
      
      const client = clientMap[key];
      client.totalSpent += o.total;
      client.orderCount += 1;
      
      // Keep track of latest order date
      if (o.createdAt && new Date(o.createdAt) > new Date(client.lastOrder)) {
        client.lastOrder = o.createdAt;
      }
      
      // Record dishes ordered
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          client.dishes[item.name] = (client.dishes[item.name] || 0) + Number(item.quantity || 1);
        });
      }
    });
    
    const clientList = Object.values(clientMap).sort((a, b) => b.totalSpent - a.totalSpent);
    
    return {
      orders: periodOrders,
      breakdown: periodData.breakdown,
      stockList,
      bestseller,
      clientList
    };
  };

  const getWhatsAppMessageForPeriod = (period: 'daily' | 'weekly' | 'monthly') => {
    const stats = getPeriodStats(period);
    const dateStr = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const periodLabel = period === 'daily' ? 'DIARIA' : period === 'weekly' ? 'SEMANAL (7 DÍAS)' : 'MENSUAL (ESTE MES)';
    
    let text = `📋 *REPORTE DE FACTURACIÓN ${periodLabel} - BUFFET CASA DE DIOS*\n`;
    text += `📅 *Fecha de Emisión:* ${dateStr}\n`;
    text += `-------------------------------------------\n\n`;
    text += `💰 *RESUMEN DE COBROS:*\n`;
    text += `💵 Efectivo: $${stats.breakdown.cash.toLocaleString('es-AR')} ARS\n`;
    text += `🏦 Transferencias: $${stats.breakdown.transfer.toLocaleString('es-AR')} ARS\n`;
    text += `📱 Código QR: $${stats.breakdown.qr.toLocaleString('es-AR')} ARS\n`;
    text += `💳 Tarjetas: $${stats.breakdown.card.toLocaleString('es-AR')} ARS\n`;
    text += `📈 *TOTAL FACTURADO: $${stats.breakdown.total.toLocaleString('es-AR')} ARS*\n`;
    text += `📊 *Pedidos Procesados:* ${stats.orders.length} comandas\n\n`;
    
    if (stats.bestseller) {
      text += `🏆 *PRODUCTO MÁS VENDIDO:* ${stats.bestseller.name} (${stats.bestseller.quantity} unidades vendidas - $${stats.bestseller.revenue.toLocaleString('es-AR')} ARS)\n\n`;
    }
    
    text += `📦 *STOCK CONSUMIDO (PRINCIPALES PRODUCTOS):*\n`;
    stats.stockList.slice(0, 5).forEach((item) => {
      text += `• ${item.quantity}x ${item.name} ($${item.revenue.toLocaleString('es-AR')} ARS)\n`;
    });
    text += `\n`;

    text += `👥 *CLIENTES FRECUENTES (${stats.clientList.length} registrados):*\n`;
    stats.clientList.slice(0, 5).forEach((c) => {
      text += `• ${c.name} (${c.phone || 'Sin tel.'}) - Spent: $${c.totalSpent.toLocaleString('es-AR')} (${c.orderCount} ped.)\n`;
    });
    
    text += `\n-------------------------------------------\n`;
    text += `📥 *Nota:* He generado el PDF contable oficial ("Reporte_Facturacion_CasaDeDios.pdf") en tu dispositivo. ¡Ya puedes seleccionarlo y adjuntarlo en este chat! 🚀`;

    return text;
  };

  const handleCopyReportText = (period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    const text = getWhatsAppMessageForPeriod(period);
    navigator.clipboard.writeText(text);
    alert("¡Reporte de facturación copiado al portapapeles! Listo para enviar por WhatsApp.");
  };

  const generatePDFReport = (period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    const stats = getPeriodStats(period);
    const d = stats.breakdown;
    const exchange = exchangeRate || 1000;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const dateStr = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Header Background Accent (Dark Slate)
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 38, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text("BUFFET CASA DE DIOS", 15, 16);

    // Subtitle
    const periodTitle = period === 'daily' ? 'CIERRE DIARIO (HOY)' : period === 'weekly' ? 'CIERRE SEMANAL (7 DIAS)' : 'CIERRE MENSUAL (ESTE MES)';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184); 
    doc.text(`REPORTE DE FACTURACION Y DETALLE - ${periodTitle}`, 15, 22);
    doc.text("CASA DE DIOS POS - CONTROL INTEGRAL AUTOMATIZADO", 15, 27);

    // Date & Time in header
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Fecha: ${dateStr}`, 145, 16);
    doc.setFont('helvetica', 'normal');
    doc.text(`Hora de Emision: ${timeStr}`, 145, 21);
    doc.text(`Tipo: ${period.toUpperCase()}`, 145, 26);

    let y = 48;

    // SECTION 1: METRICS
    doc.setTextColor(15, 23, 42); 
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`I. RESUMEN FINANCIERO (${periodTitle})`, 15, y);
    y += 5;

    // Metric 1: Total Facturado
    doc.setFillColor(241, 245, 249); 
    doc.rect(15, y, 56, 24, 'F');
    doc.setDrawColor(203, 213, 225); 
    doc.rect(15, y, 56, 24, 'S');
    
    doc.setTextColor(71, 85, 105); 
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("TOTAL FACTURADO", 18, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(16, 185, 129); 
    doc.text(`$${d.total.toLocaleString('es-AR')}`, 18, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); 
    doc.text(`T.C. $${exchange} | US$ ${(d.total / exchange).toFixed(1)}`, 18, y + 19);

    // Metric 2: Cantidad de Comandas
    doc.setFillColor(241, 245, 249);
    doc.rect(77, y, 56, 24, 'F');
    doc.rect(77, y, 56, 24, 'S');
    
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("COMANDAS PROCESADAS", 80, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(245, 158, 11); 
    doc.text(`${stats.orders.length} pedidos`, 80, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const avgOrder = stats.orders.length > 0 ? (d.total / stats.orders.length) : 0;
    doc.text(`Promedio: $${avgOrder.toLocaleString('es-AR', {maximumFractionDigits:0})} ARS`, 80, y + 19);

    // Metric 3: Resumen Temporal / Bestseller
    doc.setFillColor(241, 245, 249);
    doc.rect(139, y, 56, 24, 'F');
    doc.rect(139, y, 56, 24, 'S');
    
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("PRODUCTO ESTRELLA", 142, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); 
    if (stats.bestseller) {
      const bName = stats.bestseller.name.substring(0, 14);
      doc.text(`${bName}..`, 142, y + 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${stats.bestseller.quantity} u. | $${stats.bestseller.revenue.toLocaleString('es-AR')}`, 142, y + 18);
    } else {
      doc.text("N/A", 142, y + 12);
    }

    y += 33;

    // SECTION 2: BREAKDOWN BY METHOD Table
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("II. DESGLOSE POR METODO DE PAGO", 15, y);
    y += 5;

    // Headers
    doc.setFillColor(30, 41, 59); 
    doc.rect(15, y, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("Metodo de Pago", 20, y + 5.5);
    doc.text("Monto en Pesos (ARS)", 100, y + 5.5);
    doc.text("Monto en Dolares (USD)", 140, y + 5.5);
    doc.text("Porcentaje", 175, y + 5.5);

    const paymentMethodsList = [
      { name: "Efectivo", value: d.cash },
      { name: "Transferencias", value: d.transfer },
      { name: "Codigo QR", value: d.qr },
      { name: "Tarjetas", value: d.card }
    ];

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    paymentMethodsList.forEach((method, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252); 
        doc.rect(15, y, 180, 8.5, 'F');
      }
      doc.setDrawColor(241, 245, 249); 
      doc.line(15, y + 8.5, 195, y + 8.5);

      doc.setTextColor(51, 65, 85); 
      doc.text(method.name, 20, y + 5.5);
      
      doc.setTextColor(15, 23, 42); 
      doc.setFont('helvetica', 'bold');
      doc.text(`$${method.value.toLocaleString('es-AR')} ARS`, 100, y + 5.5);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`US$ ${(method.value / exchange).toFixed(2)}`, 140, y + 5.5);
      
      const pct = d.total > 0 ? ((method.value / d.total) * 100).toFixed(1) : "0.0";
      doc.setFont('helvetica', 'bold');
      doc.text(`${pct}%`, 175, y + 5.5);

      y += 8.5;
    });

    y += 12;

    // NEW SECTION: STOCK CONSUMED (DETALLE DE STOCK)
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("III. CONSUMO DE STOCK Y POPULARIDAD DE PLATOS", 15, y);
    y += 5;

    if (stats.stockList.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text("No hay consumos de stock registrados en este periodo.", 15, y + 5);
      y += 12;
    } else {
      // Table Headers
      doc.setFillColor(30, 41, 59);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text("Nombre del Plato / Bebida", 20, y + 5.5);
      doc.text("Unidades Vendidas (Stock Consumido)", 100, y + 5.5);
      doc.text("Ingresos Totales (ARS)", 150, y + 5.5);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      stats.stockList.slice(0, 10).forEach((item, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 8.5, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(15, y + 8.5, 195, y + 8.5);

        doc.setTextColor(15, 23, 42);
        doc.text(item.name, 20, y + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.text(`${item.quantity} unidades`, 100, y + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.text(`$${item.revenue.toLocaleString('es-AR')} ARS`, 150, y + 5.5);

        y += 8.5;
      });
    }

    y += 12;

    // NEW SECTION: CLIENTS LIST FOR TRACKING (SEGUIMIENTO)
    // Page break if we are near the bottom
    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("IV. REGISTRO DE CLIENTES PARA SEGUIMIENTO", 15, y);
    y += 5;

    if (stats.clientList.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text("No se registraron datos de clientes en este periodo.", 15, y + 5);
      y += 12;
    } else {
      doc.setFillColor(30, 41, 59);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text("Cliente", 20, y + 5.5);
      doc.text("Teléfono de Contacto", 80, y + 5.5);
      doc.text("Pedidos Realizados", 130, y + 5.5);
      doc.text("Consumo Total", 165, y + 5.5);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      stats.clientList.slice(0, 10).forEach((client, idx) => {
        // Page break inside loop
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 8.5, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(15, y + 8.5, 195, y + 8.5);

        doc.setTextColor(15, 23, 42);
        doc.text(client.name, 20, y + 5.5);

        doc.text(client.phone || "No proporcionado", 80, y + 5.5);

        doc.text(`${client.orderCount} pedido(s)`, 130, y + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.text(`$${client.totalSpent.toLocaleString('es-AR')} ARS`, 165, y + 5.5);

        y += 8.5;
      });
    }

    y += 12;

    // SECTION 5: CHRONOLOGICAL TRANS_LOGS
    if (y > 200) {
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("V. DETALLE DE COMANDAS DETALLADO (CHRONOLOGY)", 15, y);
    y += 5;

    if (stats.orders.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text("No se registraron transacciones cobradas en este periodo.", 15, y + 5);
      y += 12;
    } else {
      doc.setFillColor(30, 41, 59);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text("ID Comanda", 18, y + 5.5);
      doc.text("Mesa", 45, y + 5.5);
      doc.text("Cliente / Telefono", 60, y + 5.5);
      doc.text("Detalle de Consumo", 112, y + 5.5);
      doc.text("Metodo", 158, y + 5.5);
      doc.text("Total ARS", 178, y + 5.5);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      stats.orders.forEach((o, idx) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
          
          doc.setFillColor(15, 23, 42);
          doc.rect(0, 0, 210, 15, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(`CASA DE DIOS POS - ANEXO ${period.toUpperCase()}`, 15, 10);
          doc.setFontSize(8);
          doc.text(`Emision: ${dateStr} - Pagina ${doc.getNumberOfPages()}`, 145, 10);

          y = 25;

          doc.setFillColor(30, 41, 59);
          doc.rect(15, y, 180, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text("ID Comanda", 18, y + 5.5);
          doc.text("Mesa", 45, y + 5.5);
          doc.text("Cliente / Telefono", 60, y + 5.5);
          doc.text("Detalle de Consumo", 112, y + 5.5);
          doc.text("Metodo", 158, y + 5.5);
          doc.text("Total ARS", 178, y + 5.5);

          y += 8;
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 10, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(15, y + 10, 195, y + 10);

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        
        doc.text(o.id.substring(0, 12), 18, y + 6);
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Mesa ${o.tableNumber}`, 45, y + 6);
        
        doc.setFont('helvetica', 'normal');
        const phoneSfx = o.customerPhone ? ` (${o.customerPhone})` : '';
        const nameAndPhone = `${o.customerName}${phoneSfx}`;
        doc.text(nameAndPhone.length > 30 ? nameAndPhone.substring(0, 28) + ".." : nameAndPhone, 60, y + 6);

        const itemsStr = o.items.map((i: any) => `${i.quantity}x ${i.name.substring(0, 12)}`).join(", ");
        doc.text(itemsStr.length > 32 ? itemsStr.substring(0, 30) + ".." : itemsStr, 112, y + 6);

        const paymentLabel = o.paymentMethod === 'efectivo_caja' ? 'Efectivo' : o.paymentMethod === 'qr_caja' ? 'Codigo QR' : o.paymentMethod === 'transferencia' || o.paymentMethod === 'pago_movil' ? 'Transfer.' : 'Tarjeta';
        doc.text(paymentLabel, 158, y + 6);

        doc.setFont('helvetica', 'bold');
        doc.text(`$${o.total.toLocaleString('es-AR')}`, 178, y + 6);

        y += 10;
      });
    }

    // Signatures
    if (y > 240) {
      doc.addPage();
      y = 40;
    } else {
      y += 15;
    }

    doc.setDrawColor(148, 163, 184); 
    doc.line(25, y, 75, y);
    doc.line(135, y, 185, y);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text("Firma de Administrador / Cajero", 28, y + 4.5);
    doc.text("Firma Supervisor de Caja", 142, y + 4.5);

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text(`Pagina ${i} de ${totalPages} | Casa de Dios POS`, 15, 290);
      doc.text("DOCUMENTO DE CARACTER PRIVADO Y CONFIDENCIAL", 130, 290);
    }

    return doc;
  };

  const handlePrintPDF = (period?: 'daily' | 'weekly' | 'monthly') => {
    try {
      const selected = period || reportPeriod;
      const doc = generatePDFReport(selected);
      doc.save(`Reporte_Facturacion_${selected.toUpperCase()}_CasaDeDios.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Ocurrio un error al generar el PDF de facturacion.");
    }
  };

  const downloadPDFReport = (report: any) => {
    if (!report || !report.session) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const s = report.session;
      const openedDateStr = new Date(s.openedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
      const openedTimeStr = new Date(s.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const closedDateStr = s.closedAt ? new Date(s.closedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
      const closedTimeStr = s.closedAt ? new Date(s.closedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';

      // Header Background Accent (Dark Slate)
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 210, 38, 'F');

      // Header Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text("BUFFET CASA DE DIOS", 15, 16);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(148, 163, 184); 
      doc.text("INFORME DE ARQUEO Y CIERRE DE CAJA OFICIAL", 15, 22);
      doc.text(`SESION #${s.id.substring(0, 8).toUpperCase()} - CAJERA: ${s.openedBy.toUpperCase()}`, 15, 27);

      // Status Badge
      const isClosed = s.status === 'closed';
      doc.setFillColor(isClosed ? 16 : 245, isClosed ? 185 : 158, isClosed ? 129 : 11); // Green vs Amber
      doc.rect(145, 12, 50, 16, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(isClosed ? "CAJA CERRADA" : "CAJA ABIERTA", 150, 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`ID: ${s.id.substring(0, 8).toUpperCase()}`, 150, 23);

      let y = 50;

      // Section 1: Session Details
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("RESUMEN DE TIEMPO Y RESPONSABLES", 15, y);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y + 2, 195, y + 2);
      
      y += 8;
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      doc.text(`Cajera Apertura: ${s.openedBy}`, 15, y);
      doc.text(`Fecha/Hora Apertura: ${openedDateStr} a las ${openedTimeStr} hs`, 110, y);
      
      y += 6;
      doc.text(`Cajera Cierre: ${s.closedBy || 'Rita'}`, 15, y);
      doc.text(`Fecha/Hora Cierre: ${closedDateStr} a las ${closedTimeStr} hs`, 110, y);

      y += 14;

      // Section 2: Financial summary
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("ARQUEO DE VALORES Y CONCILIACION", 15, y);
      doc.line(15, y + 2, 195, y + 2);

      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);

      // Table layout for financials
      doc.setFontSize(9);

      // Draw a neat table header for the reconciliation
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, 180, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text("Medio de Pago", 18, y + 4.5);
      doc.text("Esperado Sist", 80, y + 4.5, { align: 'right' });
      doc.text("Declarado", 130, y + 4.5, { align: 'right' });
      doc.text("Diferencia", 185, y + 4.5, { align: 'right' });
      
      y += 6;
      doc.line(15, y, 195, y);

      const renderReconciliationRow = (label: string, expected: number, declared: number, difference: number) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(label, 18, y + 5);
        doc.text(`$${expected.toLocaleString('es-AR')}`, 80, y + 5, { align: 'right' });
        
        const declaredText = isClosed ? `$${declared.toLocaleString('es-AR')}` : "-";
        doc.text(declaredText, 130, y + 5, { align: 'right' });
        
        let diffText = "-";
        if (isClosed) {
          if (difference === 0) {
            diffText = "$0 (Coincide)";
            doc.setTextColor(16, 124, 65); // Green
          } else if (difference > 0) {
            diffText = `+$${difference.toLocaleString('es-AR')} (Sobran)`;
            doc.setTextColor(16, 124, 65); // Green
          } else {
            diffText = `-$${Math.abs(difference).toLocaleString('es-AR')} (Faltan)`;
            doc.setTextColor(220, 38, 38); // Red
          }
        }
        doc.text(diffText, 185, y + 5, { align: 'right' });
        doc.line(15, y + 7, 195, y + 7);
        y += 7;
      };

      renderReconciliationRow("Efectivo (Cajón)", s.expectedCash || 0, s.declaredCash || 0, s.difference || 0);
      renderReconciliationRow("Transferencia", s.expectedTransfer || 0, s.declaredTransfer || 0, s.differenceTransfer || 0);
      renderReconciliationRow("Código QR", s.expectedQr || 0, s.declaredQr || 0, s.differenceQr || 0);
      renderReconciliationRow("Tarjeta", s.expectedCard || 0, s.declaredCard || 0, s.differenceCard || 0);

      // Render total difference row
      if (isClosed) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("CONCILIACION / DIFERENCIA TOTAL:", 18, y + 5);
        
        const totDiff = s.differenceTotal || 0;
        let totText = "";
        if (totDiff === 0) {
          totText = "$0 (CIERRE PERFECTO)";
          doc.setTextColor(16, 124, 65); // Green
        } else if (totDiff > 0) {
          totText = `+$${totDiff.toLocaleString('es-AR')} (SOBRANTE TOTAL)`;
          doc.setTextColor(16, 124, 65); // Green
        } else {
          totText = `-$${Math.abs(totDiff).toLocaleString('es-AR')} (FALTANTE TOTAL)`;
          doc.setTextColor(220, 38, 38); // Red
        }
        doc.text(totText, 185, y + 5, { align: 'right' });
        doc.line(15, y + 7, 195, y + 7);
        y += 7;
      }

      // Render total sales
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text("Total Facturado de la Sesión:", 18, y + 5);
      doc.text(`$${(s.totalSales || 0).toLocaleString('es-AR')} ARS`, 185, y + 5, { align: 'right' });
      doc.line(15, y + 7, 195, y + 7);
      y += 10;

      // Section 3: Orders detail
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`DETALLE DE VENTAS DE LA SESION (${report.orders.length} PEDIDOS)`, 15, y);
      doc.line(15, y + 2, 195, y + 2);

      y += 8;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text("Codigo", 15, y);
      doc.text("Mesa", 40, y);
      doc.text("Cliente", 60, y);
      doc.text("Metodo Pago", 115, y);
      doc.text("Monto", 185, y, { align: 'right' });
      doc.line(15, y + 2, 195, y + 2);
      
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);

      report.orders.forEach((o: any) => {
        // Prevent overflow on page height
        if (y > 275) {
          doc.addPage();
          // Header on next page
          doc.setFillColor(15, 23, 42); 
          doc.rect(0, 0, 210, 15, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text(`INFORME DE CAJA #${s.id.substring(0, 8).toUpperCase()} - CONTINUACION DE VENTAS`, 15, 9);
          
          y = 30;
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text("Codigo", 15, y);
          doc.text("Mesa", 40, y);
          doc.text("Cliente", 60, y);
          doc.text("Metodo Pago", 115, y);
          doc.text("Monto", 185, y, { align: 'right' });
          doc.line(15, y + 2, 195, y + 2);
          y += 6;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
        }

        const methodLabel = o.paymentMethod === 'efectivo_caja' ? 'Efectivo' : o.paymentMethod === 'qr_caja' ? 'QR MercadoPago' : o.paymentMethod === 'transferencia' || o.paymentMethod === 'pago_movil' ? 'Transferencia' : 'Tarjeta';
        
        doc.text(o.id.substring(0, 8).toUpperCase(), 15, y);
        doc.text(`Mesa ${o.tableNumber}`, 40, y);
        doc.text(o.customerName.substring(0, 25), 60, y);
        doc.text(methodLabel, 115, y);
        doc.text(`$${o.total.toLocaleString('es-AR')} ARS`, 185, y, { align: 'right' });
        
        y += 5.5;
      });

      if (s.closingNote) {
        y += 6;
        if (y > 260) {
          doc.addPage();
          y = 30;
        }
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 20, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(15, y, 180, 20, 'S');
        
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text("OBSERVACIONES DEL CIERRE:", 18, y + 6);
        
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(71, 85, 105);
        doc.text(s.closingNote, 18, y + 13);
        y += 25;
      }

      // Add signature line if closed
      if (isClosed) {
        y += 15;
        if (y > 260) {
          doc.addPage();
          y = 40;
        }
        doc.setDrawColor(148, 163, 184);
        doc.line(40, y, 90, y);
        doc.line(120, y, 170, y);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Firma de Rita (Cajera)", 65, y + 5, { align: 'center' });
        doc.text("Firma del Administrador / Pastor", 145, y + 5, { align: 'center' });
      }

      // Add page numbers
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Pagina ${i} de ${totalPages} | Arqueo Casa de Dios`, 15, 287);
        doc.text("SISTEMA DE CONTROL CONTABLE BUFFET POS", 145, 287);
      }

      doc.save(`Arqueo_Caja_${s.id.substring(0, 8).toUpperCase()}.pdf`);
    } catch (err) {
      console.error("Error creating PDF report:", err);
      alert("No se pudo generar el reporte PDF. " + String(err));
    }
  };

  const getWhatsAppMessage = () => {
    return getWhatsAppMessageForPeriod(reportPeriod);
  };

  const lowStockDishes = dishes.filter(d => (d.stock !== undefined ? d.stock : 20) <= 4);

  // Cashier filtering helper logic
  const filteredCajaOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = query === '' || 
      order.id.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.tableNumber.toLowerCase().includes(query);

    if (paymentFilter === 'todos') return matchesSearch;
    return order.paymentStatus === paymentFilter && matchesSearch;
  });

  const renderPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'transferencia':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-lg text-[10px] font-bold">
            <Landmark className="w-3 h-3 text-blue-400" />
            <span>Transferencia</span>
          </span>
        );
      case 'efectivo_caja':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[10px] font-bold">
            <Coins className="w-3 h-3 text-emerald-400" />
            <span>Efectivo en Caja</span>
          </span>
        );
      case 'qr_caja':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-500/15 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-lg text-[10px] font-bold">
            <QrCode className="w-3 h-3 text-purple-400" />
            <span>QR en Caja</span>
          </span>
        );
      case 'tarjeta_caja':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[10px] font-bold">
            <CreditCard className="w-3 h-3 text-amber-400" />
            <span>Tarjeta en Caja</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-white/5 text-white/50 border border-white/10 px-2 py-0.5 rounded-lg text-[10px] font-bold">
            <Coins className="w-3 h-3" />
            <span>{method}</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 text-white" id="admin-dashboard-panel">
      {/* Low Stock Alerts */}
      {lowStockDishes.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start justify-between shadow-lg">
          <div className="flex gap-3 items-start">
            <div className="bg-amber-500 text-black p-2 rounded-xl shrink-0 shadow-md">
              <AlertTriangle className="w-5 h-5 text-black animate-bounce" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-display font-bold text-sm text-amber-400">
                ⚠️ ¡Alerta de Poco Stock!
              </h4>
              <p className="text-xs text-white/90 leading-relaxed">
                Quedan 4 o menos unidades de los siguientes productos. Haga clic en editar para reabastecer el stock:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {lowStockDishes.map(d => (
                  <button
                    key={d.id}
                    onClick={() => openEditModal(d)}
                    className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded-xl text-[11px] font-bold border border-amber-500/30 cursor-pointer transition-all"
                  >
                    <span>{d.name} ({d.stock === 0 ? 'Agotado' : `${d.stock} un.`})</span>
                    <Edit className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick alert bar */}
      {message && (
        <div className={`p-4 rounded-2xl border flex gap-2 items-center text-xs ${
          message.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
        }`}>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Sub-tab selection bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 gap-3 pb-1">
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full -mb-px">
          <button
            onClick={() => setAdminTab('caja')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 font-display text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              adminTab === 'caja'
                ? 'border-amber-400 text-amber-400 font-black bg-white/5 rounded-t-xl'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5 rounded-t-xl'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Control de Caja / Cobros</span>
            <span className="sm:hidden">Caja</span>
            {orders.filter(o => o.paymentStatus === 'pendiente').length > 0 && (
              <span className="bg-rose-500 text-white font-mono text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full animate-pulse shrink-0">
                {orders.filter(o => o.paymentStatus === 'pendiente').length}
              </span>
            )}
          </button>
 
          <button
            onClick={() => setAdminTab('menu')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 font-display text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              adminTab === 'menu'
                ? 'border-amber-400 text-amber-400 font-black bg-white/5 rounded-t-xl'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5 rounded-t-xl'
            }`}
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Gestión de Carta / Tipo Cambio</span>
            <span className="sm:hidden">Carta</span>
          </button>
 
          <button
            onClick={() => setAdminTab('qr')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 font-display text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              adminTab === 'qr'
                ? 'border-amber-400 text-amber-400 font-black bg-white/5 rounded-t-xl'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5 rounded-t-xl'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Códigos QRs</span>
            <span className="sm:hidden">QRs</span>
          </button>

          <button
            onClick={() => setAdminTab('supabase')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 font-display text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              adminTab === 'supabase'
                ? 'border-amber-400 text-amber-400 font-black bg-white/5 rounded-t-xl'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5 rounded-t-xl'
            }`}
          >
            <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Base de Datos</span>
            <span className="sm:hidden">Base Datos</span>
            {supabaseStatus && !supabaseStatus.allExist && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            )}
          </button>
        </div>
 
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-xs font-bold text-white/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-transparent hover:border-rose-500/20 mb-1 sm:mb-0 shrink-0 self-end sm:self-auto"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {adminTab === 'caja' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Cash session upper status banner */}
          {!currentSession ? (
            <div className="bg-rose-500/10 border-2 border-rose-500/20 p-8 rounded-3xl text-center flex flex-col items-center gap-4 shadow-xl">
              <div className="bg-rose-500/20 p-4 rounded-full text-rose-400">
                <Lock className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="flex flex-col gap-1.5 max-w-md">
                <h3 className="text-lg font-black text-rose-400 font-display uppercase tracking-wider">La Caja se encuentra Cerrada</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Para poder registrar ventas, cobrar pedidos QR, comisionar platos o cargar pedidos manuales de Rita, debe abrir una nueva sesión de caja y declarar el efectivo de cambio.
                </p>
              </div>
              <button
                onClick={() => {
                  setOpeningResponsible('Rita');
                  setOpeningAmount('2500');
                  setOpeningNote('Cambio inicial para la jornada');
                  setIsOpeningModalOpen(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/15 transition-all hover:scale-[1.02]"
              >
                <Coins className="w-4 h-4 text-black stroke-[2.5]" />
                <span>Abrir Sesión de Caja (Rita)</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Upper status banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-emerald-400 font-display uppercase tracking-wider">Sesión de Caja Activa</span>
                    <span className="text-[11px] text-white/60">
                      Cajera: <strong className="text-white font-extrabold">{currentSession.openedBy}</strong> • Abierto el {new Date(currentSession.openedAt).toLocaleDateString('es-AR')} a las {new Date(currentSession.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setIsAddManualOrderOpen(true)}
                    className="flex-1 md:flex-none bg-amber-400 hover:bg-amber-300 text-black px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-400/15 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-black stroke-[3]" />
                    <span>Pedido Manual</span>
                  </button>

                  <button
                    onClick={() => handleViewSessionReport('current')}
                    className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Parcial</span>
                  </button>

                  <button
                    onClick={() => {
                      setClosingResponsible(currentSession.openedBy || 'Rita');
                      setCountedCash('');
                      setTotalTransferInformed('');
                      setTotalQrInformed('');
                      setTotalCardInformed('');
                      setClosingNote('');
                      setIsClosingModalOpen(true);
                    }}
                    className="flex-1 md:flex-none bg-rose-500 hover:bg-rose-400 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-500/15 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-white" />
                    <span>Cerrar Caja</span>
                  </button>
                </div>
              </div>

              {/* Metrics header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#1e293b]/50 border border-white/10 rounded-3xl p-5 flex flex-col justify-between shadow-md">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-display">Fondo + Efectivo</span>
                    <Coins className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex flex-col">
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      ${(currentSession.expectedCash || 0).toLocaleString('es-AR')}
                    </span>
                    <span className="text-[9px] text-white/40 mt-1">Esperado en caja física</span>
                  </div>
                </div>

                <div className="bg-[#1e293b]/50 border border-white/10 rounded-3xl p-5 flex flex-col justify-between shadow-md">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-display">Ventas Digitales</span>
                    <Landmark className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="mt-3 flex flex-col">
                    <span className="text-xl font-black text-blue-400 font-mono">
                      ${((currentSession.totalTransfer || 0) + (currentSession.totalQr || 0) + (currentSession.totalCard || 0)).toLocaleString('es-AR')}
                    </span>
                    <span className="text-[9px] text-white/40 mt-1">Transferencias, QR y Tarjeta</span>
                  </div>
                </div>

                <div className="bg-[#1e293b]/50 border border-white/10 rounded-3xl p-5 flex flex-col justify-between shadow-md">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-display">Total Recaudado</span>
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-3 flex flex-col">
                    <span className="text-xl font-black text-white font-mono">
                      ${(currentSession.totalSales || 0).toLocaleString('es-AR')}
                    </span>
                    <span className="text-[9px] text-white/40 mt-1">Suma de ventas cobradas</span>
                  </div>
                </div>

                <div className="bg-[#1e293b]/50 border border-white/10 rounded-3xl p-5 flex flex-col justify-between shadow-md">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-display">Pedidos por Cobrar</span>
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  </div>
                  <div className="mt-3 flex flex-col">
                    <span className="text-xl font-black text-amber-400 font-mono">
                      {orders.filter(o => o.paymentStatus === 'pendiente').length}
                    </span>
                    <span className="text-[9px] text-white/40 mt-1">A la espera de confirmación</span>
                  </div>
                </div>
              </div>

              {/* Search and Filters Toolbar */}
              <div className="glass-card p-5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
                <div className="relative w-full md:max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Buscar por Código, Mesa o Cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0f172a]/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  <span className="text-xs font-bold text-white/40 uppercase tracking-wider whitespace-nowrap shrink-0">Filtrar:</span>
                  <button
                    onClick={() => setPaymentFilter('pendiente')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      paymentFilter === 'pendiente'
                        ? 'bg-amber-400 text-black shadow-md font-extrabold'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Pendientes ({orders.filter(o => o.paymentStatus === 'pendiente').length})
                  </button>
                  <button
                    onClick={() => setPaymentFilter('pagado')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      paymentFilter === 'pagado'
                        ? 'bg-emerald-500 text-white shadow-md font-extrabold'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Cobrados ({orders.filter(o => o.paymentStatus === 'pagado').length})
                  </button>
                  <button
                    onClick={() => setPaymentFilter('todos')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      paymentFilter === 'todos'
                        ? 'bg-white/15 text-white font-extrabold border border-white/10'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Ver Todos ({orders.length})
                  </button>
                </div>
              </div>

              {/* Orders Grid */}
              {filteredCajaOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCajaOrders.map((order) => {
                    const totalInUsd = order.total / (exchangeRate || 1);
                    const isManual = order.source === 'manual_cashier';
                    
                    return (
                      <div 
                        key={order.id} 
                        className={`glass-card p-5 flex flex-col justify-between gap-4 border transition-all ${
                          order.paymentStatus === 'pendiente' 
                            ? 'border-amber-400/30 bg-amber-400/[0.01] shadow-lg shadow-amber-400/[0.01] hover:border-amber-400/50' 
                            : 'border-white/5 hover:border-white/10'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex justify-between items-start border-b border-white/10 pb-3">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-white/40 font-mono tracking-wider">
                                Código de Pedido
                              </span>
                              {isManual && (
                                <span className="bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md">
                                  Manual
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-black text-amber-400 font-mono">
                              {order.id}
                            </span>
                          </div>
                          
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                              Ubicación
                            </span>
                            <span className="bg-black/50 border border-white/10 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-lg">
                              Mesa {order.tableNumber}
                            </span>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-white/40">Cliente:</span>
                            <span className="font-extrabold text-white">{order.customerName}</span>
                          </div>
                          {order.customerPhone && (
                            <div className="flex justify-between">
                              <span className="text-white/40">Teléfono:</span>
                              <span className="font-mono text-white/80">{order.customerPhone}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-white/40">Medio Elegido:</span>
                            {renderPaymentMethodBadge(order.paymentMethod || 'pendiente')}
                          </div>
                          {order.notes && (
                            <div className="mt-1 bg-white/5 p-2 rounded-lg border border-white/5 text-[10px] text-white/70 italic">
                              <strong>Nota:</strong> {order.notes}
                            </div>
                          )}
                        </div>

                        {/* Receipt Items */}
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-1.5">
                          <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider border-b border-white/5 pb-1 font-mono">
                            Detalle de Consumo
                          </span>
                          <div className="flex flex-col gap-1 font-mono text-[11px] text-white/90">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between gap-2">
                                <span>
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="text-white/50 shrink-0">
                                  ${(item.price * item.quantity).toLocaleString('es-AR')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Totals & Confirm Action */}
                        <div className="flex flex-col gap-3 mt-1 pt-3 border-t border-white/10">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider font-display">
                              Total a Cobrar:
                            </span>
                            <div className="flex flex-col items-end">
                              <span className="text-xl font-black font-mono text-emerald-400">
                                ${order.total.toLocaleString('es-AR')}
                              </span>
                              <span className="text-[10px] text-white/40 font-mono">
                                ≈ u$s {totalInUsd.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {order.paymentStatus === 'pendiente' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                onClick={() => setSelectedPayOrder(order)}
                                disabled={payingOrderId === order.id || dismissingOrderId === order.id}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black hover:scale-[1.02] py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10 transition-all font-display animate-pulse"
                              >
                                <Check className="w-4 h-4 text-black stroke-[3]" />
                                <span>Confirmar Pago</span>
                              </button>
                              <button
                                onClick={() => handleDismissOrder(order)}
                                disabled={payingOrderId === order.id || dismissingOrderId === order.id}
                                className="w-full bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-rose-300 border border-rose-500/30 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all font-display"
                              >
                                <X className="w-4 h-4 text-rose-300 stroke-[3]" />
                                <span>{dismissingOrderId === order.id ? 'Desestimando...' : 'Desestimar'}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5 font-display">
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                              <span>Cobrado por {order.cashierName || 'Rita'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 glass-card p-8 flex flex-col items-center gap-3">
                  <Receipt className="w-12 h-12 text-white/20" />
                  <h3 className="text-base font-bold text-white font-display">No hay comandas en esta sección</h3>
                  <p className="text-xs text-white/60 max-w-sm leading-relaxed text-center">
                    {paymentFilter === 'pendiente' 
                      ? "¡Excelente! No hay cobros pendientes de aprobación en este momento."
                      : "No se encontraron cobros registrados que coincidan con la búsqueda."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {adminTab === 'menu' && (
        /* Grid of administrative controls */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Currency Config */}
        <div className="lg:col-span-1 glass-card p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-base">Cotización de Moneda</h3>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xs text-white/70 leading-normal">
              Ajuste el tipo de cambio oficial del dólar en pesos argentinos para las cotizaciones en tiempo real del menú.
            </p>

            <div className="flex flex-col gap-2 bg-white/5 p-4 rounded-2xl border border-white/10">
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider font-display">
                1 USD (Dólar) equivale a:
              </label>
              
              <div className="flex gap-2 items-center mt-1">
                <div className="relative flex-grow">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-amber-400">$</span>
                  <input
                    type="number"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-[#0f172a]/40 border border-white/10 rounded-xl text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
                  />
                </div>
                <span className="text-xs font-bold text-white/50">ARS</span>
              </div>
            </div>

            <button
              onClick={handleUpdateRate}
              className="w-full btn-gold py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Guardar Tipo de Cambio
            </button>
          </div>
        </div>

        {/* Right column: Actions and List */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col gap-5">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="font-display font-bold text-base">Gestión de la Carta</h3>
            </div>
            
            <button
              onClick={openAddModal}
              id="admin-add-dish-btn"
              className="btn-gold px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>Nuevo Plato</span>
            </button>
          </div>

          {/* Dishes list table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider font-bold">
                  <th className="py-2.5">Imagen</th>
                  <th className="py-2.5">Platillo</th>
                  <th className="py-2.5">Categoría</th>
                  <th className="py-2.5">Precio ARS</th>
                  <th className="py-2.5 text-center">Stock</th>
                  <th className="py-2.5 text-center">Estado</th>
                  <th className="py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dishes.map((dish) => (
                  <tr key={dish.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3">
                      <img
                        src={dish.image}
                        alt={dish.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-cover rounded-lg bg-white/5 border border-white/10"
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white leading-tight">{dish.name}</span>
                        {dish.nameEn && (
                          <span className="text-[10px] text-white/40 italic flex items-center gap-0.5">
                            <Globe className="w-3 h-3 text-white/30" />
                            {dish.nameEn}
                          </span>
                        )}
                        <span className="text-[10px] text-amber-400 leading-tight line-clamp-1">{dish.purpose}</span>
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-white/70">
                      {dish.category}
                    </td>
                    <td className="py-3 font-bold font-mono text-amber-400">
                      ${dish.price.toLocaleString('es-AR')}
                    </td>
                    <td className="py-3 text-center">
                      {dish.stock === 0 ? (
                        <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 text-[10px] uppercase">
                          Agotado
                        </span>
                      ) : dish.stock <= 4 ? (
                        <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 text-[10px] animate-pulse">
                          {dish.stock} (Bajo)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded bg-white/5 text-white/80 font-bold font-mono border border-white/10 text-[10px]">
                          {dish.stock}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => toggleAvailability(dish)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer ${
                          dish.available 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                        title={dish.available ? "Ocultar de la carta" : "Mostrar en la carta"}
                      >
                        {dish.available ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                            <span>Oculto</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEditModal(dish)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-amber-400 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDish(dish.id, dish.name)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {adminTab === 'qr' && (
        <div className="animate-fade-in glass-card p-6 flex flex-col gap-6 text-white">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <QrCode className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-base">Generador de Códigos QRs de Mesa</h3>
          </div>
          <TableQRGenerator appUrl="" />
        </div>
      )}

      {adminTab === 'supabase' && (
        <div className="animate-fade-in flex flex-col gap-6 text-white">
          <div className="glass-card p-6 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-2xl ${supabaseStatus?.allExist ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-400' : 'bg-rose-500/15 border border-rose-500/35 text-rose-400'}`}>
                  <Database className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-display font-black text-lg">Estado de Base de Datos (Supabase)</h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Sincronización en tiempo real y persistencia en la nube para el Buffet Casa de Dios.
                  </p>
                </div>
              </div>
              <button
                onClick={() => fetchSupabaseStatus(true)}
                disabled={checkingSupabase}
                className="px-4 py-2 bg-white/5 border border-white/10 hover:border-amber-400/40 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer text-white disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingSupabase ? 'animate-spin text-amber-400' : ''}`} />
                <span>{checkingSupabase ? 'Verificando...' : 'Re-comprobar Estado'}</span>
              </button>
            </div>

            {checkingSupabase && !supabaseStatus && (
              <div className="flex flex-col items-center justify-center p-12 text-center text-white/50 gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                <span className="text-sm font-semibold">Consultando estado del servidor de Supabase...</span>
              </div>
            )}

            {supabaseStatus && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Side Status summary cards */}
                <div className="md:col-span-1 flex flex-col gap-4">
                  <div className={`p-5 rounded-2xl border ${supabaseStatus.allExist ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' : 'bg-amber-500/5 border-amber-500/15 text-amber-400'} flex flex-col gap-3`}>
                    <div className="flex items-center gap-2 font-display font-bold text-sm">
                      <Server className="w-4 h-4" />
                      <span>Estado General</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-black font-display tracking-tight">
                        {supabaseStatus.allExist ? 'ACTIVO' : 'LOCAL'}
                      </span>
                      <span className="text-[10px] text-white/60 leading-relaxed">
                        {supabaseStatus.allExist 
                          ? 'Sincronización bidireccional activa y base de datos de nube conectada.' 
                          : 'Las tablas no se encuentran en la nube. El buffet opera 100% en almacenamiento local.'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border bg-white/5 border-white/10 flex flex-col gap-3">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-wider font-mono">Variables de Entorno</span>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">SUPABASE_URL</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${supabaseStatus.initialized ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {supabaseStatus.initialized ? 'CONFIGURADO' : 'FALTANTE'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">SERVICE_ROLE_KEY</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${supabaseStatus.initialized ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {supabaseStatus.initialized ? 'CONFIGURADO' : 'FALTANTE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side Table checklists */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <h4 className="text-sm font-bold font-display uppercase tracking-wider text-white/80">
                    Estructura de Tablas en Supabase
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(supabaseStatus.tables || {}).map(([tableName, tableStatus]: [string, any]) => (
                      <div key={tableName} className="p-3 bg-[#0f172a]/40 border border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <span className="font-mono text-white/80 font-bold">{tableName}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {tableStatus.exists ? (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                              <Check className="w-3 h-3" />
                              <span>Creada</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20" title={tableStatus.error || 'Tabla faltante'}>
                              <X className="w-3 h-3" />
                              <span>Faltante</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Database Setup SQL box */}
          {supabaseStatus && !supabaseStatus.allExist && (
            <div className="glass-card p-6 flex flex-col gap-5 animate-fade-in">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h4 className="font-display font-bold text-base">Instrucciones para aprovisionar las Tablas</h4>
              </div>

              <div className="flex flex-col gap-3 text-xs text-white/80 leading-relaxed bg-amber-400/5 border border-amber-400/20 p-4 rounded-xl">
                <p className="font-semibold text-amber-300">
                  ⚠️ El sistema operativo de Caja y Pedidos actualmente opera en MODO LOCAL porque la base de datos remota no tiene las tablas inicializadas.
                </p>
                <p>
                  Siga estos sencillos pasos para activar la sincronización automática en la nube:
                </p>
                <ol className="list-decimal pl-4 flex flex-col gap-2 mt-1">
                  <li>Inicie sesión en su panel de control de <strong>Supabase</strong>.</li>
                  <li>Seleccione su proyecto y haga clic en la pestaña <strong>SQL Editor</strong> en la barra lateral izquierda.</li>
                  <li>Cree un nuevo script de consulta haciendo clic en <strong>+ New Query</strong>.</li>
                  <li>Copie el código SQL provisto a continuación y péguelo en el editor de consultas.</li>
                  <li>Haga clic en el botón verde <strong>Run</strong> (Ejecutar) en la esquina inferior derecha.</li>
                  <li>Regrese a esta pestaña y presione el botón <strong>Re-comprobar Estado</strong> de arriba.</li>
                </ol>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white/50 uppercase tracking-wider font-mono">Consulta SQL de Inicialización</span>
                  <button
                    onClick={() => {
                      const sqlText = `-- 1. Crear tabla de configuraciones
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear tabla de usuarios administradores
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Crear tabla de sesiones de caja
CREATE TABLE IF NOT EXISTS cash_sessions (
    id TEXT PRIMARY KEY,
    opened_by TEXT NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    opening_amount NUMERIC NOT NULL,
    opening_note TEXT,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by TEXT,
    closing_amount_cash NUMERIC,
    closing_amount_qr NUMERIC,
    closing_amount_card NUMERIC,
    closing_note TEXT,
    expected_cash NUMERIC,
    difference_cash NUMERIC,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Crear tabla de pedidos/órdenes
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    table_number TEXT NOT NULL,
    customer_name TEXT,
    total NUMERIC NOT NULL,
    status TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    cash_session_id TEXT REFERENCES cash_sessions(id) ON DELETE SET NULL,
    notes TEXT,
    whatsapp_sent BOOLEAN DEFAULT false
);

-- 5. Crear tabla de platos/items de menú (para stock e historial)
CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    price_ars NUMERIC NOT NULL,
    price_usd NUMERIC,
    category TEXT NOT NULL,
    image_url TEXT,
    stock INTEGER DEFAULT 99,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Crear tabla de items del pedido (relación de muchos a muchos)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    dish_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Crear tabla de movimientos de caja (egresos / ingresos adicionales)
CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES cash_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    concept TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`;
                      navigator.clipboard.writeText(sqlText);
                      alert("¡Script SQL copiado al portapapeles exitosamente!");
                    }}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script SQL</span>
                  </button>
                </div>

                <div className="bg-[#0f172a]/90 border border-white/10 rounded-2xl p-4 font-mono text-[10px] text-white/90 overflow-x-auto max-h-[250px] leading-relaxed scrollbar-thin">
                  <pre>{`-- 1. Crear tabla de configuraciones
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear tabla de usuarios administradores
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Crear tabla de sesiones de caja
CREATE TABLE IF NOT EXISTS cash_sessions (
    id TEXT PRIMARY KEY,
    opened_by TEXT NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    opening_amount NUMERIC NOT NULL,
    opening_note TEXT,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by TEXT,
    closing_amount_cash NUMERIC,
    closing_amount_qr NUMERIC,
    closing_amount_card NUMERIC,
    closing_note TEXT,
    expected_cash NUMERIC,
    difference_cash NUMERIC,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Crear tabla de pedidos/órdenes
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    table_number TEXT NOT NULL,
    customer_name TEXT,
    total NUMERIC NOT NULL,
    status TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    cash_session_id TEXT REFERENCES cash_sessions(id) ON DELETE SET NULL,
    notes TEXT,
    whatsapp_sent BOOLEAN DEFAULT false
);

-- 5. Crear tabla de platos/items de menú (para stock e historial)
CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    price_ars NUMERIC NOT NULL,
    price_usd NUMERIC,
    category TEXT NOT NULL,
    image_url TEXT,
    stock INTEGER DEFAULT 99,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Crear tabla de items del pedido (relación de muchos a muchos)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    dish_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Crear tabla de movimientos de caja (egresos / ingresos adicionales)
CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES cash_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    concept TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {dishToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div 
            className="glass-card-heavy max-w-md w-full p-6 flex flex-col gap-6 text-white border border-white/10 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-white">
                ¿Eliminar este plato?
              </h3>
            </div>

            <p className="text-sm text-white/70 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente el plato <strong className="text-white">"{dishToDelete.name}"</strong> de la carta pública? Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3 justify-end mt-2">
              <button
                type="button"
                onClick={() => setDishToDelete(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-all text-sm font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteDish}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-xl text-white transition-all text-sm font-bold shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Confirmar y Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div 
            className="glass-card-heavy max-w-2xl w-full p-6 flex flex-col gap-5 text-white my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-lg text-white">
                {editingDish ? `Editar: ${editingDish.name}` : "Agregar Nuevo Plato a la Carta"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white bg-white/5 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDish} className="flex flex-col gap-4">
              
              {/* AI Auto-Complete & Translator Banner */}
              <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-3 items-center">
                  <div className="bg-amber-400 text-black p-2 rounded-xl shrink-0 shadow-md">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-400 font-display uppercase tracking-wider flex items-center gap-1.5">
                      Asistente de Carta IA
                    </h4>
                    <p className="text-[10px] text-white/60 leading-normal max-w-sm">
                      Escribe el nombre en español y deja que la IA redacte y auto-traduzca todo el plato, o escribe en español y tabula para auto-traducir al instante.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleAIGenerateAndTranslate}
                    disabled={!name.trim() || aiLoading}
                    className="flex-1 md:flex-none bg-amber-400 hover:bg-amber-300 disabled:bg-white/10 disabled:text-white/40 text-black px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-amber-400/10"
                  >
                    {aiLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generar y Traducir con IA
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleAITranslateOnly}
                    disabled={(!name.trim() && !description.trim() && !purpose.trim()) || aiLoading}
                    className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 disabled:bg-transparent disabled:text-white/20 border border-white/10 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    title="Traducir campos actuales de Español a Inglés"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    Traducir Campos
                  </button>
                </div>
              </div>

              {/* Bilingual names fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/80">Nombre (Español) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Tostado de Jamón y Queso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={(e) => handleFieldBlur('name', e.target.value)}
                    className="bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/80">Name (Inglés - Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Ham and Cheese Grilled Sandwich"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
                  />
                </div>
              </div>

              {/* Categoría, Precio y Stock */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/80">Sección / Categoría *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
                  >
                    <option value="Café y Bebidas">Café y Bebidas (Sección Café)</option>
                    <option value="Snacks">Snacks (Sección Café)</option>
                    <option value="Galletas">Galletas (Sección Café)</option>
                    <option value="Platos Fuertes">Platos Fuertes / Menú (Sección Buffet)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/80">Precio en Pesos Argentinos (ARS) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-amber-400">$</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
                    />
                  </div>
                  {/* Dynamic USD Equivalent conversion */}
                  <div className="mt-1 flex items-center justify-between text-[10px] text-white/50 bg-[#0f172a]/20 px-2.5 py-1 rounded-lg border border-white/5">
                    <span>Precio en USD:</span>
                    <span className="font-mono font-bold text-amber-400">
                      ${(price / (exchangeRate || 1000)).toFixed(2)} USD
                    </span>
                    <span className="text-[9px] text-white/30">(Tasa: ${exchangeRate})</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/80">Stock Disponible *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="Cantidad disponible"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/80">Descripción (Español) *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Detalles de preparación, ingredientes, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={(e) => handleFieldBlur('description', e.target.value)}
                    className="bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white resize-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/80">Description (Inglés - Opcional)</label>
                  <textarea
                    rows={3}
                    placeholder="Details about preparation, ingredients, etc. in English"
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    className="bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white resize-none"
                  />
                </div>
              </div>

              {/* Chef's Suggestion Taglines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/80">Recomendación/Nota del Chef (Español) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Masa artesanal de 24 hs de fermentación."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    onBlur={(e) => handleFieldBlur('purpose', e.target.value)}
                    className="bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/80">Chef's Note (Inglés - Opcional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Handmade dough fermented for 24 hours."
                    value={purposeEn}
                    onChange={(e) => setPurposeEn(e.target.value)}
                    className="bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
                  />
                </div>
              </div>

              {/* Imagen URL, presets, & Supabase Storage file upload */}
              <div className="flex flex-col gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option A: Supabase Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/80 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cargar archivo a Supabase Storage (Recomendado)</span>
                    </label>
                    
                    <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-xl p-4 bg-[#0f172a]/20 hover:border-amber-400/40 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        id="supabase-image-file-input"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-1.5 text-amber-400">
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Subiendo imagen...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-white/60">
                          <ImageIcon className="w-6 h-6 text-white/40" />
                          <span className="text-xs font-bold">Seleccionar archivo local</span>
                          <span className="text-[9px] text-white/40 font-mono">Límite: 5MB (PNG, JPG, WEBP, GIF)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Option B: Manual URL Entry */}
                  <div className="flex flex-col justify-between">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-white/80 flex items-center gap-1">
                        <span>O pegue un enlace (URL)</span>
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://images.unsplash.com/..."
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        className="bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white font-mono"
                      />
                    </div>

                    {/* Preview of the currently selected/uploaded image */}
                    {image && (
                      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10 mt-3 md:mt-0">
                        <img
                          src={image}
                          alt="Previsualización"
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 object-cover rounded-lg border border-white/10"
                        />
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[9px] uppercase font-bold text-amber-400">Previsualización activa</span>
                          <span className="text-[10px] text-white/50 truncate font-mono">{image}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preset Options */}
                <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">O elija de nuestros hermosos diseños preestablecidos:</span>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {PRESET_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImage(preset.url)}
                        className={`px-3 py-2 rounded-xl text-[11px] font-bold border whitespace-nowrap cursor-pointer transition-all ${
                          image === preset.url
                            ? 'bg-amber-400 text-black border-amber-400'
                            : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Fit Mode selector */}
                <div className="flex flex-col gap-2.5 border-t border-white/5 pt-3">
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
                    Ajuste de la Imagen del Producto en la Carta:
                  </span>
                  
                  <div className="flex flex-col md:flex-row gap-3 md:gap-4 bg-slate-950/20 p-3 rounded-2xl border border-white/5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80 select-none">
                      <input
                        type="radio"
                        name="imageFit"
                        checked={imageFit === 'cover'}
                        onChange={() => setImageFit('cover')}
                        className="text-amber-400 focus:ring-0 focus:ring-offset-0 bg-[#0f172a]/40 border-white/20 w-4.5 h-4.5 cursor-pointer"
                      />
                      <span className="font-semibold">Recortar y rellenar (16:9 completo sin bordes)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80 select-none">
                      <input
                        type="radio"
                        name="imageFit"
                        checked={imageFit === 'contain'}
                        onChange={() => setImageFit('contain')}
                        className="text-amber-400 focus:ring-0 focus:ring-offset-0 bg-[#0f172a]/40 border-white/20 w-4.5 h-4.5 cursor-pointer"
                      />
                      <span className="font-semibold">Ajustar completo (con fondo difuminado inteligente)</span>
                    </label>
                  </div>

                  {/* Informative Medidas Guideline Box */}
                  <div className="bg-amber-400/[0.03] border border-amber-400/20 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span className="text-xs font-bold font-display uppercase tracking-wider">
                        Guía de Dimensiones de Imagen y Auto-Ajuste Inteligente
                      </span>
                    </div>
                    <p className="text-[11px] text-white/85 leading-relaxed">
                      Para que sus platos luzcan impecables sin bordes negros ni recortes indeseados, le recomendamos usar las siguientes medidas:
                    </p>
                    <ul className="text-[10px] text-white/70 list-disc pl-4 space-y-1 font-sans">
                      <li>
                        <strong className="text-white">Proporción Horizontal (16:9) - Recomendado:</strong> La medida ideal es de <strong className="text-amber-300">1280 x 720 píxeles</strong> o <strong className="text-amber-300">800 x 450 píxeles</strong>.
                      </li>
                      <li>
                        <strong className="text-white">Modo Recortar y Rellenar:</strong> Estira y adapta automáticamente cualquier imagen para cubrir todo el espacio de la carta sin dejar márgenes vacíos.
                      </li>
                      <li>
                        <strong className="text-white">Modo Ajustar Completo:</strong> Si sube imágenes cuadradas o de otras proporciones, el sistema activa automáticamente un <strong className="text-emerald-400 font-mono">Fondo Difuminado de Ambiente Inteligente</strong> con los colores de su propio plato para rellenar los costados con un aspecto de alta costura, eliminando los bordes negros sólidos.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Etiquetas y Disponibilidad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/80">Etiquetas (Separadas por comas)</label>
                  <input
                    type="text"
                    placeholder="Ej. Clásico, Recomendado, Dulce"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
                  />
                </div>
                
                <div className="flex items-center gap-2.5 md:mt-4 bg-[#0f172a]/20 p-3 rounded-2xl border border-white/10">
                  <input
                    type="checkbox"
                    id="available-checkbox"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-[#0f172a] text-amber-400 focus:ring-amber-400/50"
                  />
                  <label htmlFor="available-checkbox" className="text-xs font-bold text-white select-none cursor-pointer">
                    Mostrar este plato en la carta (Visible para clientes)
                  </label>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10 mt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingDish ? "Guardar Cambios" : "Crear Producto"}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. BILLING REPORTS MODAL */}
      {isReportModalOpen && (() => {
        const reports = getBillingReports();
        const d = reports.daily.breakdown;
        const w = reports.weekly.breakdown;
        const m = reports.monthly.breakdown;

        const stats = getPeriodStats(reportPeriod);
        const b = stats.breakdown;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <div 
              className="glass-card-heavy max-w-4xl w-full p-6 flex flex-col gap-6 text-white my-8 max-h-[90vh] overflow-y-auto border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-display font-bold text-lg text-white">
                    Facturación Automatizada e Informes de Caja
                  </h3>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-white/60 hover:text-white bg-white/5 p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Interactive Period Selector Tabs */}
              <div className="flex bg-[#0f172a]/85 p-1.5 rounded-2xl border border-white/10 shrink-0">
                <button
                  onClick={() => setReportPeriod('daily')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${
                    reportPeriod === 'daily'
                      ? 'bg-amber-400 text-black shadow-lg font-black'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Día (Hoy)</span>
                </button>
                <button
                  onClick={() => setReportPeriod('weekly')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${
                    reportPeriod === 'weekly'
                      ? 'bg-amber-400 text-black shadow-lg font-black'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Semana (7 días)</span>
                </button>
                <button
                  onClick={() => setReportPeriod('monthly')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${
                    reportPeriod === 'monthly'
                      ? 'bg-amber-400 text-black shadow-lg font-black'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Mes (Este mes)</span>
                </button>
              </div>

              {/* Bento Row 1: Summary Cards (Today, Weekly, Monthly) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => setReportPeriod('daily')}
                  className={`p-4 flex flex-col justify-between rounded-2xl border transition-all cursor-pointer ${
                    reportPeriod === 'daily'
                      ? 'bg-gradient-to-br from-emerald-500/20 to-[#0f172a] border-emerald-400 shadow-lg scale-[1.01]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                      <span>Facturación de Hoy</span>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <p className="text-2xl font-black text-white font-mono">
                      ${d.total.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <p className="text-[10px] text-white/50 mt-2">
                    {reports.daily.orders.length} comandas finalizadas hoy
                  </p>
                </div>

                <div 
                  onClick={() => setReportPeriod('weekly')}
                  className={`p-4 flex flex-col justify-between rounded-2xl border transition-all cursor-pointer ${
                    reportPeriod === 'weekly'
                      ? 'bg-gradient-to-br from-blue-500/20 to-[#0f172a] border-blue-400 shadow-lg scale-[1.01]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                      <span>Resumen Semanal</span>
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <p className="text-2xl font-black text-white font-mono">
                      ${w.total.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <p className="text-[10px] text-white/50 mt-2">
                    Últimos 7 días de facturación
                  </p>
                </div>

                <div 
                  onClick={() => setReportPeriod('monthly')}
                  className={`p-4 flex flex-col justify-between rounded-2xl border transition-all cursor-pointer ${
                    reportPeriod === 'monthly'
                      ? 'bg-gradient-to-br from-purple-500/20 to-[#0f172a] border-purple-400 shadow-lg scale-[1.01]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                      <span>Resumen Mensual</span>
                      <Coins className="w-4 h-4" />
                    </div>
                    <p className="text-2xl font-black text-white font-mono">
                      ${m.total.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <p className="text-[10px] text-white/50 mt-2">
                    Este mes calendario
                  </p>
                </div>
              </div>

              {/* Bento Row 2: Breakdown by Payment Method for SELECTED PERIOD */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  Desglose de Cobros del Periodo Seleccionado (por Método de Pago)
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-3 flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-emerald-400" />
                      Efectivo
                    </span>
                    <span className="text-base font-black text-white font-mono mt-1">
                      ${b.cash.toLocaleString('es-AR')}
                    </span>
                    <span className="text-[9px] text-emerald-400/70 font-semibold">
                      {b.total > 0 ? ((b.cash / b.total) * 100).toFixed(0) : 0}% del total
                    </span>
                  </div>

                  <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-3 flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase font-bold flex items-center gap-1">
                      <Landmark className="w-3.5 h-3.5 text-blue-400" />
                      Transferencias
                    </span>
                    <span className="text-base font-black text-white font-mono mt-1">
                      ${b.transfer.toLocaleString('es-AR')}
                    </span>
                    <span className="text-[9px] text-blue-400/70 font-semibold">
                      {b.total > 0 ? ((b.transfer / b.total) * 100).toFixed(0) : 0}% del total
                    </span>
                  </div>

                  <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-3 flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase font-bold flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-purple-400" />
                      Código QR
                    </span>
                    <span className="text-base font-black text-white font-mono mt-1">
                      ${b.qr.toLocaleString('es-AR')}
                    </span>
                    <span className="text-[9px] text-purple-400/70 font-semibold">
                      {b.total > 0 ? ((b.qr / b.total) * 100).toFixed(0) : 0}% del total
                    </span>
                  </div>

                  <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-3 flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase font-bold flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      Tarjetas
                    </span>
                    <span className="text-base font-black text-white font-mono mt-1">
                      ${b.card.toLocaleString('es-AR')}
                    </span>
                    <span className="text-[9px] text-amber-400/70 font-semibold">
                      {b.total > 0 ? ((b.card / b.total) * 100).toFixed(0) : 0}% del total
                    </span>
                  </div>
                </div>
              </div>

              {/* Bento Row 3: Stock Consumption & Bestseller Stats */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-display flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    Consumo de Stock y Producto Más Pedido
                  </h4>
                  <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-white/60">
                    {stats.stockList.length} productos diferentes vendidos
                  </span>
                </div>

                {stats.stockList.length === 0 ? (
                  <div className="text-center py-6 text-white/30 text-xs">
                    No se han registrado consumos en este período.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Bestseller Spotlight Card */}
                    {stats.bestseller && (
                      <div className="md:col-span-1 bg-gradient-to-br from-amber-400/15 to-[#0f172a] border border-amber-400/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg font-display">
                          Bestseller ★
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] text-amber-400 uppercase font-black tracking-wider">
                            Producto Más Solicitado
                          </span>
                          <span className="text-base font-extrabold text-white leading-tight">
                            {stats.bestseller.name}
                          </span>
                          <span className="text-2xl font-black text-amber-400 font-mono mt-1">
                            {stats.bestseller.quantity} <span className="text-xs text-white/60 font-semibold uppercase">unidades</span>
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-white/60 font-medium">
                          Facturación generada: <strong className="text-white font-mono">${stats.bestseller.revenue.toLocaleString('es-AR')} ARS</strong>
                        </div>
                      </div>
                    )}

                    {/* Stock Consumption table/list */}
                    <div className="md:col-span-2 bg-[#0f172a]/40 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                      <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">
                        Detalle de Unidades Descontadas del Stock:
                      </span>
                      <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {stats.stockList.map((item, i) => {
                          const maxQty = stats.bestseller ? stats.bestseller.quantity : 1;
                          const barWidth = Math.max(5, Math.min(100, (item.quantity / maxQty) * 100));
                          return (
                            <div key={i} className="flex flex-col gap-1 text-xs">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-white flex items-center gap-1.5">
                                  <span className="text-[10px] text-amber-400">#{i + 1}</span>
                                  {item.name}
                                </span>
                                <span className="font-mono text-white/90">
                                  {item.quantity} u. <span className="text-white/40 font-normal text-[10px]">(${item.revenue.toLocaleString('es-AR')})</span>
                                </span>
                              </div>
                              {/* Custom progress bar representing stock consumption */}
                              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bento Row 4: Client Tracking List for CRM / Follow-ups */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-display flex items-center gap-2">
                    <Copy className="w-4 h-4 text-amber-400" />
                    Seguimiento y Registro de Clientes
                  </h4>
                  <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-white/60">
                    {stats.clientList.length} clientes activos
                  </span>
                </div>

                {stats.clientList.length === 0 ? (
                  <div className="text-center py-6 text-white/30 text-xs">
                    No hay clientes registrados en este período.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                    {stats.clientList.map((client, i) => {
                      // Prepare WhatsApp follow up template
                      const messageText = `Hola ${client.name}! Te contactamos de Buffet Casa de Dios. Agradecemos mucho tu preferencia y tus compras recientes en nuestro buffet. ¡Esperamos que hayas disfrutado tu comida! Ante cualquier sugerencia o consulta, estamos a tu entera disposición. ¡Que tengas un bendecido día!`;
                      const waUrl = client.phone 
                        ? `https://api.whatsapp.com/send?phone=${client.phone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(messageText)}`
                        : null;

                      // Favorite dishes list
                      const favorites = Object.entries(client.dishes)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([name, qty]) => `${qty}x ${name}`)
                        .join(', ');

                      return (
                        <div key={i} className="bg-[#0f172a]/40 border border-white/5 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-amber-400 font-mono">#{i + 1}</span>
                              <span className="font-bold text-white text-sm">{client.name}</span>
                              {client.phone && (
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg">
                                  {client.phone}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 text-white/60">
                              <p>🛒 <strong className="text-white/80">Frecuencia:</strong> {client.orderCount} pedido(s) realizado(s)</p>
                              {favorites && (
                                <p>⭐ <strong className="text-white/80">Platos Favoritos:</strong> <span className="italic text-amber-300">{favorites}</span></p>
                              )}
                              <p>📅 <strong className="text-white/80">Última compra:</strong> {new Date(client.lastOrder).toLocaleDateString('es-AR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})} hs</p>
                            </div>
                          </div>

                          {/* Action area: Total spent & follow-up button */}
                          <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t border-white/5 md:border-t-0 pt-2 md:pt-0">
                            <div className="text-right">
                              <span className="text-[10px] text-white/40 block">Total Consumido</span>
                              <span className="font-black text-emerald-400 font-mono text-sm">
                                ${client.totalSpent.toLocaleString('es-AR')} ARS
                              </span>
                            </div>
                            
                            {waUrl ? (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#25D366] hover:bg-[#20ba59] text-black px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1 transition-all cursor-pointer hover:scale-[1.02]"
                              >
                                <Copy className="w-3.5 h-3.5 text-black" />
                                <span>Hacer Seguimiento</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-white/30 italic">Sin teléfono para seguimiento</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bento Row 5: Chronological detail of orders in selected period */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-display">
                    Detalle Cronológico de Consumos ({reportPeriod === 'daily' ? 'Hoy' : reportPeriod === 'weekly' ? 'Semana' : 'Mes'})
                  </h4>
                  <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-white/60">
                    {stats.orders.length} pedidos finalizados
                  </span>
                </div>

                {stats.orders.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-xs">
                    No se han registrado consumos pagados en este período.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {stats.orders.map((o, idx) => (
                      <div key={o.id} className="bg-[#0f172a]/40 border border-white/5 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-amber-400">#{idx + 1}</span>
                            <span className="font-bold text-white font-mono">Pedido ID: {o.id.substring(0, 8).toUpperCase()}</span>
                            <span className="bg-white/10 border border-white/10 text-[10px] font-bold px-2 py-0.5 rounded">
                              Mesa {o.tableNumber}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 text-white/70">
                            <p>👤 <strong className="text-white">Cliente:</strong> {o.customerName}</p>
                            <p>📞 <strong className="text-white">Teléfono:</strong> {o.customerPhone || <span className="italic text-white/40">No proporcionado</span>}</p>
                          </div>
                        </div>

                        {/* Middle: Products detailed list */}
                        <div className="flex-1 lg:max-w-md bg-[#0f172a]/20 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider block mb-1">
                            Productos Consumidos:
                          </span>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/80 font-semibold">
                            {o.items.map((item: any, i: number) => (
                              <span key={i} className="whitespace-nowrap">
                                <strong className="text-amber-300 font-mono">{item.quantity}x</strong> {item.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Right: Method and Price */}
                        <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 border-t border-white/5 lg:border-t-0 pt-2 lg:pt-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-white/40">Pago por:</span>
                            {renderPaymentMethodBadge(o.paymentMethod)}
                          </div>
                          <div className="text-right flex flex-col font-bold">
                            <span className="font-black text-emerald-400 font-mono text-sm">
                              ${o.total.toLocaleString('es-AR')}
                            </span>
                            <span className="text-[10px] text-white/40 font-mono">
                              US$ {(o.total / exchangeRate).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer: Copy / Export Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-white/10">
                <span className="text-[10px] text-white/40 italic text-center sm:text-left">
                  * El sistema genera un PDF contable detallado que se descarga automáticamente para que lo puedas adjuntar o imprimir.
                </span>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getWhatsAppMessageForPeriod(reportPeriod))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      try {
                        const doc = generatePDFReport(reportPeriod);
                        doc.save(`Reporte_Facturacion_${reportPeriod.toUpperCase()}_CasaDeDios.pdf`);
                      } catch (err) {
                        console.error("Error generating PDF on WhatsApp click:", err);
                      }
                    }}
                    className="flex-1 sm:flex-none bg-[#25D366] hover:bg-[#20ba59] text-black px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer text-center font-display transition-all hover:scale-[1.01]"
                  >
                    <Copy className="w-3.5 h-3.5 text-black" />
                    <span>WhatsApp (PDF + Resumen)</span>
                  </a>
                  <button
                    onClick={() => handlePrintPDF(reportPeriod)}
                    className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer font-display transition-all shadow-md hover:scale-[1.01]"
                  >
                    <Printer className="w-3.5 h-3.5 text-black" />
                    <span>Descargar e Imprimir PDF</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 1. APERTURA DE CAJA MODAL */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card-heavy max-w-md w-full p-6 flex flex-col gap-5 text-white animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400 animate-bounce" />
                <h3 className="font-display font-bold text-base text-white">Apertura de Caja</h3>
              </div>
              <button onClick={() => setIsOpeningModalOpen(false)} className="text-white/60 hover:text-white bg-white/5 p-1.5 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleOpenSession} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/80">Nombre de la Cajera Responsable *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Rita"
                  value={openingResponsible}
                  onChange={(e) => setOpeningResponsible(e.target.value)}
                  className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-white font-bold"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/80">Efectivo Inicial / Cambio ($ ARS) *</label>
                <input
                  type="number"
                  required
                  placeholder="Ej. 2500"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-white font-mono font-bold"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/80">Observaciones de Apertura</label>
                <textarea
                  placeholder="Ej. Dejo $2500 en cambio de billetes chicos."
                  value={openingNote}
                  onChange={(e) => setOpeningNote(e.target.value)}
                  className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-white min-h-[80px]"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer mt-2"
              >
                <Check className="w-4 h-4 text-black stroke-[3]" />
                <span>Confirmar Apertura de Caja</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. CIERRE DE CAJA & ARQUEO MODAL */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card-heavy max-w-lg w-full p-6 flex flex-col gap-5 text-white animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-400" />
                <h3 className="font-display font-bold text-base text-white">Cierre de Caja y Arqueo Diario</h3>
              </div>
              <button onClick={() => setIsClosingModalOpen(false)} className="text-white/60 hover:text-white bg-white/5 p-1.5 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 flex flex-col gap-2.5">
              <h4 className="text-[10px] uppercase font-bold text-rose-400 tracking-wider font-mono">Valores de Arqueo Esperados en Sistema</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-white/40">Fondo Inicial:</span>
                  <span className="font-mono font-extrabold text-white mt-0.5">${(currentSession?.openingAmount || 0).toLocaleString('es-AR')}</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-white/40">Ventas en Efectivo:</span>
                  <span className="font-mono font-extrabold text-emerald-400 mt-0.5">${(currentSession?.totalCash || 0).toLocaleString('es-AR')}</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 col-span-2 flex flex-col justify-between">
                  <span className="text-white/40">Efectivo Total Esperado en Cajón:</span>
                  <span className="font-mono text-lg font-black text-emerald-400 mt-0.5">${(currentSession?.expectedCash || 0).toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleCloseSession} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/80">Responsable del Cierre *</label>
                  <input
                    type="text"
                    required
                    value={closingResponsible}
                    onChange={(e) => setClosingResponsible(e.target.value)}
                    className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-white font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-emerald-400">Efectivo Contado (Cajón Físico) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Ingrese total contado..."
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col gap-3">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-mono">Control de Medios de Pago Digitales (Opcional)</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-white/60">Transferencia</label>
                    <input
                      type="number"
                      placeholder={`Sist: $${currentSession?.totalTransfer || 0}`}
                      value={totalTransferInformed}
                      onChange={(e) => setTotalTransferInformed(e.target.value)}
                      className="bg-[#0f172a]/60 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-white font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-white/60">Código QR</label>
                    <input
                      type="number"
                      placeholder={`Sist: $${currentSession?.totalQr || 0}`}
                      value={totalQrInformed}
                      onChange={(e) => setTotalQrInformed(e.target.value)}
                      className="bg-[#0f172a]/60 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/30 text-white font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-white/60">Tarjeta</label>
                    <input
                      type="number"
                      placeholder={`Sist: $${currentSession?.totalCard || 0}`}
                      value={totalCardInformed}
                      onChange={(e) => setTotalCardInformed(e.target.value)}
                      className="bg-[#0f172a]/60 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/30 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/80">Observaciones / Balance del Arqueo</label>
                <textarea
                  placeholder="Ej. Cierre de caja perfecto. Todo coincide con lo contado."
                  value={closingNote}
                  onChange={(e) => setClosingNote(e.target.value)}
                  className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-white min-h-[70px]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-rose-500 hover:bg-rose-400 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-rose-500/10 cursor-pointer mt-2"
              >
                <CheckSquare className="w-4 h-4 text-white" />
                <span>Arquear y Cerrar Caja</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADVERTENCIA DE DIFERENCIAS EN EL ARQUEO */}
      {showDifferencesWarning && differencesDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="glass-card-heavy max-w-md w-full p-6 flex flex-col gap-5 text-white border border-rose-500/30 shadow-2xl shadow-rose-950/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-white/15 pb-4">
              <div className="bg-rose-500/15 p-2 rounded-xl text-rose-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-rose-400">¡Hay diferencias en el arqueo!</h3>
                <p className="text-[11px] text-white/60">Los montos declarados no coinciden con los esperados por el sistema.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 bg-black/40 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-mono">Detalle de Diferencias</span>
              <div className="flex flex-col gap-2 text-xs">
                {/* EFECTIVO */}
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-white font-medium">Efectivo:</span>
                  <div className="text-right flex flex-col font-mono text-[11px]">
                    <span className="text-white/60">Sist: ${differencesDetails.cash.expected.toLocaleString('es-AR')} • Decl: ${differencesDetails.cash.declared.toLocaleString('es-AR')}</span>
                    <span className={`font-bold ${differencesDetails.cash.diff > 0 ? 'text-emerald-400' : differencesDetails.cash.diff < 0 ? 'text-rose-400' : 'text-white/60'}`}>
                      {differencesDetails.cash.diff > 0 ? `+$${differencesDetails.cash.diff.toLocaleString('es-AR')} sobrante` : differencesDetails.cash.diff < 0 ? `-$${Math.abs(differencesDetails.cash.diff).toLocaleString('es-AR')} faltante` : '$0'}
                    </span>
                  </div>
                </div>

                {/* TRANSFERENCIA */}
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-white font-medium">Transferencia:</span>
                  <div className="text-right flex flex-col font-mono text-[11px]">
                    <span className="text-white/60">Sist: ${differencesDetails.transfer.expected.toLocaleString('es-AR')} • Decl: ${differencesDetails.transfer.declared.toLocaleString('es-AR')}</span>
                    <span className={`font-bold ${differencesDetails.transfer.diff > 0 ? 'text-emerald-400' : differencesDetails.transfer.diff < 0 ? 'text-rose-400' : 'text-white/60'}`}>
                      {differencesDetails.transfer.diff > 0 ? `+$${differencesDetails.transfer.diff.toLocaleString('es-AR')} sobrante` : differencesDetails.transfer.diff < 0 ? `-$${Math.abs(differencesDetails.transfer.diff).toLocaleString('es-AR')} faltante` : '$0'}
                    </span>
                  </div>
                </div>

                {/* QR */}
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-white font-medium">Código QR:</span>
                  <div className="text-right flex flex-col font-mono text-[11px]">
                    <span className="text-white/60">Sist: ${differencesDetails.qr.expected.toLocaleString('es-AR')} • Decl: ${differencesDetails.qr.declared.toLocaleString('es-AR')}</span>
                    <span className={`font-bold ${differencesDetails.qr.diff > 0 ? 'text-emerald-400' : differencesDetails.qr.diff < 0 ? 'text-rose-400' : 'text-white/60'}`}>
                      {differencesDetails.qr.diff > 0 ? `+$${differencesDetails.qr.diff.toLocaleString('es-AR')} sobrante` : differencesDetails.qr.diff < 0 ? `-$${Math.abs(differencesDetails.qr.diff).toLocaleString('es-AR')} faltante` : '$0'}
                    </span>
                  </div>
                </div>

                {/* TARJETA */}
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-white font-medium">Tarjeta:</span>
                  <div className="text-right flex flex-col font-mono text-[11px]">
                    <span className="text-white/60">Sist: ${differencesDetails.card.expected.toLocaleString('es-AR')} • Decl: ${differencesDetails.card.declared.toLocaleString('es-AR')}</span>
                    <span className={`font-bold ${differencesDetails.card.diff > 0 ? 'text-emerald-400' : differencesDetails.card.diff < 0 ? 'text-rose-400' : 'text-white/60'}`}>
                      {differencesDetails.card.diff > 0 ? `+$${differencesDetails.card.diff.toLocaleString('es-AR')} sobrante` : differencesDetails.card.diff < 0 ? `-$${Math.abs(differencesDetails.card.diff).toLocaleString('es-AR')} faltante` : '$0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-rose-400">Observación Obligatoria (Explicar diferencia) *</label>
              <textarea
                required
                placeholder="Por favor ingrese una observación explicando la diferencia..."
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                className="bg-[#0f172a]/80 border border-rose-500/30 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-white min-h-[90px] font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowDifferencesWarning(false)}
                className="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white py-3 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border border-white/10 text-center"
              >
                Volver y corregir
              </button>
              <button
                type="button"
                onClick={() => handleCloseSession(undefined, true)}
                disabled={!closingNote.trim()}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1 shadow-lg cursor-pointer ${
                  closingNote.trim() 
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/10' 
                    : 'bg-rose-950/40 text-white/30 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cerrar con diferencias</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CARGAR PEDIDO MANUAL MODAL */}
      {isAddManualOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="glass-card-heavy max-w-5xl w-full p-6 flex flex-col gap-5 text-white max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-bold text-base text-white">Cargar Pedido Manual (Rita)</h3>
              </div>
              <button onClick={() => setIsAddManualOrderOpen(false)} className="text-white/60 hover:text-white bg-white/5 p-1.5 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Side: Form and Selected Items */}
              <div className="lg:col-span-5 flex flex-col gap-4 border-r border-white/5 lg:pr-6">
                <h4 className="text-[10px] uppercase font-bold text-amber-400 tracking-wider font-mono">Datos del Pedido</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-white/70">Nombre Cliente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Rita de Casa de Dios"
                      value={manualCustomer}
                      onChange={(e) => setManualCustomer(e.target.value)}
                      className="bg-[#0f172a]/60 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-white/70">Mesa / Ubicación</label>
                      <input
                        type="text"
                        placeholder="Ej. Mesa 4 o Mostrador"
                        value={manualTable}
                        onChange={(e) => setManualTable(e.target.value)}
                        className="bg-[#0f172a]/60 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-white/70">Teléfono (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej. 11 1234 5678"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        className="bg-[#0f172a]/60 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-white/70">Método de Pago inmediato *</label>
                    <select
                      value={manualPaymentMethod}
                      onChange={(e: any) => setManualPaymentMethod(e.target.value)}
                      className="bg-[#0f172a]/60 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="efectivo">Efectivo en Caja</option>
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="qr">MercadoPago / Código QR</option>
                      <option value="tarjeta">Tarjeta Débito/Crédito</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-white/70">Notas para Cocina (Maricel)</label>
                    <input
                      type="text"
                      placeholder="Ej. Sin aderezos, Gaseosa bien fría"
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      className="bg-[#0f172a]/60 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Cart list */}
                <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-mono border-b border-white/5 pb-1">Canasta del Pedido</span>
                  {manualCart.length === 0 ? (
                    <div className="text-center py-6 text-white/30 text-xs italic">
                      Canasta vacía. Agregue productos de la lista de la derecha.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                      {manualCart.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-white/5 p-2 rounded-xl text-xs gap-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{item.name}</span>
                            <span className="text-[10px] text-white/40 font-mono">${item.price.toLocaleString()} un.</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const copy = [...manualCart];
                                if (copy[index].quantity > 1) {
                                  copy[index].quantity -= 1;
                                  setManualCart(copy);
                                } else {
                                  copy.splice(index, 1);
                                  setManualCart(copy);
                                }
                              }}
                              className="bg-white/10 hover:bg-white/20 p-1 rounded-lg text-white font-bold w-6 h-6 flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono font-extrabold text-white text-sm w-4 text-center">{item.quantity}</span>
                            <button
                              onClick={() => {
                                const copy = [...manualCart];
                                copy[index].quantity += 1;
                                setManualCart(copy);
                              }}
                              className="bg-white/10 hover:bg-white/20 p-1 rounded-lg text-white font-bold w-6 h-6 flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                            <button
                              onClick={() => {
                                const copy = [...manualCart];
                                copy.splice(index, 1);
                                setManualCart(copy);
                              }}
                              className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 ml-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Total */}
                      <div className="flex justify-between items-baseline pt-2 border-t border-white/10 mt-1">
                        <span className="text-xs font-bold text-white/50 uppercase font-display">Total Pedido:</span>
                        <span className="text-lg font-black font-mono text-emerald-400">
                          ${manualCart.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateManualOrder}
                  disabled={manualCart.length === 0 || !manualCustomer.trim()}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/20 text-black py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg disabled:cursor-not-allowed shadow-emerald-500/15"
                >
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                  <span>Mandar Pedido Directo a Cocina</span>
                </button>
              </div>

              {/* Right Side: Dishes selection */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h4 className="text-[10px] uppercase font-bold text-amber-400 tracking-wider font-mono">Seleccionar Productos</h4>
                  {/* Small Search */}
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                    <input
                      type="text"
                      placeholder="Buscar plato o bebida..."
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0f172a]/60 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-1">
                  {dishes
                    .filter((d) => d.available && d.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((d) => {
                      const stock = d.stock !== undefined ? d.stock : 20;
                      const isOutOfStock = stock <= 0;
                      return (
                        <div
                          key={d.id}
                          onClick={() => {
                            if (isOutOfStock) return;
                            const copy = [...manualCart];
                            const existing = copy.find((item) => item.dishId === d.id);
                            if (existing) {
                              existing.quantity += 1;
                            } else {
                              copy.push({ dishId: d.id, name: d.name, price: d.price, quantity: 1 });
                            }
                            setManualCart(copy);
                          }}
                          className={`p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3 cursor-pointer hover:bg-white/10 transition-all ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-black text-white">{d.name}</span>
                            <span className="text-[11px] font-mono text-emerald-400 font-extrabold">${d.price.toLocaleString('es-AR')}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-white/40 font-mono">
                            <span>Stock: <strong className={stock <= 4 ? 'text-amber-400' : 'text-white/60'}>{stock} un.</strong></span>
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-lg">
                              Agregar +
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. VER REPORTE COMPLETO MODAL */}
      {isViewReportOpen && sessionReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="glass-card-heavy max-w-3xl w-full p-6 flex flex-col gap-5 text-white max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-bold text-base text-white">Informe Contable de Caja</h3>
              </div>
              <button onClick={() => setIsViewReportOpen(false)} className="text-white/60 hover:text-white bg-white/5 p-1.5 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {/* Report Header Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] text-white/40 uppercase font-mono">Estado de Sesión</span>
                  <span className={`text-base font-black uppercase ${sessionReport.session.status === 'open' ? 'text-amber-400' : 'text-rose-400'}`}>
                    {sessionReport.session.status === 'open' ? '🔴 ABIERTO / ACTIVO' : '🟢 ARCHIVADO / CERRADO'}
                  </span>
                  <span className="text-[9px] text-white/40 mt-1">Abierto por {sessionReport.session.openedBy}</span>
                </div>
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] text-white/40 uppercase font-mono">Diferencia de Caja</span>
                  <span className={`text-lg font-black font-mono ${sessionReport.session.status === 'open' ? 'text-white/40' : (sessionReport.session.difference || 0) === 0 ? 'text-emerald-400' : (sessionReport.session.difference || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sessionReport.session.status === 'open' ? 'N/A' : `$${(sessionReport.session.difference || 0).toLocaleString('es-AR')}`}
                  </span>
                  <span className="text-[9px] text-white/40 mt-1">
                    {sessionReport.session.status === 'open' ? 'Requiere arqueo final' : (sessionReport.session.difference || 0) === 0 ? 'Cierre Perfecto' : (sessionReport.session.difference || 0) > 0 ? 'Sobrante' : 'Faltante'}
                  </span>
                </div>
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] text-white/40 uppercase font-mono">Total de Ventas</span>
                  <span className="text-base font-black text-white font-mono">${(sessionReport.session.totalSales || 0).toLocaleString('es-AR')}</span>
                  <span className="text-[9px] text-white/40 mt-1">Suma total de cobros</span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-white/15 pb-2.5">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-display">Conciliación por Medio de Pago</h4>
                  {sessionReport.session.status === 'closed' && (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      sessionReport.session.closingResult === 'perfect' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {sessionReport.session.closingResult === 'perfect' ? '✓ Arqueo Coincidente' : '⚠️ Cerrado con Diferencias'}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase">
                        <th className="py-2 font-medium text-left">Medio de Pago</th>
                        <th className="py-2 text-right font-medium">Esperado Sist</th>
                        <th className="py-2 text-right font-medium">Declarado</th>
                        <th className="py-2 text-right font-medium">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {/* EFECTIVO */}
                      <tr>
                        <td className="py-2.5 text-white font-medium text-left">Efectivo (Cajón)</td>
                        <td className="py-2.5 text-right text-white/80">${sessionReport.session.expectedCash.toLocaleString('es-AR')}</td>
                        <td className="py-2.5 text-right text-white/80">
                          {sessionReport.session.status === 'open' ? '-' : `$${sessionReport.session.declaredCash.toLocaleString('es-AR')}`}
                        </td>
                        <td className="py-2.5 text-right">
                          {sessionReport.session.status === 'open' ? (
                            <span className="text-white/30">-</span>
                          ) : (
                            <span className={`font-bold ${sessionReport.session.difference > 0 ? 'text-emerald-400' : sessionReport.session.difference < 0 ? 'text-rose-400' : 'text-white/40'}`}>
                              {sessionReport.session.difference > 0 ? `+$${sessionReport.session.difference.toLocaleString('es-AR')}` : sessionReport.session.difference < 0 ? `-$${Math.abs(sessionReport.session.difference).toLocaleString('es-AR')}` : '$0'}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* TRANSFERENCIA */}
                      <tr>
                        <td className="py-2.5 text-white font-medium text-left">Transferencia</td>
                        <td className="py-2.5 text-right text-white/80">${sessionReport.session.expectedTransfer.toLocaleString('es-AR')}</td>
                        <td className="py-2.5 text-right text-white/80">
                          {sessionReport.session.status === 'open' ? '-' : `$${sessionReport.session.declaredTransfer.toLocaleString('es-AR')}`}
                        </td>
                        <td className="py-2.5 text-right">
                          {sessionReport.session.status === 'open' ? (
                            <span className="text-white/30">-</span>
                          ) : (
                            <span className={`font-bold ${sessionReport.session.differenceTransfer > 0 ? 'text-emerald-400' : sessionReport.session.differenceTransfer < 0 ? 'text-rose-400' : 'text-white/40'}`}>
                              {sessionReport.session.differenceTransfer > 0 ? `+$${sessionReport.session.differenceTransfer.toLocaleString('es-AR')}` : sessionReport.session.differenceTransfer < 0 ? `-$${Math.abs(sessionReport.session.differenceTransfer).toLocaleString('es-AR')}` : '$0'}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* QR */}
                      <tr>
                        <td className="py-2.5 text-white font-medium text-left">Código QR</td>
                        <td className="py-2.5 text-right text-white/80">${sessionReport.session.expectedQr.toLocaleString('es-AR')}</td>
                        <td className="py-2.5 text-right text-white/80">
                          {sessionReport.session.status === 'open' ? '-' : `$${sessionReport.session.declaredQr.toLocaleString('es-AR')}`}
                        </td>
                        <td className="py-2.5 text-right">
                          {sessionReport.session.status === 'open' ? (
                            <span className="text-white/30">-</span>
                          ) : (
                            <span className={`font-bold ${sessionReport.session.differenceQr > 0 ? 'text-emerald-400' : sessionReport.session.differenceQr < 0 ? 'text-rose-400' : 'text-white/40'}`}>
                              {sessionReport.session.differenceQr > 0 ? `+$${sessionReport.session.differenceQr.toLocaleString('es-AR')}` : sessionReport.session.differenceQr < 0 ? `-$${Math.abs(sessionReport.session.differenceQr).toLocaleString('es-AR')}` : '$0'}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* TARJETA */}
                      <tr>
                        <td className="py-2.5 text-white font-medium text-left">Tarjeta</td>
                        <td className="py-2.5 text-right text-white/80">${sessionReport.session.expectedCard.toLocaleString('es-AR')}</td>
                        <td className="py-2.5 text-right text-white/80">
                          {sessionReport.session.status === 'open' ? '-' : `$${sessionReport.session.declaredCard.toLocaleString('es-AR')}`}
                        </td>
                        <td className="py-2.5 text-right">
                          {sessionReport.session.status === 'open' ? (
                            <span className="text-white/30">-</span>
                          ) : (
                            <span className={`font-bold ${sessionReport.session.differenceCard > 0 ? 'text-emerald-400' : sessionReport.session.differenceCard < 0 ? 'text-rose-400' : 'text-white/40'}`}>
                              {sessionReport.session.differenceCard > 0 ? `+$${sessionReport.session.differenceCard.toLocaleString('es-AR')}` : sessionReport.session.differenceCard < 0 ? `-$${Math.abs(sessionReport.session.differenceCard).toLocaleString('es-AR')}` : '$0'}
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                    {sessionReport.session.status === 'closed' && (
                      <tfoot>
                        <tr className="border-t border-white/10 font-black text-xs">
                          <td className="py-3 text-amber-400 text-left">DIFERENCIA TOTAL</td>
                          <td className="py-3 text-right text-white/40"></td>
                          <td className="py-3 text-right text-white/40"></td>
                          <td className={`py-3 text-right ${sessionReport.session.differenceTotal > 0 ? 'text-emerald-400' : sessionReport.session.differenceTotal < 0 ? 'text-rose-400' : 'text-white/40'}`}>
                            {sessionReport.session.differenceTotal > 0 ? `+$${sessionReport.session.differenceTotal.toLocaleString('es-AR')}` : sessionReport.session.differenceTotal < 0 ? `-$${Math.abs(sessionReport.session.differenceTotal).toLocaleString('es-AR')}` : '$0'}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Chronological details */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-display border-b border-white/5 pb-2">Ventas de la Sesión ({sessionReport.orders.length})</h4>
                {sessionReport.orders.length === 0 ? (
                  <p className="text-xs text-white/40 italic text-center py-4">No se registraron ventas en esta sesión todavía.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto font-mono text-[11px] pr-1">
                    {sessionReport.orders.map((o: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400">#{o.id}</span>
                          <span className="text-white/60">Mesa {o.tableNumber}</span>
                          <span className="text-white/40">• {o.customerName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-white/50">{o.paymentMethod}</span>
                          <span className="font-extrabold text-emerald-400">${o.total.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {sessionReport.session.closingNote && (
                <div className="bg-[#1e293b]/40 border border-white/5 p-4 rounded-xl text-xs">
                  <strong>Observaciones del Cierre:</strong>
                  <p className="text-white/70 italic mt-1 font-mono">{sessionReport.session.closingNote}</p>
                </div>
              )}

              {/* Footer Controls */}
              <div className="flex justify-between items-center border-t border-white/10 pt-4 mt-2">
                <span className="text-[10px] text-white/40 italic">Generado desde el panel administrativo del Buffet</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadPDFReport(sessionReport)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-black" />
                    <span>Descargar PDF Oficial</span>
                  </button>
                  <button
                    onClick={() => setIsViewReportOpen(false)}
                    className="bg-white/10 hover:bg-white/15 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SELECCIONAR METODO DE PAGO INDIVIDUAL MODAL */}
      {selectedPayOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="glass-card-heavy max-w-md w-full p-6 flex flex-col gap-5 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-base text-white">Registrar Medio de Pago</h3>
              <button onClick={() => setSelectedPayOrder(null)} className="text-white/60 hover:text-white bg-white/5 p-1.5 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Pedido ID:</span>
                <span className="font-mono font-bold text-white">{selectedPayOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Cliente:</span>
                <span className="font-bold text-white">{selectedPayOrder.customerName}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-1.5 mt-0.5 text-sm">
                <span className="text-amber-400 font-bold">Total a Cobrar:</span>
                <span className="font-mono font-black text-emerald-400">${selectedPayOrder.total.toLocaleString('es-AR')}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[10px] uppercase font-bold text-white/40 font-mono tracking-wider">Seleccione el medio de pago físico:</span>
              
              <button
                onClick={() => handlePayOrder(selectedPayOrder.id, 'efectivo')}
                disabled={payingOrderId === selectedPayOrder.id}
                className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 p-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between gap-1 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  <span>Efectivo en Caja</span>
                </span>
                <span className="text-[10px] text-emerald-400/60 font-mono">Más rápido</span>
              </button>

              <button
                onClick={() => handlePayOrder(selectedPayOrder.id, 'transferencia')}
                disabled={payingOrderId === selectedPayOrder.id}
                className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 p-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between gap-1 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Landmark className="w-4 h-4" />
                  <span>Transferencia / Pago Móvil</span>
                </span>
                <span className="text-[10px] text-blue-400/60 font-mono">Bancario</span>
              </button>

              <button
                onClick={() => handlePayOrder(selectedPayOrder.id, 'qr')}
                disabled={payingOrderId === selectedPayOrder.id}
                className="w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 p-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between gap-1 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  <span>MercadoPago / Código QR</span>
                </span>
                <span className="text-[10px] text-purple-400/60 font-mono">Digital</span>
              </button>

              <button
                onClick={() => handlePayOrder(selectedPayOrder.id, 'tarjeta')}
                disabled={payingOrderId === selectedPayOrder.id}
                className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 p-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between gap-1 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Tarjeta Posnet</span>
                </span>
                <span className="text-[10px] text-amber-400/60 font-mono">Posnet físico</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
