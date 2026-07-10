import React, { useState, useRef } from 'react';
import { CartItem } from '../App';
import { Dish } from '../types';
import { ShoppingBasket, Trash2, Table, User, Phone, CreditCard, Sparkles, AlertCircle, Coins, Copy, Check, QrCode, Landmark } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface CartDrawerProps {
  cartItems: CartItem[];
  onUpdateQuantity: (dishId: string, quantity: number) => void;
  onRemoveItem: (dishId: string) => void;
  onCheckout: (details: {
    customerName: string;
    customerPhone: string;
    tableNumber: string;
    paymentMethod: 'transferencia' | 'efectivo_caja' | 'qr_caja' | 'tarjeta_caja' | 'simulado_tarjeta' | 'pago_movil';
  }) => void;
  onClose: () => void;
  initialTableNumber: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onClose,
  initialTableNumber
}) => {
  const { language, formatPrice, t } = useApp();
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>(initialTableNumber);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Main payment methods selection state
  const [mainPaymentMethod, setMainPaymentMethod] = useState<'transferencia' | 'caja'>('transferencia');
  const [cajaSubMethod, setCajaSubMethod] = useState<'efectivo' | 'qr' | 'tarjeta'>('efectivo');
  const [copiedAlias, setCopiedAlias] = useState<boolean>(false);
  
  const [error, setError] = useState<string>('');

  const total = cartItems.reduce((acc, item) => acc + item.dish.price * item.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName.trim()) {
      setError(
        language === 'en' 
          ? 'Please enter your name to identify your order.' 
          : 'Por favor ingrese su nombre para identificar el pedido.'
      );
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!tableNumber || tableNumber === "seleccionar") {
      setError(
        language === 'en' 
          ? 'Please select the table number where you are located.' 
          : 'Por favor elija el número de mesa en el que está ubicado.'
      );
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (cartItems.length === 0) {
      setError(
        language === 'en' 
          ? 'The cart is empty. Add dishes to continue.' 
          : 'El carrito está vacío. Agregue platos para continuar.'
      );
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const finalPaymentMethod = mainPaymentMethod === 'transferencia' 
      ? 'transferencia' 
      : (cajaSubMethod === 'efectivo' ? 'efectivo_caja' : (cajaSubMethod === 'qr' ? 'qr_caja' : 'tarjeta_caja'));

    onCheckout({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      tableNumber,
      paymentMethod: finalPaymentMethod
    });
  };

  const handleCopyAlias = () => {
    navigator.clipboard.writeText('casadedios24');
    setCopiedAlias(true);
    setTimeout(() => setCopiedAlias(false), 2000);
  };

  const isTableLocked = !!initialTableNumber && initialTableNumber !== "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" id="cart-drawer-overlay" onClick={onClose}>
      <div 
        className="w-full max-w-md glass-card-heavy h-full flex flex-col shadow-2xl overflow-hidden animate-slide-left text-white border-y-0 border-r-0 rounded-r-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-black/30 border-b border-white/10 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="w-5 h-5 text-amber-400" />
            <h2 className="font-display font-bold text-lg">{t.cartTitle}</h2>
          </div>
          <button 
            onClick={onClose}
            id="close-cart-btn"
            className="text-white/85 hover:text-white text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
          >
            {t.cartClose}
          </button>
        </div>

        {/* Form and items scroll area */}
        <div 
          ref={scrollContainerRef}
          className="flex-grow overflow-y-auto p-5 flex flex-col gap-5"
        >
          {cartItems.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8 gap-3 my-auto">
              <div className="p-4 bg-white/5 border border-white/10 rounded-full text-white/40">
                <ShoppingBasket className="w-10 h-10" />
              </div>
              <h3 className="font-display font-semibold text-white">{t.cartEmpty}</h3>
              <p className="text-xs text-white/60 max-w-xs">
                {t.cartEmptyDesc}
              </p>
              <button
                onClick={onClose}
                className="mt-2 btn-gold px-5 py-2.5 rounded-xl transition-all cursor-pointer text-xs"
              >
                {t.cartViewDishes}
              </button>
            </div>
          ) : (
            <>
              {/* Selected Items List */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider font-display">
                  {t.cartSelectedDishes}
                </h3>
                <div className="flex flex-col gap-2">
                  {cartItems.map((item) => {
                    const dishName = language === 'en' && item.dish.nameEn ? item.dish.nameEn : item.dish.name;
                    const dishPurpose = language === 'en' && item.dish.purposeEn ? item.dish.purposeEn : item.dish.purpose;
                    return (
                      <div 
                        key={item.dish.id} 
                        className="bg-white/5 p-3 rounded-2xl border border-white/10 shadow-sm flex gap-3 items-center"
                      >
                        <img 
                          src={item.dish.image} 
                          alt={dishName}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 object-cover rounded-xl shrink-0 bg-white/5"
                        />
                        <div className="flex-grow min-w-0 flex flex-col gap-1">
                          <h4 className="font-display font-semibold text-xs text-white truncate leading-tight">
                            {dishName}
                          </h4>
                          <span className="text-[10px] text-white/50 font-mono font-bold">
                            {formatPrice(item.dish.price)} {language === 'en' ? 'each' : 'c/u'}
                          </span>
                          
                          <p className="text-[9px] text-amber-400 font-medium italic serif leading-none truncate">
                            "{dishPurpose}"
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <button 
                            onClick={() => onRemoveItem(item.dish.id)}
                            id={`remove-item-${item.dish.id}`}
                            className="text-white/40 hover:text-rose-400 p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
                            title={language === 'en' ? 'Remove' : 'Eliminar'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10 text-xs text-white">
                            <button 
                              onClick={() => onUpdateQuantity(item.dish.id, Math.max(1, item.quantity - 1))}
                              id={`cart-dec-${item.dish.id}`}
                              className="px-2 py-0.5 hover:bg-white/10 rounded font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2 font-bold font-mono text-white">{item.quantity}</span>
                            <button 
                              onClick={() => onUpdateQuantity(item.dish.id, item.quantity + 1)}
                              id={`cart-inc-${item.dish.id}`}
                              className="px-2 py-0.5 hover:bg-white/10 rounded font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer and Placement details form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 shadow-sm">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider font-display border-b border-white/10 pb-1.5">
                  {t.cartMesaDelivery}
                </h3>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex gap-2 items-start text-xs text-rose-200">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Table selector (locked if QR simulated) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-white/60 flex items-center gap-1">
                    <Table className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.cartMesaLabel}</span>
                  </label>
                  {isTableLocked ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-white rounded-xl px-3 py-2.5 text-xs font-bold flex justify-between items-center">
                      <span>{t.cartMesaLinked.replace('{num}', tableNumber)}</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase">
                        {language === 'en' ? 'Linked' : 'Activa'}
                      </span>
                    </div>
                  ) : (
                    <select
                      value={tableNumber}
                      id="table-selector-cart"
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
                    >
                      <option value="seleccionar" className="bg-[#0f172a] text-white">
                        {t.cartMesaSelect}
                      </option>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <option key={n} value={String(n)} className="bg-[#0f172a] text-white">
                          {language === 'en' ? `Table ${n}` : `Mesa ${n}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Customer Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-white/60 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.cartWhoPicksUp}</span>
                  </label>
                  <input
                    type="text"
                    id="customer-name-input"
                    placeholder={t.cartWhoPlaceholder}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white placeholder-white/30"
                  />
                </div>

                {/* Customer Phone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-white/60 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.cartPhone}</span>
                  </label>
                  <input
                    type="tel"
                    id="customer-phone-input"
                    placeholder={t.cartPhonePlaceholder}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white placeholder-white/30"
                  />
                  <span className="text-[10px] text-white/40">{t.cartPhoneHint}</span>
                </div>

                {/* Billing options selection */}
                <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
                  <label className="text-xs font-bold text-white/60 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'en' ? 'Payment Method' : 'Método de Pago'}</span>
                  </label>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      id="pay-method-transfer"
                      onClick={() => setMainPaymentMethod('transferencia')}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                        mainPaymentMethod === 'transferencia'
                          ? 'border-amber-400 bg-amber-400/15 text-amber-400 font-bold'
                          : 'border-white/10 text-white/60 hover:bg-white/5'
                      }`}
                    >
                      <Landmark className="w-4 h-4" />
                      <span className="text-xs font-semibold leading-none">
                        {language === 'en' ? 'Bank Transfer' : 'Transferencia'}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="pay-method-cashier"
                      onClick={() => setMainPaymentMethod('caja')}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                        mainPaymentMethod === 'caja'
                          ? 'border-amber-400 bg-amber-400/15 text-amber-400 font-bold'
                          : 'border-white/10 text-white/60 hover:bg-white/5'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span className="text-xs font-semibold leading-none">
                        {language === 'en' ? 'Pay at Cashier' : 'Pagar por Caja'}
                      </span>
                    </button>
                  </div>

                  {/* Transfer details box */}
                  {mainPaymentMethod === 'transferencia' && (
                    <div className="mt-1 bg-[#0f172a]/60 border border-amber-400/20 rounded-2xl p-3 flex flex-col gap-2 animate-scale-up">
                      <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-xl border border-white/5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">
                            Alias Bancario
                          </span>
                          <span className="text-sm font-black font-mono text-amber-400">
                            casadedios24
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyAlias}
                          className="p-2 rounded-lg bg-amber-400 text-black hover:bg-amber-300 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                        >
                          {copiedAlias ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{language === 'en' ? 'Copied' : 'Copiado'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{language === 'en' ? 'Copy' : 'Copiar'}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        {language === 'en' 
                          ? '* Send the transfer for the total amount to the alias above. Then check in at the cashier for confirmation.'
                          : '* Realiza la transferencia por el total al alias indicado y confirma tu pago en caja para pasar tu pedido a la cocina.'}
                      </p>
                    </div>
                  )}

                  {/* Cashier payment suboptions */}
                  {mainPaymentMethod === 'caja' && (
                    <div className="mt-1 bg-[#0f172a]/60 border border-white/10 rounded-2xl p-3 flex flex-col gap-3 animate-scale-up">
                      <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                        {language === 'en' ? 'Choose payment option at cashier:' : 'Selecciona cómo abonarás en caja:'}
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCajaSubMethod('efectivo')}
                          className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            cajaSubMethod === 'efectivo'
                              ? 'border-amber-400 bg-amber-400/10 text-amber-400 font-bold'
                              : 'border-white/5 text-white/50 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-semibold">
                            {language === 'en' ? 'Cash' : 'Efectivo'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCajaSubMethod('qr')}
                          className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            cajaSubMethod === 'qr'
                              ? 'border-amber-400 bg-amber-400/10 text-amber-400 font-bold'
                              : 'border-white/5 text-white/50 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-semibold">QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCajaSubMethod('tarjeta')}
                          className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            cajaSubMethod === 'tarjeta'
                              ? 'border-amber-400 bg-amber-400/10 text-amber-400 font-bold'
                              : 'border-white/5 text-white/50 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-semibold">
                            {language === 'en' ? 'Card' : 'Tarjeta'}
                          </span>
                        </button>
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        {language === 'en'
                          ? '* Your order is registered as pending. Head to the cash register to pay.'
                          : '* Tu comanda quedará registrada. Dirígete a la caja para abonar y autorizar tu comanda.'}
                      </p>
                    </div>
                  )}
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer sticky Totalizer and Order dispatching */}
        {cartItems.length > 0 && (
          <div className="bg-[#0f172a]/50 border-t border-white/10 p-5 shrink-0 flex flex-col gap-4">
            {error && (
              <div className="bg-rose-500/20 border border-rose-500/40 rounded-xl p-3 flex gap-2 items-start text-xs text-rose-200 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="font-semibold">{error}</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-white/60 font-display">{t.cartSubtotal}</span>
                <span className="text-sm font-semibold text-white font-mono">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/10">
                <span className="text-base font-bold text-white font-display">{t.cartTotal}</span>
                <span className="text-xl font-black text-amber-400 font-mono">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Social Impact message */}
            <div className="bg-emerald-500/10 rounded-xl p-2.5 border border-emerald-500/20 flex items-center gap-2 text-white/90">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse-subtle" />
              <span className="text-[10px] leading-normal font-medium">
                {t.cartSolidarityNote}
              </span>
            </div>

            <button
              onClick={handleSubmit}
              id="submit-order-btn"
              className="w-full btn-gold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 cursor-pointer text-xs"
            >
              <span>
                {mainPaymentMethod === 'transferencia' 
                  ? (language === 'en' ? 'Submit & Transfer' : 'Confirmar Pedido por Transferencia')
                  : (cajaSubMethod === 'efectivo' 
                      ? (language === 'en' ? 'Pay Cash at Counter' : 'Pagar en Efectivo por Caja')
                      : (cajaSubMethod === 'qr'
                          ? (language === 'en' ? 'Pay with QR at Counter' : 'Pagar con QR por Caja')
                          : (language === 'en' ? 'Pay with Card at Counter' : 'Pagar con Tarjeta por Caja')
                        )
                    )
                }
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
