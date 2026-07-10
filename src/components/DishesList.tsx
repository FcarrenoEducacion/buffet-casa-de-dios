import React, { useState } from 'react';
import { Dish } from '../types';
import { Search, Sparkles, BadgeInfo, ZoomIn } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface DishesListProps {
  dishes: Dish[];
  onAdd: (dish: Dish) => void;
  onSelectDish: (dish: Dish) => void;
}

export const DishesList: React.FC<DishesListProps> = ({ dishes, onAdd, onSelectDish }) => {
  const { language, formatPrice, t, setPreviewImage } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<'Todos' | 'cafe' | 'buffet'>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Helper to determine if a dish belongs to cafe or buffet
  const getSection = (categoryName: string | null | undefined): 'cafe' | 'buffet' => {
    if (!categoryName) return 'buffet';
    const lower = String(categoryName).toLowerCase();
    if (
      lower.includes('caf') || 
      lower.includes('snack') || 
      lower.includes('galleta') || 
      lower.includes('bebida') ||
      lower.includes('sweet') ||
      lower.includes('cookie')
    ) {
      return 'cafe';
    }
    return 'buffet';
  };

  // Filter items matching the query
  const matchesSearch = (dish: Dish): boolean => {
    const q = searchQuery.toLowerCase();
    const nameEs = (dish.name || '').toLowerCase();
    const nameEn = (dish.nameEn || '').toLowerCase();
    const descEs = (dish.description || '').toLowerCase();
    const descEn = (dish.descriptionEn || '').toLowerCase();
    const purpEs = (dish.purpose || '').toLowerCase();
    const purpEn = (dish.purposeEn || '').toLowerCase();

    return nameEs.includes(q) || 
           nameEn.includes(q) || 
           descEs.includes(q) || 
           descEn.includes(q) || 
           purpEs.includes(q) || 
           purpEn.includes(q);
  };

  // Group dishes for the "Todos" view
  const cafeDishes = dishes.filter(d => d.available !== false && getSection(d.category) === 'cafe' && matchesSearch(d));
  const buffetDishes = dishes.filter(d => d.available !== false && getSection(d.category) === 'buffet' && matchesSearch(d));

  const totalFilteredCount = 
    selectedCategory === 'Todos' ? (cafeDishes.length + buffetDishes.length) :
    selectedCategory === 'cafe' ? cafeDishes.length : buffetDishes.length;

  const renderDishCard = (dish: Dish) => {
    const defaultImage = "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=60";
    const nameText = language === 'en' && dish.nameEn ? dish.nameEn : (dish.name || '');
    const descText = language === 'en' && dish.descriptionEn ? dish.descriptionEn : (dish.description || '');
    const purposeText = language === 'en' && dish.purposeEn ? dish.purposeEn : (dish.purpose || '');
    const dishImage = dish.image || defaultImage;

    return (
      <div
        key={dish.id}
        id={`dish-card-${dish.id}`}
        className="glass-card overflow-hidden hover:shadow-2xl hover:shadow-amber-400/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group"
      >
        {/* Image Container with elegant overlay */}
        <div 
          className="relative h-48 w-full overflow-hidden bg-slate-950/40 flex items-center justify-center cursor-zoom-in group/img"
          onClick={() => setPreviewImage(dishImage)}
          title={language === 'en' ? 'Click to enlarge image' : 'Click para ampliar imagen'}
        >
          {/* Blurred Ambient Glow Backdrop for contain mode */}
          {dish.imageFit === 'contain' && (
            <div 
              className="absolute inset-0 bg-cover bg-center filter blur-xl scale-110 opacity-40 select-none pointer-events-none"
              style={{ backgroundImage: `url(${dishImage})` }}
            />
          )}

          <img
            src={dishImage}
            alt={nameText}
            referrerPolicy="no-referrer"
            className={`w-full h-full transition-transform duration-500 group-hover/img:scale-105 ${
              dish.imageFit === 'contain' 
                ? 'object-contain p-2.5 z-10' 
                : 'object-cover'
            }`}
            loading="lazy"
          />

          {/* Zoom icon on hover */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-1.5 text-white text-xs font-bold font-display">
            <ZoomIn className="w-5 h-5 text-amber-400" />
            <span>{language === 'en' ? 'Zoom' : 'Ampliar'}</span>
          </div>
          
          {/* Category badge */}
          <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10 shadow-sm uppercase tracking-wider font-mono">
            {language === 'en' && getSection(dish.category) === 'cafe' ? 'Cafeteria & Snacks' :
             language === 'en' && getSection(dish.category) === 'buffet' ? 'Buffet Service' :
             getSection(dish.category) === 'cafe' ? 'Cafetería y Snacks' : 'Servicio de Buffet'}
          </span>

          {/* Hot/Dietary tag and stock indicators */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end z-10">
            {dish.stock === 0 ? (
              <span className="bg-rose-600 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md border border-rose-400/30 uppercase tracking-wider shadow-sm">
                {language === 'en' ? 'Out of stock' : 'Sin stock'}
              </span>
            ) : dish.stock <= 4 ? (
              <span className="bg-amber-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-md border border-amber-300/30 uppercase tracking-wider shadow-sm animate-pulse">
                {language === 'en' ? `Only ${dish.stock} left!` : `¡Solo ${dish.stock} disp!`}
              </span>
            ) : null}

            <div className="flex gap-1">
              {dish.tags.map(tag => (
                <span 
                  key={tag}
                  className="bg-[#0f172a]/80 backdrop-blur-md text-amber-400 text-[9px] font-semibold px-2 py-0.5 rounded-md border border-white/5 shadow-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>

        {/* Dish Metadata Content */}
        <div className="p-5 flex flex-col flex-grow justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-start gap-2">
              <h3 
                className="font-display font-semibold text-base md:text-lg text-white leading-tight hover:text-amber-400 transition-colors cursor-pointer" 
                onClick={() => onSelectDish(dish)}
              >
                {nameText}
              </h3>
              <div className="text-right whitespace-nowrap">
                <span className="text-[9px] uppercase font-bold text-white/50 block">
                  {t.priceLabel}
                </span>
                <span className="text-base font-bold text-amber-400 font-mono">
                  {formatPrice(dish.price)}
                </span>
              </div>
            </div>

            <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
              {descText}
            </p>
          </div>

          {/* Gourmet Recommendation Box */}
          <div className="bg-amber-400/5 border border-amber-400/10 rounded-2xl p-3 flex gap-2 items-start mt-1">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse-subtle" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider font-display">
                {language === 'en' ? "Chef's Recommendation" : "Recomendación del Chef"}
              </span>
              <p className="text-[11px] text-white/90 font-medium leading-normal italic serif">
                "{purposeText}"
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-white/10 items-center">
            <button
              onClick={() => onSelectDish(dish)}
              id={`btn-info-${dish.id}`}
              className="flex-1 text-center py-2 rounded-xl border border-white/10 text-white/80 hover:text-white hover:bg-white/5 text-xs font-semibold tracking-wide transition-all cursor-pointer"
            >
              {t.detailsBtn}
            </button>
            <button
              onClick={() => onAdd(dish)}
              id={`btn-add-${dish.id}`}
              disabled={dish.stock === 0}
              className={`flex-2 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md flex justify-center items-center gap-1.5 cursor-pointer ${
                dish.stock === 0
                  ? 'bg-rose-950/20 text-rose-400 border border-rose-500/20 cursor-not-allowed shadow-none'
                  : 'btn-gold'
              }`}
            >
              {dish.stock === 0 
                ? (language === 'en' ? 'Out of stock' : 'Sin stock') 
                : t.addBtn}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6" id="dishes-section">
      {/* Search and Filters bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
          <input
            type="text"
            id="search-input"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-sm placeholder-white/40 transition-all bg-white/5 text-white"
          />
        </div>
        
        {/* Category Filter pills */}
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none scroll-smooth">
          {(['Todos', 'cafe', 'buffet'] as const).map((cat) => (
            <button
              key={cat}
              id={`cat-btn-${cat}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'bg-white/5 text-white/85 hover:bg-white/10 border border-white/10'
              }`}
            >
              {cat === 'Todos' ? t.allCategories : cat === 'cafe' ? t.secCafe : t.secBuffet}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Grid */}
      {totalFilteredCount > 0 ? (
        <div className="flex flex-col gap-10">
          
          {/* SECTION A: CAFE & SNACKS */}
          {(selectedCategory === 'Todos' || selectedCategory === 'cafe') && cafeDishes.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full"></div>
                <h3 className="text-lg font-bold font-display text-white uppercase tracking-wider">
                  {t.secCafe}
                </h3>
                <span className="text-xs text-white/40 font-mono font-bold">({cafeDishes.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {cafeDishes.map(renderDishCard)}
              </div>
            </div>
          )}

          {/* SECTION B: BUFFET */}
          {(selectedCategory === 'Todos' || selectedCategory === 'buffet') && buffetDishes.length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full"></div>
                <h3 className="text-lg font-bold font-display text-white uppercase tracking-wider">
                  {t.secBuffet}
                </h3>
                <span className="text-xs text-white/40 font-mono font-bold">({buffetDishes.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {buffetDishes.map(renderDishCard)}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="text-center py-16 glass-card p-8 flex flex-col items-center gap-3">
          <BadgeInfo className="w-12 h-12 text-white/20" />
          <h3 className="text-lg font-semibold text-white font-display">{t.noDishesFound}</h3>
          <p className="text-xs text-white/60 max-w-md">
            {t.noDishesDesc}
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('Todos'); }}
            className="mt-2 btn-gold px-4 py-2 rounded-xl transition-all cursor-pointer text-xs"
          >
            {t.showAllMenu}
          </button>
        </div>
      )}
    </div>
  );
};
