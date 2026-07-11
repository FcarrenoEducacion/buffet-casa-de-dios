import React, { useMemo, useRef, useState } from "react";
import {
  Download,
  Loader2,
  Smartphone,
  Sparkles,
  Utensils,
} from "lucide-react";
import { toPng } from "html-to-image";

interface TableQRGeneratorProps {
  appUrl: string;
}

export const TableQRGenerator: React.FC<TableQRGeneratorProps> = ({ appUrl }) => {
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [exporting, setExporting] = useState<boolean>(false);

  const previewCardRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);

  const totalTables = 12;

  const getPublicBaseUrl = () => {
    const envUrl =
      (import.meta as any).env?.VITE_PUBLIC_APP_URL ||
      appUrl ||
      window.location.origin ||
      "https://buffet-casa-de-dios.vercel.app";

    return String(envUrl).replace(/\/$/, "");
  };

  const getTableUrl = (tableNumber: number) => {
    const baseUrl = getPublicBaseUrl();
    const url = new URL(baseUrl);

    url.searchParams.set("mesa", String(tableNumber));
    url.searchParams.set("table", String(tableNumber));

    return url.toString();
  };

  const getQrImageUrl = (tableNumber: number) => {
    const tableUrl = getTableUrl(tableNumber);

    return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&color=0d1e36&bgcolor=ffffff&margin=12&data=${encodeURIComponent(
      tableUrl
    )}`;
  };

  const selectedTableUrl = useMemo(() => {
    return getTableUrl(selectedTable);
  }, [selectedTable, appUrl]);

  const selectedQrImageUrl = useMemo(() => {
    return getQrImageUrl(selectedTable);
  }, [selectedTable, appUrl]);

  const waitForImagesInside = async (element: HTMLElement) => {
    const images = Array.from(element.querySelectorAll("img"));

    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();

        return new Promise<void>((resolve) => {
          const timeout = window.setTimeout(() => resolve(), 4000);

          img.onload = () => {
            window.clearTimeout(timeout);
            resolve();
          };

          img.onerror = () => {
            window.clearTimeout(timeout);
            resolve();
          };
        });
      })
    );
  };

  const handleSelectTable = (tableNumber: number) => {
    setSelectedTable(tableNumber);
  };

  const handleDownloadPng = async () => {
    if (!exportCardRef.current) return;

    const tableToExport = selectedTable;

    setExporting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!exportCardRef.current) return;

      await waitForImagesInside(exportCardRef.current);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const dataUrl = await toPng(exportCardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#0c1222",
        style: {
          borderRadius: "24px",
          margin: "0",
          transform: "scale(1)",
          transformOrigin: "top left",
          width: "384px",
          boxShadow: "none",
        },
      });

      const link = document.createElement("a");
      link.download = `qr-mesa-${tableToExport}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error al exportar la tarjeta QR a PNG:", error);
      alert("Hubo un problema al generar la tarjeta PNG. Intente nuevamente.");
    } finally {
      setExporting(false);
    }
  };

  const TableCard = ({
    tableNumber,
    hiddenForExport = false,
  }: {
    tableNumber: number;
    hiddenForExport?: boolean;
  }) => {
    const tableUrl = getTableUrl(tableNumber);
    const qrUrl = getQrImageUrl(tableNumber);

    return (
      <div
        ref={hiddenForExport ? exportCardRef : previewCardRef}
        id={hiddenForExport ? `export-card-table-${tableNumber}` : "printable-table-card"}
        className="bg-[#0c1222] border-4 border-amber-400 rounded-3xl p-6 shadow-xl max-w-sm w-full flex flex-col items-center gap-5 text-center relative overflow-hidden text-white"
        data-table-number={tableNumber}
        data-table-url={tableUrl}
      >
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 translate-x-1.5 translate-y-1.5" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 -translate-x-1.5 translate-y-1.5" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 translate-x-1.5 -translate-y-1.5" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 -translate-x-1.5 -translate-y-1.5" />

        <div className="flex flex-col items-center gap-1">
          <Utensils className="w-6 h-6 text-amber-400" />
          <h2 className="font-display font-bold text-base text-white leading-none">
            Buffet Casa de Dios
          </h2>
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest leading-none mt-1.5">
            Iglesia Casa de Dios
          </span>
        </div>

        <div className="w-2/3 h-px bg-white/10 relative flex justify-center items-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 bg-[#0c1222]" />
        </div>

        <div className="bg-[#0f172a]/80 text-white px-5 py-2.5 rounded-2xl flex flex-col items-center shadow-md border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider font-display text-white/50">
            MESA RESERVADA
          </span>
          <span className="text-3xl font-black font-mono leading-none mt-0.5 text-amber-400">
            {tableNumber}
          </span>
        </div>

        <div className="p-3 bg-white border border-white/10 rounded-2xl flex flex-col items-center gap-2">
          <img
            key={`qr-img-${tableNumber}-${tableUrl}`}
            src={qrUrl}
            alt={`QR Mesa ${tableNumber}`}
            className="w-44 h-44 object-contain rounded-xl bg-white shadow-inner"
            crossOrigin="anonymous"
          />

          <span
            className="text-[9px] text-slate-400 font-mono select-all truncate max-w-[200px]"
            title={tableUrl}
          >
            {tableUrl}
          </span>
        </div>

        <div className="flex flex-col gap-2 bg-[#0f172a]/60 p-3 rounded-2xl border border-white/10">
          <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-display flex items-center justify-center gap-1">
            <Smartphone className="w-3.5 h-3.5" />
            <span>¿CÓMO REALIZAR TU PEDIDO?</span>
          </h4>

          <ol className="text-[10px] text-white/80 text-left list-decimal pl-4 flex flex-col gap-1 leading-normal font-medium">
            <li>Escaneá este código QR con tu teléfono móvil.</li>
            <li>Explorá nuestra carta e ingresá tus datos en el carrito.</li>
            <li>Realizá tu pago digital o indicalo para pagar en caja.</li>
            <li>¡Listo! Te avisaremos para que retires tu pedido en la barra.</li>
          </ol>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8" id="qr-generator-section">
      <div className="flex-1 glass-card p-6 flex flex-col gap-5 text-white">
        <div className="flex flex-col gap-1">
          <h3 className="font-display font-bold text-lg text-white">
            Generador de QR para Mesas
          </h3>

          <p className="text-xs text-white/60 leading-normal">
            Cree y descargue los códigos QR que se colocarán físicamente en cada
            mesa del buffet. Al escanearlos, los clientes verán la carta y sus
            pedidos se vincularán automáticamente a esa mesa.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-white/70">
            Seleccionar Mesa para Visualizar:
          </label>

          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: totalTables }, (_, idx) => {
              const tableNumber = idx + 1;

              return (
                <button
                  key={`select-table-${tableNumber}`}
                  type="button"
                  onClick={() => handleSelectTable(tableNumber)}
                  id={`select-table-btn-${tableNumber}`}
                  className={`py-3.5 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                    selectedTable === tableNumber
                      ? "bg-amber-400 border-amber-400 text-black shadow-md shadow-amber-400/20"
                      : "border-white/10 text-white bg-white/5 hover:bg-white/10"
                  }`}
                >
                  Mesa {tableNumber}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/10 pt-5 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-display">
            Instrucciones de Uso
          </h4>

          <div className="flex flex-col gap-3">
            <div className="flex gap-3 text-xs items-start">
              <span className="w-5 h-5 bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-full flex items-center justify-center font-bold font-mono shrink-0">
                1
              </span>
              <p className="text-white/70">
                Seleccione la mesa arriba y descargue la tarjeta correspondiente.
              </p>
            </div>

            <div className="flex gap-3 text-xs items-start">
              <span className="w-5 h-5 bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-full flex items-center justify-center font-bold font-mono shrink-0">
                2
              </span>
              <p className="text-white/70">
                Suba o edite la imagen en Canva e imprímala en alta calidad.
              </p>
            </div>

            <div className="flex gap-3 text-xs items-start">
              <span className="w-5 h-5 bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-full flex items-center justify-center font-bold font-mono shrink-0">
                3
              </span>
              <p className="text-white/70">
                Coloque el impreso sobre un soporte acrílico en la mesa para que
                sus clientes escaneen.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={exporting}
            id="print-qr-card-btn"
            className="w-full btn-gold text-xs font-bold py-3 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 cursor-pointer uppercase tracking-wider disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando PNG Mesa {selectedTable}...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Descargar Tarjeta Mesa {selectedTable} PNG</span>
              </>
            )}
          </button>

          <a
            href={selectedTableUrl}
            target="_blank"
            rel="noreferrer"
            className="text-center text-xs font-bold text-amber-400 hover:text-amber-300 py-1.5 underline"
          >
            Simular escaneo Mesa {selectedTable}
          </a>

          <p className="text-[10px] text-white/40 text-center break-all">
            URL actual: {selectedTableUrl}
          </p>
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center bg-black/40 backdrop-blur-md p-6 rounded-3xl border-2 border-dashed border-white/10">
        <TableCard tableNumber={selectedTable} />
      </div>

      <div
        style={{
          position: "fixed",
          left: "-10000px",
          top: "0",
          width: "384px",
          height: "auto",
          opacity: 1,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <TableCard tableNumber={selectedTable} hiddenForExport />
      </div>
    </div>
  );
};