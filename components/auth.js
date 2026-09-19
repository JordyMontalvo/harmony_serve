/**
 * Autenticacion y autorizacion centralizada.
 *
 * Este modulo NO modifica el comportamiento de ningun endpoint por si solo:
 * hay que envolver el handler explicitamente con withAdmin / withAuth.
 *
 * Roles reconocidos:
 *   - 'admin'  : acceso total al panel administrativo
 *   - 'office' : oficina / sucursal, acceso limitado a su propia cuenta
 *   - 'user'   : socio de la app
 */

const crypto = require("crypto");
const bcrypt = require("bcrypt");

const db = require("./db");
const { applyCORS } = require("../middleware/middleware-cors");

const { Session, User } = db;

// Duracion por defecto de una sesion administrativa (12 horas).
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Token de sesion criptograficamente seguro.
 * Reemplaza a lib.rand(), que usa Math.random() y es predecible.
 */
function secureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Devuelve el valor solo si es una cadena no vacia.
 * Evita inyeccion NoSQL: si llega { "$ne": null } se descarta.
 */
function safeString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

/**
 * Extrae el token de sesion de la peticion.
 * Acepta (en este orden): cabecera Authorization, query, body.
 */
function extractToken(req) {
  const header = req.headers && req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const fromHeader = safeString(header.slice(7));
    if (fromHeader) return fromHeader;
  }

  const query = req.query || {};
  const fromQuery = safeString(query.admin_session) || safeString(query.session);
  if (fromQuery) return fromQuery;

  const body = req.body;
  if (body && typeof body === "object") {
    const fromBody = safeString(body.admin_session) || safeString(body.session);
    if (fromBody) return fromBody;
  }

  return null;
}

/** Una sesion esta expirada solo si tiene expires_at y ya paso. */
function isExpired(session) {
  if (!session || !session.expires_at) return false;
  const expiry = new Date(session.expires_at).getTime();
  if (!Number.isFinite(expiry)) return false;
  return Date.now() > expiry;
}

/**
 * Resuelve la sesion y el rol efectivo del solicitante.
 * Devuelve null si no hay sesion valida.
 */
async function resolveSession(req) {
  const value = extractToken(req);
  if (!value) return null;

  const session = await Session.findOne({ value });
  if (!session || isExpired(session)) return null;

  // Rol declarado al crear la sesion (login de admin u oficina).
  let role = safeString(session.role);
  let user = null;

  // Sesiones de socio: el rol se deduce del usuario.
  if (!role) {
    const userId = safeString(session.id);
    if (userId) user = await User.findOne({ id: userId });
    role = user && user.type === "admin" ? "admin" : "user";
  }

  return {
    session,
    role,
    user,
    userId: safeString(session.id),
    officeId: safeString(session.office_id),
  };
}

/**
 * Crea y persiste una sesion con rol explicito.
 * Usada por los endpoints de login de admin y oficina.
 */
async function createSession({ role, id, office_id, name, ttlMs }) {
  const value = secureToken();
  const now = new Date();

  await Session.insert({
    id: id || role,
    value,
    role,
    office_id: office_id || null,
    name: name || null,
    date: now,
    expires_at: new Date(now.getTime() + (ttlMs || ADMIN_SESSION_TTL_MS)),
  });

  return value;
}

/**
 * Credenciales del panel administrativo.
 * Prioridad: hash bcrypt en entorno > password plano en entorno > valor actual.
 *
 * El respaldo final replica la credencial que hoy vive en el frontend, para
 * que activar la autenticacion no deje al equipo fuera del panel. Debe
 * sustituirse configurando ADMIN_PANEL_PASSWORD_HASH en el servidor.
 */
function adminPanelCredentials() {
  return {
    user: process.env.ADMIN_PANEL_USER || "HARMONY",
    passwordHash: process.env.ADMIN_PANEL_PASSWORD_HASH || null,
    password: process.env.ADMIN_PANEL_PASSWORD || null,
    usingFallback:
      !process.env.ADMIN_PANEL_PASSWORD_HASH && !process.env.ADMIN_PANEL_PASSWORD,
  };
}

/** Comparacion en tiempo constante para evitar ataques de temporizacion. */
function safeCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Valida las credenciales del panel administrativo. */
async function verifyAdminPassword(password) {
  const value = safeString(password);
  if (!value) return false;

  const creds = adminPanelCredentials();

  if (creds.passwordHash) {
    return bcrypt.compare(value, creds.passwordHash);
  }
  if (creds.password) {
    return safeCompare(value, creds.password);
  }
  // Respaldo temporal: credencial historica del panel.
  return safeCompare(value, "harmony2026");
}

/**
 * Envuelve un handler exigiendo sesion de administrador.
 * Deja disponible req.auth con { role, userId, officeId }.
 */
function withAdmin(handler) {
  return async (req, res) => {
    applyCORS(req, res);
    if (req.method === "OPTIONS") return res.status(200).end();

    const auth = await resolveSession(req);

    if (!auth) {
      return res
        .status(401)
        .json({ error: true, msg: "Sesion invalida o expirada" });
    }
    if (auth.role !== "admin" && auth.role !== "office") {
      return res
        .status(403)
        .json({ error: true, msg: "Acceso denegado: se requieren permisos administrativos" });
    }

    req.auth = auth;
    return handler(req, res);
  };
}

/** Igual que withAdmin, pero exige rol 'admin' estricto (excluye oficinas). */
function withAdminOnly(handler) {
  return async (req, res) => {
    applyCORS(req, res);
    if (req.method === "OPTIONS") return res.status(200).end();

    const auth = await resolveSession(req);

    if (!auth) {
      return res
        .status(401)
        .json({ error: true, msg: "Sesion invalida o expirada" });
    }
    if (auth.role !== "admin") {
      return res
        .status(403)
        .json({ error: true, msg: "Acceso denegado: se requiere rol de administrador" });
    }

    req.auth = auth;
    return handler(req, res);
  };
}

/** Envuelve un handler exigiendo cualquier sesion valida (socio incluido). */
function withAuth(handler) {
  return async (req, res) => {
    applyCORS(req, res);
    if (req.method === "OPTIONS") return res.status(200).end();

    const auth = await resolveSession(req);

    if (!auth) {
      return res
        .status(401)
        .json({ error: true, msg: "Sesion invalida o expirada" });
    }

    req.auth = auth;
    return handler(req, res);
  };
}

/**
 * Alcance de datos permitido para la sesion.
 * Un admin ve todo; una oficina solo su propia cuenta.
 * Sustituye a confiar en el query param `account`, que hoy es falsificable.
 */
function accountScope(auth) {
  if (!auth) return null;
  if (auth.role === "admin") return "admin";
  if (auth.role === "office") return auth.officeId || auth.userId;
  return auth.userId;
}

module.exports = {
  ADMIN_SESSION_TTL_MS,
  accountScope,
  adminPanelCredentials,
  createSession,
  extractToken,
  resolveSession,
  safeString,
  secureToken,
  verifyAdminPassword,
  withAdmin,
  withAdminOnly,
  withAuth,
};
