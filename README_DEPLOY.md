# Guía de Despliegue de Producción: Buffet Casa de Dios ⛪🍔

Esta guía te guiará paso a paso para desplegar la aplicación **Buffet Casa de Dios** en Vercel, conectarla a tu base de datos Supabase en producción, subirla a un repositorio de GitHub, y realizar las pruebas reales en la iglesia.

---

## 🚀 1. PASO A PASO PARA SUBIR A GITHUB

Para subir el proyecto a GitHub, asegurate de tener instalado Git y seguir estos comandos en tu terminal local.

### Archivos que NO se subirán al repositorio (Excluidos en `.gitignore`):
- `.env` y `.env.local` (contienen las claves privadas de Supabase y Gemini).
- `node_modules/` (dependencias instaladas localmente).
- `dist/` (carpeta de compilación generada).
- `.vercel/` (carpetas de caché de Vercel).

### Comandos de Git para subir el proyecto:

```bash
# 1. Inicializar el repositorio Git local
git init

# 2. Agregar todos los archivos al seguimiento de Git
git add .

# 3. Crear el commit inicial con los cambios preparados para producción
git commit -m "Deploy inicial Buffet Casa de Dios"

# 4. Crear la rama principal llamada 'main'
git branch -M main

# 5. Vincular el repositorio local con tu repositorio vacío en GitHub
# (Reemplaza 'URL_DEL_REPOSITORIO' por el enlace real de tu repositorio en GitHub)
git remote add origin URL_DEL_REPOSITORIO

# 6. Subir todo el código a GitHub
git push -u origin main
```

---

## 🌐 2. PASO A PASO PARA EL DESPLIEGUE EN VERCEL

Vercel detectará automáticamente que el proyecto utiliza **Vite + React** para el frontend, y gracias a nuestra configuración `vercel.json` integrada, enrutará las funciones serverless de la API de Express sin que tengas que realizar ninguna configuración adicional complicada.

