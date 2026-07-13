import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

const app = express();
const PORT = 3000;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
let isSupabaseActive = true;

function handleSupabaseError(error: any, operationName: string) {
  if (!error) return;
  
  const isMissingTable = 
    error.code === "42P01" || 
    error.code === "PGRST116" ||
    error.code === "PGRST204" ||
    (error.message && (
      error.message.includes("schema cache") || 
      error.message.includes("does not exist") || 
      error.message.includes("relation")
    ));

  if (isMissingTable) {
    if (isSupabaseActive) {
      console.log(`\n⚠️ [SUPABASE] Deshabilitando sincronización en tiempo real temporalmente durante "${operationName}". Razón: Las tablas no han sido creadas en Supabase (error: ${error.message}).`);
      console.log(`El buffet continuará operando localmente sin problemas y sin pérdida de datos. Registre las tablas en la sección 'Base de Datos' de la administración. 🚀\n`);
      isSupabaseActive = false;
    }
  } else {
    console.error(`❌ [SUPABASE ERROR] Error durante "${operationName}":`, error.message || error);
  }
}

if (!supabase) {
  console.log("⚠️ Supabase Storage client not initialized: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are missing.");
  isSupabaseActive = false;
} else {
  console.log("✅ Supabase client successfully initialized for Storage operations.");
}

// Initialize GoogleGenAI client (Server-side ONLY)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json({ limit: "10mb" }));
function normalizePaymentMethod(method: any): "efectivo" | "transferencia" | "qr" | "tarjeta" {
  const raw = String(method || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    raw === "efectivo" ||
    raw === "efectivo_caja" ||
    raw.includes("efectivo") ||
    raw.includes("cash")
  ) {
    return "efectivo";
  }

  if (
    raw === "transferencia" ||
    raw === "pago_movil" ||
    raw.includes("transfer") ||
    raw.includes("banc") ||
    raw.includes("movil")
  ) {
    return "transferencia";
  }

  if (
    raw === "qr" ||
    raw === "qr_caja" ||
    raw.includes("mercadopago") ||
    raw.includes("mercado pago") ||
    raw.includes("codigo qr") ||
    raw.includes("qr")
  ) {
    return "qr";
  }

  if (
    raw === "tarjeta" ||
    raw === "tarjeta_caja" ||
    raw.includes("card") ||
    raw.includes("posnet") ||
    raw.includes("credito") ||
    raw.includes("debito")
  ) {
    return "tarjeta";
  }

  return "efectivo";
}

// Files for persistence
const DISHES_FILE = path.join(process.cwd(), "dishes.json");
const CONFIG_FILE = path.join(process.cwd(), "config.json");

// Helper to save dishes
function saveDishes(dishesList: any[]) {
  try {
    fs.writeFileSync(DISHES_FILE, JSON.stringify(dishesList, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving dishes.json:", e);
  }
}

// Helper to load dishes
function loadDishes(): any[] {
  try {
    if (fs.existsSync(DISHES_FILE)) {
      const data = fs.readFileSync(DISHES_FILE, "utf-8");
      const list = JSON.parse(data);
      let modified = false;
      const verified = list.map((d: any) => {
        if (d.stock === undefined) {
          d.stock = 20;
          modified = true;
        }
        return d;
      });
      if (modified) {
        saveDishes(verified);
      }
      return verified;
    }
  } catch (e) {
    console.error("Error loading dishes.json:", e);
  }

  // Fallback to initial Argentine-focused dishes
  const defaults = [
    {
      id: "dish_cafe_leche",
      name: "Café con Leche + 1 Medialuna",
      nameEn: "Coffee with Milk + 1 Medialuna Croissant",
      description: "Delicioso café expresso con leche cremosa, servido caliente junto a una medialuna tradicional hojaldrada horneada en el día.",
      descriptionEn: "Delicious espresso coffee with warm creamy milk, served alongside a freshly baked sweet medialuna pastry.",
      price: 5000,
      category: "Café y Bebidas",
      image: "https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?w=600&auto=format&fit=crop&q=80",
      tags: ["Clásico", "Caliente"],
      purpose: "Preparado fresco con granos seleccionados de café arábico y leche emulsionada a temperatura perfecta.",
      purposeEn: "Freshly brewed with premium Arabica coffee beans and perfectly steamed milk.",
      available: true
    },
    {
      id: "dish_agua_gas",
      name: "Agua Mineral Sin Gas (500ml)",
      nameEn: "Still Mineral Water (500ml)",
      description: "Agua mineral fresca de manantial embotellada, ideal para hidratarse sanamente a cualquier hora.",
      descriptionEn: "Fresh source bottled still mineral water, ideal for refreshing hydration.",
      price: 1300,
      category: "Café y Bebidas",
      image: "https://images.unsplash.com/photo-1608885898957-a599fb1b1494?w=600&auto=format&fit=crop&q=80",
      tags: ["Saludable", "Frío"],
      purpose: "Agua mineral natural purificada y de bajo contenido en sodio, ideal para refrescar el paladar.",
      purposeEn: "Pure natural mineral water with low sodium content, perfect for refreshing the palate.",
      available: true
    },
    {
      id: "dish_agua_gas_2",
      name: "Agua Mineral Sin Gas Grande (2L)",
      nameEn: "Still Mineral Water Large (2L)",
      description: "Botella grande de agua pura, ideal para compartir y mantenerse hidratado todo el día.",
      descriptionEn: "Large bottle of pure water, ideal to share and keep hydrated all day long.",
      price: 2000,
      category: "Café y Bebidas",
      image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&auto=format&fit=crop&q=80",
      tags: ["Familiar", "Compartir"],
      purpose: "Botella familiar ideal para mantener la hidratación en mesas numerosas.",
      purposeEn: "Family-sized bottle, perfect for keeping everyone hydrated at large tables.",
      available: true
    },
    {
      id: "dish_coca_cola",
      name: "Gaseosa Coca-Cola Original (600ml)",
      nameEn: "Coca-Cola Original (600ml)",
      description: "La gaseosa favorita del mundo en su presentación clásica súper fría.",
      descriptionEn: "The world's favorite soft drink in its classic bottle, served ice cold.",
      price: 2300,
      category: "Café y Bebidas",
      image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
      tags: ["Bebida", "Frío"],
      purpose: "Servido en vaso con hielo y rodaja de limón fresco a elección del cliente.",
      purposeEn: "Served ice-cold, with optional fresh lemon slice and ice.",
      available: true
    },
    {
      id: "dish_saladix_pizza",
      name: "Saladix Sabor Pizza",
      nameEn: "Pizza Flavor Saladix Crackers",
      description: "Las clásicas galletitas saladas horneadas con el inconfundible e intenso sabor a pizza.",
      descriptionEn: "Classic baked savory cracker snacks with intense pizza flavor.",
      price: 1300,
      category: "Snacks",
      image: "https://qzqgccdogvzkdudpsckd.supabase.co/storage/v1/object/public/dishes/1783393953762_ChatGPT_Image_28_jun_2026__14_49_26.png",
      tags: ["Crujiente", "Salado"],
      purpose: "Snack horneado crujiente elaborado con auténtico queso parmesano y orégano seleccionado.",
      purposeEn: "Crispy baked snack crackers made with authentic Parmesan cheese and selected oregano.",
      available: true
    },
    {
      id: "dish_chips_lays",
      name: "Papas Fritas Lays Clásicas",
      nameEn: "Lays Classic Potato Chips",
      description: "Papas fritas cortadas finas, crujientes y con el toque justo de sal argentina.",
      descriptionEn: "Thinly sliced golden potato chips, crispy with a perfect touch of salt.",
      price: 1700,
      category: "Snacks",
      image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
      tags: ["Snack", "Crujiente"],
      purpose: "Papas fritas clásicas seleccionadas y saladas a la perfección para acompañar cualquier bebida.",
      purposeEn: "Classic crispy potato chips salted to perfection to complement any cold beverage.",
      available: true
    },
    {
      id: "dish_conitos_3d",
      name: "Conitos 3D Queso Cheddar",
      nameEn: "3D Cheddar Cheese Cones",
      description: "Exquisitos bocaditos de maíz tridimensionales horneados con un delicioso sabor a queso cheddar intenso.",
      descriptionEn: "Exquisite three-dimensional corn snacks baked with an intense cheddar cheese flavor.",
      price: 1500,
      category: "Snacks",
      image: "https://images.unsplash.com/photo-1534080391025-497c0c270248?w=600&auto=format&fit=crop&q=80",
      tags: ["Queso", "Bocadito"],
      purpose: "Divertido snack tridimensional de maíz con el sabor más crujiente y quesoso.",
      purposeEn: "Fun three-dimensional corn snack with the crispiest cheddar cheese dust.",
      available: true
    },
    {
      id: "dish_bagley_rex",
      name: "Galletitas Rex Saladas Bagley",
      nameEn: "Savory Rex Crackers Bagley",
      description: "Las tradicionales galletitas saladas Rex de Bagley, crocantes y con la forma clásica amada por todos.",
      descriptionEn: "Bagley's traditional Rex crackers, crispy and with the classic salted flavor.",
      price: 1800,
      category: "Snacks",
      image: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80",
      tags: ["Bagley", "Horneado"],
      purpose: "Galletas saladas clásicas ideales para acompañar una taza de café o té caliente.",
      purposeEn: "Traditional salted crackers, perfect alongside a warm cup of coffee or tea.",
      available: true
    },
    {
      id: "dish_mini_oreo",
      name: "Mini Oreo Dulces",
      nameEn: "Mini Sweet Oreo Cookies",
      description: "Las mundialmente conocidas galletas de chocolate rellenas con crema de vainilla en formato mini.",
      descriptionEn: "The world-famous chocolate cookies filled with sweet vanilla cream in mini size.",
      price: 1900,
      category: "Galletas",
      image: "https://images.unsplash.com/photo-1558961309-dbdf717d13d7?w=600&auto=format&fit=crop&q=80",
      tags: ["Dulce", "Chocolate"],
      purpose: "Galletas crujientes de chocolate con relleno cremoso sabor vainilla, ideales para el postre.",
      purposeEn: "Crunchy bite-sized chocolate cookies with vanilla cream filling, perfect for dessert.",
      available: true
    },
    {
      id: "dish_bagley_kesitas",
      name: "Galletitas Kesitas Bagley",
      nameEn: "Kesitas Bagley Cheese Crackers",
      description: "Galletitas horneadas con un inconfundible e intenso sabor a queso real, ideales para snackear.",
      descriptionEn: "Crisp baked crackers with an unmistakable and intense real cheese flavor.",
      price: 1800,
      category: "Galletas",
      image: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80",
      tags: ["Queso", "Horneado"],
      purpose: "Elaboradas con queso horneado real que brinda un inconfundible sabor y crocancia.",
      purposeEn: "Made with real baked cheese, providing a unique unmistakable crunch.",
      available: true
    },
    {
      id: "dish_bon_o_bon",
      name: "Bon o Bon Dulce de Maní",
      nameEn: "Bon o Bon Chocolate & Peanut",
      description: "El bombón argentino por excelencia: oblea crujiente rellena de crema de maní y bañada en chocolate de leche.",
      descriptionEn: "The typical Argentine chocolate treat: crispy wafer filled with peanut butter cream and milk chocolate.",
      price: 1000,
      category: "Galletas",
      image: "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=600&auto=format&fit=crop&q=80",
      tags: ["Bombón", "Dulce"],
      purpose: "El dulce preferido para compartir al final del almuerzo o regalar como cortesía dulce.",
      purposeEn: "The perfect sweet bite to share at the end of a meal or give as a gift.",
      available: true
    },
    {
      id: "dish_hamburguesa_com",
      name: "Hamburguesa Doble con Queso + Papas",
      nameEn: "Double Cheeseburger + Fries",
      description: "Dos jugosas hamburguesas caseras a la parrilla con doble queso cheddar, lechuga, tomate y aderezo especial, servida en pan brioche con papas.",
      descriptionEn: "Two juicy grilled homemade beef patties with double cheddar, fresh lettuce, tomato, and special sauce in brioche, with fries.",
      price: 8000,
      category: "Platos Fuertes",
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
      tags: ["Recomendado", "Abundante"],
      purpose: "Carne 100% vacuna condimentada con finas hierbas y asada al punto perfecto.",
      purposeEn: "100% beef patties seasoned with herbs and grilled to juicy perfection.",
      available: true
    },
    {
      id: "dish_cesar_salad",
      name: "Ensalada César con Pollo",
      nameEn: "Chicken Caesar Salad",
      description: "Colchón de lechuga romana crocante, pollo desmenuzado a la plancha, crutones dorados, queso parmesano en hebras y aderezo César casero.",
      descriptionEn: "Crisp romaine lettuce, grilled shredded chicken, golden croutons, shaved parmesan, and creamy house Caesar dressing.",
      price: 8000,
      category: "Platos Fuertes",
      image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&auto=format&fit=crop&q=80",
      tags: ["Saludable", "Fresco"],
      purpose: "Lechuga hidropónica super crocante y aderezo César casero preparado en el día.",
      purposeEn: "Crisp hydroponic romaine lettuce and freshly made house Caesar dressing.",
      available: true
    },
    {
      id: "dish_tostado_jyq",
      name: "Tostado Completo de Jamón y Queso",
      nameEn: "Ham and Cheese Toasted Sandwich",
      description: "Sándwich de pan de miga tostado caliente a la plancha con abundante jamón cocido y queso muzzarella derretido.",
      descriptionEn: "Grilled hot toasted crumb bread sandwich stuffed with warm cooked ham and melted mozzarella cheese.",
      price: 3000,
      category: "Platos Fuertes",
      image: "https://qzqgccdogvzkdudpsckd.supabase.co/storage/v1/object/public/dishes/1783393909865_tostado.jpg",
      tags: ["Caliente", "Rápido"],
      purpose: "Pan de miga súper fino dorado a la manteca con jamón seleccionado y muzzarella fundida.",
      purposeEn: "Thin sandwich bread toasted in butter with premium ham and melted mozzarella.",
      available: true
    },
    {
      id: "dish_pizza_muzza",
      name: "Pizza Muzzarella Casera Grande",
      nameEn: "Large Homemade Mozzarella Pizza",
      description: "Masa artesanal esponjosa con salsa de tomate de la casa, abundante muzzarella derretida, aceitunas verdes y orégano.",
      descriptionEn: "Traditional large homemade crust pizza with rich tomato sauce, melted mozzarella, olives, and oregano.",
      price: 12000,
      category: "Platos Fuertes",
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
      tags: ["Para Compartir", "Artesanal"],
      purpose: "Masa fermentada en frío por 24 horas y horneada a alta temperatura para lograr máxima esponjosidad.",
      purposeEn: "Cold-fermented dough baked at high temperature for the perfect light and airy crust.",
      available: true
    },
    {
      id: "dish_empanada_criolla",
      name: "Empanada de Carne Criolla al Horno",
      nameEn: "Baked Beef Creole Empanada",
      description: "Empanada tradicional argentina cocida al horno, rellena de carne cortada a cuchillo sazonada con huevo, verdeo y especias.",
      descriptionEn: "Traditional baked Argentine empanada stuffed with spiced ground beef, egg, and green onions.",
      price: 2000,
      category: "Platos Fuertes",
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
      tags: ["Tradicional", "Clásico"],
      purpose: "Repulgue tradicional artesanal y relleno súper jugoso con el auténtico sabor del norte argentino.",
      purposeEn: "Traditional hand-crimped pastry stuffed with a juicy, authentic Argentine beef filling.",
      available: true
    }
  ];

  const defaultsWithStock = defaults.map(d => ({ ...d, stock: 20 }));
  saveDishes(defaultsWithStock);
  return defaultsWithStock;
}

let cachedConfig = { exchangeRate: 1000 };

// Initialize cachedConfig from local file on startup as a fallback
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const data = fs.readFileSync(CONFIG_FILE, "utf-8");
    cachedConfig = JSON.parse(data);
  }
} catch (e) {
  console.error("Error loading initial config.json:", e);
}

