import path from "path"
import db from "../../../components/db"
import lib from "../../../components/lib"

function loadHarmonyRank() {
  const byCwd = path.join(
    process.cwd(),
    "components",
    "rank-calculation-harmony.js"
  )
  try {
    return require(byCwd)
  } catch (e) {
    return require("../../../components/rank-calculation-harmony.js")
  }
}

const harmonyRank = loadHarmonyRank()

const { calcularPP, calcularRangosTodos, contarActivosDirectos } = harmonyRank

const { User, Affiliation, Activation } = db
const { midd, success, rand } = lib

const { Tree, Transaction, Closed } = db

let tree

const Pay = {
  MILLONARIO:          0,
  ORO:                 0,
  ESMERALDA:           0,
  PLATINO:             0,
  DIAMANTE:            0,
  DIAMANTE_AZUL:       0,
  DIAMANTE_EJECUTIVO:  0,
  DOBLE_DIAMANTE:      0,
  DIAMANTE_CORONA:     0,
  TOP_HARMONY:         0,
}

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
  if (s === "NONE" || s === "NO_RANK" || s === "SINRANGO") return "SIN_RANGO"
  return s
}

const RANK_MAX_LEVELS = {
  SIN_RANGO: 5,
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
  active: 0,
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

const bonuses = {
  gold: [],
  sapphire: [],
  ruby: [],
  diamond: [],
}

function total_points(id) {
  const node = tree.find((e) => e.id == id)
  if (!node) return
  node.total_points = node.points + node.affiliation_points
  node.childs.forEach((_id) => {
    node.total_points += total_points(_id)
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
  return tree.map((node) => ({
    id: node.id,
    name: node.name,
    puntos_productos: Number(node.points || 0),
    puntos_afiliacion: Number(node.affiliation_points || 0),
    total_points: puntajeGrupalSinPropio(node),
    directos: node.childs || [],
  }))
}

function depthForClosureRank(rankKey) {
  if (rankKey === "none") return 0
  if (rankKey === "active") return RANK_MAX_LEVELS.MILLONARIO
  const k = normalizeRankKey(rankKey)
  return RANK_MAX_LEVELS[k] ?? RANK_MAX_LEVELS.SIN_RANGO
}

function applyHarmonyRanks(rankIdsPorUsuario, usuariosHarmonyList) {
  const activosList = usuariosHarmonyList.map((t) => ({
    id: t.id,
    puntos_productos: t.puntos_productos,
    puntos_afiliacion: t.puntos_afiliacion,
  }))

  for (const node of tree) {
    const uh = usuariosHarmonyList.find((e) => e.id === node.id)
    const pp = uh ? calcularPP(uh) : 0
    const rid = rankIdsPorUsuario[node.id] || 0

    let rankKey = "none"
    if (pp < 180) rankKey = "none"
    else if (!rid) rankKey = "active"
    else rankKey = RANGO_ID_TO_KEY[rid] || "active"

    node.rank = rankKey
    node.levels = depthForClosureRank(rankKey)

    node._harmony_qualification = {
      pp,
      pg_grupal_sin_propio: puntajeGrupalSinPropio(node),
      activos_directos: contarActivosDirectos(
        { id: node.id, directos: node.childs || [] },
        activosList
      ),
      rango_calculado_id: rid || 0,
      rango_guardado_cierre: node.rank,
    }
  }
}

function maxRankPreferStored(a, b) {
  const pa = pos[a] !== undefined ? pos[a] : -999
  const pb = pos[b] !== undefined ? pos[b] : -999
  return pa >= pb ? a : b
}

function mergeRankMaxHistory(cierreRank, prevUserDoc) {
  const prevStored = prevUserDoc?.rank_max_history || prevUserDoc?.rank || "none"
  if (!cierreRank || cierreRank === "none") return prevStored
  return maxRankPreferStored(cierreRank, prevStored)
}

function pay_residual(id, n, user) {
  if (n >= 30) return

  let node = tree.find((e) => e.id == id)
  if (!node) return
  let _id = node.parent

  if (node._activated || node.activated) {
    const rr = node.activated ? 1 : 0.5
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
  } else if (_id) pay_residual(_id, n, user)
}

export default async (req, res) => {
  await midd(req, res)

  if (req.method == "GET") {
    try {
      const closeds = await Closed.find({})
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
        node.activated = user.activated
        node._activated = user._activated ? user._activated : false
        node.points = Number(user.points)
        node.affiliation_points = user.affiliation_points ? user.affiliation_points : 0
        node.pays = user.pays ? user.pays : pays
        node.bonuses = user.bonuses ? user.bonuses : bonuses
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
          node.total.push(_node.total_points)
          node._total.push(_node.total_points)
        })
        node.total.sort((a, b) => b - a)
      })

      const usuariosHarmony = buildHarmonyUsuarioListFromTree()
      const rankIdsPorUsuario = calcularRangosTodos(usuariosHarmony, users)
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
        const { rank } = node
        if (rank != "none") {
          const payIdx = node.pays.findIndex((e) => e.name == rank)
          if (payIdx != -1) {
            for (let i = 0; i <= payIdx; i++) {
              const pay = node.pays[i]
              if (!pay.payed) {
                const value = Pay[pay.name]
                pay.value = value
                node._pays.push(pay)
              }
            }
          }
        }
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
            activated: node.activated,
            _activated: node._activated,
            points: node.points,
            total: node._total,
            rank: node.rank,
            residual_bonus: node.residual_bonus,
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

          const payIdx = node.pays.findIndex((e) => e.name == rnk)
          if (payIdx != -1) {
            for (let i = 0; i <= payIdx; i++) {
              const pay = node.pays[i]
              if (!pay.payed) {
                await Transaction.insert({
                  date: new Date(),
                  user_id: node.id,
                  type: "in",
                  value: Pay[pay.name],
                  name: "closed bonus",
                })
                pay.payed = true
              }
            }
          }
        }

        if (!node.activated) node.n_inactives + 1
      }

      await User.updateMany(
        {},
        {
          activated: false,
          _activated: false,
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
