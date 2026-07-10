import React, { useState } from 'react';
import { CreditCard, Shield, Landmark, Smartphone, Loader, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface PaymentModalProps {
  total: number;
  paymentMethod: 'simulado_tarjeta' | 'pago_movil';
  customerName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  total,
  paymentMethod,
  customerName,
  onSuccess,
  onCancel
}) => {
  const { language, formatPrice, t } = useApp();
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardName, setCardName] = useState<string>(customerName);
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [phoneWallet, setPhoneWallet] = useState<string>('');

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('processing');
    
    // Simulate payment clearing latency (2 seconds)
    setTimeout(() => {
      setStatus('completed');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" id="payment-gateway-modal">
      <div 
        className="glass-card-heavy overflow-hidden shadow-2xl max-w-md w-full p-6 flex flex-col gap-6 transition-all transform scale-100 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="font-display font-bold text-base text-white">{t.payTitle}</h3>
          </div>
          <span className="text-xs font-semibold text-white/40 font-mono">{t.paySandbox}</span>
        </div>

        {status === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
            <Loader className="w-12 h-12 text-amber-400 animate-spin" />
            <div className="flex flex-col">
              <h4 className="font-display font-semibold text-white">{t.payProcessing}</h4>
              <p className="text-xs text-white/60 mt-1">{t.payProcessingDesc}</p>
            </div>
            <span className="text-lg font-bold text-amber-400 font-mono mt-2">{formatPrice(total)}</span>
          </div>
        )}

        {status === 'completed' && (
          <div className="py-12 flex flex-col items-center justify-center gap-4 text-center animate-scale-up">
            <CheckCircle className="w-16 h-16 text-emerald-400" />
            <div className="flex flex-col">
              <h4 className="font-display font-bold text-lg text-emerald-200">{t.payCompleted}</h4>
              <p className="text-xs text-emerald-300/80 mt-1">{t.payCompletedDesc}</p>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-mono px-3 py-1 rounded-full uppercase font-bold">
              {t.payApproved}
            </span>
          </div>
        )}

        {status === 'idle' && (
          <form onSubmit={handlePay} className="flex flex-col gap-5">
            {/* Payment Summary */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-xs text-white/40 uppercase tracking-wider font-display font-bold">{t.payDebitedTotal}</span>
                <span className="text-xs font-semibold text-white/80 leading-tight">Buffet Casa de Dios</span>
              </div>
              <span className="text-2xl font-black text-amber-400 font-mono">{formatPrice(total)}</span>
            </div>

            {paymentMethod === 'simulado_tarjeta' ? (
              <div className="flex flex-col gap-4">
                {/* Visual Credit Card */}
                <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between h-44 border border-white/10">
                  {/* Subtle Background Art */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl translate-x-10 -translate-y-10"></div>
                  
                  <div className="flex justify-between items-start">
                    <Landmark className="w-6 h-6 text-amber-400" />
                    <span className="text-[9px] bg-white/10 border border-white/15 px-2 py-0.5 rounded uppercase font-bold tracking-wider font-mono">
                      {language === 'en' ? 'Credit Card' : 'Tarjeta de Crédito'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 z-10">
                    <span className="text-lg font-mono tracking-widest block font-bold">
                      {cardNumber || "•••• •••• •••• ••••"}
                    </span>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/50 uppercase tracking-wider leading-none">
                          {language === 'en' ? 'Holder' : 'Titular'}
                        </span>
                        <span className="text-xs font-semibold truncate max-w-[200px] block text-amber-400">
                          {cardName.toUpperCase() || (language === 'en' ? 'HOLDER NAME' : 'TITULAR TARJETA')}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[8px] text-white/50 uppercase tracking-wider leading-none">
                          {language === 'en' ? 'Expires' : 'Vence'}
                        </span>
                        <span className="text-xs font-semibold font-mono block text-amber-400">
                          {cardExpiry || "MM/AA"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card input forms */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-white/60">{t.payCardNumber}</label>
                    <input
                      type="text"
                      id="card-num-input"
                      required
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white placeholder-white/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-white/60">{t.payCardHolder}</label>
                    <input
                      type="text"
                      id="card-name-input"
                      required
                      placeholder={customerName || "Juan Pérez"}
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white placeholder-white/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-white/60">{t.payCardExpiry}</label>
                      <input
                        type="text"
                        id="card-exp-input"
                        required
                        placeholder="MM/AA"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/[^0-9]/g, "");
                          if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2, 4)}`;
                          setCardExpiry(v);
                        }}
                        className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-center focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white placeholder-white/20"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-white/60">{t.payCardCvv}</label>
                      <input
                        type="password"
                        id="card-cvv-input"
                        required
                        placeholder="•••"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-center focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white placeholder-white/20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 items-center">
                {/* QR Code Simulation for Mobile Payments */}
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex flex-col items-center gap-3 w-full">
                  <Smartphone className="w-8 h-8 text-amber-400 animate-pulse-subtle" />
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-white">
                      {language === 'en' ? 'Smart Mobile Payment' : 'Pago Inteligente Móvil'}
                    </span>
                    <p className="text-[10px] text-white/60 text-center max-w-[240px] mt-0.5 leading-normal">
                      {language === 'en' 
                        ? 'Scan the QR code with your bank wallet app or enter your registered phone.'
                        : 'Escanee el código QR bancario con su App financiera o ingrese su número afiliado.'}
                    </p>
                  </div>

                  {/* QR Box placeholder with CSS bars */}
                  <div className="w-36 h-36 border-4 border-amber-400 rounded-2xl flex items-center justify-center p-2 bg-white relative">
                    <div className="grid grid-cols-5 gap-2 w-full h-full opacity-80">
                      {[...Array(25)].map((_, i) => (
                        <div key={i} className={`rounded-sm ${i % 3 === 0 || i % 4 === 1 ? 'bg-[#0f172a]' : 'bg-slate-100'}`} />
                      ))}
                    </div>
                    <div className="absolute inset-x-0 h-0.5 bg-rose-500 animate-bounce"></div>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-1">
                  <label className="text-xs font-bold text-white/60">{t.payWalletNumber}</label>
                  <input
                    type="tel"
                    id="phone-wallet-input"
                    required
                    placeholder="+54 9 11 5555-5555"
                    value={phoneWallet}
                    onChange={(e) => setPhoneWallet(e.target.value)}
                    className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white placeholder-white/20"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 text-xs font-semibold text-white/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                {t.payCancel}
              </button>
              <button
                type="submit"
                id="execute-payment-btn"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg cursor-pointer flex justify-center items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{t.paySubmit} {formatPrice(total)}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