// Helper to save config locally (strictly in-memory during execution)
function saveConfigLocal(config: any) {
  cachedConfig = { ...cachedConfig, ...config };
}

// Helper to save config (Legacy synchronous wrapper & background sync)
function saveConfig(config: any) {
  saveConfigLocal(config);
  if (supabase && isSupabaseActive) {
    (async () => {
      try {
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key: "exchangeRate", value: String(cachedConfig.exchangeRate) });
        if (error) {
          handleSupabaseError(error, "saveConfig (sync exchangeRate)");
        } else {
          console.log("✅ Background sync success for exchangeRate:", cachedConfig.exchangeRate);
        }
      } catch (err) {
        console.error("⚠️ Background sync failed:", err);
      }
    })();
  }
}

// Synchronous loadConfig helper (returns cache immediately)
function loadConfig(): any {
  return cachedConfig;
}

// Asynchronous config loader with Supabase fetch & Seed
async function loadConfigAsync(): Promise<any> {
  if (supabase && isSupabaseActive) {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "exchangeRate")
        .single();
      
      if (error) {
        handleSupabaseError(error, "loadConfigAsync (load exchangeRate)");
        if (isSupabaseActive) {
          try {
            await supabase
              .from("app_settings")
              .upsert({ key: "exchangeRate", value: String(cachedConfig.exchangeRate) });
          } catch (seedErr: any) {
            console.log("ℹ️ Skipping Supabase seeding, using local config fallback.");
          }
        }
      } else if (data && data.value) {
        const rate = Number(data.value);
        if (rate > 0) {
          cachedConfig.exchangeRate = rate;
          saveConfigLocal(cachedConfig);
        }
      }
    } catch (e: any) {
      console.error("Error loading config from Supabase:", e);
    }
  }
  return cachedConfig;
}

// Asynchronous config saver
async function saveConfigAsync(config: any): Promise<void> {
  cachedConfig = { ...cachedConfig, ...config };
  saveConfigLocal(cachedConfig);

  if (supabase && isSupabaseActive) {
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "exchangeRate", value: String(cachedConfig.exchangeRate) });
      
      if (error) {
        handleSupabaseError(error, "saveConfigAsync");
      } else {
        console.log("✅ Exchange rate successfully synced with Supabase app_settings:", cachedConfig.exchangeRate);
      }
    } catch (e: any) {
      console.error("Failed to sync config with Supabase:", e);
    }
  }
}

// Secure administrative password hashing and verification using crypto
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHmac("sha256", salt).update(password).digest("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const verifyHash = crypto.createHmac("sha256", salt).update(password).digest("hex");
    return verifyHash === hash;
  } catch (err) {
    return false;
  }
}

async function isValidAdminPassword(adminPassword: string): Promise<boolean> {
  if (!adminPassword) return false;
  
  const trimmed = adminPassword.trim();
  // Allow session tokens to maintain active administrative dashboards
  if (trimmed === 'sabores-pos-admin-session-active-token') {
    return true;
  }
  
  if (!supabase) return false;
  
  try {
    const { data: users, error } = await supabase
      .from("admin_users")
      .select("password_hash");
      
    if (error || !users) return false;
    
    for (const u of users) {
      if (verifyPassword(trimmed, u.password_hash)) {
        return true;
      }
    }
  } catch (err) {
    console.error("Error validating admin password against Supabase:", err);
  }
  
  return false;
}

// Pre-calculate and log administrative initial SQL template for easy copy-paste
try {
  const staticSalt = "f4b8c9d1e2f3a4b5c6d7e8f9a0b1c2d3";
  const staticHash = crypto.createHmac("sha256", staticSalt).update("admin").digest("hex");
  const defaultAdminSQLHash = `${staticSalt}:${staticHash}`;

  console.log("\n=========================================================================");
  console.log("🔐 [BUFFET CASA DE DIOS] INSTRUCCIONES DE CONFIGURACION DE SEGURIDAD Y TABLAS SUPABASE");
  console.log("Ejecute la siguiente consulta SQL en el SQL Editor de su panel de Supabase");
  console.log("para aprovisionar TODAS las tablas necesarias del sistema de Caja y Pedidos:");
  console.log("-------------------------------------------------------------------------");
  console.log(`
-- 1. Crear la tabla de usuarios administradores si no existe
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text DEFAULT 'admin',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insertar el administrador inicial ('admin' con contraseña 'admin')
INSERT INTO admin_users (username, password_hash, role)
VALUES ('admin', '${defaultAdminSQLHash}', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 3. Crear tabla de Sesiones de Caja (cash_sessions)
CREATE TABLE IF NOT EXISTS cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by text NOT NULL,
  opening_amount numeric NOT NULL DEFAULT 0,
  opening_note text,
  opened_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  status text NOT NULL DEFAULT 'open',
  closed_by text,
  closed_at timestamp with time zone,
  counted_cash numeric,
  total_cash numeric DEFAULT 0,
  total_transfer numeric DEFAULT 0,
  total_qr numeric DEFAULT 0,
  total_card numeric DEFAULT 0,
  total_sales numeric DEFAULT 0,
  expected_cash numeric DEFAULT 0,
  difference numeric DEFAULT 0,
  closing_note text,
  
  -- Campos de Arqueo Detallado por Medio de Pago
  declared_cash numeric DEFAULT 0,
  declared_transfer numeric DEFAULT 0,
  declared_qr numeric DEFAULT 0,
  declared_card numeric DEFAULT 0,
  expected_transfer numeric DEFAULT 0,
  expected_qr numeric DEFAULT 0,
  expected_card numeric DEFAULT 0,
  difference_transfer numeric DEFAULT 0,
  difference_qr numeric DEFAULT 0,
  difference_card numeric DEFAULT 0,
  difference_total numeric DEFAULT 0,
  closing_result text,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Crear tabla de Pedidos (orders)
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  table_number text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  payment_method text NOT NULL DEFAULT 'efectivo',
  payment_status text NOT NULL DEFAULT 'pendiente',
  status text NOT NULL DEFAULT 'recibido',
  total numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'qr_customer',
  cashier_name text,
  cash_session_id uuid REFERENCES cash_sessions(id) ON DELETE SET NULL,
  notes text,
  paid_at timestamp with time zone,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Crear tabla de Items de Pedidos (order_items)
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  dish_id text NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Crear tabla de Movimientos de Caja (cash_movements)
CREATE TABLE IF NOT EXISTS cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id uuid REFERENCES cash_sessions(id) ON DELETE CASCADE NOT NULL,
  order_id text REFERENCES orders(id) ON DELETE SET NULL,
  type text NOT NULL,
  payment_method text,
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL,
  created_by text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Deshabilitar RLS o crear políticas para permitir acceso público anonizado
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo a anon en cash_sessions" ON cash_sessions;
CREATE POLICY "Permitir todo a anon en cash_sessions" ON cash_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon en orders" ON orders;
CREATE POLICY "Permitir todo a anon en orders" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon en order_items" ON order_items;
CREATE POLICY "Permitir todo a anon en order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon en cash_movements" ON cash_movements;
CREATE POLICY "Permitir todo a anon en cash_movements" ON cash_movements FOR ALL USING (true) WITH CHECK (true);
`);
  console.log("=========================================================================\n");
} catch (e) {
  console.error("Error showing startup SQL config:", e);
}

// Files for persistence
const ORDERS_FILE = path.join(process.cwd(), "orders.json");
const SESSIONS_FILE = path.join(process.cwd(), "cash_sessions.json");
const MOVEMENTS_FILE = path.join(process.cwd(), "cash_movements.json");

// Helper functions for file-based state saving and loading
function saveOrders(ordersList: any[]) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersList, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving orders.json:", e);
  }
}

function loadSessions(): any[] {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading cash_sessions.json:", e);
  }
  return [];
}

function saveSessions(sessionsList: any[]) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsList, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving cash_sessions.json:", e);
  }
}

