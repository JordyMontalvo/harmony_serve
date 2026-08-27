import path from "path"
import lib from "./lib"

/**
 * Carga dinámica de rank-calculation-harmony.js para evitar problemas con Webpack/Next.
 */
function loadDbRankHarmony() {
  const dynamicRequire = eval("require")
  const candidates = [
    path.join(process.cwd(), "components", "rank-calculation-harmony.js"),
    path.join(process.cwd(), "..", "components", "rank-calculation-harmony.js"),
    path.join(process.cwd(), "..", "db", "rank-calculation-harmony.js"),
    path.join(process.cwd(), "db", "rank-calculation-harmony.js"),
  ]
  for (const p of candidates) {
    try {
      return dynamicRequire(p)
    } catch (e) {
      /* siguiente ruta */
    }
  }
  return dynamicRequire(
    path.join(process.cwd(), "components", "rank-calculation-harmony.js")
  )
}

let dbRankHarmonyCached = null
function getDbRankHarmony() {
  if (!dbRankHarmonyCached) dbRankHarmonyCached = loadDbRankHarmony()
  return dbRankHarmonyCached
}

export const Pay = {
  MILLONARIO:          0,
  ORO:                 80,
  ESMERALDA:           120,
  PLATINO:             350,
  DIAMANTE:            800,
  DIAMANTE_AZUL:       3000,
  DIAMANTE_EJECUTIVO:  5000,
  DOBLE_DIAMANTE:      10000,
  DIAMANTE_CORONA:     15000,
  TOP_HARMONY:         30000,
}

export const QUALIFICATION_REQUALIFICATION_RATE = 0.2
export const ACTIVE_POINTS_THRESHOLD = 180

export const pays = [
  { name: "MILLONARIO", payed: false },
  { name: "ORO", payed: false },
  { name: "ESMERALDA", payed: false },
  { name: "PLATINO", payed: false },
  { name: "DIAMANTE", payed: false },
  { name: "DIAMANTE_AZUL", payed: false },
  { name: "DIAMANTE_EJECUTIVO", payed: false },
  { name: "DOBLE_DIAMANTE", payed: false },
  { name: "DIAMANTE_CORONA", payed: false },
  { name: "TOP_HARMONY", payed: false },
]

export function getPercentageForLevel(level1Based) {
  if (level1Based <= 0) return 0
  if (level1Based === 1) return 0.73
  if (level1Based === 2) return 0.05
  if (level1Based === 3) return 0.1
  if (level1Based === 4) return 0.04
  if (level1Based === 5) return 0.02
  if (level1Based >= 6 && level1Based <= 9) return 0.02
  if (level1Based >= 10 && level1Based <= 30) return 0.01
  return 0
}

export function normalizeRankKey(rank) {
  if (!rank) return "SIN_RANGO"
  let s = String(rank)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/Á/g, "A")
    .replace(/É/g, "E")
    .replace(/Í/g, "I")
    .replace(/Ó/g, "O")
    .replace(/Ú/g, "U")
  if (s === "NONE" || s === "NO_RANK" || s === "SINRANGO" || s === "ACTIVE")
    return "SIN_RANGO"
  return s
}

export const RANK_MAX_LEVELS = {
  SIN_RANGO: 3,
  MILLONARIO: 5,
  ORO: 5,
  ESMERALDA: 6,
  PLATINO: 7,
  DIAMANTE: 8,
  DIAMANTE_AZUL: 9,
  DIAMANTE_EJECUTIVO: 10,
  DOBLE_DIAMANTE: 11,
  DIAMANTE_CORONA: 12,
  TOP_HARMONY: 30,
}