### Guía de Despliegue:
1. Iniciá sesión en [Vercel](https://vercel.com).
2. Hacé clic en **"Add New"** y luego en **"Project"**.
3. Importá el repositorio `buffet-casa-de-dios` desde tu cuenta de GitHub.
4. En **Framework Preset**, podés seleccionar **Vite** (o dejar que Vercel lo auto-detecte).
5. En la sección **Build and Output Settings**, dejá los comandos por defecto:
   - **Build Command:** `npm run build` o `vite build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Desplegá la sección **Environment Variables** y cargá las siguientes variables con sus respectivos valores reales (ver sección 3).
7. Hacé clic en **"Deploy"**.
8. Una vez finalizado, Vercel te dará una URL pública oficial (ejemplo: `https://buffet-casa-de-dios.vercel.app`).
9. Copiá esa URL oficial y agregala en la variable de entorno **`VITE_PUBLIC_APP_URL`** en la configuración de Vercel, luego volvé a desplegar (Redeploy) para que los códigos QR generados apunten de forma definitiva a la web real de producción.

---

## 🔑 3. VARIABLES DE ENTORNO REQUERIDAS EN VERCEL

Debes configurar exactamente estas variables de entorno en la sección **Settings > Environment Variables** de tu proyecto en Vercel para que la aplicación conecte con la base de datos Supabase y el asistente inteligente de Gemini funcione sin problemas de forma segura:

| Nombre de Variable | Tipo/Ámbito | Descripción / Valor de Ejemplo |
|---|---|---|
| **`SUPABASE_URL`** | Backend | URL de tu proyecto de Supabase (ej. `https://xyzabc.supabase.co`) |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Backend (Secreto) | Clave de rol de servicio privada (Service Role Key). **NUNCA la expongas en el frontend.** Permite bypass de RLS para sincronización perfecta del backend. |
| **`GEMINI_API_KEY`** | Backend (Secreto) | Clave API de Google AI Studio para que el asistente de recomendación funcione de forma segura sin exponerse al cliente. |
| **`VITE_PUBLIC_APP_URL`** | Frontend (Público) | URL oficial asignada por Vercel (ej. `https://buffet-casa-de-dios.vercel.app`). **Es fundamental para que los QR generados en las mesas redireccionen al buffet real en producción.** |
| **`PUBLIC_APP_URL`** | Backend/General | (Opcional) Copia de la URL oficial de Vercel utilizada como respaldo. |

> 🚨 **ADVERTENCIA DE SEGURIDAD:** Nunca utilices `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. El service role key tiene privilegios totales sobre la base de datos. Nuestra arquitectura del Buffet mantiene esta clave segura en el backend de Node, protegiendo tus datos.

---

## 📋 4. CHECKLIST DE PRUEBA REAL EN LA IGLESIA ⛪

Una vez desplegada, realizá este circuito de pruebas en orden para garantizar que el buffet funcione de manera perfecta durante los servicios de la iglesia:

### 📱 Flujo del Cliente / Mesa
- [ ] **1. Escaneo de QR:** Abrí la cámara de un celular y escaneá el QR generado para la **Mesa 3** (desde la sección de administración de la app).
- [ ] **2. Vinculación de Mesa:** Verificá que la aplicación web se abra y en el encabezado superior muestre automáticamente `"Mesa 3"` (sin que el cliente tenga que seleccionarla a mano).
- [ ] **3. Navegación e IA:** Consultá platos de la carta digital y enviá una consulta al asistente de IA en la esquina para verificar recomendaciones rápidas en español.
- [ ] **4. Carrito y Envío:** Agregá un producto (ej. Hamburguesa) y una bebida al carrito, cargá un nombre representativo (ej. "Carlos") y un teléfono de contacto, y enviá el pedido.
- [ ] **5. Estado Inicial:** Verificá que se muestre la pantalla de confirmación indicando que tu pedido está pendiente de pago.

### 💵 Flujo de Caja (Rita)
- [ ] **6. Verificación en Caja:** Entrá al Panel de Administración (`/admin` o desde el menú de la app) y confirmá que el pedido de "Carlos" figure en la pestaña "Caja" bajo el estado **"Pendiente de Pago"**.
- [ ] **7. Apertura de Caja:** Antes de cobrar, hacé clic en **"Abrir Caja"** e ingresá un monto inicial (ej. `$2.500`). Confirmá que se guarde la sesión activa.
- [ ] **8. Cobro del Pedido:** Hacé clic en **"Cobrar"** en el pedido de "Carlos", seleccioná el método de pago (ej. "Efectivo") y confirmá el cobro.
- [ ] **9. Sincronización y Movimientos:** Confirmá que el pedido pase al estado **"Aprobado"** y que en la sección de movimientos de caja se haya registrado automáticamente el ingreso correspondiente.

### 🍳 Flujo de Cocina (Maricel)
- [ ] **10. Recepción en Cocina:** Entrá al Panel de Cocina (`/cocina` o la pestaña correspondiente) en otra tablet o pantalla y confirmá que el pedido de "Carlos" aparezca inmediatamente en color amarillo.
- [ ] **11. Preparación:** Hacé clic en **"Preparar"**. El estado debe actualizarse en tiempo real a **"En preparación"**.
- [ ] **12. Pedido Listo:** Cuando la comida esté lista, hacé clic en **"Listo"**. El pedido debe cambiar a **"Listo para retirar"** (color verde).

### 📦 Flujo de Entrega y Cierre
- [ ] **13. Pantalla del Cliente:** Volvé al celular del cliente (Carlos) y verificá que su pantalla de seguimiento de pedido se haya actualizado a **"Listo para retirar"** de forma inmediata.
- [ ] **14. Entrega en Caja:** En el panel de Caja, marcá el pedido como **"Entregado"** una vez que se le entregue a Carlos. El pedido se archivará correctamente.
- [ ] **15. Pedido Manual:** Creá un pedido directamente desde la Caja (venta mostrador sin QR). Cargá los productos, confirmá el pago y comprobá que viaje directo a Cocina omitiendo el paso de "Pendiente de pago".
- [ ] **16. Cierre de Caja y Arqueo:** Al final de la prueba, andá a Caja, hacé clic en **"Cerrar Caja"**, ingresá el monto en efectivo contado real en el cajón y comprobá que calcule automáticamente la diferencia (Caja perfecta, Sobrante o Faltante).
- [ ] **17. Informe PDF:** Generá y descargá el PDF del reporte de cierre de caja. Verificá que los datos estén perfectamente estructurados e impresos.
- [ ] **18. Verificación en Supabase:** Entrá a tu panel de Supabase y confirmá que los registros se hayan creado correctamente en las tablas `orders`, `order_items`, `cash_sessions` y `cash_movements`.

---

## ⚠️ 5. ADVERTENCIAS CRÍTICAS ANTES DE IMPRIMIR LOS QR

Antes de mandar a imprimir de forma definitiva las tarjetas de códigos QR para pegar en las mesas de la iglesia, es crucial repasar este checklist técnico para evitar desperdicio de materiales y reimpresiones costosas:

1. **Configuración del Dominio Definitivo:** Asegurate de que la URL final de Vercel sea estable. Si vas a comprar un dominio propio (como `buffetcasadedios.com` o similar), vinculalo a Vercel **antes** de generar los códigos QR. Si los generas usando el dominio por defecto de Vercel (`*.vercel.app`) y luego compras uno personalizado, los códigos QR antiguos dejarán de funcionar si no configuras una redirección 301.
2. **Carga Completa de `VITE_PUBLIC_APP_URL`:** Verificá que la variable de entorno `VITE_PUBLIC_APP_URL` esté cargada en Vercel con la URL real de producción y que el proyecto se haya vuelto a compilar (Redeploy). De lo contrario, los códigos QR se generarán con la URL local (`localhost:3000`) o con la URL de pruebas interna.
3. **Prueba de Enlace Real:** Antes de imprimir la plancha completa, descarga una tarjeta QR individual en formato PNG, visualizala en pantalla completa y escaneala con varios celulares de diferentes marcas (iPhone y Android) para confirmar que:
   - Resuelva rápido y sin redirecciones extrañas.
   - Cargue la URL correcta con el parámetro `?table=X` (ej. `?table=3`).
   - El sistema cargue directamente la mesa correcta sin errores.
4. **Calidad de Impresión en PNG:** Las tarjetas descargadas desde nuestra aplicación están optimizadas con un factor de escala de alta resolución (`pixelRatio: 3`) y fondo sólido oscuro de alta densidad, lo que las hace perfectas para subirlas directamente a herramientas de diseño gráfico como Canva o mandarlas a una imprenta profesional para que salgan nítidas y se escaneen perfectamente incluso bajo iluminación tenue.
5. **Colocación y Cuidado:** Al pegar las tarjetas en las mesas del buffet, asegurate de protegerlas con un laminado plástico transparente o colocarlas bajo un portarretratos acrílico protector, ya que la caída de líquidos, salsas o la limpieza constante con alcohol puede deteriorar el dibujo del código QR y dificultar su lectura por los teléfonos de los comensales.
