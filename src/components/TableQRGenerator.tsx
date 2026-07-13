import React, { useMemo, useState } from "react";
import {
  Download,
  Loader2,
  Smartphone,
  Sparkles,
  Utensils,
} from "lucide-react";

interface TableQRGeneratorProps {
  appUrl: string;
}

export const TableQRGenerator: React.FC<TableQRGeneratorProps> = ({ appUrl }) => {
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [exporting, setExporting] = useState<boolean>(false);

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

    return `https://api.qrserver.com/v1/create-qr-code/?size=800x800&color=0d1e36&bgcolor=ffffff&margin=16&data=${encodeURIComponent(
      tableUrl
    )}&v=${Date.now()}-${tableNumber}`;
  };

  const selectedTableUrl = useMemo(() => {
    return getTableUrl(selectedTable);
  }, [selectedTable, appUrl]);

  const selectedQrImageUrl = useMemo(() => {
    return getQrImageUrl(selectedTable);
  }, [selectedTable, appUrl]);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo cargar el QR."));
      img.src = src;
    });
  };

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const drawCenteredText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    font: string,
    color: string
  ) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  };

  const handleSelectTable = (tableNumber: number) => {
    setSelectedTable(tableNumber);
  };

  const handleDownloadPng = async () => {
    const tableToExport = selectedTable;
    const tableUrl = getTableUrl(tableToExport);
    const qrUrl = getQrImageUrl(tableToExport);

    setExporting(true);

    try {
      const qrImage = await loadImage(qrUrl);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("No se pudo crear el canvas.");
      }

      const width = 1200;
      const height = 1800;

      canvas.width = width;
      canvas.height = height;

      const bg = "#0c1222";
      const amber = "#fbbf24";
      const white = "#ffffff";
      const muted = "rgba(255,255,255,0.72)";
      const cardDark = "#0f172a";

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Borde principal
      ctx.strokeStyle = amber;
      ctx.lineWidth = 10;
      drawRoundedRect(ctx, 36, 36, width - 72, height - 72, 54);
      ctx.stroke();

      // Esquinas decorativas
      ctx.strokeStyle = amber;
      ctx.lineWidth = 12;

      const corner = 92;
      const inset = 54;

      ctx.beginPath();
      ctx.moveTo(inset, inset + corner);
      ctx.lineTo(inset, inset);
      ctx.lineTo(inset + corner, inset);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(width - inset - corner, inset);
      ctx.lineTo(width - inset, inset);
      ctx.lineTo(width - inset, inset + corner);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(inset, height - inset - corner);
      ctx.lineTo(inset, height - inset);
      ctx.lineTo(inset + corner, height - inset);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(width - inset - corner, height - inset);
      ctx.lineTo(width - inset, height - inset);
      ctx.lineTo(width - inset, height - inset - corner);
      ctx.stroke();

      // Header
      drawCenteredText(ctx, "🍴", width / 2, 130, "70px Arial", amber);

      drawCenteredText(
        ctx,
        "Buffet Casa de Dios",
        width / 2,
        218,
        "bold 60px Arial",
        white
      );

      drawCenteredText(
        ctx,
        "IGLESIA CASA DE DIOS",
        width / 2,
        292,
        "bold 34px Arial",
        amber
      );

      // Separador
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(250, 382);
      ctx.lineTo(950, 382);
      ctx.stroke();

      drawCenteredText(ctx, "✦", width / 2, 382, "44px Arial", amber);

      // Caja mesa
      drawRoundedRect(ctx, 335, 450, 530, 220, 44);
      ctx.fillStyle = "rgba(15,23,42,0.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 4;
      ctx.stroke();

      drawCenteredText(
        ctx,
        "MESA RESERVADA",
        width / 2,
        520,
        "bold 36px Arial",
        muted
      );

      drawCenteredText(
        ctx,
        String(tableToExport),
        width / 2,
        607,
        "bold 92px Arial",
        amber
      );

      // QR más chico para ganar espacio inferior
      const qrCardX = 300;
      const qrCardY = 735;
      const qrCardSize = 600;
      const qrImageX = 355;
      const qrImageY = 790;
      const qrImageSize = 490;

      drawRoundedRect(ctx, qrCardX, qrCardY, qrCardSize, qrCardSize, 38);
      ctx.fillStyle = white;
      ctx.fill();

      ctx.drawImage(qrImage, qrImageX, qrImageY, qrImageSize, qrImageSize);

      ctx.font = "21px monospace";
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const visibleUrl =
        tableUrl.length > 62 ? `${tableUrl.slice(0, 62)}...` : tableUrl;

      ctx.fillText(visibleUrl, width / 2, qrCardY + qrCardSize - 34);

      // Instrucciones agrandadas
      const instructionX = 110;
      const instructionY = 1415;
      const instructionW = 980;
      const instructionH = 285;

      drawRoundedRect(ctx, instructionX, instructionY, instructionW, instructionH, 38);
      ctx.fillStyle = "rgba(15,23,42,0.78)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 4;
      ctx.stroke();

      drawCenteredText(
        ctx,
        "¿CÓMO REALIZAR TU PEDIDO?",
        width / 2,
        instructionY + 58,
        "bold 36px Arial",
        amber
      );

      ctx.font = "34px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.90)";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      const instructions = [
        "1. Escaneá este código QR con tu teléfono móvil.",
        "2. Explorá nuestra carta e ingresá tus datos.",
        "3. Realizá tu pago digital o indicá pago en caja.",
        "4. Te avisaremos para retirar tu pedido en barra.",
      ];

      instructions.forEach((line, index) => {
        ctx.fillText(line, 178, instructionY + 108 + index * 46);
      });

      const dataUrl = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.download = `qr-mesa-${tableToExport}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error al generar PNG de mesa:", error);
      alert("Hubo un problema al generar la tarjeta PNG. Intente nuevamente.");
    } finally {
      setExporting(false);
    }
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
        <div className="bg-[#0c1222] border-4 border-amber-400 rounded-3xl p-6 shadow-xl max-w-sm w-full flex flex-col items-center gap-5 text-center relative overflow-hidden text-white">
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
              {selectedTable}
            </span>
          </div>

          <div className="p-3 bg-white border border-white/10 rounded-2xl flex flex-col items-center gap-2">
            <img
              key={`preview-qr-${selectedTable}-${selectedTableUrl}`}
              src={selectedQrImageUrl}
              alt={`QR Mesa ${selectedTable}`}
              className="w-44 h-44 object-contain rounded-xl bg-white shadow-inner"
              crossOrigin="anonymous"
            />

            <span
              className="text-[9px] text-slate-400 font-mono select-all truncate max-w-[200px]"
              title={selectedTableUrl}
            >
              {selectedTableUrl}
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
      </div>
    </div>
  );
};