export const pos = {
  none: -1,
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

export function emptyBonuses() {
  return {
    platino: [],
    diamante: [],
    diamante_azul: [],
    diamante_ejecutivo: [],
  }
}

export function computeTotalPoints(id, tree) {
  const node = tree.find((e) => e.id == id)
  if (!node) return 0
  node.total_points = node.points + node.affiliation_points
  node.childs.forEach((_id) => {
    node.total_points += computeTotalPoints(_id, tree) || 0
  })
  return node.total_points
}

export function puntajeGrupalSinPropio(node) {
  const propio = Number(node.points || 0) + Number(node.affiliation_points || 0)
  return Math.max(0, Number(node.total_points || 0) - propio)
}

export const RANGO_ID_TO_KEY = {
  1: "MILLONARIO",
  2: "ORO",
  3: "ESMERALDA",
  4: "PLATINO",
  5: "DIAMANTE",
  6: "DIAMANTE_AZUL",
  7: "DIAMANTE_EJECUTIVO",
  8: "DOBLE_DIAMANTE",
  9: "DIAMANTE_CORONA",
  10: "TOP_HARMONY",
}

export function buildHarmonyUsuarioListFromTree(tree) {
  return tree.map((node) => ({
    id: node.id,
    name: node.name,
    puntos_productos: Number(node.points || 0),
    puntos_afiliacion: Number(node.affiliation_points || 0),
    total_points: puntajeGrupalSinPropio(node),
    directos: node.childs || [],
  }))
}

export function depthForClosureRank(rankKey) {
  if (rankKey === "none") return 0
  const k = normalizeRankKey(rankKey)
  return RANK_MAX_LEVELS[k] ?? RANK_MAX_LEVELS.SIN_RANGO
}

export function applyHarmonyRanks(tree, rankIdsPorUsuario, usuariosHarmonyList) {
  const { contarActivosDirectos } = getDbRankHarmony()
  for (const node of tree) {
    const uh = usuariosHarmonyList.find((e) => e.id === node.id)
    const pp = uh ? Number(uh.puntos_productos || 0) : 0
    const pp_afil = uh ? Number(uh.puntos_afiliacion || 0) : 0
    const rid = rankIdsPorUsuario[node.id] || 0

    let rankKey = "none"
    if ((pp + pp_afil) < 180) rankKey = "none"
    else if (!rid) rankKey = "SIN_RANGO"
    else rankKey = RANGO_ID_TO_KEY[rid] || "SIN_RANGO"

    node.rank = rankKey
    node.levels = depthForClosureRank(rankKey)

    const rangoCalculadoNombre = rid
      ? RANGO_ID_TO_KEY[rid] || "SIN_RANGO"
      : "SIN_RANGO"
    node._harmony_qualification = {
      pp,
      pg_grupal_sin_propio: puntajeGrupalSinPropio(node),
      activos_directos: contarActivosDirectos(
        { directos: node.childs || [] },
        usuariosHarmonyList
      ),
      rango_calculado_id: rid || 0,
      rango_calculado_nombre: rangoCalculadoNombre,
      rango_guardado_cierre: node.rank,
      pp_umbral_activacion_rango: 180,
      niveles_residual_permitidos: node.levels,
      compresion_residual_activa: rankAllowsResidualDynamicCompression(node),
      puntos_propios_suma_activ_mas_afil:
        Number(node.points || 0) + Number(node.affiliation_points || 0),
      plan: node.plan || null,
    }
  }
}

export function maxRankPreferStored(a, b) {
  const rankA = !a || a === "none" ? "none" : normalizeRankKey(a)
  const rankB = !b || b === "none" ? "none" : normalizeRankKey(b)
  const pa = pos[rankA] !== undefined ? pos[rankA] : -999
  const pb = pos[rankB] !== undefined ? pos[rankB] : -999
  return pa >= pb ? rankA : rankB
}

export function rankPosition(rank) {
  const key = !rank || rank === "none" ? "none" : normalizeRankKey(rank)
  return pos[key] !== undefined ? pos[key] : -999
}

export function normalizePaysList(userPays) {
  const source = Array.isArray(userPays) ? userPays : []
  const byName = new Map(source.map((p) => [normalizeRankKey(p.name), p]))
  return pays.map((template) => {
    const prev = byName.get(template.name)
    return {
      ...template,
      ...(prev || {}),
      name: template.name,
      payed: prev ? Boolean(prev.payed) : false,
    }
  })
}

export function isTrueDbFlag(value) {
  return value === true || value === 1 || value === "true" || value === "TRUE" || value === "1"
}

export function hasActivationPoints(record) {
  const points = Number(record?.points || record?.puntos_productos || 0)
  const afil = Number(record?.affiliation_points || record?.puntos_afiliacion || 0)
  return (points + afil) >= ACTIVE_POINTS_THRESHOLD
}

export function isFullActivated(record) {
  return isTrueDbFlag(record?.activated) || isTrueDbFlag(record?.ACTIVATED) || hasActivationPoints(record)
}

export function isActiveForClosure(record) {
  return isFullActivated(record) || isTrueDbFlag(record?._activated) || isTrueDbFlag(record?.active)
}

export function buildQualificationPayments(node) {
  const rankKey = normalizeRankKey(node.rank)
  const rankPos = rankPosition(rankKey)
  if (rankPos < pos.ORO) return []

  const prevMaxRank = node.rank_max_history || node.previous_rank_max_history || "none"
  const prevMaxPos = rankPosition(prevMaxRank)
  const nodePays = normalizePaysList(node.pays)
  node.pays = nodePays

  if (rankPos > prevMaxPos) {
    return nodePays
      .filter((pay) => {
        const payRank = normalizeRankKey(pay.name)
        const payPos = rankPosition(payRank)
        return (
          payPos >= pos.ORO &&
          payPos <= rankPos &&
          payPos > prevMaxPos &&
          !pay.payed &&
          Number(Pay[payRank] || 0) > 0
        )
      })
      .map((pay) => {
        const payRank = normalizeRankKey(pay.name)
        const value = Number(Pay[payRank] || 0)
        return {
          ...pay,
          name: payRank,
          value,
          base_value: value,
          percentage: 1,
          type: "primera_calificacion",
        }
      })
  }

  if (rankPos === prevMaxPos) {
    const baseValue = Number(Pay[rankKey] || 0)
    if (baseValue <= 0) return []
    return [
      {
        name: rankKey,
        payed: true,
        value: Number((baseValue * QUALIFICATION_REQUALIFICATION_RATE).toFixed(2)),
        base_value: baseValue,
        percentage: QUALIFICATION_REQUALIFICATION_RATE,
        type: "recalificacion",
      },
    ]
  }

  return []
}

export function mergeRankMaxHistory(cierreRank, prevUserDoc) {
  const prevStored = prevUserDoc?.rank_max_history || prevUserDoc?.rank || "none"
  if (!cierreRank || cierreRank === "none") return prevStored
  return maxRankPreferStored(cierreRank, prevStored)
}

export function rankAllowsResidualDynamicCompression(node) {
  const r = node?.rank
  if (!r || r === "none") return false
  const p = pos[normalizeRankKey(r)]
  return typeof p === "number" && p >= pos.PLATINO
}

export function findNextActiveAncestorId(fromNode, tree) {
  let id = fromNode?.parent
  while (id) {
    const x = tree.find((e) => e.id == id)
    if (!x) return null
    if (isActiveForClosure(x)) return id
    id = x.parent
  }
  return null
}

export function pay_residual(id, n, user, tree) {
  if (n >= 30) return

  let node = tree.find((e) => e.id == id)
  if (!node) return
  let _id = node.parent

  if (isActiveForClosure(node)) {
    const rr = isFullActivated(node) ? 1 : 0.5
    const pct = getPercentageForLevel(n + 1)

    if (node.levels > n && pct > 0 && user.points) {
      node.residual_bonus += pct * user.points * rr
      if (pct * user.points * rr > 0) {
        node.residual_bonus_arr.push({
          n,
          dni: user.dni,
          name: user.name,
          val: user.points,
          r: pct,
          rr,
          amount: pct * user.points * rr,
        })
      }
    }

    if (_id) pay_residual(_id, n + 1, user, tree)
  } else if (_id) {
    let nextN = n + 1
    const nextActiveId = findNextActiveAncestorId(node, tree)
    if (nextActiveId) {
      const recipient = tree.find((e) => e.id == nextActiveId)
      if (recipient && rankAllowsResidualDynamicCompression(recipient)) {
        nextN = n
      }
    }
    pay_residual(_id, nextN, user, tree)
  }
}

/**
 * Ejecuta el cálculo completo del árbol de cierre en memoria.
 * @param {object} db - Instancia de db con User, Tree, Affiliation, Activation, Transaction
 * @param {object} [options]
 * @param {boolean} [options.createFastBonusTransactions=false] - Si es true, inserta transacciones fast bonus en base de datos.
 * @returns {Promise<{ tree: Array, affiliations: Array, activations: Array }>}
 */
export async function calculateClosureTree(db, { createFastBonusTransactions = false } = {}) {
  const { User, Tree, Affiliation, Activation, Transaction } = db

  const users = await User.find({ tree: true })
  const tree = await Tree.find({})

  tree.forEach((node) => {
    const user = users.find((e) => e.id == node.id)

    node.parentId = user ? user.parentId : node.parentId
    node.plan = user ? user.plan : node.plan
    node.dni = user ? user.dni : ""
    node.name = user ? user.name + " " + user.lastName : ""
    node.ACTIVATED = isTrueDbFlag(user?.ACTIVATED)
    node.activated = isFullActivated(user)
    node._activated = isTrueDbFlag(user?._activated)
    node.active = isActiveForClosure(node)
    node.points = Number(user?.points || 0)
    node.affiliation_points = user?.affiliation_points ? user.affiliation_points : 0
    node.pays = normalizePaysList(user?.pays)
    node.rank_max_history = user?.rank_max_history || user?.rank || "none"
    node.bonuses = user?.bonuses ? user.bonuses : emptyBonuses()
    node.n_inactives = user?.n_inactives ? user.n_inactives : 0
    node.residual_bonus = 0
    node.residual_bonus_arr = []
    node._pays = []
  })

  // Calcular puntos totales del árbol desde la raíz (detección dinámica)
  // Buscar todos los nodos raíz (nodos sin padre dentro del árbol)
  const treeIds = new Set(tree.map((n) => String(n.id)))
  const rootNodes = tree.filter((n) => !n.parent || !treeIds.has(String(n.parent)))
  if (rootNodes.length > 0) {
    rootNodes.forEach((root) => computeTotalPoints(root.id, tree))
  } else {
    // Fallback al ID histórico de la raíz si no se detecta ningún nodo raíz
    computeTotalPoints("5f0e0b67af92089b5866bcd0", tree)
  }

  tree.forEach((node) => {
    node.total = []
    node._total = []
    node.childs.forEach((_id) => {
      const _node = tree.find((e) => e.id == _id)
      if (_node) {
        node.total.push(_node.total_points || 0)
        node._total.push(_node.total_points || 0)
      }
    })
    node.total.sort((a, b) => b - a)
  })

  const usuariosHarmony = buildHarmonyUsuarioListFromTree(tree)
  const { calcularRangosTodos } = getDbRankHarmony()
  const rankIdsPorUsuario = calcularRangosTodos(usuariosHarmony, [])
  applyHarmonyRanks(tree, rankIdsPorUsuario, usuariosHarmony)

  for (let node of tree) {
    // Solo propagar residual hacia arriba si el nodo hijo tiene puntos > 0
    // (un nodo activo con 0 puntos no aporta residual real a sus uplines)
    if (node.parent && node.points > 0) pay_residual(node.parent, 0, node, tree)
  }

  if (createFastBonusTransactions && Transaction) {
    for (let node of tree) {
      let directs = tree.filter(
        (e) =>
          e.affiliation_points &&
          e.parentId == node.id &&
          (e.plan == "business" ||
            e.plan == "master" ||
            e.plan == "vip" ||
            e.plan == "empresario" ||
            e.plan == "standard")
      )

      directs.sort((a, b) => {
        if (a.plan == b.plan) return 0
        if (a.plan == "vip") return -1
        if (b.plan == "vip") return 1
        if (a.plan == "master" && b.plan == "business") return -1
        return 1
      })

      if (directs.length >= 5) {
        const value =
          directs[4].plan == "vip" || directs[4].plan == "master" ? 250 : 100
        await Transaction.insert({
          date: new Date(),
          user_id: node.id,
          type: "in",
          value,
          name: "fast bonus",
        })
      }
    }
  }

  for (let node of tree) {
    node._pays = buildQualificationPayments(node)
  }

  const affiliations = Affiliation ? await Affiliation.find({ closed: false }) : []
  const activations = Activation ? await Activation.find({ closed: false }) : []

  return { tree, affiliations, activations }
}

/**
 * Cache en memoria con TTL para previews frecuentes desde el Dashboard.
 */
let cachedClosure = null
let cacheTimestamp = 0
// TTL reducido a 15s para que los cambios de puntos se reflejen rápido en el dashboard
const CACHE_TTL_MS = 15 * 1000 // 15 segundos

export async function getClosurePreviewCached(db, { forceRefresh = false } = {}) {
  const now = Date.now()
  if (!forceRefresh && cachedClosure && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedClosure
  }

  const result = await calculateClosureTree(db, { createFastBonusTransactions: false })
  cachedClosure = result
  cacheTimestamp = now
  return result
}

export function invalidateClosureCache() {
  cachedClosure = null
  cacheTimestamp = 0
}

/**
 * Obtiene el monto de residuales estimados en tiempo real para un usuario.
 * @param {object} db 
 * @param {string} userId 
 * @returns {Promise<{ estimatedResidual: number, rank: string, levels: number, lines: Array }>}
 */
export async function getEstimatedResidualForUser(db, userId) {
  try {
    if (!userId) return { estimatedResidual: 0, rank: "none", levels: 0, lines: [] }
    const { tree } = await getClosurePreviewCached(db)
    const node = tree.find((n) => String(n.id) === String(userId))
    if (!node) {
      return { estimatedResidual: 0, rank: "none", levels: 0, lines: [] }
    }
    const bonus = Number(node.residual_bonus || 0)
    return {
      estimatedResidual: Number(bonus.toFixed(2)),
      rank: node.rank || "none",
      levels: node.levels || 0,
      lines: node.residual_bonus_arr || [],
    }
  } catch (err) {
    console.error("[getEstimatedResidualForUser error]", err)
    return { estimatedResidual: 0, rank: "none", levels: 0, lines: [] }
  }
}

export default {
  Pay,
  QUALIFICATION_REQUALIFICATION_RATE,
  ACTIVE_POINTS_THRESHOLD,
  pays,
  RANK_MAX_LEVELS,
  pos,
  RANGO_ID_TO_KEY,
  getPercentageForLevel,
  normalizeRankKey,
  emptyBonuses,
  computeTotalPoints,
  puntajeGrupalSinPropio,
  buildHarmonyUsuarioListFromTree,
  depthForClosureRank,
  applyHarmonyRanks,
  maxRankPreferStored,
  rankPosition,
  normalizePaysList,
  isTrueDbFlag,
  hasActivationPoints,
  isFullActivated,
  isActiveForClosure,
  buildQualificationPayments,
  mergeRankMaxHistory,
  rankAllowsResidualDynamicCompression,
  findNextActiveAncestorId,
  pay_residual,
  calculateClosureTree,
  getClosurePreviewCached,
  invalidateClosureCache,
  getEstimatedResidualForUser,
}
