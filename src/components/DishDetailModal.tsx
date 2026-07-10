import React, { useState } from 'react';
import { Dish } from '../types';
import { X, Sparkles, ShoppingBag, ShieldCheck, ZoomIn } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface DishDetailModalProps {
  dish: Dish | null;
  onClose: () => void;
  onAdd: (dish: Dish, quantity: number) => void;
}

export const DishDetailModal: React.FC<DishDetailModalProps> = ({ dish, onClose, onAdd }) => {
  const maxQty = dish?.stock !== undefined ? dish.stock : 20;
  const [quantity, setQuantity] = useState<number>(maxQty === 0 ? 0 : 1);
  const { language, formatPrice, setPreviewImage } = useApp();

  if (!dish) return null;

  const nameText = language === 'en' && dish.nameEn ? dish.nameEn : dish.name;
  const descText = language === 'en' && dish.descriptionEn ? dish.descriptionEn : dish.description;
  const purposeText = language === 'en' && dish.purposeEn ? dish.purposeEn : dish.purpose;

  const handleAdd = () => {
    if (quantity > 0) {
      onAdd(dish, quantity);
      setQuantity(maxQty === 0 ? 0 : 1);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="dish-detail-modal">
      <div 
        className="relative glass-card-heavy overflow-hidden shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col transition-all transform scale-100 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div 
          className="relative h-60 w-full overflow-hidden bg-slate-950/40 flex items-center justify-center cursor-zoom-in group/img"
          onClick={() => setPreviewImage(dish.image)}
          title={language === 'en' ? 'Click to enlarge image' : 'Click para ampliar imagen'}
        >
          {/* Blurred Ambient Glow Backdrop for contain mode */}
          {dish.imageFit === 'contain' && (
            <div 
              className="absolute inset-0 bg-cover bg-center filter blur-xl scale-110 opacity-40 select-none pointer-events-none"
              style={{ backgroundImage: `url(${dish.image})` }}
            />
          )}

          <img
            src={dish.image}
            alt={nameText}
            referrerPolicy="no-referrer"
            className={`w-full h-full transition-transform duration-500 group-hover/img:scale-105 ${
              dish.imageFit === 'contain' 
                ? 'object-contain p-4 z-10' 
                : 'object-cover'
            }`}
          />
          {/* Zoom icon on hover */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-1.5 text-white text-xs font-bold font-display">
            <ZoomIn className="w-5 h-5 text-amber-400" />
            <span>{language === 'en' ? 'Zoom' : 'Ampliar'}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            id="close-detail-modal"
            className="absolute top-4 right-4 bg-black/45 hover:bg-black/65 text-white p-2 rounded-full backdrop-blur-md transition-all cursor-pointer z-20"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="absolute bottom-4 left-4 flex gap-1 z-20" onClick={(e) => e.stopPropagation()}>
            {dish.tags.map(tag => (
              <span 
                key={tag}
                className="bg-[#0f172a]/90 backdrop-blur-md text-amber-400 text-[10px] font-bold px-3 py-1 rounded-md shadow-sm uppercase tracking-wider border border-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Content Details */}
        <div className="p-6 flex flex-col gap-5 flex-grow">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono uppercase tracking-wider text-white/40">
              {dish.category}
            </span>
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-2xl font-bold font-display text-white leading-tight">{nameText}</h2>
              <span className="text-2xl font-extrabold text-amber-400 font-mono">
                {formatPrice(dish.price)}
              </span>
            </div>
          </div>

          <div className="text-white/80 text-sm leading-relaxed flex flex-col gap-1.5">
            <h4 className="font-bold text-white/40 font-display text-xs uppercase tracking-wider">
              {language === 'en' ? 'Dish Description' : 'Descripción del Plato'}
            </h4>
            <p>{descText}</p>
          </div>

          {/* Gourmet Recommendation Container */}
          <div className="bg-amber-400/5 border border-amber-400/10 rounded-2xl p-4 flex gap-3 items-start">
            <div className="bg-amber-400 text-black p-1.5 rounded-lg shrink-0 mt-0.5 shadow-sm">
              <Sparkles className="w-4 h-4 animate-spin-slow text-black" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider font-display">
                {language === 'en' ? "Chef's Recommendation" : "Recomendación del Chef"}
              </h4>
              <p className="text-xs text-white font-medium leading-relaxed italic serif">
                "{purposeText}"
              </p>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-400/80 font-semibold uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'en' ? 'Selected ingredients' : 'Ingredientes seleccionados'}</span>
              </div>
            </div>
          </div>

          {/* Add-to-cart controller */}
          <div className="flex flex-col gap-4 pt-4 border-t border-white/10 mt-2">
            <div className="flex justify-between items-center gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white/70 font-display">
                  {language === 'en' ? 'Quantity to request' : 'Cantidad a solicitar'}
                </span>
                {maxQty > 0 && maxQty <= 4 && (
                  <span className="text-[10px] text-amber-400 font-bold animate-pulse">
                    {language === 'en' ? `Only ${maxQty} available` : `Solo quedan ${maxQty} unidades`}
                  </span>
                )}
                {maxQty === 0 && (
                  <span className="text-[10px] text-rose-400 font-bold">
                    {language === 'en' ? 'Out of stock' : 'Producto agotado'}
                  </span>
                )}
              </div>
              
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  id="dec-qty-btn"
                  className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-lg text-lg font-bold transition-all cursor-pointer"
                  disabled={quantity <= 1 || maxQty === 0}
                >
                  -
                </button>
                <span className="w-10 text-center font-bold text-sm text-white font-mono">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                  id="inc-qty-btn"
                  className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-lg text-lg font-bold transition-all cursor-pointer"
                  disabled={quantity >= maxQty || maxQty === 0}
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 text-sm font-semibold text-white/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                {language === 'en' ? 'Back' : 'Volver'}
              </button>
              <button
                onClick={handleAdd}
                disabled={maxQty === 0 || quantity === 0}
                id="add-to-cart-modal-btn"
                className={`flex-2 py-3 px-6 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-lg flex justify-center items-center gap-2 cursor-pointer ${
                  maxQty === 0 || quantity === 0
                    ? 'bg-rose-950/20 text-rose-400 border border-rose-500/20 cursor-not-allowed shadow-none'
                    : 'btn-gold'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {maxQty === 0 
                    ? (language === 'en' ? 'Out of stock' : 'Sin stock') 
                    : `${language === 'en' ? 'Add' : 'Agregar'} • ${formatPrice(dish.price * quantity)}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