function loadMovements(): any[] {
  try {
    if (fs.existsSync(MOVEMENTS_FILE)) {
      return JSON.parse(fs.readFileSync(MOVEMENTS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading cash_movements.json:", e);
  }
  return [];
}

function saveMovements(movementsList: any[]) {
  try {
    fs.writeFileSync(MOVEMENTS_FILE, JSON.stringify(movementsList, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving cash_movements.json:", e);
  }
}

// In-memory orders store
let orders: any[] = [];
try {
  if (fs.existsSync(ORDERS_FILE)) {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
  } else {
    orders = [
      {
        id: "OP-1001",
        tableNumber: "4",
        items: [
          { dishId: "dish_tostado_jyq", name: "Tostado Completo de Jamón y Queso", price: 3000, quantity: 2 },
          { dishId: "dish_coca_cola", name: "Gaseosa Coca-Cola Original (600ml)", price: 2300, quantity: 2 }
        ],
        total: 10600,
        status: "recibido",
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        customerName: "Carlos Gómez",
        customerPhone: "+54 9 11 5449-3329",
        paymentMethod: "simulado_tarjeta",
        paymentStatus: "pagado"
      },
      {
        id: "OP-1002",
        tableNumber: "7",
        items: [
          { dishId: "dish_empanada_criolla", name: "Empanada de Carne Criolla al Horno", price: 2000, quantity: 4 },
          { dishId: "dish_mini_oreo", name: "Mini Oreo Dulces", price: 1900, quantity: 2 },
          { dishId: "dish_cafe_leche", name: "Café con Leche + 1 Medialuna", price: 5000, quantity: 1 }
        ],
        total: 16800,
        status: "preparando",
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        customerName: "María Beltrán",
        customerPhone: "+54 9 11 3910-4493",
        paymentMethod: "pago_movil",
        paymentStatus: "pagado"
      }
    ];
    saveOrders(orders);
  }
} catch (e) {
  console.error("Error loading or seeding orders:", e);
}

// Helper functions to map between frontend Dish and database MenuItem format
function mapDbToFrontendDish(row: any): any {
  const defaultImage = "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=60";
  const mapped = {
    id: row.id,
    name: row.name || "Plato sin nombre",
    nameEn: row.name_en || undefined,
    description: row.description || "",
    descriptionEn: row.description_en || undefined,
    price: Number(row.price_ars !== undefined && row.price_ars !== null ? row.price_ars : (row.price || 0)),
    priceArs: Number(row.price_ars !== undefined && row.price_ars !== null ? row.price_ars : (row.price || 0)),
    priceUsd: row.price_usd !== undefined ? Number(row.price_usd) : undefined,
    category: row.category || "Otros",
    section: row.section || row.category || "Otros",
    image: row.image_url || row.image || defaultImage,
    imageUrl: row.image_url || row.image || defaultImage,
    tags: Array.isArray(row.tags) ? row.tags : [],
    purpose: row.purpose || "Sabor con propósito que bendice a la comunidad.",
    purposeEn: row.purpose_en || undefined,
    available: row.available !== undefined ? Boolean(row.available) : (row.isAvailable !== undefined ? Boolean(row.isAvailable) : true),
    isAvailable: row.available !== undefined ? Boolean(row.available) : (row.isAvailable !== undefined ? Boolean(row.isAvailable) : true),
    stock: row.stock !== undefined && row.stock !== null ? Number(row.stock) : 20,
    imageFit: row.image_fit || "cover"
  };
  return mapped;
}

function mapFrontendToDbDish(dish: any): any {
  return {
    name: dish.name,
    name_en: dish.nameEn || null,
    description: dish.description || "",
    description_en: dish.descriptionEn || null,
    price_ars: Number(dish.price),
    price_usd: Number((Number(dish.price) / (loadConfig()?.exchangeRate || 1000)).toFixed(2)),
    category: dish.category || "Otros",
    section: dish.category || "Otros",
    image_url: dish.image || "",
    stock: dish.stock !== undefined ? Number(dish.stock) : 20,
    available: dish.available !== undefined ? Boolean(dish.available) : true,
    tags: Array.isArray(dish.tags) ? dish.tags : [],
    purpose: dish.purpose || "",
    purpose_en: dish.purposeEn || null,
    image_fit: dish.imageFit || "cover",
    updated_at: new Date().toISOString()
  };
}

// Seeding logic to migrate local dishes JSON to Supabase if empty
async function seedMenuItems() {
  if (!supabase) {
    console.log("⚠️ [SEED ERROR] Supabase client is not initialized. Skipping seed.");
    return;
  }
  try {
    const { data, error, count } = await supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.log("\n=========================================================================");
      console.log("⚠️ [MIGRACION DE PLATOS] AVISO IMPORTANTE DE SUPABASE");
      console.log("La tabla 'menu_items' no parece existir en Supabase todavía o no se puede acceder a ella.");
      console.log(`Detalle del error: ${error.message}`);
      console.log("Por favor ejecute la consulta SQL que se detalla en el resumen del asistente.");
      console.log("=========================================================================\n");
      return;
    }

    if (count === 0) {
      console.log("🌱 [SEED] La tabla 'menu_items' de Supabase está vacía. Iniciando migración de platos...");
      const dishesToMigrate = loadDishes(); // reads dishes.json or falls back to defaults
      
      const dbRows = dishesToMigrate.map(d => ({
        id: d.id,
        name: d.name,
        name_en: d.nameEn || null,
        description: d.description || "",
        description_en: d.descriptionEn || null,
        price_ars: Number(d.price),
        price_usd: Number((Number(d.price) / (cachedConfig?.exchangeRate || 1000)).toFixed(2)),
        category: d.category || "Otros",
        section: d.category || "Otros",
        image_url: d.image || "",
        stock: d.stock !== undefined ? Number(d.stock) : 20,
        available: d.available !== undefined ? Boolean(d.available) : true,
        tags: d.tags || [],
        purpose: d.purpose || "",
        purpose_en: d.purposeEn || null,
        image_fit: d.imageFit || "cover"
      }));

      const { error: insertError } = await supabase
        .from("menu_items")
        .insert(dbRows);

      if (insertError) {
        console.error("❌ [SEED ERROR] Falló la inserción de los platos en Supabase:", insertError.message);
      } else {
        console.log(`✅ [SEED SUCCESS] Se migraron exitosamente ${dbRows.length} platos a la tabla 'menu_items' de Supabase.`);
      }
    } else {
      console.log(`ℹ️ [SEED] La tabla 'menu_items' de Supabase ya tiene ${count} platos. No se requiere migración.`);
    }
  } catch (err: any) {
    console.error("❌ [SEED ERROR] Error crítico al migrar platos a Supabase:", err);
  }
}

// API Endpoints

// Get all dishes / menu items (Supporting both endpoints)
const handleGetMenuItems = async (req: express.Request, res: express.Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data) {
        console.log(`📡 [SUPABASE MENU ITEMS] Cantidad de registros recibidos: ${data.length}`);
        if (data.length > 0) {
          console.log(`📡 [SUPABASE MENU ITEMS] Primer registro recibido de la base de datos:`, JSON.stringify(data[0], null, 2));
          const mappedFirst = mapDbToFrontendDish(data[0]);
          console.log(`📡 [SUPABASE MENU ITEMS] Primer registro mapeado al frontend:`, JSON.stringify(mappedFirst, null, 2));
        } else {
          console.log("📡 [SUPABASE MENU ITEMS] El array recibido está vacío.");
        }
        const dishes = data.map(mapDbToFrontendDish);
        return res.json(dishes);
      } else {
        console.warn("⚠️ [DISHES BACKUP] Falló la consulta en Supabase, utilizando platos locales. Error:", error?.message);
      }
    } catch (e: any) {
      console.error("❌ Error de red al consultar platos en Supabase:", e);
    }
  }

  // Fallback if Supabase is offline or not created yet
  console.log("ℹ️ [FALLBACK] Retornando platos desde base de datos local (dishes.json)");
  const dishes = loadDishes();
  res.json(dishes);
};

app.get("/api/dishes", handleGetMenuItems);
app.get("/api/menu-items", handleGetMenuItems);

// Create a new dish (Admin)
const handleCreateMenuItem = async (req: express.Request, res: express.Response) => {
  const { 
    name, nameEn, description, descriptionEn, 
    price, category, image, tags, purpose, purposeEn, available, stock, imageFit
  } = req.body;

  if (!name || !description || !price || !category || !image || !purpose) {
    return res.status(400).json({ error: "Faltan datos obligatorios para crear el plato." });
  }

  const newId = `dish_${Date.now()}`;
  
  if (supabase) {
    try {
      const dbRow = {
        id: newId,
        name,
        name_en: nameEn || null,
        description,
        description_en: descriptionEn || null,
        price_ars: Number(price),
        price_usd: Number((Number(price) / (loadConfig()?.exchangeRate || 1000)).toFixed(2)),
        category,
        section: category,
        image_url: image,
        stock: stock !== undefined ? Number(stock) : 20,
        available: available !== undefined ? Boolean(available) : true,
        tags: Array.isArray(tags) ? tags : [tags],
        purpose,
        purpose_en: purposeEn || null,
        image_fit: imageFit || 'cover',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("menu_items")
        .insert(dbRow);

      if (!error) {
        console.log(`✅ [SUPABASE MENU] Nuevo plato creado exitosamente en base de datos: "${name}"`);
        // Sync to local json as secondary backup
        const dishes = loadDishes();
        const mappedDish = mapDbToFrontendDish(dbRow);
        dishes.push(mappedDish);
        saveDishes(dishes);

        return res.status(201).json(mappedDish);
      } else {
        console.error("❌ Error al insertar plato en Supabase:", error.message);
        return res.status(500).json({ error: `Error en Supabase: ${error.message}` });
      }
    } catch (e: any) {
      console.error("❌ Error de servidor al conectar con Supabase:", e);
    }
  }

  // Fallback if Supabase is offline
  console.log("ℹ️ [FALLBACK] Creando plato localmente en dishes.json");
  const dishes = loadDishes();
  const newDish = {
    id: newId,
    name,
    nameEn: nameEn || undefined,
    description,
    descriptionEn: descriptionEn || undefined,
    price: Number(price),
    category,
    image,
    tags: Array.isArray(tags) ? tags : [tags],
    purpose,
    purposeEn: purposeEn || undefined,
    available: available !== undefined ? available : true,
    stock: stock !== undefined ? Number(stock) : 20,
    imageFit: imageFit || 'cover'
  };

  dishes.push(newDish);
  saveDishes(dishes);
  res.status(201).json(newDish);
};

app.post("/api/dishes", handleCreateMenuItem);
app.post("/api/menu-items", handleCreateMenuItem);

// Update a dish (Admin)
const handleUpdateMenuItem = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { 
    name, nameEn, description, descriptionEn, 
    price, category, image, tags, purpose, purposeEn, available, stock, imageFit 
  } = req.body;

  if (supabase) {
    try {
      // Build clean update object matching the database schema
      const dbUpdate: any = {};
      if (name !== undefined) dbUpdate.name = name;
      if (nameEn !== undefined) dbUpdate.name_en = nameEn || null;
      if (description !== undefined) dbUpdate.description = description;
      if (descriptionEn !== undefined) dbUpdate.description_en = descriptionEn || null;
      if (price !== undefined) {
        dbUpdate.price_ars = Number(price);
        dbUpdate.price_usd = Number((Number(price) / (loadConfig()?.exchangeRate || 1000)).toFixed(2));
      }
      if (category !== undefined) {
        dbUpdate.category = category;
        dbUpdate.section = category;
      }
      if (image !== undefined) dbUpdate.image_url = image;
      if (tags !== undefined) dbUpdate.tags = Array.isArray(tags) ? tags : [tags];
      if (purpose !== undefined) dbUpdate.purpose = purpose;
      if (purposeEn !== undefined) dbUpdate.purpose_en = purposeEn || null;
      if (available !== undefined) dbUpdate.available = Boolean(available);
      if (stock !== undefined) dbUpdate.stock = Number(stock);
      if (imageFit !== undefined) dbUpdate.image_fit = imageFit;
      dbUpdate.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("menu_items")
        .update(dbUpdate)
        .eq("id", id);

      if (!error) {
        // Read updated record
        const { data, error: selectErr } = await supabase
          .from("menu_items")
          .select("*")
          .eq("id", id)
          .single();

        if (!selectErr && data) {
          console.log(`✅ [SUPABASE MENU] Plato "${id}" actualizado con éxito en Supabase.`);
          const updatedDish = mapDbToFrontendDish(data);

          // Update local backup
          const dishes = loadDishes();
          const idx = dishes.findIndex(d => d.id === id);
          if (idx !== -1) {
            dishes[idx] = updatedDish;
          } else {
            dishes.push(updatedDish);
          }
          saveDishes(dishes);

          return res.json(updatedDish);
        }
      } else {
        console.error(`❌ Error al actualizar plato ${id} en Supabase:`, error.message);
        return res.status(500).json({ error: `Error en Supabase: ${error.message}` });
      }
    } catch (e: any) {
      console.error("❌ Error de servidor al conectar con Supabase para actualización:", e);
    }
  }

  // Fallback if Supabase is offline
  console.log("ℹ️ [FALLBACK] Actualizando plato localmente en dishes.json");
  const dishes = loadDishes();
  const index = dishes.findIndex(d => d.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Platillo no encontrado." });
  }

  dishes[index] = {
    ...dishes[index],
    name: name !== undefined ? name : dishes[index].name,
    nameEn: nameEn !== undefined ? nameEn : dishes[index].nameEn,
    description: description !== undefined ? description : dishes[index].description,
    descriptionEn: descriptionEn !== undefined ? descriptionEn : dishes[index].descriptionEn,
    price: price !== undefined ? Number(price) : dishes[index].price,
    category: category !== undefined ? category : dishes[index].category,
    image: image !== undefined ? image : dishes[index].image,
    tags: tags !== undefined ? (Array.isArray(tags) ? tags : [tags]) : dishes[index].tags,
    purpose: purpose !== undefined ? purpose : dishes[index].purpose,
    purposeEn: purposeEn !== undefined ? purposeEn : dishes[index].purposeEn,
    available: available !== undefined ? available : dishes[index].available,
    stock: stock !== undefined ? Number(stock) : (dishes[index].stock !== undefined ? dishes[index].stock : 20),
    imageFit: imageFit !== undefined ? imageFit : dishes[index].imageFit
  };

  saveDishes(dishes);
  res.json(dishes[index]);
};

app.put("/api/dishes/:id", handleUpdateMenuItem);
app.put("/api/menu-items/:id", handleUpdateMenuItem);

// Delete a dish (Admin)
const handleDeleteMenuItem = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  if (supabase) {
    try {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", id);

      if (!error) {
        console.log(`✅ [SUPABASE MENU] Plato "${id}" eliminado de Supabase.`);
        // Remove from local backup
        let dishes = loadDishes();
        dishes = dishes.filter(d => d.id !== id);
        saveDishes(dishes);

        return res.json({ success: true, message: "Platillo eliminado con éxito de Supabase" });
      } else {
        console.error(`❌ Error al eliminar plato ${id} de Supabase:`, error.message);
        return res.status(500).json({ error: `Error en Supabase: ${error.message}` });
      }
    } catch (e: any) {
      console.error("❌ Error de servidor al conectar con Supabase para eliminación:", e);
    }
  }

  // Fallback if Supabase is offline
  console.log("ℹ️ [FALLBACK] Eliminando plato localmente de dishes.json");
  let dishes = loadDishes();
  const index = dishes.findIndex(d => d.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Platillo no encontrado." });
  }

  dishes = dishes.filter(d => d.id !== id);
  saveDishes(dishes);

  res.json({ success: true, message: "Platillo eliminado con éxito" });
};

app.delete("/api/dishes/:id", handleDeleteMenuItem);
app.delete("/api/menu-items/:id", handleDeleteMenuItem);

// Config GET (Exchange rate)
app.get("/api/config", async (req, res) => {
  const config = await loadConfigAsync();
  res.json(config);
});

// Config POST (Exchange rate)
app.post("/api/config", async (req, res) => {
  const { exchangeRate } = req.body;
  if (!exchangeRate || Number(exchangeRate) <= 0) {
    return res.status(400).json({ error: "Tipo de cambio inválido." });
  }

  const config = { exchangeRate: Number(exchangeRate) };
  await saveConfigAsync(config);

  res.json({ success: true, config });
});

// Admin Login validation against Supabase admin_users table
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Usuario y contraseña requeridos." });
  }

  if (!supabase) {
    return res.status(500).json({ error: "El cliente de Supabase no está configurado." });
  }

  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("password_hash, role")
      .eq("username", username.trim())
      .single();

    if (error || !data) {
      console.log(`ℹ️ Login failed: User '${username}' not found or error: ${error?.message}`);
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    const isMatch = verifyPassword(password, data.password_hash);
    if (!isMatch) {
      console.log(`ℹ️ Login failed: Password mismatch for user '${username}'`);
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    console.log(`✅ Admin logged in successfully: ${username}`);
    return res.json({
      success: true,
      role: data.role || "admin",
      token: "sabores-pos-admin-session-active-token"
    });
  } catch (err: any) {
    console.error("Error during admin login endpoint:", err);
    return res.status(500).json({ error: "Error interno del servidor al verificar credenciales." });
  }
});

