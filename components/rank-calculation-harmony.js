/**
 * Harmony rank helpers for admin (p. ej. reportes). El cierre mensual usa
 * `db/rank-calculation-harmony.js` para rangos del periodo (PP/PG/directos).
 */
const path = require("path")

function loadDbRankHarmony() {
  const candidates = [
    path.join(process.cwd(), "..", "db", "rank-calculation-harmony.js"),
    path.join(process.cwd(), "db", "rank-calculation-harmony.js"),
    path.join(__dirname, "..", "..", "db", "rank-calculation-harmony.js"),
  ]
  for (const p of candidates) {
    try {
      return require(p)
    } catch (e) {
      /* siguiente ruta */
    }
  }
  return null
}

const dbRankHarmony = loadDbRankHarmony()

function normalizeRankKey(rank) {
  if (!rank) return "SIN_RANGO"
  let s = String(rank)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/\u00C1/g, "A")
    .replace(/\u00C9/g, "E")
    .replace(/\u00CD/g, "I")
    .replace(/\u00D3/g, "O")
    .replace(/\u00DA/g, "U")
  if (s === "NONE" || s === "NO_RANK" || s === "SINRANGO") return "SIN_RANGO"
  return s
}

const RANK_NAME_TO_ID = {
  SIN_RANGO: 0,
  MILLONARIO: 1,
  ORO: 2,
  ESMERALDA: 3,
  PLATINO: 4,
  DIAMANTE: 5,
  DIAMANTE_AZUL: 6,
  DIAMANTE_EJECUTIVO: 7,
  DOBLE_DIAMANTE: 8,
  DIAMANTE_CORONA: 9,
  TOP_HARMONY: 10,
}

function calcularPP(uh) {
  if (!uh) return 0
  return Number(uh.puntos_productos || 0) + Number(uh.puntos_afiliacion || 0)
}

function isActivoDbFlag(value) {
  return (
    value === true ||
    value === 1 ||
    value === "true" ||
    value === "TRUE" ||
    value === "1"
  )
}

function isUsuarioActivoHarmony(uh) {
  if (!uh) return false
  return isActivoDbFlag(uh.activated) || calcularPP(uh) >= 180
}

function contarActivosDirectos({ directos }, activosList) {
  const byId = new Map((activosList || []).map((a) => [a.id, a]))
  let n = 0
  for (const did of directos || []) {
    const a = byId.get(did)
    if (a && isUsuarioActivoHarmony(a)) n += 1
  }
  return n
}

function logsForDbRank(second) {
  if (!Array.isArray(second) || !second.length) return []
  if (typeof second[0] === "string") return second
  return []
}

/**
 * Rangos del periodo según volumen Harmony. Si existe el paquete `db/`, delega
 * allí. Si no, usa solo `rank` persistido (nunca rank_max_history).
 */
function calcularRangosTodos(usuariosHarmony, usersOrLogs) {
  if (dbRankHarmony) {
    return dbRankHarmony.calcularRangosTodos(
      usuariosHarmony,
      logsForDbRank(usersOrLogs)
    )
  }

  const out = {}
  const rawList = Array.isArray(usersOrLogs) ? usersOrLogs : []
  const userDocs =
    rawList.length && typeof rawList[0] === "object" && rawList[0] !== null
      ? rawList
      : []
  const userById = new Map(userDocs.map((u) => [u.id, u]))
  for (const uh of usuariosHarmony || []) {
    const u = userById.get(uh.id)
    const raw = u ? u.rank || "none" : "none"
    const key = normalizeRankKey(raw)
    const rid = RANK_NAME_TO_ID[key]
    out[uh.id] = rid !== undefined && rid !== null ? rid : 0
  }
  return out
}

module.exports = {
  calcularPP,
  calcularRangosTodos,
  isUsuarioActivoHarmony,
  contarActivosDirectos,
}
