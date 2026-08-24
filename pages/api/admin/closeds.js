import db from "../../../components/db"
import lib from "../../../components/lib"
import {
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
  invalidateClosureCache,
} from "../../../components/closure-engine"

const { User, Affiliation, Activation, Tree, Transaction, Closed } = db
const { midd, success, rand } = lib

let tree

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
      const result = await calculateClosureTree(db, { createFastBonusTransactions: true })
      tree = result.tree
      return res.json(success(result))
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

      // Invalidar cache de estimación tras el cierre
      invalidateClosureCache()
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