// Secure image upload proxy to Supabase Storage (supporting both /api/upload and /api/upload-image)
const handleImageUploadRequest = async (req: express.Request, res: express.Response) => {
  const endpointName = req.path;
  try {
    const { file, fileName, fileType, adminPassword } = req.body;

    // Security Check 1: Admin session check
    const isAuthorized = await isValidAdminPassword(adminPassword);
    if (!isAuthorized) {
      return res.status(403).json({ error: "No autorizado. Sesión administrativa inválida o incorrecta." });
    }

    if (!supabase) {
      console.error(`❌ [STORAGE UPLOAD ERROR] Supabase no está inicializado para el endpoint ${endpointName}`);
      return res.status(500).json({ 
        error: "Supabase no está configurado. Por favor configure las variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el panel de secretos de AI Studio." 
      });
    }

    if (!file || !fileName || !fileType) {
      return res.status(400).json({ error: "Faltan parámetros del archivo para realizar la carga." });
    }

    // Security Check 2: MIME Type verification (Whitelist safe images only)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
    if (!allowedTypes.includes(fileType.toLowerCase())) {
      console.warn(`⚠️ [STORAGE UPLOAD WARNING] Formato de archivo no permitido intentado: ${fileType}`);
      return res.status(400).json({ error: "Formato de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WEBP, GIF)." });
    }

    // Convert base64 to binary buffer
    const base64Data = file.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // Security Check 3: File size constraint (max 5MB)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    if (buffer.length > MAX_SIZE_BYTES) {
      console.warn(`⚠️ [STORAGE UPLOAD WARNING] Archivo excede tamaño máximo: ${buffer.length} bytes`);
      return res.status(400).json({ error: "La imagen es demasiado grande. El límite es de 5MB." });
    }

    // Sanitise file name to prevent directory traversal
    const safeName = `${Date.now()}_${path.basename(fileName).replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    console.log(`📸 [STORAGE UPLOAD] Iniciando subida de imagen para el endpoint: ${endpointName}`);
    console.log(`   • Bucket utilizado: "platos"`);
    console.log(`   • Nombre original: "${fileName}"`);
    console.log(`   • Nombre único generado: "${safeName}"`);
    console.log(`   • Tipo MIME: "${fileType}"`);
    console.log(`   • Tamaño del buffer: ${buffer.length} bytes`);

    // Upload to Supabase Storage bucket 'platos' (per user recommendation)
    const { data, error } = await supabase.storage
      .from('platos')
      .upload(safeName, buffer, {
        contentType: fileType,
        upsert: true
      });

    if (error) {
      console.error(`❌ [STORAGE UPLOAD ERROR] Error exacto de Supabase al subir a "platos":`);
      console.error(`   • Bucket: "platos"`);
      console.error(`   • Nombre de archivo: "${safeName}"`);
      console.error(`   • Tipo MIME: "${fileType}"`);
      console.error(`   • Detalles del error:`, error);
      return res.status(500).json({ error: `Fallo en el storage de Supabase: ${error.message}` });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('platos')
      .getPublicUrl(safeName);

    console.log(`✅ [STORAGE UPLOAD SUCCESS] Imagen subida exitosamente.`);
    console.log(`   • URL pública generada: "${publicUrl}"`);

    return res.json({ success: true, url: publicUrl });

  } catch (error: any) {
    console.error(`❌ [STORAGE UPLOAD ERROR] Error crítico en endpoint ${endpointName}:`, error);
    return res.status(500).json({ error: error.message || "Error interno del servidor al procesar la imagen." });
  }
};

app.post("/api/upload", handleImageUploadRequest);
app.post("/api/upload-image", handleImageUploadRequest);

async function getOpenCashSession(): Promise<any | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("*")
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("[OPEN CASH SESSION] Error Supabase:", error.message);
      }

      if (!error && data && data.length > 0) {
        return mapDbToSession(data[0]);
      }
    } catch (err: any) {
      console.error("[OPEN CASH SESSION] Error inesperado:", err.message || err);
    }
  }

  try {
    const sessions = loadSessions();
    return sessions.find((s: any) => s.status === "open") || null;
  } catch (err) {
    console.error("[OPEN CASH SESSION] Error local:", err);
    return null;
  }
}

// --- DATABASE MAPPING HELPERS FOR COHESIVE SYSTEM ---
function mapDbToSession(row: any): any {
  if (!row) return null;
  const rawDiff = row.difference_cash !== undefined && row.difference_cash !== null ? row.difference_cash : row.difference;
  return {
    id: row.id,
    openedBy: row.opened_by || "",
    openingAmount: Number(row.opening_amount || 0),
    openingNote: row.opening_note || "",
    openedAt: row.opened_at,
    closedBy: row.closed_by || null,
    closedAt: row.closed_at || null,
    status: row.status || "open",
    expectedCash: Number(row.expected_cash || 0),
    countedCash: row.counted_cash !== null && row.counted_cash !== undefined ? Number(row.counted_cash) : undefined,
    totalCash: Number(row.total_cash || 0),
    totalTransfer: Number(row.total_transfer || 0),
    totalQr: Number(row.total_qr || 0),
    totalCard: Number(row.total_card || 0),
    totalSales: Number(row.total_sales || 0),
    difference: rawDiff !== null && rawDiff !== undefined ? Number(rawDiff) : undefined,
    closingNote: row.closing_note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    // New Fields
    declaredCash: row.declared_cash !== undefined && row.declared_cash !== null ? Number(row.declared_cash) : (row.counted_cash !== null && row.counted_cash !== undefined ? Number(row.counted_cash) : 0),
    declaredTransfer: Number(row.declared_transfer || 0),
    declaredQr: Number(row.declared_qr || 0),
    declaredCard: Number(row.declared_card || 0),
    expectedTransfer: Number(row.expected_transfer || 0),
    expectedQr: Number(row.expected_qr || 0),
    expectedCard: Number(row.expected_card || 0),
    differenceTransfer: Number(row.difference_transfer || 0),
    differenceQr: Number(row.difference_qr || 0),
    differenceCard: Number(row.difference_card || 0),
    differenceTotal: Number(row.difference_total || 0),
    closingResult: row.closing_result || null
  };
}

function mapSessionToDb(session: any): any {
  if (!session) return null;
  return {
    id: session.id,
    opened_by: session.openedBy,
    opening_amount: Number(session.openingAmount || 0),
    opening_note: session.openingNote || null,
    opened_at: session.openedAt,
    closed_by: session.closedBy || null,
    closed_at: session.closedAt || null,
    status: session.status,
    expected_cash: Number(session.expectedCash || 0),
    counted_cash: session.countedCash !== undefined ? Number(session.countedCash) : null,
    total_cash: Number(session.totalCash || 0),
    total_transfer: Number(session.totalTransfer || 0),
    total_qr: Number(session.totalQr || 0),
    total_card: Number(session.totalCard || 0),
    total_sales: Number(session.totalSales || 0),
    difference_cash: session.difference !== undefined ? Number(session.difference) : null,
    closing_note: session.closingNote || null,
    created_at: session.createdAt || new Date().toISOString(),
    updated_at: session.updatedAt || new Date().toISOString(),

    // New Fields
    declared_cash: Number(session.declaredCash !== undefined ? session.declaredCash : (session.countedCash || 0)),
    declared_transfer: Number(session.declaredTransfer || 0),
    declared_qr: Number(session.declaredQr || 0),
    declared_card: Number(session.declaredCard || 0),
    expected_transfer: Number(session.expectedTransfer || 0),
    expected_qr: Number(session.expectedQr || 0),
    expected_card: Number(session.expectedCard || 0),
    difference_transfer: Number(session.differenceTransfer || 0),
    difference_qr: Number(session.differenceQr || 0),
    difference_card: Number(session.differenceCard || 0),
    difference_total: Number(session.differenceTotal || 0),
    closing_result: session.closingResult || null
  };
}

function mapDbToMovement(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    cashSessionId: row.cash_session_id,
    orderId: row.order_id || undefined,
    type: row.type,
    paymentMethod: row.payment_method || undefined,
    amount: Number(row.amount || 0),
    description: row.description || "",
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

function mapMovementToDb(mov: any): any {
  if (!mov) return null;
  return {
    id: mov.id,
    cash_session_id: mov.cashSessionId,
    order_id: mov.orderId || null,
    type: mov.type,
    payment_method: mov.paymentMethod || null,
    amount: Number(mov.amount || 0),
    description: mov.description || "",
    concept: mov.concept || mov.description || "",
    created_by: mov.createdBy,
    created_at: mov.createdAt || new Date().toISOString()
  };
}

async function ensureSessionSynced(session: any) {
  if (!supabase || !session) return;
  try {
    const { data, error } = await supabase
      .from("cash_sessions")
      .select("id")
      .eq("id", session.id);
    if (!error && (!data || data.length === 0)) {
      console.log(`[SYNC] Local session ${session.id} not found in Supabase. Syncing...`);
      const { error: insertErr } = await supabase
        .from("cash_sessions")
        .insert([mapSessionToDb(session)]);
      if (insertErr) {
        console.error(`[SYNC] Error syncing local session ${session.id} to Supabase:`, insertErr.message);
      } else {
        console.log(`[SYNC] Local session ${session.id} synced successfully.`);
        // Also sync its opening cash_movement!
        const movements = loadMovements().filter(m => m.cashSessionId === session.id);
        for (const m of movements) {
          try {
            await supabase.from("cash_movements").insert([mapMovementToDb(m)]);
          } catch (mErr) {
            // Ignore individual sync errors
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`[SYNC] Error checking/syncing local session ${session.id}:`, err.message);
  }
}

function mapDbToOrder(row: any, dbItems: any[] = []): any {
  if (!row) return null;
  const items = dbItems.filter(item => item.order_id === row.id).map(item => ({
    dishId: item.dish_id,
    menuItemId: item.menu_item_id || item.dish_id,
    name: item.name,
    price: Number(item.price || 0),
    priceArs: Number(item.price_ars || item.price || 0),
    quantity: Number(item.quantity || 1),
    subtotalArs: Number(item.subtotal_ars || (Number(item.price_ars || item.price || 0) * Number(item.quantity || 1))),
    notes: item.notes || undefined
  }));

  // Map database status/paymentStatus values to align with local code expectation
  let mappedPaymentStatus = "pendiente";
  if (row.payment_status === "paid" || row.payment_status === "pagado") {
    mappedPaymentStatus = "pagado";
  } else if (row.payment_status === "pending" || row.payment_status === "pendiente") {
    mappedPaymentStatus = "pendiente";
  }

  let mappedStatus = "recibido";
  if (row.status === "pending_payment") {
    mappedStatus = "recibido";
  } else if (row.status === "approved" || row.status === "approved_manual" || row.status === "preparing") {
    // If approved or preparing, map to 'preparando' or 'recibido' based on kitchen flow
    if (row.status === "approved" || row.status === "approved_manual") {
      mappedStatus = "recibido"; // Cocina sees 'recibido' to prepare
    } else {
      mappedStatus = "preparando"; // Cocina sees 'preparando' in progress
    }
  } else if (row.status === "ready") {
    mappedStatus = "listo";
  } else if (row.status === "delivered") {
    mappedStatus = "entregado";
  } else {
    mappedStatus = row.status || "recibido";
  }

  return {
    id: row.id,
    tableNumber: row.table_number || "",
    items: items,
    total: Number(row.total || 0),
    totalArs: Number(row.total_ars || row.total || 0),
    totalUsd: Number(row.total_usd || 0),
    status: mappedStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name || "",
    customerPhone: row.customer_phone || undefined,
    paymentMethod: row.payment_method || "efectivo",
    paymentStatus: mappedPaymentStatus,
    source: row.source || "qr_customer",
    cashierName: row.cashier_name || undefined,
    cashSessionId: row.cash_session_id || undefined,
    paidAt: row.paid_at || undefined,
    approvedAt: row.approved_at || undefined,
    notes: row.notes || undefined
  };
}

function mapOrderToDb(order: any): any {
  if (!order) return null;

  // Map paymentStatus: 'pendiente' -> 'pending', 'pagado' -> 'paid'
  let dbPaymentStatus = "pending";
  if (order.paymentStatus === "pagado" || order.paymentStatus === "paid") {
    dbPaymentStatus = "paid";
  } else if (order.paymentStatus === "pendiente" || order.paymentStatus === "pending") {
    dbPaymentStatus = "pending";
  }

  // Map status:
  let dbStatus = "pending_payment";
  if (dbPaymentStatus === "pending") {
    dbStatus = "pending_payment";
  } else {
    if (order.status === "recibido" || order.status === "approved") {
      dbStatus = "approved";
    } else if (order.status === "preparando" || order.status === "preparing") {
      dbStatus = "preparing";
    } else if (order.status === "listo" || order.status === "ready") {
      dbStatus = "ready";
    } else if (order.status === "entregado" || order.status === "delivered") {
      dbStatus = "delivered";
    }
  }

  return {
    id: order.id,
    table_number: order.tableNumber,
    total: Number(order.total || 0),
    total_ars: Number(order.totalArs || order.total || 0),
    total_usd: Number(order.totalUsd || (Number(order.totalArs || order.total || 0) / (cachedConfig.exchangeRate || 1000))),
    status: dbStatus,
    payment_status: dbPaymentStatus,
    payment_method: order.paymentMethod || null,
    source: order.source || "qr_customer",
    customer_name: order.customerName,
    customer_phone: order.customerPhone || null,
    cash_session_id: order.cashSessionId || null,
    notes: order.notes || null,
    created_at: order.createdAt || new Date().toISOString(),
    updated_at: order.updatedAt || new Date().toISOString(),
    paid_at: order.paidAt || null,
    approved_at: order.approvedAt || null,
    cashier_name: order.cashierName || null
  };
}

function mapOrderItemToDb(orderId: string, item: any): any {
  const quantity = Number(item.quantity || 1);
  const price = Number(item.price || item.priceArs || 0);
  const price_ars = Number(item.priceArs || item.price || 0);
  const subtotal_ars = price_ars * quantity;
  return {
    id: crypto.randomUUID(),
    order_id: orderId,
    dish_id: item.dishId || null,
    menu_item_id: item.menuItemId || item.dishId || null,
    name: item.name,
    price: price,
    price_ars: price_ars,
    quantity: quantity,
    subtotal_ars: subtotal_ars,
    notes: item.notes || null,
    created_at: new Date().toISOString()
  };
}


// Get all orders
app.get("/api/orders", async (req, res) => {
  if (supabase) {
    try {
      const { data: dbOrders, error: ordersErr } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!ordersErr && dbOrders) {
        // Fetch items for these orders
        const { data: dbItems, error: itemsErr } = await supabase
          .from("order_items")
          .select("*");

        if (!itemsErr && dbItems) {
          const mapped = dbOrders.map(o => mapDbToOrder(o, dbItems));
          // Synchronise local memory/file orders for resilience
          orders = mapped;
          saveOrders(orders);
          return res.json(mapped);
        }
      }
      console.warn("⚠️ Falló la consulta de pedidos en Supabase:", ordersErr?.message);
    } catch (e) {
      console.error("❌ Error de servidor al consultar pedidos en Supabase:", e);
    }
  }

  // Fallback to local
  res.json(orders);
});

// Create a new customer order
app.post("/api/orders", async (req, res) => {
  const { tableNumber, items, total, customerName, customerPhone, paymentMethod, notes } = req.body;
  
  if (!tableNumber || !items || !items.length || !total || !customerName) {
    return res.status(400).json({ error: "Faltan datos obligatorios para el pedido." });
  }

  // Find current session if open to associate it
  const activeSessionId = await getActiveSessionId();

  const orderId = `OP-${Math.floor(1000 + Math.random() * 9000)}`;
  const newOrder: any = {
    id: orderId,
    tableNumber,
    items,
    total,
    totalArs: total,
    totalUsd: Number(total / (cachedConfig.exchangeRate || 1000)),
    status: "recibido", // maps to "pending_payment" in DB
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerName,
    customerPhone: customerPhone || "",
    paymentMethod: paymentMethod || null,
    paymentStatus: "pendiente", // maps to "pending" in DB
    source: "qr_customer",
    cashSessionId: activeSessionId || null,
    notes: notes || ""
  };

  // Discount stock immediately on order creation
  try {
    const dishes = loadDishes();
    let modified = false;
    items.forEach((item: any) => {
      const dish = dishes.find(d => d.id === item.dishId);
      if (dish) {
        const currentStock = dish.stock !== undefined ? dish.stock : 20;
        dish.stock = Math.max(0, currentStock - item.quantity);
        modified = true;
      }
    });
    if (modified) {
      saveDishes(dishes);
      console.log(`📉 Stock discounted immediately on placement of order ${newOrder.id}`);
      // Push stock update to Supabase too if active!
      if (supabase) {
        for (const item of items) {
          const d = dishes.find(dish => dish.id === item.dishId);
          if (d) {
            await supabase.from("menu_items").update({ stock: d.stock }).eq("id", item.dishId).then(({ error }) => {
              if (error) console.error("Error updating stock in Supabase:", error);
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Error updating stock on order placement:", err);
  }

  // Insert to Supabase first!
  if (supabase) {
    try {
      const dbOrder = mapOrderToDb(newOrder);
      const { error: orderErr } = await supabase.from("orders").insert([dbOrder]);
      if (orderErr) {
        console.error("❌ Error inserting order to Supabase:", orderErr.message);
        return res.status(500).json({ error: "No se pudo registrar el pedido en la base de datos de la nube. Intente nuevamente." });
      }

      const dbItems = items.map((item: any) => mapOrderItemToDb(newOrder.id, item));
      const { error: itemsErr } = await supabase.from("order_items").insert(dbItems);
      if (itemsErr) {
        console.error("❌ Error inserting order items to Supabase:", itemsErr.message);
        // Rollback inserted order on error
        await supabase.from("orders").delete().eq("id", newOrder.id);
        return res.status(500).json({ error: "No se pudo registrar los productos del pedido en la base de datos de la nube. Intente nuevamente." });
      }
      
      console.log(`✅ [SUPABASE ORDERS] Pedido ${newOrder.id} creado exitosamente con sus items.`);
    } catch (e: any) {
      console.error("❌ Error conectando con Supabase para insertar pedido:", e);
      return res.status(500).json({ error: "No se pudo registrar el pedido en Supabase. Conexión fallida." });
    }
  } else {
    return res.status(500).json({ error: "No se pudo registrar el pedido. Conexión de base de datos no disponible." });
  }

  // If Supabase was successful, also update local cache
  orders.unshift(newOrder);
  saveOrders(orders);

  res.status(201).json(newOrder);
});

// Helper to get active cash session ID
async function getActiveSessionId(): Promise<string | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("id")
        .eq("status", "open")
        .single();
      if (!error && data) {
        return data.id;
      }
    } catch (err) {
      // Ignore
    }
  }
  const sessions = loadSessions();
  const active = sessions.find(s => s.status === 'open');
  if (active) {
    await ensureSessionSynced(active);
    return active.id;
  }
  return null;
}

// Update order status (Kitchen or customer action)
app.put("/api/orders/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const orderIndex = orders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "Pedido no encontrado." });
  }

  const validStatuses = ["recibido", "preparando", "listo", "entregado"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Estado de pedido inválido." });
  }

  orders[orderIndex].status = status;
  orders[orderIndex].updatedAt = new Date().toISOString();

  // If order status changes to delivered, we mark as paid if it wasn't
  if (status === "entregado") {
    orders[orderIndex].paymentStatus = "pagado";
    if (!orders[orderIndex].paidAt) {
      orders[orderIndex].paidAt = new Date().toISOString();
    }
    if (!orders[orderIndex].cashSessionId) {
      const activeSessionId = await getActiveSessionId();
      orders[orderIndex].cashSessionId = activeSessionId;
    }
  }

  saveOrders(orders); // Persist to local cache file

  if (supabase && isSupabaseActive) {
    try {
      let dbStatus = "pending_payment";
      if (status === "recibido") {
        dbStatus = "approved";
      } else if (status === "preparando") {
        dbStatus = "preparing";
      } else if (status === "listo") {
        dbStatus = "ready";
      } else if (status === "entregado") {
        dbStatus = "delivered";
      }

      const dbUpdate: any = { status: dbStatus, updated_at: new Date().toISOString() };
      if (status === "entregado") {
        dbUpdate.payment_status = "paid";
        dbUpdate.paid_at = orders[orderIndex].paidAt || new Date().toISOString();
        if (orders[orderIndex].cashSessionId) {
          dbUpdate.cash_session_id = orders[orderIndex].cashSessionId;
        }
      }
      const { error } = await supabase
        .from("orders")
        .update(dbUpdate)
        .eq("id", id);
      if (error) {
        handleSupabaseError(error, "actualizar estado del pedido");
      } else {
        console.log(`✅ [SUPABASE] Estado del pedido ${id} actualizado a "${dbStatus}".`);
      }
    } catch (e: any) {
      console.error("❌ Error conectando con Supabase para actualizar estado:", e);
    }
  }

  res.json(orders[orderIndex]);
});

// Update order payment status (Cashier action)
app.put("/api/orders/:id/payment", async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  const orderIndex = orders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "Pedido no encontrado." });
  }

  if (paymentStatus !== "pendiente" && paymentStatus !== "pagado") {
    return res.status(400).json({ error: "Estado de pago inválido." });
  }

  const oldStatus = orders[orderIndex].status;
  const oldPaymentStatus = orders[orderIndex].paymentStatus;

  orders[orderIndex].paymentStatus = paymentStatus;
  orders[orderIndex].updatedAt = new Date().toISOString();
  if (paymentStatus === "pagado") {
    orders[orderIndex].paidAt = new Date().toISOString();
    orders[orderIndex].approvedAt = new Date().toISOString();
    orders[orderIndex].status = "recibido"; // Set to recibido locally so Cocina displays it immediately as approved
    if (!orders[orderIndex].cashSessionId) {
      const activeSessionId = await getActiveSessionId();
      orders[orderIndex].cashSessionId = activeSessionId;
    }
  }

  saveOrders(orders);

  let supabaseResponse = null;
  if (supabase && isSupabaseActive) {
    try {
      const dbPaymentStatus = paymentStatus === "pagado" ? "paid" : "pending";
      const dbUpdate: any = {
        payment_status: dbPaymentStatus,
        updated_at: new Date().toISOString()
      };
      if (paymentStatus === "pagado") {
        dbUpdate.paid_at = new Date().toISOString();
        dbUpdate.approved_at = new Date().toISOString();
        dbUpdate.status = "approved"; // If payment is updated to paid, set status to approved
        if (orders[orderIndex].cashSessionId) {
          dbUpdate.cash_session_id = orders[orderIndex].cashSessionId;
        }
        if (orders[orderIndex].cashierName) {
          dbUpdate.cashier_name = orders[orderIndex].cashierName;
        }
      }
      
      const { data, error } = await supabase
        .from("orders")
        .update(dbUpdate)
        .eq("id", id)
        .select("*");
      
      supabaseResponse = { data, error };
      
      console.log(`[DIAGNOSTIC LOG /payment]`, {
        orderId: id,
        oldStatus,
        oldPaymentStatus,
        newStatus: orders[orderIndex].status,
        newPaymentStatus: paymentStatus,
        supabaseResponse: JSON.stringify(supabaseResponse)
      });

      if (error) {
        handleSupabaseError(error, "actualizar pago del pedido");
      }
    } catch (e: any) {
      console.error("❌ Error de red al actualizar pago en Supabase:", e.message);
    }
  }

  res.json(orders[orderIndex]);
});

// Clear orders history (Admin password required)
app.post("/api/orders/clear", async (req, res) => {
  const { adminPassword } = req.body;

  const isAuthorized = await isValidAdminPassword(adminPassword);
  if (!isAuthorized) {
    return res.status(403).json({ error: "No autorizado. Sesión administrativa inválida o incorrecta." });
  }

  orders = [];
  saveOrders(orders); // Persist to local cache file

  if (supabase) {
    try {
      await supabase.from("order_items").delete().gt("created_at", "1970-01-01");
      await supabase.from("cash_movements").delete().neq("type", "opening");
      await supabase.from("orders").delete().gt("created_at", "1970-01-01");
      console.log("✅ [SUPABASE] Todos los pedidos han sido eliminados de la base de datos.");
    } catch (err) {
      console.error("Error clearing orders from Supabase:", err);
    }
  }

  res.json({ message: "Historial de pedidos reiniciado exitosamente." });
});

// Delete individual order (Admin password required)
app.delete("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const { adminPassword } = req.body;

  const isAuthorized = await isValidAdminPassword(adminPassword);
  if (!isAuthorized) {
    return res.status(403).json({ error: "No autorizado. Sesión administrativa inválida o incorrecta." });
  }

  const index = orders.findIndex(o => o.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Pedido no encontrado." });
  }

  orders.splice(index, 1);
  saveOrders(orders); // Persist to local cache file

  if (supabase) {
    try {
      await supabase.from("order_items").delete().eq("order_id", id);
      await supabase.from("cash_movements").delete().eq("order_id", id);
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) console.error("Error deleting order from Supabase:", error);
    } catch (err) {
      console.error("Error deleting order from Supabase:", err);
    }
  }

  res.json({ success: true, message: `Pedido ${id} eliminado con éxito.` });
});

// --- CAJA & ARQUEO SYSTEM ENDPOINTS ---

function getCalculatedSession(session: any, ordersList: any[], movementsList: any[]) {
  if (!session) return null;
  if (session.status === 'closed') return session;

  const sessionOrders = ordersList.filter(o => o.cashSessionId === session.id && o.paymentStatus === 'pagado');
  
  let totalCash = 0;
  let totalTransfer = 0;
  let totalQr = 0;
  let totalCard = 0;
  let totalSales = 0;

  sessionOrders.forEach(o => {
    const amount = o.total || 0;
    totalSales += amount;
    const method = String(o.paymentMethod || "").toLowerCase();
    if (method === 'efectivo' || method === 'efectivo_caja') {
      totalCash += amount;
    } else if (method === 'transferencia' || method === 'pago_movil') {
      totalTransfer += amount;
    } else if (method === 'qr' || method === 'qr_caja') {
      totalQr += amount;
    } else if (method === 'tarjeta' || method === 'tarjeta_caja' || method === 'simulado_tarjeta') {
      totalCard += amount;
    } else {
      totalCash += amount;
    }
  });

  const sessionMovements = movementsList.filter(m => m.cashSessionId === session.id);
  let expectedCash = session.openingAmount;
  sessionMovements.forEach(m => {
    if (m.type === 'adjustment') {
      expectedCash += m.amount;
    } else if (m.type === 'refund') {
      expectedCash -= m.amount;
    }
  });
  expectedCash += totalCash;

  return {
    ...session,
    totalCash,
    totalTransfer,
    totalQr,
    totalCard,
    totalSales,
    expectedCash
  };
}

// GET /api/cash-session/current
app.get("/api/cash-session/current", async (req, res) => {
  let current = null;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("*")
        .eq("status", "open")
        .single();
      if (!error && data) {
        current = mapDbToSession(data);
      }
    } catch (err: any) {
      console.log("ℹ️ No open session found in Supabase or error:", err.message);
    }
  }

  if (!current) {
    const sessions = loadSessions();
    current = sessions.find(s => s.status === 'open');
  }

  if (!current) {
    return res.json({ session: null });
  }

  // Ensure this active session is synced to Supabase
  await ensureSessionSynced(current);

  // Self-healing: Find any paid orders without cashSessionId that were paid around/after session opened,
  // and associate them with the current open session.
  let healedAny = false;
  orders.forEach(o => {
    if ((o.paymentStatus === 'pagado' || o.paymentStatus === 'paid') && !o.cashSessionId) {
      const orderTime = new Date(o.paidAt || o.createdAt).getTime();
      const sessionTime = new Date(current.openedAt).getTime();
      // If paid/created within 24 hours of session opened, or after session opened:
      if (Math.abs(orderTime - sessionTime) < 24 * 60 * 60 * 1000) {
        o.cashSessionId = current.id;
        healedAny = true;
        console.log(`Self-healed: Linked orphaned paid order ${o.id} to active session ${current.id}`);
      }
    }
  });

  if (healedAny) {
    saveOrders(orders);
    if (supabase) {
      try {
        for (const o of orders) {
          if (o.cashSessionId === current.id) {
            await supabase.from("orders").update({ cash_session_id: current.id }).eq("id", o.id);
          }
        }
      } catch (err) {
        console.error("Error updating self-healed orders in Supabase:", err);
      }
    }
  }

  // Calculate session financials based on current live orders and movements
  let sessionOrders = [];
  let sessionMovements = [];

  if (supabase) {
    try {
      const { data: dbOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("cash_session_id", current.id)
        .in("payment_status", ["paid", "pagado"]);
      
      const { data: dbMovements } = await supabase
        .from("cash_movements")
        .select("*")
        .eq("cash_session_id", current.id);

      if (dbOrders) {
        sessionOrders = dbOrders.map(o => mapDbToOrder(o, [])); // simple headers
      }
      if (dbMovements) {
        sessionMovements = dbMovements.map(mapDbToMovement);
      }
    } catch (err) {
      console.error("Error fetching live calculations from Supabase:", err);
    }
  }

  // Fallback to local files if Supabase is empty or failed
  if (!sessionOrders.length) {
    sessionOrders = orders.filter(o => o.cashSessionId === current.id && o.paymentStatus === 'pagado');
  }
  if (!sessionMovements.length) {
    const movements = loadMovements();
    sessionMovements = movements.filter(m => m.cashSessionId === current.id);
  }

  // Perform calculations
  let totalCash = 0;
  let totalTransfer = 0;
  let totalQr = 0;
  let totalCard = 0;
  let totalSales = 0;

  sessionOrders.forEach(o => {
    const amount = o.total || 0;
    totalSales += amount;
    const method = String(o.paymentMethod || "").toLowerCase();
    if (method === 'efectivo' || method === 'efectivo_caja') {
      totalCash += amount;
    } else if (method === 'transferencia' || method === 'pago_movil') {
      totalTransfer += amount;
    } else if (method === 'qr' || method === 'qr_caja') {
      totalQr += amount;
    } else if (method === 'tarjeta' || method === 'tarjeta_caja' || method === 'simulado_tarjeta') {
      totalCard += amount;
    } else {
      totalCash += amount;
    }
  });

  let expectedCash = current.openingAmount;
  sessionMovements.forEach(m => {
    if (m.type === 'adjustment') {
      expectedCash += m.amount;
    } else if (m.type === 'refund') {
      expectedCash -= m.amount;
    }
  });
  expectedCash += totalCash;

  const calculated = {
    ...current,
    totalCash,
    totalTransfer,
    totalQr,
    totalCard,
    totalSales,
    expectedCash
  };

  res.json({ session: calculated });
});

// POST /api/cash-session/open
app.post("/api/cash-session/open", async (req, res) => {
  const { openedBy, openingAmount, openingNote } = req.body;
  if (!openedBy) {
    return res.status(400).json({ error: "Debe especificar el nombre de la cajera responsable." });
  }

  let hasOpen = false;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("id")
        .eq("status", "open");
      if (!error && data && data.length > 0) {
        hasOpen = true;
      }
    } catch (err) {
      console.error("Error checking open session in Supabase:", err);
    }
  }

  if (!hasOpen) {
    const sessions = loadSessions();
    hasOpen = sessions.some(s => s.status === 'open');
  }

  if (hasOpen) {
    return res.status(400).json({ error: "Ya existe una sesión de caja abierta. Debe cerrarla antes de abrir una nueva." });
  }

  const newSession = {
    id: crypto.randomUUID(),
    openedBy,
    openingAmount: Number(openingAmount) || 0,
    openingNote: openingNote || "",
    openedAt: new Date().toISOString(),
    status: "open",
    expectedCash: Number(openingAmount) || 0,
    totalCash: 0,
    totalTransfer: 0,
    totalQr: 0,
    totalCard: 0,
    totalSales: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Save locally
  const sessions = loadSessions();
  sessions.unshift(newSession);
  saveSessions(sessions);

  const newMovement = {
    id: crypto.randomUUID(),
    cashSessionId: newSession.id,
    type: "opening",
    amount: Number(openingAmount) || 0,
    description: "Apertura de Caja",
    createdBy: openedBy,
    createdAt: new Date().toISOString()
  };
  
  const movements = loadMovements();
  movements.unshift(newMovement);
  saveMovements(movements);

  // Save to Supabase
  if (supabase) {
    try {
      await supabase.from("cash_sessions").insert([mapSessionToDb(newSession)]);
      await supabase.from("cash_movements").insert([mapMovementToDb(newMovement)]);
      console.log("✅ [SUPABASE] Sesión de caja abierta creada exitosamente.");
    } catch (err: any) {
      console.error("❌ Error de Supabase al insertar apertura:", err.message);
    }
  }

  res.status(201).json({ session: newSession });
});

// POST /api/cash-session/close
app.post("/api/cash-session/close", async (req, res) => {
  const { closedBy, countedCash, totalTransfer, totalQr, totalCard, closingNote, closingResult: clientClosingResult } = req.body;
  if (!closedBy) {
    return res.status(400).json({ error: "Debe especificar el nombre del responsable del cierre." });
  }

  let current = null;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("*")
        .eq("status", "open")
        .single();
      if (!error && data) {
        current = mapDbToSession(data);
      }
    } catch (err) {
      console.error("Error fetching open session from Supabase:", err);
    }
  }

  if (!current) {
    const sessions = loadSessions();
    current = sessions.find(s => s.status === 'open');
  }

  if (!current) {
    return res.status(400).json({ error: "No hay ninguna sesión de caja abierta para cerrar." });
  }

  // Self-healing: Find any paid orders without cashSessionId that were paid around/after session opened,
  // and associate them with the current open session.
  let healedAny = false;
  orders.forEach(o => {
    if ((o.paymentStatus === 'pagado' || o.paymentStatus === 'paid') && !o.cashSessionId) {
      const orderTime = new Date(o.paidAt || o.createdAt).getTime();
      const sessionTime = new Date(current.openedAt).getTime();
      // If paid/created within 24 hours of session opened, or after session opened:
      if (Math.abs(orderTime - sessionTime) < 24 * 60 * 60 * 1000) {
        o.cashSessionId = current.id;
        healedAny = true;
        console.log(`Self-healed at closure: Linked orphaned paid order ${o.id} to active session ${current.id}`);
      }
    }
  });

  if (healedAny) {
    saveOrders(orders);
    if (supabase) {
      try {
        for (const o of orders) {
          if (o.cashSessionId === current.id) {
            await supabase.from("orders").update({ cash_session_id: current.id }).eq("id", o.id);
          }
        }
      } catch (err) {
        console.error("Error updating self-healed orders in Supabase during closure:", err);
      }
    }
  }

  // Calculate financial details dynamically
  let sessionOrders = [];
  let sessionMovements = [];

  if (supabase) {
    try {
      const { data: dbOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("cash_session_id", current.id)
        .in("payment_status", ["paid", "pagado"]);
      
      const { data: dbMovements } = await supabase
        .from("cash_movements")
        .select("*")
        .eq("cash_session_id", current.id);

      if (dbOrders) {
        sessionOrders = dbOrders.map(o => mapDbToOrder(o, []));
      }
      if (dbMovements) {
        sessionMovements = dbMovements.map(mapDbToMovement);
      }
    } catch (err) {
      console.error("Error fetching live calculations from Supabase:", err);
    }
  }

  if (!sessionOrders.length) {
    sessionOrders = orders.filter(o => o.cashSessionId === current.id && o.paymentStatus === 'pagado');
  }
  if (!sessionMovements.length) {
    const movements = loadMovements();
    sessionMovements = movements.filter(m => m.cashSessionId === current.id);
  }

  // Calculate
  let totalCash = 0; // expected cash from sales
  let expected_transfer = 0;
  let expected_qr = 0;
  let expected_card = 0;
  let totalSales = 0;

  sessionOrders.forEach(o => {
    const amount = o.total || 0;
    totalSales += amount;
    const method = normalizePaymentMethod(o.paymentMethod);
    if (method === 'efectivo') {
      totalCash += amount;
    } else if (method === 'transferencia') {
      expected_transfer += amount;
    } else if (method === 'qr') {
      expected_qr += amount;
    } else if (method === 'tarjeta') {
      expected_card += amount;
    }
  });

  let expectedCash = current.openingAmount;
  sessionMovements.forEach(m => {
    if (m.type === 'adjustment') {
      expectedCash += m.amount;
    } else if (m.type === 'refund') {
      expectedCash -= m.amount;
    }
  });
  expectedCash += totalCash;

  const finalExpectedCash = expectedCash;
  const finalCountedCash = Number(countedCash) || 0;
  const difference_cash = finalCountedCash - finalExpectedCash;

  const finalTotalTransfer = Number(totalTransfer) || 0;
  const finalTotalQr = Number(totalQr) || 0;
  const finalTotalCard = Number(totalCard) || 0;

  const difference_transfer = finalTotalTransfer - expected_transfer;
  const difference_qr = finalTotalQr - expected_qr;
  const difference_card = finalTotalCard - expected_card;
  const difference_total = difference_cash + difference_transfer + difference_qr + difference_card;

  // Classify overall result
  const diffs = [difference_cash, difference_transfer, difference_qr, difference_card];
  const hasNegative = diffs.some(d => d < 0);
  const hasPositive = diffs.some(d => d > 0);

  let closingResult = "perfect";
  if (hasPositive && hasNegative) {
    closingResult = "mixed";
  } else if (hasNegative) {
    closingResult = "deficit";
  } else if (hasPositive) {
    closingResult = "surplus";
  }

  const closedSession = {
    ...current,
    status: "closed",
    closedBy,
    closedAt: new Date().toISOString(),
    countedCash: finalCountedCash,
    totalTransfer: finalTotalTransfer,
    totalQr: finalTotalQr,
    totalCard: finalTotalCard,
    totalCash,
    expectedCash: finalExpectedCash,
    totalSales,
    difference: difference_cash,
    closingNote: closingNote || "",
    updatedAt: new Date().toISOString(),

    // New Fields
    declaredCash: finalCountedCash,
    declaredTransfer: finalTotalTransfer,
    declaredQr: finalTotalQr,
    declaredCard: finalTotalCard,
    expectedTransfer: expected_transfer,
    expectedQr: expected_qr,
    expectedCard: expected_card,
    differenceTransfer: difference_transfer,
    differenceQr: difference_qr,
    differenceCard: difference_card,
    differenceTotal: difference_total,
    closingResult: clientClosingResult || closingResult
  };

  // Save locally
  const sessions = loadSessions();
  const openIdx = sessions.findIndex(s => s.id === current.id);
  if (openIdx !== -1) {
    sessions[openIdx] = closedSession;
  } else {
    sessions.unshift(closedSession);
  }
  saveSessions(sessions);

  const newMovement = {
    id: crypto.randomUUID(),
    cashSessionId: current.id,
    type: "closing",
    amount: finalCountedCash,
    description: `Cierre de Caja. Resultado: ${closingResult.toUpperCase()}. Dif Total: ${difference_total >= 0 ? '+' : ''}${difference_total}`,
    createdBy: closedBy,
    createdAt: new Date().toISOString()
  };

  const movements = loadMovements();
  movements.unshift(newMovement);
  saveMovements(movements);

  if (supabase) {
    try {
      await supabase.from("cash_sessions").update(mapSessionToDb(closedSession)).eq("id", current.id);
      await supabase.from("cash_movements").insert([mapMovementToDb(newMovement)]);
      console.log("✅ [SUPABASE] Sesión de caja cerrada exitosamente en base de datos.");
    } catch (err: any) {
      console.error("❌ Error de Supabase al cerrar la caja:", err.message);
    }
  }

  res.json({ session: closedSession });
});

// GET /api/cash-session/:id/report
app.get("/api/cash-session/:id/report", async (req, res) => {
  const { id } = req.params;
  
  let session = null;
  if (supabase) {
    try {
      if (id === 'current') {
        const { data, error } = await supabase
          .from("cash_sessions")
          .select("*")
          .eq("status", "open")
          .single();
        if (!error && data) session = mapDbToSession(data);
      } else {
        const { data, error } = await supabase
          .from("cash_sessions")
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data) session = mapDbToSession(data);
      }
    } catch (err) {
      console.error("Error fetching session from Supabase:", err);
    }
  }

  if (!session) {
    const sessions = loadSessions();
    if (id === 'current') {
      session = sessions.find(s => s.status === 'open');
    } else {
      session = sessions.find(s => s.id === id);
    }
  }

  if (!session) {
    return res.status(404).json({ error: "Sesión de caja no encontrada." });
  }

  // Fetch orders and movements from Supabase
  let sessionOrders = [];
  let sessionMovements = [];

  if (supabase) {
    try {
      const { data: dbOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("cash_session_id", session.id);
      
      const { data: dbItems } = await supabase
        .from("order_items")
        .select("*");

      const { data: dbMovements } = await supabase
        .from("cash_movements")
        .select("*")
        .eq("cash_session_id", session.id);

      if (dbOrders) {
        sessionOrders = dbOrders.map(o => mapDbToOrder(o, dbItems || []));
      }
      if (dbMovements) {
        sessionMovements = dbMovements.map(mapDbToMovement);
      }
    } catch (err) {
      console.error("Error fetching session details from Supabase:", err);
    }
  }

  // Fallback
  if (!sessionOrders.length) {
    sessionOrders = orders.filter(o => o.cashSessionId === session.id);
  }
  if (!sessionMovements.length) {
    const movements = loadMovements();
    sessionMovements = movements.filter(m => m.cashSessionId === session.id);
  }

  // Recalculate session statistics (same logic for consistency)
  let totalCash_sales = 0;
  let expected_transfer = 0;
  let expected_qr = 0;
  let expected_card = 0;
  let totalSales_calc = 0;

  sessionOrders.filter(o => o.paymentStatus === 'pagado').forEach(o => {
    const amount = o.total || 0;
    totalSales_calc += amount;
    const method = normalizePaymentMethod(o.paymentMethod);
    if (method === 'efectivo') {
      totalCash_sales += amount;
    } else if (method === 'transferencia') {
      expected_transfer += amount;
    } else if (method === 'qr') {
      expected_qr += amount;
    } else if (method === 'tarjeta') {
      expected_card += amount;
    }
  });

  let expectedCash_calc = session.openingAmount;
  sessionMovements.forEach(m => {
    if (m.type === 'adjustment') {
      expectedCash_calc += m.amount;
    } else if (m.type === 'refund') {
      expectedCash_calc -= m.amount;
    }
  });
  expectedCash_calc += totalCash_sales;

  // Populate fields with fallback for older closed sessions
  const isClosed = session.status === 'closed';

  const declaredCash = isClosed ? (session.declaredCash !== undefined && session.declaredCash !== null ? session.declaredCash : (session.countedCash || 0)) : 0;
  const declaredTransfer = isClosed ? (session.declaredTransfer || 0) : 0;
  const declaredQr = isClosed ? (session.declaredQr || 0) : 0;
  const declaredCard = isClosed ? (session.declaredCard || 0) : 0;

  const expTransfer = isClosed ? (session.expectedTransfer !== undefined && session.expectedTransfer !== null ? session.expectedTransfer : expected_transfer) : expected_transfer;
  const expQr = isClosed ? (session.expectedQr !== undefined && session.expectedQr !== null ? session.expectedQr : expected_qr) : expected_qr;
  const expCard = isClosed ? (session.expectedCard !== undefined && session.expectedCard !== null ? session.expectedCard : expected_card) : expected_card;
  const expCash = isClosed ? (session.expectedCash !== undefined && session.expectedCash !== null ? session.expectedCash : expectedCash_calc) : expectedCash_calc;

  const diffCash = isClosed ? (session.difference !== undefined && session.difference !== null ? session.difference : (declaredCash - expCash)) : undefined;
  const diffTransfer = isClosed ? (session.differenceTransfer !== undefined && session.differenceTransfer !== null ? session.differenceTransfer : (declaredTransfer - expTransfer)) : undefined;
  const diffQr = isClosed ? (session.differenceQr !== undefined && session.differenceQr !== null ? session.differenceQr : (declaredQr - expQr)) : undefined;
  const diffCard = isClosed ? (session.differenceCard !== undefined && session.differenceCard !== null ? session.differenceCard : (declaredCard - expCard)) : undefined;
  const diffTotal = isClosed ? (session.differenceTotal !== undefined && session.differenceTotal !== null ? session.differenceTotal : ((diffCash || 0) + (diffTransfer || 0) + (diffQr || 0) + (diffCard || 0))) : undefined;

  let closingResult = session.closingResult;
  if (isClosed && !closingResult) {
    const diffs = [diffCash || 0, diffTransfer || 0, diffQr || 0, diffCard || 0];
    const hasNegative = diffs.some(d => d < 0);
    const hasPositive = diffs.some(d => d > 0);
    if (hasPositive && hasNegative) {
      closingResult = "mixed";
    } else if (hasNegative) {
      closingResult = "deficit";
    } else if (hasPositive) {
      closingResult = "surplus";
    } else {
      closingResult = "perfect";
    }
  }

  const calculated = {
    ...session,
    totalCash: totalCash_sales,
    totalTransfer: isClosed ? (session.totalTransfer !== undefined ? session.totalTransfer : expTransfer) : expTransfer,
    totalQr: isClosed ? (session.totalQr !== undefined ? session.totalQr : expQr) : expQr,
    totalCard: isClosed ? (session.totalCard !== undefined ? session.totalCard : expCard) : expCard,
    totalSales: isClosed ? session.totalSales : totalSales_calc,
    expectedCash: expCash,
    difference: diffCash,

    // New Fields
    declaredCash,
    declaredTransfer,
    declaredQr,
    declaredCard,
    expectedTransfer: expTransfer,
    expectedQr: expQr,
    expectedCard: expCard,
    differenceTransfer: diffTransfer,
    differenceQr: diffQr,
    differenceCard: diffCard,
    differenceTotal: diffTotal,
    closingResult: isClosed ? closingResult : "open"
  };

  res.json({
    session: calculated,
    orders: sessionOrders,
    movements: sessionMovements
  });
});

// POST /api/orders/manual
app.post("/api/orders/manual", async (req, res) => {
  const { customerName, customerPhone, tableNumber, paymentMethod, items, total, notes } = req.body;
  if (!customerName || !items || !items.length || total === undefined) {
    return res.status(400).json({ error: "Faltan datos obligatorios para el pedido manual." });
  }

 const currentSession = await getOpenCashSession();
const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

  if (!currentSession) {
    return res.status(400).json({ error: "Debe abrir caja antes de registrar un pedido manual." });
  }

  const orderId = `OM-${Math.floor(1000 + Math.random() * 9000)}`;
  const newOrder = {
    id: orderId,
    tableNumber: tableNumber || "Mostrador",
    items,
    total,
    status: "recibido", // Sent to kitchen
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerName,
    customerPhone: customerPhone || "",
    paymentMethod, // efectivo, transferencia, qr, tarjeta
    paymentStatus: "pagado", // Immediately paid
    source: "manual_cashier",
    cashierName: currentSession.openedBy,
    cashSessionId: currentSession.id,
    paidAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    notes: notes || ""
  };

  // Discount stock immediately
  try {
    const dishes = loadDishes();
    let modified = false;
    items.forEach((item: any) => {
      const dish = dishes.find(d => d.id === item.dishId);
      if (dish) {
        const currentStock = dish.stock !== undefined ? dish.stock : 20;
        dish.stock = Math.max(0, currentStock - item.quantity);
        modified = true;
      }
    });
    if (modified) {
      saveDishes(dishes);
      if (supabase) {
        for (const item of items) {
          const d = dishes.find(dish => dish.id === item.dishId);
          if (d) {
            await supabase.from("menu_items").update({ stock: d.stock }).eq("id", item.dishId).then(({ error }) => {
              if (error) console.error("Error updating stock in Supabase:", error);
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Error updating stock on manual order:", err);
  }

  // Local
  orders.unshift(newOrder);
  saveOrders(orders);

  const newMovement = {
    id: crypto.randomUUID(),
    cashSessionId: currentSession.id,
    orderId: newOrder.id,
    type: "manual_sale",
    paymentMethod,
    amount: total,
    description: `Pedido manual - ${customerName}`,
    createdBy: currentSession.openedBy,
    createdAt: new Date().toISOString()
  };
  
  const movements = loadMovements();
  movements.unshift(newMovement);
  saveMovements(movements);

  if (supabase) {
    try {
      await supabase.from("orders").insert([mapOrderToDb(newOrder)]);
      const dbItems = items.map((item: any) => mapOrderItemToDb(orderId, item));
      await supabase.from("order_items").insert(dbItems);
      await supabase.from("cash_movements").insert([mapMovementToDb(newMovement)]);
      console.log(`✅ [SUPABASE] Pedido manual ${orderId} e items registrados exitosamente.`);
    } catch (err: any) {
      console.error("Error inserting manual order to Supabase:", err.message);
    }
  }

  res.status(201).json(newOrder);
});

// POST /api/orders/:id/pay
app.post("/api/orders/:id/pay", async (req, res) => {
  const { id } = req.params;
  const { paymentMethod, cashierName } = req.body;

  let currentSession = null;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("*")
        .eq("status", "open")
        .single();
      if (!error && data) {
        currentSession = mapDbToSession(data);
      }
    } catch (err) {
      console.error("Error fetching open session from Supabase:", err);
    }
  }
  if (!currentSession) {
    const sessions = loadSessions();
    currentSession = sessions.find(s => s.status === 'open');
  }

  if (!currentSession) {
    return res.status(400).json({ error: "Debe abrir caja antes de poder cobrar un pedido." });
  }

  // Find order
  let orderIndex = orders.findIndex(o => o.id === id);
  if (orderIndex === -1 && supabase) {
    try {
      const { data: dbOrder } = await supabase.from("orders").select("*").eq("id", id).single();
      if (dbOrder) {
        const { data: dbItems } = await supabase.from("order_items").select("*").eq("order_id", id);
        const mapped = mapDbToOrder(dbOrder, dbItems || []);
        orders.unshift(mapped);
        orderIndex = 0;
      }
    } catch (err) {
      console.error("Error fetching order from Supabase:", err);
    }
  }

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Pedido no encontrado." });
  }

  const order = orders[orderIndex];
  const method = paymentMethod || 'efectivo'; // default fallback

  const oldStatus = order.status;
  const oldPaymentStatus = order.paymentStatus;

  orders[orderIndex].paymentStatus = "pagado";
  orders[orderIndex].paymentMethod = method;
  orders[orderIndex].cashierName = cashierName || currentSession.openedBy;
  orders[orderIndex].cashSessionId = currentSession.id;
  orders[orderIndex].paidAt = new Date().toISOString();
  orders[orderIndex].approvedAt = new Date().toISOString();
  orders[orderIndex].status = "recibido"; // Set to recibido locally so Cocina sees it immediately as approved
  orders[orderIndex].updatedAt = new Date().toISOString();

  saveOrders(orders);

  const newMovement = {
    id: crypto.randomUUID(),
    cashSessionId: currentSession.id,
    orderId: order.id,
    type: "sale",
    paymentMethod: method,
    amount: order.total,
    description: `Cobro Pedido ${order.id} - ${order.customerName}`,
    createdBy: cashierName || currentSession.openedBy,
    createdAt: new Date().toISOString()
  };

  const movements = loadMovements();
  movements.unshift(newMovement);
  saveMovements(movements);

  let supabaseResponse = null;
  if (supabase) {
    try {
      const dbUpdate = {
        payment_status: "paid",
        payment_method: method,
        status: "approved",
        cashier_name: cashierName || currentSession.openedBy || "Rita",
        cash_session_id: currentSession.id,
        paid_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("orders")
        .update(dbUpdate)
        .eq("id", order.id)
        .select("*");

      supabaseResponse = { data, error };

      console.log(`[DIAGNOSTIC LOG /pay]`, {
        orderId: order.id,
        oldStatus,
        oldPaymentStatus,
        newStatus: orders[orderIndex].status,
        newPaymentStatus: orders[orderIndex].paymentStatus,
        dbUpdate,
        supabaseResponse: JSON.stringify(supabaseResponse)
      });

      const dbMov = mapMovementToDb({
        id: newMovement.id,
        cashSessionId: currentSession.id,
        orderId: order.id,
        type: "sale",
        paymentMethod: method,
        amount: order.total,
        description: `Cobro Pedido ${order.id} - ${order.customerName}`,
        concept: "Venta pedido QR",
        createdBy: cashierName || currentSession.openedBy || "Rita",
        createdAt: new Date().toISOString()
      });

      await supabase.from("cash_movements").insert([dbMov]);
      console.log(`✅ [SUPABASE] Cobro de pedido ${id} e inserción de movimiento completado.`);
    } catch (err: any) {
      console.error("Error inserting movement or updating order in Supabase:", err.message);
    }
  }

  res.json(orders[orderIndex]);
});

// POST /api/orders/:id/dismiss
// Desestima/cancela un pedido pendiente sin cerrar caja y sin borrar historial
app.post("/api/orders/:id/dismiss", async (req, res) => {
  try {
    const { id } = req.params;
    const { adminPassword, reason, dismissedBy } = req.body || {};

    if (!id) {
      return res.status(400).json({
        error: "Falta el ID del pedido.",
      });
    }

    if (!adminPassword) {
      return res.status(400).json({
        error: "Debe ingresar la clave administrativa.",
      });
    }

    if (!reason || String(reason).trim().length < 3) {
      return res.status(400).json({
        error: "Debe ingresar un motivo válido para desestimar el pedido.",
      });
    }

    const expectedPassword =
      process.env.ADMIN_ACTION_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      "Buffet@CasaDeDios2026!";

    if (String(adminPassword) !== String(expectedPassword)) {
      return res.status(401).json({
        error: "Clave administrativa incorrecta.",
      });
    }

    let existingOrder: any = null;

    if (supabase) {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("[DISMISS ORDER] Error buscando pedido:", error.message);
        return res.status(500).json({
          error: "No se pudo buscar el pedido para desestimarlo.",
          details: error.message,
        });
      }

      existingOrder = data;
    } else {
      const localOrders = loadOrders();
      existingOrder = localOrders.find((order: any) => order.id === id);
    }

    if (!existingOrder) {
      return res.status(404).json({
        error: "Pedido no encontrado.",
      });
    }

    const paymentStatus = String(
      existingOrder.payment_status ||
        existingOrder.paymentStatus ||
        ""
    ).toLowerCase();

    const currentStatus = String(
      existingOrder.status ||
        ""
    ).toLowerCase();

    if (
      paymentStatus === "paid" ||
      paymentStatus === "pagado" ||
      currentStatus === "approved" ||
      currentStatus === "preparing" ||
      currentStatus === "ready" ||
      currentStatus === "delivered"
    ) {
      return res.status(400).json({
        error:
          "Este pedido ya fue cobrado o enviado a cocina. No puede desestimarse. Use nota de crédito o ajuste.",
      });
    }

    const now = new Date().toISOString();
    const cleanReason = String(reason).trim();
    const cleanUser = dismissedBy || "Admin";

    if (supabase) {
      const updatePayload = {
        status: "dismissed",
        payment_status: "cancelled",
        dismissed_at: now,
        dismissed_by: cleanUser,
        dismissed_reason: cleanReason,
        cancelled_at: now,
        cancelled_by: cleanUser,
        cancelled_reason: cleanReason,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        console.error("[DISMISS ORDER] Error actualizando pedido:", error.message);
        return res.status(500).json({
          error: "No se pudo desestimar el pedido.",
          details: error.message,
        });
      }

      return res.json({
        success: true,
        order: data,
        message: "Pedido desestimado correctamente.",
      });
    }

    const localOrders = loadOrders();

    const updatedOrders = localOrders.map((order: any) => {
      if (order.id !== id) return order;

      return {
        ...order,
        status: "dismissed",
        paymentStatus: "cancelled",
        payment_status: "cancelled",
        dismissedAt: now,
        dismissed_at: now,
        dismissedBy: cleanUser,
        dismissed_by: cleanUser,
        dismissedReason: cleanReason,
        dismissed_reason: cleanReason,
        cancelledAt: now,
        cancelled_at: now,
        cancelledBy: cleanUser,
        cancelled_by: cleanUser,
        cancelledReason: cleanReason,
        cancelled_reason: cleanReason,
        updatedAt: now,
        updated_at: now,
      };
    });

    saveOrders(updatedOrders);

    return res.json({
      success: true,
      order: updatedOrders.find((order: any) => order.id === id),
      message: "Pedido desestimado correctamente.",
    });
  } catch (error: any) {
    console.error("[DISMISS ORDER] Error general:", error);
    return res.status(500).json({
      error: "Error interno al desestimar pedido.",
      details: error?.message || String(error),
    });
  }
});

// GET /api/cash-movements
app.get("/api/cash-movements", async (req, res) => {
  const { sessionId } = req.query;
  
  let targetSessionId = sessionId;
  if (!targetSessionId) {
    let currentSession = null;
    if (supabase) {
      try {
        const { data } = await supabase
          .from("cash_sessions")
          .select("id")
          .eq("status", "open")
          .single();
        if (data) targetSessionId = data.id;
      } catch (err) {
        console.error("Error fetching open session from Supabase:", err);
      }
    }
    if (!targetSessionId) {
      const sessions = loadSessions();
      const current = sessions.find(s => s.status === 'open');
      if (current) targetSessionId = current.id;
    }
  }

  if (!targetSessionId) {
    return res.json([]);
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cash_movements")
        .select("*")
        .eq("cash_session_id", targetSessionId)
        .order("created_at", { ascending: false });
      if (!error && data) {
        return res.json(data.map(mapDbToMovement));
      }
    } catch (err) {
      console.error("Error fetching movements from Supabase:", err);
    }
  }

  // Fallback
  const movements = loadMovements();
  const filtered = movements.filter(m => m.cashSessionId === targetSessionId);
  res.json(filtered);
});


// Gemini Chatbot Endpoint
app.post("/api/chat", async (req, res) => {
  const { messages, useHighThinking, cart, tableNumber, activeOrders, language } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Mensajes no válidos." });
  }

  let systemInstruction = "";
  let geminiContents: any[] = [];
  let liveDishes: any[] = [];
  let rate = 1000;

  try {
    liveDishes = loadDishes();
    const liveConfig = loadConfig();
    rate = liveConfig.exchangeRate || 1000;

    let cartInfo = "";
    if (cart && Array.isArray(cart) && cart.length > 0) {
      cartInfo = "El cliente tiene actualmente estos productos en su carrito:\n" +
        cart.map((item: any) => `- ${item.quantity}x ${item.name} ($${(item.price * item.quantity).toLocaleString('es-AR')} ARS)`).join("\n") +
        `\nTotal del carrito actual: $${cart.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0).toLocaleString('es-AR')} ARS`;
    } else {
      cartInfo = "El carrito de compras del cliente está actualmente vacío.";
    }

    let tableInfo = tableNumber ? `El cliente está ubicado físicamente en la Mesa: ${tableNumber}.` : "El cliente aún no tiene mesa asignada (no escaneó QR de mesa).";

    let activeOrdersInfo = "";
    if (activeOrders && Array.isArray(activeOrders) && activeOrders.length > 0) {
      activeOrdersInfo = "El cliente tiene los siguientes pedidos realizados en curso:\n" +
        activeOrders.map((o: any) => {
          let stLabel = o.status;
          if (o.status === "recibido") stLabel = "Recibido en espera de confirmación de pago";
          else if (o.status === "preparando") stLabel = "En preparación en cocina por Maricel";
          else if (o.status === "listo") stLabel = "Listo para retirar en barra";
          else if (o.status === "entregado") stLabel = "Entregado";
          return `- Pedido #${o.id}: Estado '${stLabel}' (Pago: '${o.paymentStatus === 'pagado' ? 'Pagado' : 'Pendiente'}), Total: $${Number(o.total || 0).toLocaleString('es-AR')} ARS`;
        }).join("\n");
    } else {
      activeOrdersInfo = "El cliente no cuenta con pedidos registrados en curso.";
    }

    systemInstruction = `Eres "Ángel del Sabor", el asistente virtual y consejero culinario oficial del "Buffet Casa de Dios". Tu trato con el cliente debe ser extremadamente cordial, atento, servicial, amigable y muy práctico.
Responde siempre en español de Argentina (Rioplatense), tuteando amablemente y usando expresiones como "podés", "tenés", "mirá", "acercate", "sumá", "cargá", etc.

### INFORMACIÓN Y ESTADO DEL CLIENTE EN TIEMPO REAL:
Use estos datos reales provistos por la aplicación para personalizar tu respuesta si es necesario:
- ${tableInfo}
- ${cartInfo}
- ${activeOrdersInfo}

### MEDIOS DE PAGO DEL BUFFET:
Para dudas sobre cómo pagar, usa estrictamente esta explicación clara y concisa (en tono argentino):
"Podés realizar tu pedido desde esta carta y luego elegir el medio de pago disponible. Podés pagar en efectivo en caja, transferencia, QR o tarjeta, según lo que indique el buffet. Una vez que Rita confirme el pago desde caja, tu pedido pasa a cocina para que lo preparen."

### FLUJO DE COMPRA REAL DE LA APLICACIÓN:
Explica este flujo paso a paso de forma clara e intuitiva para que los comensales sepan qué hacer:
1. El cliente escanea el QR de su mesa (si no tiene, puede ordenar igual y cargar la mesa manualmente).
2. Elige productos deliciosos de la carta digital y los agrega al carrito de compras.
3. Ingresa sus datos (nombre y teléfono) en el carrito y envía el pedido.
4. Se acerca físicamente a la caja donde Rita le cobra (efectivo, transferencia, QR o tarjeta) y confirma el pago.
5. Maricel, en la cocina, recibe instantáneamente la comanda en su pantalla y se pone a cocinar.
6. La cocina cambia el estado a "preparando" y luego a "listo para retirar".
7. El cliente recibe una notificación de que su pedido está listo y se acerca a la caja/barra a retirarlo bien calentito.

### MENÚ REAL Y DISPONIBLE DE NUESTRA CARTA (Nombres, precios, disponibilidad y descripción):
${JSON.stringify(liveDishes.map((d: any) => ({ name: d.name, nameEn: d.nameEn, price: d.price, category: d.category, description: d.description, available: d.available, stock: d.stock })), null, 2)}
Tasa del Dólar Oficial del Buffet: $${rate} ARS por 1 USD.

### REGLAS DE ORO:
- NUNCA inventes productos, ingredientes o precios que no figuren explícitamente en el menú de arriba.
- Si el cliente pregunta por disponibilidad de un producto ("¿tienen hamburguesa?", "¿hay tarta?", etc.), consulta la lista: si está disponible, confírmalo alegremente e invítalo a sumarlo desde la Carta. Si no está disponible o no figura, indícale amablemente que no contamos con stock por hoy y recomiéndale una alternativa real de la carta.
- Mantén las respuestas siempre amables, claras, breves (1 a 2 párrafos concisos) y muy enfocadas en ayudar. ¡Evita explicaciones largas, redundantes o robóticas!
- No inventes números de mesa ni estados de pedido falsos. Si no hay pedidos activos, acláralo amablemente indicándole cómo pedir.`;

    // Map messages history
    geminiContents = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    // Ensure history starts with a user turn (Gemini API requirement)
    while (geminiContents.length > 0 && geminiContents[0].role === "model") {
      geminiContents.shift();
    }

    if (geminiContents.length === 0) {
      return res.status(400).json({ error: "La conversación debe comenzar con un mensaje del usuario." });
    }

    // Choose model based on whether high thinking is enabled by the client
    const selectedModel = useHighThinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
    
    const config: any = {
      systemInstruction,
      temperature: useHighThinking ? 0.7 : 0.8
    };

    // If using the complex model (gemini-3.1-pro-preview), we can configure thinking level.
    if (useHighThinking) {
      config.thinkingConfig = {
        thinkingLevel: "HIGH"
      };
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: geminiContents,
      config
    });

    const reply = response.text || "Lo siento, no pude procesar la consulta en este momento. ¡Bendiciones!";
    res.json({ reply });
  } catch (error: any) {
    console.error("Gemini Error:", error.message || error);
    
    // Attempt retry with gemini-3.5-flash if high thinking was requested and failed
    if (useHighThinking) {
      try {
        console.log("Retrying with gemini-3.5-flash due to error on pro model...");
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: geminiContents,
          config: {
            systemInstruction,
            temperature: 0.8
          }
        });
        const reply = response.text || "Lo siento, no pude procesar la consulta en este momento. ¡Bendiciones!";
        return res.json({ reply });
      } catch (retryError: any) {
        console.error("Retry on gemini-3.5-flash also failed:", retryError);
      }
    }

    // FALLBACK LOCAL INTELIGENTE SEGÚN INTENCIÓN DEL CLIENTE
    const lastUserMsg = messages[messages.length - 1]?.text || "";
    const textLower = lastUserMsg.toLowerCase().trim();
    
    let fallbackReply = "";

    // A) Si pregunta por pago / cobro
    if (/pago|pagar|como pago|cómo pago|cobro|caja|tarjeta|transferencia|efectivo|qr|mercadopago|medios de pago|formas de pago/i.test(textLower)) {
      if (cart && Array.isArray(cart) && cart.length > 0) {
        const cartItemsList = cart.map((item: any) => `${item.quantity}x ${item.name}`).join(" y ");
        fallbackReply = `¡Hola! Veo que tenés en tu carrito de compras: ${cartItemsList}. 

Para poder pagarlo, primero enviá el pedido desde la sección del Carrito de la aplicación. Luego, acercate a la caja donde podés pagar con efectivo, transferencia bancaria, código QR de MercadoPago o tarjeta, según lo que prefieras. Una vez que Rita confirme el cobro, tu pedido pasará de inmediato a la cocina para que lo preparen.`;
      } else {
        fallbackReply = `Podés realizar tu pedido desde esta carta y luego elegir el medio de pago disponible. Podés pagar en efectivo en caja, transferencia, QR o tarjeta, según lo que indique el buffet. Una vez que Rita confirme el pago desde caja, tu pedido pasa a cocina para que lo preparen.`;
      }
    }
    // B) Si pregunta cómo pedir / comprar / hacer pedido
    else if (/pedir|pedido|comprar|como comprar|cómo compro|cómo hago|como hago|flujo|pasos|ordenar/i.test(textLower)) {
      fallbackReply = `¡Con gusto! Para hacer tu pedido en el Buffet Casa de Dios, seguí este flujo súper sencillo:

1. **Elegí los productos**: Mirá las delicias de nuestra pestaña "Carta" y agregá tus favoritos al carrito.
2. **Cargá tus datos**: Abrí el carrito de compras (el botón flotante amarillo), ingresá tu nombre, teléfono y número de mesa.
3. **Enviá el pedido**: Presioná el botón para enviar el pedido al sistema.
4. **Pagá en caja**: Acercate a la caja para abonar. Rita registrará tu pago (efectivo, transferencia, QR o tarjeta).
5. **Preparación y retiro**: Al confirmar el pago, cocina (Maricel) recibe la comanda, la prepara y te notificaremos en pantalla cuando figure como **"Listo para retirar"** para que lo busques en la barra.`;
    }
    // C) Si pregunta por retiro / retirar / dónde busco
    else if (/retirar|retiro|donde retiro|dónde retiro|barra|donde busco|dónde busco|buscar|retira/i.test(textLower)) {
      fallbackReply = `¡Hola! Cuando tu pedido figure con el estado **"Listo para retirar"** en tu pantalla (y escuches el aviso del buffet), podés acercarte directamente a la barra o caja principal para que te lo entreguemos bien caliente y listo para disfrutar.`;
    }
    // D) Si pregunta por estado de su pedido actual
    else if (/estado|como va|cómo va|ya está|ya esta|demora|tarda|listo|mi pedido/i.test(textLower)) {
      if (activeOrders && Array.isArray(activeOrders) && activeOrders.length > 0) {
        const orderStates = activeOrders.map((o: any) => {
          let statusText = o.status;
          if (o.status === 'recibido') statusText = 'Recibido (aguardando confirmación de pago por Rita)';
          else if (o.status === 'preparando') statusText = 'En preparación en la cocina por Maricel';
          else if (o.status === 'listo') statusText = '¡Listo para retirar en barra!';
          
          return `- **Pedido #${o.id}**: Estado '${statusText}' (${o.paymentStatus === 'pagado' ? 'Pagado' : 'Pendiente de pago'})`;
        }).join("\n");
        fallbackReply = `¡Hola! Aquí tenés el estado de tus pedidos en tiempo real:\n\n${orderStates}\n\nRecordá que apenas Maricel termine de prepararlo, te enviaremos una notificación en pantalla para que lo retires en barra.`;
      } else {
        fallbackReply = `Actualmente no tenés pedidos activos registrados en esta sesión. Una vez que agregues productos a tu carrito y envíes tu orden, vas a poder seguir su estado minuto a minuto desde la sección de la app.`;
      }
    }
    // E) Si pregunta por recomendaciones
    else if (/recomiend|sugier|recomendas|sugeris|que como|algun plato|especial|recomienda|sugerencia/i.test(textLower)) {
      const availableDishes = liveDishes.filter((d: any) => d.available !== false).slice(0, 3);
      if (availableDishes.length > 0) {
        const suggestions = availableDishes.map((d: any) => `- **${d.name}** ($${d.price.toLocaleString('es-AR')}): ${d.description}`).join("\n");
        fallbackReply = `¡Hola! Hoy te recomiendo probar alguna de estas delicias frescas de la casa:\n\n${suggestions}\n\n¡Están listas para ser preparadas al instante! Podés sumarlas desde la Carta.`;
      } else {
        fallbackReply = `Para algo dulce te recomiendo un exquisito **Café con Leche + Medialuna** o unas ricas Pepas caseras. Si preferís algo salado para almorzar o merendar, un **Tostado Completo de Jamón y Queso** o una **Hamburguesa con Papas Fritas** son opciones increíbles. Podés ver todos los detalles en la pestaña "Carta".`;
      }
    }
    // F) Si pregunta por disponibilidad de algún producto específico, precios o menú
    else if (/carta|menu|plato|comida|bebida|precio|sale|cuesta|cuestan|tenes|hay|disponible|stock/i.test(textLower)) {
      // Intento de búsqueda local de productos en el menú
      const matchedDishes = liveDishes.filter((d: any) => {
        const dName = d.name.toLowerCase();
        return textLower.includes(dName) || dName.split(" ").some((w: string) => w.length > 3 && textLower.includes(w));
      });

      if (matchedDishes.length > 0) {
        const dishDetails = matchedDishes.slice(0, 3).map((d: any) => {
          const priceUsd = (d.price / rate).toFixed(2);
          const stockInfo = d.stock !== undefined ? ` (Stock: ${d.stock})` : "";
          const avail = d.available ? `Disponible${stockInfo}` : "No disponible temporalmente";
          return `- **${d.name}**: $${d.price.toLocaleString('es-AR')} ARS (~$${priceUsd} USD) | ${avail}\n  _${d.description}_`;
        }).join("\n\n");
        
        fallbackReply = `¡Encontré estas opciones en nuestra carta actual que coinciden con tu búsqueda!:\n\n${dishDetails}\n\nSi te tientan, podés agregarlas directamente desde la pestaña de la Carta.`;
      } else {
        fallbackReply = `No puedo consultar la carta en este momento, pero podés verla directamente en la sección Carta con fotos, precios en tiempo real y stock disponible.`;
      }
    }
    // G) Si es ayuda humana / Rita / Maricel
    else if (/rita|maricel|persona|humano|ayuda|atencion|atención|hablar|caja|barra/i.test(textLower)) {
      fallbackReply = `¡Hola! Si necesitás ayuda directa para realizar tu pago, registrar tus datos o tenés alguna duda sobre tu mesa, podés acercarte directamente a la caja para hablar con Rita. Ella con gusto te ayudará con la mayor calidez.`;
    }
    // G) Fallback General por defecto
    else {
      fallbackReply = `¡Hola! Soy Ángel del Sabor, tu asistente virtual en el Buffet Casa de Dios. 

Puedo ayudarte a entender cómo pedir, los medios de pago, el estado de tu pedido, o recomendarte platos de la carta actual. ¿Qué te gustaría saber hoy, estimado comensal?`;
    }

    res.json({ reply: fallbackReply });
  }
});

