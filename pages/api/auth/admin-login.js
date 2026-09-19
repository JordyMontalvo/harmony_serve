/**
 * Login del panel administrativo.
 *
 * Sustituye a la validacion que hoy ocurre en el navegador
 * (admin/src/store.js + admin/src/views/Login.vue), donde la credencial
 * viaja dentro del bundle publico.
 *
 * Configuracion recomendada en el servidor:
 *   ADMIN_PANEL_USER           nombre de usuario del panel
 *   ADMIN_PANEL_PASSWORD_HASH  hash bcrypt de la contrasena
 */

const { applyCORS } = require("../../../middleware/middleware-cors");
const auth = require("../../../components/auth");

const { safeString, verifyAdminPassword, createSession, adminPanelCredentials } = auth;

// Limitador simple de intentos por IP, en memoria del proceso.
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

function clearAttempts(ip) {
  attempts.delete(ip);
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
  const email = safeString(body.email) || safeString(body.user);
  const password = safeString(body.password);

  if (!email || !password) {
    return res.status(400).json({ error: true, msg: "Usuario y contrasena requeridos" });
  }

  const creds = adminPanelCredentials();

  const userMatches = email.toLowerCase() === String(creds.user).toLowerCase();
  const passwordMatches = await verifyAdminPassword(password);

  // Mensaje generico: no revela si fallo el usuario o la contrasena.
  if (!userMatches || !passwordMatches) {
    return res.status(401).json({ error: true, msg: "Credenciales invalidas" });
  }

  clearAttempts(ip);

  if (creds.usingFallback) {
    console.warn(
      "[admin-login] ADMIN_PANEL_PASSWORD_HASH no esta configurado; usando credencial de respaldo."
    );
  }

  const session = await createSession({
    role: "admin",
    id: "admin",
    name: "Administrador",
  });

  return res.json({
    error: false,
    session,
    account: {
      type: "admin",
      id: "admin",
      email: creds.user,
      name: "Administrador",
    },
  });
};
