const crypto = require("crypto");

/**
 * Sabores POS - Secure Administrative Password Hash Generator
 * 
 * This utility generates secure password hashes compatible with Sabores POS's administrative login.
 * It uses the same algorithm: Crypto HMAC SHA-256 with a cryptographically secure random 16-byte salt.
 * 
 * How to use:
 * Option A) Pass the password as a command line argument:
 *    node hash-generator.js "mi_super_clave_segura_123"
 * 
 * Option B) Simply modify the 'myPassword' variable below and run:
 *    node hash-generator.js
 */

function generateSecureHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHmac("sha256", salt).update(password).digest("hex");
  return `${salt}:${hash}`;
}

// Get password from command line arguments or use a placeholder
const args = process.argv.slice(2);
let myPassword = args[0] || "CAMBIAR_POR_TU_PASSWORD_AQUI";

const fullHash = generateSecureHash(myPassword);

console.log("\n=========================================================================");
console.log("🔒 GENERADOR DE HASH PARA CONTRASEÑA ADMINISTRATIVA - SABORES POS");
console.log("=========================================================================");
console.log(`Contraseña procesada: "${myPassword}"`);
console.log(`Formato generado:      salt:hash_hexadecimal`);
console.log("-------------------------------------------------------------------------");
console.log(`🔑 HASH GENERADO:\n\n${fullHash}\n`);
console.log("-------------------------------------------------------------------------");
console.log("📋 CONSULTA SQL PARA INSERTAR/ACTUALIZAR EN SUPABASE:");
console.log("-------------------------------------------------------------------------");
console.log(`
-- 1. Asegurar la existencia de la tabla
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text DEFAULT 'admin',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insertar o actualizar el usuario admin con el nuevo hash seguro
INSERT INTO admin_users (username, password_hash, role)
VALUES ('admin', '${fullHash}', 'admin')
ON CONFLICT (username) 
DO UPDATE SET password_hash = EXCLUDED.password_hash;

SELECT * FROM admin_users WHERE username = 'admin';
`);
console.log("=========================================================================\n");