// AI Autocomplete & Translation Endpoint for Dishes
app.post("/api/ai/process-dish", async (req, res) => {
  const { name, description, purpose, category } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "El nombre del plato es obligatorio." });
  }

  try {
    const prompt = `You are an expert gourmet Chef, copywriter, and professional culinary translator for a high-end restaurant menu named "Buffet Casa de Dios".
Analyze the input data and perform the required generation and translation.

Input data:
- Name (Spanish): "${name.trim()}"
- Category: "${category || 'Platos Fuertes'}"
- Description (Spanish, optional): "${(description || '').trim()}"
- Chef's Note (Spanish, optional): "${(purpose || '').trim()}"

Instructions:
1. Translate the Spanish 'Name' to English and put it in "nameEn" (e.g. "Tarta de Manzana" -> "Apple Pie").
2. If the Spanish 'Description' is already provided and not empty, keep it as-is in "description", and translate it to English in "descriptionEn".
3. If the Spanish 'Description' is NOT provided (empty or blank), generate a delicious, gourmet menu description in Spanish (approx 20-35 words) explaining the flavors, texture, and appeal of the dish, put it in "description", and translate it to English in "descriptionEn".
4. If the Spanish 'Chef's Note' is already provided and not empty, keep it as-is in "purpose", and translate it to English in "purposeEn".
5. If the Spanish 'Chef's Note' is NOT provided (empty or blank), generate a brief, warm, expert Chef's Note or culinary recommendation in Spanish (approx 10-20 words, e.g. focusing on ingredient freshness, chef's secret touch, artisan preparation, or temperature/beverage pairing), put it in "purpose", and translate it to English in "purposeEn".

Return exactly this JSON structure:
{
  "nameEn": "English translation of the name",
  "description": "Spanish description (existing or newly generated)",
  "descriptionEn": "English translation of the Spanish description",
  "purpose": "Spanish Chef's Note (existing or newly generated)",
  "purposeEn": "English translation of the Spanish Chef's Note"
}

Ensure the output is valid JSON. Do not include any markdown formatting or \`\`\`json blocks, only the JSON block itself.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API.");
    }

    const parsed = JSON.parse(text.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("AI Process Dish Error, using local fallback generator:", error.message);
    
    // Fallback dictionary for common dish terms
    const translations: { [key: string]: string } = {
      "tarta": "tart",
      "manzana": "apple",
      "empanada": "empanada",
      "carne": "beef",
      "pollo": "chicken",
      "queso": "cheese",
      "jamon": "ham",
      "tostado": "toasted sandwich",
      "cafe": "coffee",
      "gaseosa": "soda",
      "agua": "water",
      "medialuna": "croissant",
      "dulce de leche": "caramel milk",
      "flan": "flan",
      "papas fritas": "french fries",
      "milanesa": "schnitzel",
      "pizza": "pizza",
      "ensalada": "salad",
      "completo": "full option",
      "doble": "double",
      "casero": "homemade",
      "artesanal": "artisanal"
    };

    // Helper to translate words in name
    const cleanName = name.toLowerCase().replace(/[^a-zñáéíóúü\s]/g, "");
    const words = cleanName.split(/\s+/);
    let translatedWords = words.map(w => {
      if (translations[w]) return translations[w];
      if (w === "de" || w === "con" || w === "y") return "";
      return w;
    }).filter(Boolean);

    const fallbackNameEn = translatedWords.length > 0 
      ? translatedWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
      : `${name} (Gourmet)`;

    const finalDescription = description && description.trim() 
      ? description.trim() 
      : `Exquisito plato elaborado al instante con ingredientes frescos y seleccionados por nuestro Chef para garantizar una experiencia gourmet única.`;

    const finalDescriptionEn = description && description.trim()
      ? `Delicious freshly prepared dish made with high-quality selected ingredients.`
      : `Exquisite dish freshly prepared with select ingredients chosen by our Chef to guarantee a unique gourmet experience.`;

    const finalPurpose = purpose && purpose.trim()
      ? purpose.trim()
      : `Recomendado para disfrutar a temperatura ideal y maridar con una bebida fresca.`;

    const finalPurposeEn = purpose && purpose.trim()
      ? `Recommended to enjoy at perfect temperature with your choice of beverage.`
      : `Recommended to enjoy at perfect temperature and pair with a refreshing beverage.`;

    res.json({
      nameEn: fallbackNameEn,
      description: finalDescription,
      descriptionEn: finalDescriptionEn,
      purpose: finalPurpose,
      purposeEn: finalPurposeEn
    });
  }
});

// GET Supabase status check & diagnostics
app.get("/api/supabase-status", async (req, res) => {
  const recheck = req.query.recheck === "true";
  
  if (!supabase) {
    return res.json({
      initialized: false,
      active: false,
      allExist: false,
      error: "Credenciales de Supabase no configuradas en variables de entorno.",
      tables: {}
    });
  }

  if (recheck) {
    isSupabaseActive = true;
  }

  const tablesToCheck = [
    "admin_users",
    "cash_sessions",
    "orders",
    "order_items",
    "cash_movements",
    "menu_items",
    "app_settings"
  ];

  const status: Record<string, { exists: boolean; error: string | null }> = {};

  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase.from(table).select("*").limit(1);
      if (error) {
        const isMissing = 
          error.code === "PGRST116" || 
          error.code === "PGRST204" || 
          error.code === "42P01" || 
          error.message.includes("schema cache") || 
          error.message.includes("does not exist") ||
          error.message.includes("relation");

        if (isMissing) {
          status[table] = { exists: false, error: error.message };
        } else {
          status[table] = { exists: true, error: null };
        }
      } else {
        status[table] = { exists: true, error: null };
      }
    } catch (e: any) {
      status[table] = { exists: false, error: e.message };
    }
  }

  const allExist = Object.values(status).every(t => t.exists);
  
  if (!allExist) {
    isSupabaseActive = false;
  } else {
    isSupabaseActive = true;
  }

  res.json({
    initialized: true,
    active: isSupabaseActive,
    allExist,
    tables: status
  });
});

let initPromise: Promise<void> | null = null;
export async function initSupabaseSync() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        console.log("🔄 [Buffet Casa de Dios] Synchronizing exchange rate with Supabase app_settings...");
        await loadConfigAsync();
        console.log(`✅ [Buffet Casa de Dios] Exchange rate synced: $${cachedConfig.exchangeRate} ARS`);
      } catch (err) {
        console.error("⚠️ Startup config sync error:", err);
      }

      try {
        console.log("🔄 [Buffet Casa de Dios] Verificando e iniciando seed/migración de platos preestablecidos a Supabase...");
        await seedMenuItems();
      } catch (err) {
        console.error("⚠️ Error durante seed de platos:", err);
      }
    })();
  }
  return initPromise;
}

// Lazy initialization middleware for Serverless environment (Vercel)
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    try {
      await initSupabaseSync();
    } catch (e) {
      console.error("Error in serverless initialization middleware:", e);
    }
  }
  next();
});

// Serve static assets & Vite middleware configuration
async function startServer() {
  if (!process.env.VERCEL) {
    try {
      await initSupabaseSync();
    } catch (err) {
      console.error("⚠️ Initial sync error:", err);
    }
  }

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Buffet Casa de Dios] Server running on port ${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
