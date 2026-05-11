/**
 * Harmony rank helpers for admin monthly closure (closeds).
 */
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
  ACTIVE: 0,
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

function contarActivosDirectos({ directos }, activosList) {
  const byId = new Map((activosList || []).map((a) => [a.id, a]))
  let n = 0
  for (const did of directos || []) {
    const a = byId.get(did)
    if (a && calcularPP(a) >= 180) n += 1
  }
  return n
}

function calcularRangosTodos(usuariosHarmony, users) {
  const out = {}
  const userById = new Map((users || []).map((u) => [u.id, u]))
  for (const uh of usuariosHarmony || []) {
    const u = userById.get(uh.id)
    const raw = u ? u.rank_max_history || u.rank || "none" : "none"
    const key = normalizeRankKey(raw)
    const rid = RANK_NAME_TO_ID[key]
    out[uh.id] = rid !== undefined && rid !== null ? rid : 0
  }
  return out
}

module.exports = {
  calcularPP,
  calcularRangosTodos,
  contarActivosDirectos,
}