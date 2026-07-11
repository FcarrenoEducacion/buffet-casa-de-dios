export type OrderStatus = 'recibido' | 'preparando' | 'listo' | 'entregado' | 'desestimado';

export interface Dish {
  id: string;
  name: string;
  nameEn?: string; // English translation for name
  description: string;
  descriptionEn?: string; // English translation for description
  price: number;
  category: string;
  image: string;
  tags: string[];
  purpose: string; // The spiritual/charitable tagline for "Buffet Casa de Dios"
  purposeEn?: string; // English translation for purpose
  available: boolean;
  stock: number;
  imageFit?: 'cover' | 'contain';
}

export interface OrderItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  tableNumber: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod: 'efectivo' | 'transferencia' | 'qr' | 'tarjeta' | 'simulado_tarjeta';
  paymentStatus: 'pendiente' | 'pagado' | 'cancelado';
  source?: 'qr_customer' | 'manual_cashier';
  cashierName?: string;
  cashSessionId?: string;
  paidAt?: string;
  approvedAt?: string;
  dismissedAt?: string;
  dismissedBy?: string;
  dismissedReason?: string;
  hasCreditNote?: boolean;
  creditNoteAmount?: number;
  notes?: string;
}

export interface CashSession {
  id: string;
  openedBy: string;
  openingAmount: number;
  openingNote?: string;
  openedAt: string;
  closedBy?: string;
  closedAt?: string;
  status: 'open' | 'closed';
  expectedCash: number;
  countedCash?: number;
  totalCash: number;
  totalTransfer: number;
  totalQr: number;
  totalCard: number;
  totalSales: number;
  difference?: number;
  closingNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashMovement {
  id: string;
  cashSessionId: string;
  orderId?: string;
  type: 'opening' | 'sale' | 'manual_sale' | 'refund' | 'adjustment' | 'credit_note' | 'closing' | string;
  paymentMethod?: 'efectivo' | 'transferencia' | 'qr' | 'tarjeta';
  amount: number;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

