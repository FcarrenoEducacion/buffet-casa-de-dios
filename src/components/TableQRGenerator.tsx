import React, { useState, useRef } from 'react';
import { Table, QrCode, Download, ChevronRight, Sparkles, Smartphone, Utensils, HelpCircle, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';

interface TableQRGeneratorProps {
  appUrl: string;
}

export const TableQRGenerator: React.FC<TableQRGeneratorProps> = ({ appUrl }) => {
  const [selectedTable, setSelectedTable] = useState<number>(3);
  const [exporting, setExporting] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const totalTables = 12;

  // Calculate the URL that the QR Code will encode
  const getTableUrl = (num: number) => {
    const base = (import.meta as any).env?.VITE_PUBLIC_APP_URL || appUrl || window.location.origin || "https://buffetcasadedios.com";
    return `${base}/?table=${num}`;
  };

  const qrImageUrl = (data: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=0d1e36&data=${encodeURIComponent(data)}`;
  };

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      // Delay slightly to ensure browser renders any pending frames
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3, // High scale factor for high-resolution printing / Canva integration
        cacheBust: true,
        backgroundColor: '#0c1222', // Guarantee a solid, premium dark background on the PNG file
        style: {
          borderRadius: '24px', // Keep corners beautifully rounded
          margin: '0',
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '384px', // standard max-w-sm is 384px
          boxShadow: 'none',
        },
      });

      const link = document.createElement('a');
      link.download = `qr-mesa-${selectedTable}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error al exportar la tarjeta QR a PNG:', error);
      alert('Hubo un problema al generar la tarjeta PNG. Intente nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8" id="qr-generator-section">
      {/* Control Panel (Selector) */}
      <div className="flex-1 glass-card p-6 flex flex-col gap-5 text-white">
        <div className="flex flex-col gap-1">
          <h3 className="font-display font-bold text-lg text-white">Generador de QR para Mesas</h3>
          <p className="text-xs text-white/60 leading-normal">
            Cree y descargue los códigos QR que se colocarán físicamente en cada mesa del buffet. Al escanearlos, los feligreses verán el menú y sus pedidos se vincularán automáticamente a esa mesa.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-white/70">Seleccionar Mesa para Visualizar:</label>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(totalTables)].map((_, idx) => {
              const num = idx + 1;
              return (
                <button
                  key={num}
                  onClick={() => setSelectedTable(num)}
                  id={`select-table-btn-${num}`}
                  className={`py-3.5 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                    selectedTable === num
                      ? 'bg-amber-400 border-amber-400 text-black shadow-md shadow-amber-400/20'
                      : 'border-white/10 text-white bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Mesa {num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Informative Step Guides */}
        <div className="border-t border-white/10 pt-5 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-display">Instrucciones de Uso</h4>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 text-xs items-start">
              <span className="w-5 h-5 bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-full flex items-center justify-center font-bold font-mono shrink-0">1</span>
              <p className="text-white/70">Seleccione la mesa arriba o descargue su tarjeta correspondiente.</p>
            </div>
            <div className="flex gap-3 text-xs items-start">
              <span className="w-5 h-5 bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-full flex items-center justify-center font-bold font-mono shrink-0">2</span>
              <p className="text-white/70">Suba o edite la imagen en Canva e imprímala en alta calidad.</p>
            </div>
            <div className="flex gap-3 text-xs items-start">
              <span className="w-5 h-5 bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-full flex items-center justify-center font-bold font-mono shrink-0">3</span>
              <p className="text-white/70">Coloque el impreso sobre un soporte acrílico en la mesa para que sus clientes escaneen.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleDownloadPng}
            disabled={exporting}
            id="print-qr-card-btn"
            className="w-full btn-gold text-xs font-bold py-3 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 cursor-pointer uppercase tracking-wider disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando PNG...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Descargar Tarjeta de Mesa (PNG)</span>
              </>
            )}
          </button>
          
          <a
            href={getTableUrl(selectedTable)}
            target="_blank"
            rel="noreferrer"
            className="text-center text-xs font-bold text-amber-400 hover:text-amber-300 py-1.5 underline"
          >
            Simular Escaneo (Abrir en Nueva Pestaña)
          </a>
        </div>
      </div>

      {/* Visualizer Template (Printable Layout) */}
      <div className="flex-1 flex justify-center items-center bg-black/40 backdrop-blur-md p-6 rounded-3xl border-2 border-dashed border-white/10">
        {/* Printable Card */}
        <div 
          ref={cardRef}
          id="printable-table-card" 
          className="bg-[#0c1222] border-4 border-amber-400 rounded-3xl p-6 shadow-xl max-w-sm w-full flex flex-col items-center gap-5 text-center relative overflow-hidden text-white"
        >
          {/* Decorative Corner Borders */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 translate-x-1.5 translate-y-1.5"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 -translate-x-1.5 translate-y-1.5"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 translate-x-1.5 -translate-y-1.5"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 -translate-x-1.5 -translate-y-1.5"></div>

          {/* Branding */}
          <div className="flex flex-col items-center gap-1">
            <Utensils className="w-6 h-6 text-amber-400" />
            <h2 className="font-display font-bold text-base text-white leading-none">Buffet Casa de Dios</h2>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest leading-none mt-1.5">Iglesia Casa de Dios</span>
          </div>

          {/* Divider with church design theme */}
          <div className="w-2/3 h-px bg-white/10 relative flex justify-center items-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>

          {/* Table Number Shield */}
          <div className="bg-[#0f172a]/80 text-white px-5 py-2.5 rounded-2xl flex flex-col items-center shadow-md border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display text-white/50">MESA RESERVADA</span>
            <span className="text-3xl font-black font-mono leading-none mt-0.5 text-amber-400">{selectedTable}</span>
          </div>

          {/* QR Code Container */}
          <div className="p-3 bg-white border border-white/10 rounded-2xl flex flex-col items-center gap-2">
            <img
              src={qrImageUrl(getTableUrl(selectedTable))}
              alt={`QR Mesa ${selectedTable}`}
              className="w-44 h-44 object-contain rounded-xl bg-white shadow-inner"
            />
            <span className="text-[9px] text-slate-400 font-mono select-all truncate max-w-[200px]" title={getTableUrl(selectedTable)}>
              {getTableUrl(selectedTable)}
            </span>
          </div>

          {/* Instructions for clients */}
          <div className="flex flex-col gap-2 bg-[#0f172a]/60 p-3 rounded-2xl border border-white/10">
            <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-display flex items-center justify-center gap-1">
              <Smartphone className="w-3.5 h-3.5" />
              <span>¿CÓMO REALIZAR TU PEDIDO?</span>
            </h4>
            <ol className="text-[10px] text-white/80 text-left list-decimal pl-4 flex flex-col gap-1 leading-normal font-medium">
              <li>Escaneá este código QR con tu teléfono móvil.</li>
              <li>Explorá nuestra carta e ingresá tus datos en el carrito.</li>
              <li>Realizá tu pago digital (tarjeta) o indicalo para pagar en caja.</li>
              <li>¡Listo! Te avisaremos al celular para que retires tu plato en la barra.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
