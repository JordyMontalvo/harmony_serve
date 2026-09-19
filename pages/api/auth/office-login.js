/**
 * Login de oficinas / sucursales.
 *
 * Hoy admin/src/views/Sucursal.vue descarga TODAS las oficinas con sus
 * contrasenas via GET /api/admin/offices y las compara en el navegador.
 * Este endpoint mueve esa validacion al servidor, de modo que las
 * credenciales de las oficinas dejan de viajar al cliente.
 *
 * Acepta contrasena en texto plano (formato actual en base de datos) y
 * tambien hash bcrypt, para permitir migrar sin romper los accesos.
 */

const bcrypt = require("bcrypt");

const { applyCORS } = require("../../../middleware/middleware-cors");
const db = require("../../../components/db");
const auth = require("../../../components/auth");

const { Office } = db;
const { safeString, createSession } = auth;

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map();

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return (req.connection && req.connection.remoteAddress) || "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now - entry.start > WINDOW_MS) {
    attempts.set(ip, { start: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

async function passwordMatches(stored, provided) {
  if (typeof stored !== "string" || !stored.length) return false;

  // Hash bcrypt
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return bcrypt.compare(provided, stored);
  }

  // Texto plano (formato heredado)
  return stored === provided;
}

module.exports = async function handler(req, res) {
  applyCORS(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: true, msg: "Metodo no permitido" });
  }

  const ip = clientIp(req);

  if (rateLimited(ip)) {
    return res.status(429).json({
      error: true,
      msg: "Demasiados intentos. Espera unos minutos e intenta de nuevo.",
    });
  }

  const body = req.body || {};
  const email = safeString(body.email);
  const password = safeString(body.password);

  if (!email || !password) {
    return res.status(400).json({ error: true, msg: "Usuario y contrasena requeridos" });
  }

  // safeString garantiza que email es una cadena: no hay inyeccion NoSQL.
  const office = await Office.findOne({ email });

  if (!office || !(await passwordMatches(office.password, password))) {
    return res.status(401).json({ error: true, msg: "Credenciales invalidas" });
  }

  const session = await createSession({
    role: "office",
    id: office.id,
    office_id: office.id,
    name: office.name || null,
  });

  // Solo se devuelven los campos que el panel necesita; nunca la contrasena.
  return res.json({
    error: false,
    session,
    account: {
      type: "office",
      id: office.id,
      email: office.email,
      name: office.name || null,
    },
  });
};
