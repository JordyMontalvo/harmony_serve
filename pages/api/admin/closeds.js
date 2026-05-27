import path from "path"
import db from "../../../components/db"
import lib from "../../../components/lib"

/**
 * Cálculo de rangos del periodo (PP/PG/directos) — no usa rank_max_history.
 * Carga en runtime con eval('require') para que Webpack/Next 9 no intente empaquetar ../db (fallaba con 404 en la ruta).
 */
function loadDbRankHarmony() {
  const dynamicRequire = eval("require")
  const candidates = [
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
    path.join(process.cwd(), "..", "db", "rank-calculation-harmony.js")
  )
}

let dbRankHarmonyCached = null
function getDbRankHarmony() {
  if (!dbRankHarmonyCached) dbRankHarmonyCached = loadDbRankHarmony()
  return dbRankHarmonyCached
}

const { User, Affiliation, Activation } = db
const { midd, success, rand } = lib

const { Tree, Transaction, Closed } = db

let tree

const Pay = {
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

const QUALIFICATION_REQUALIFICATION_RATE = 0.2
const ACTIVE_POINTS_THRESHOLD = 180

const pays = [
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

function getPercentageForLevel(level1Based) {
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

function normalizeRankKey(rank) {
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

const RANK_MAX_LEVELS = {
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

const pos = {
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

function emptyBonuses() {
  return {
    platino: [],
    diamante: [],
    diamante_azul: [],
    diamante_ejecutivo: [],
  }
}

function total_points(id) {
  const node = tree.find((e) => e.id == id)
  if (!node) return 0
  node.total_points = node.points + node.affiliation_points
  node.childs.forEach((_id) => {
    node.total_points += total_points(_id) || 0
  })
  return node.total_points
}

function puntajeGrupalSinPropio(node) {
  const propio = Number(node.points || 0) + Number(node.affiliation_points || 0)
  return Math.max(0, Number(node.total_points || 0) - propio)
}

const RANGO_ID_TO_KEY = {
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

function buildHarmonyUsuarioListFromTree() {
  // PP del cierre = solo activaciones (reconsumo/producto). No mezclar puntos de afiliación en lo “personal” para rangos ni activos directos.
  return tree.map((node) => ({
    id: node.id,
    name: node.name,
    puntos_productos: Number(node.points || 0),
    puntos_afiliacion: 0,
    total_points: puntajeGrupalSinPropio(node),
    directos: node.childs || [],
  }))
}

function depthForClosureRank(rankKey) {
  if (rankKey === "none") return 0
  const k = normalizeRankKey(rankKey)
  return RANK_MAX_LEVELS[k] ?? RANK_MAX_LEVELS.SIN_RANGO
}

function applyHarmonyRanks(rankIdsPorUsuario, usuariosHarmonyList) {
  const { contarActivosDirectos } = getDbRankHarmony()
  for (const node of tree) {
    const uh = usuariosHarmonyList.find((e) => e.id === node.id)
    const pp = uh ? Number(uh.puntos_productos || 0) : 0
    const rid = rankIdsPorUsuario[node.id] || 0

    let rankKey = "none"
    if (pp < 180) rankKey = "none"
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
      /** Este afiliado es Platino+ → en la línea aplica compresión dinámica de residuales hacia arriba. */
      compresion_residual_activa: rankAllowsResidualDynamicCompression(node),
      puntos_propios_suma_activ_mas_afil:
        Number(node.points || 0) + Number(node.affiliation_points || 0),
      plan: node.plan || null,
    }
  }
}

function maxRankPreferStored(a, b) {
  const rankA = !a || a === "none" ? "none" : normalizeRankKey(a)
  const rankB = !b || b === "none" ? "none" : normalizeRankKey(b)
  const pa = pos[rankA] !== undefined ? pos[rankA] : -999
  const pb = pos[rankB] !== undefined ? pos[rankB] : -999
  return pa >= pb ? rankA : rankB
}

function rankPosition(rank) {
  const key = !rank || rank === "none" ? "none" : normalizeRankKey(rank)
  return pos[key] !== undefined ? pos[key] : -999
}

function normalizePaysList(userPays) {
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

function isTrueDbFlag(value) {
  return value === true || value === 1 || value === "true" || value === "TRUE" || value === "1"
}

function hasActivationPoints(record) {
  return Number(record?.points || record?.puntos_productos || 0) >= ACTIVE_POINTS_THRESHOLD
}

function isFullActivated(record) {
  return isTrueDbFlag(record?.activated) || isTrueDbFlag(record?.ACTIVATED) || hasActivationPoints(record)
}

function isActiveForClosure(record) {
  return isFullActivated(record) || isTrueDbFlag(record?._activated) || isTrueDbFlag(record?.active)
}

function buildQualificationPayments(node) {
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

function mergeRankMaxHistory(cierreRank, prevUserDoc) {
  const prevStored = prevUserDoc?.rank_max_history || prevUserDoc?.rank || "none"
  if (!cierreRank || cierreRank === "none") return prevStored
  return maxRankPreferStored(cierreRank, prevStored)
}

/** Platino+ usan compresión dinámica en residual; Millonario-Esmeralda y SIN_RANGO no. */
function rankAllowsResidualDynamicCompression(node) {
  const r = node?.rank
  if (!r || r === "none") return false
  const p = pos[normalizeRankKey(r)]
  return typeof p === "number" && p >= pos.PLATINO
}

/** Primer ancestro con bandera activa en el árbol de cierre (hacia arriba). */
function findNextActiveAncestorId(fromNode) {
  let id = fromNode?.parent
  while (id) {
    const x = tree.find((e) => e.id == id)
    if (!x) return null
    if (isActiveForClosure(x)) return id
    id = x.parent
  }
  return null
}

function pay_residual(id, n, user) {
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

    if (_id) pay_residual(_id, n + 1, user)
  } else if (_id) {
    // Nivel inactivo: sin compresión (Millonario-Esmeralda / SIN_RANGO) se pierde el % de ese nivel (n+1).
    // Con compresión (Platino+ como próximo cobrador válido) se mantiene n.
    let nextN = n + 1
    const nextActiveId = findNextActiveAncestorId(node)
    if (nextActiveId) {
      const recipient = tree.find((e) => e.id == nextActiveId)
      if (recipient && rankAllowsResidualDynamicCompression(recipient)) {
        nextN = n
      }
    }
    pay_residual(_id, nextN, user)
  }
}

export default async (req, res) => {
  await midd(req, res)

  if (req.method == "GET") {
    try {
      const closeds = await Closed.find({}, { projection: { tree: 0 } })
      return res.json(success({ closeds }))
    } catch (err) {
      console.error("[admin/closeds GET]", err)
      return res
        .status(500)
        .json(lib.error(err.message || String(err)))
    }
  }

  if (req.method == "POST") {
    console.log("POST ...")
    const { action } = req.body

    if (action == "new") {
      console.log("new ...")

      const users = await User.find({ tree: true })
      tree = await Tree.find({})

      tree.forEach((node) => {
        const user = users.find((e) => e.id == node.id)

        node.parentId = user.parentId
        node.plan = user.plan
        node.dni = user.dni
        node.name = user.name + " " + user.lastName
        node.ACTIVATED = isTrueDbFlag(user.ACTIVATED)
        node.activated = isFullActivated(user)
        node._activated = isTrueDbFlag(user._activated)
        node.active = isActiveForClosure(node)
        node.points = Number(user.points)
        node.affiliation_points = user.affiliation_points ? user.affiliation_points : 0
        node.pays = normalizePaysList(user.pays)
        node.rank_max_history = user.rank_max_history || user.rank || "none"
        node.bonuses = user.bonuses ? user.bonuses : emptyBonuses()
        node.n_inactives = user.n_inactives ? user.n_inactives : 0
        node.residual_bonus = 0
        node.residual_bonus_arr = []
        node._pays = []
      })

      total_points("5f0e0b67af92089b5866bcd0")
      console.log("1")

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

      const usuariosHarmony = buildHarmonyUsuarioListFromTree()
      const { calcularRangosTodos } = getDbRankHarmony()
      const rankIdsPorUsuario = calcularRangosTodos(usuariosHarmony, [])
      applyHarmonyRanks(rankIdsPorUsuario, usuariosHarmony)
      console.log("2 — rangos Harmony aplicados")

      for (let node of tree) if (node.parent) pay_residual(node.parent, 0, node)
      console.log("3")

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

      for (let node of tree) {
        node._pays = buildQualificationPayments(node)
      }
      console.log("4")

      const affiliations = await Affiliation.find({ closed: false })
      const activations = await Activation.find({ closed: false })

      return res.json(success({ tree, affiliations, activations }))
    }

    if (action == "save") {
      console.log("save ...")
      const { tree: saveTree, affiliations, activations } = req.body.data
      tree = saveTree

      const prevSnap = await User.find({})
      const prevById = new Map(prevSnap.map((u) => [u.id, u]))

      let users = []

      for (let node of tree) {
        if (node.rank != "none") {
          users.push({
            name: node.name,
            dni: node.dni,
            activated: node.activated,
            _activated: node._activated,
            ACTIVATED: node.ACTIVATED,
            active: node.active,
            points: node.points,
            affiliation_points: node.affiliation_points,
            plan: node.plan,
            parentId: node.parentId,
            total: node._total,
            total_org: node.total_points,
            levels: node.levels,
            rank: node.rank,
            residual_bonus: node.residual_bonus,
            residual_bonus_arr: node.residual_bonus_arr,
            pays_cierre_rango: node._pays || [],
            harmony_qualification: node._harmony_qualification,
          })
        }
      }
      console.log("1")

      await Closed.insert({
        id: rand(),
        date: new Date(),
        users,
        tree,
        affiliations,
        activations,
      })

      for (let node of tree) {
        const rnk = node.rank

        if (rnk != "none") {
          await Transaction.insert({
            date: new Date(),
            user_id: node.id,
            type: "in",
            value: node.residual_bonus,
            name: "residual",
          })

          const qualificationPays = Array.isArray(node._pays) && node._pays.length
            ? node._pays
            : buildQualificationPayments(node)

          for (const pay of qualificationPays) {
            const payRank = normalizeRankKey(pay.name)
            const value = Number(pay.value || 0)
            if (value <= 0) continue

            await Transaction.insert({
              date: new Date(),
              user_id: node.id,
              type: "in",
              value,
              name: "closed bonus",
            })

            if (pay.type !== "recalificacion") {
              const payIdx = node.pays.findIndex(
                (e) => normalizeRankKey(e.name) == payRank
              )
              if (payIdx != -1) node.pays[payIdx].payed = true
            }
          }
        }

        if (!isActiveForClosure(node)) node.n_inactives += 1
      }

      await User.updateMany(
        {},
        {
          activated: false,
          _activated: false,
          ACTIVATED: false,
          active: false,
          rank: "none",
          points: 0,
          affiliation_points: 0,
        }
      )

      for (let node of tree) {
        if (node.rank != "none") {
          const prev = prevById.get(node.id)
          await User.updateOne(
            { id: node.id },
            {
              rank: node.rank,
              rank_max_history: mergeRankMaxHistory(node.rank, prev),
              pays: node.pays,
              closeds: node.closeds,
              bonuses: node.bonuses,
              n_inactives: node.n_inactives,
            }
          )
        }
      }

      await Affiliation.updateMany({}, { closed: true })
      await Activation.updateMany({}, { closed: true })

      const virtualTransactions = await Transaction.find({ virtual: true })
      for (let transaction of virtualTransactions) {
        await Transaction.delete({ id: transaction.id })
      }
    }

    return res.json(success({}))
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
}
