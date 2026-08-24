import db  from "../../../components/db"
import lib from "../../../components/lib"
import { getEstimatedResidualForUser } from "../../../components/closure-engine"

const { User, Session, Transaction, Tree, Banner, Plan, DashboardConfig, Affiliation } = db
const { error, success, acum, midd, model } = lib

const D = ['id', 'name', 'lastName', 'affiliated', 'activated', 'tree', 'email', 'phone', 'address', 'rank', 'points', 'parentId', 'total_points']

function normalizeRankKey(rank) {
  const key = String(rank || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (!key || key === "NONE" || key === "NO_RANK" || key === "SINRANGO" || key === "ACTIVE") {
    return "SIN_RANGO"
  }

  return key
}

export default async (req, res) => {
  await midd(req, res)

  let { session } = req.query

  
  
  
  // valid session
  session = await Session.findOne({ value: session })
  if(!session)  return res.json(error('invalid session'))

  const sessionUserId = session.id || session.userId
  
  // GET plans (antes para inferencia fallback)
  const plans = await Plan.find({}); // Traer todos los planes
  
  // get USER
  const user = await User.findOne({ id: sessionUserId })
  if (!user) return res.json(error("User not found"))

  const lastAffiliation = await lib.pickAffiliationForPlanResolution(
    Affiliation,
    sessionUserId
  )

  let userPlan = lib.resolveUserPlanId(user, lastAffiliation, plans)
  userPlan = lib.finalizePlanWithGuesses(userPlan, user, plans)
  const planLabel = lib.resolvePlanLabelForUser(
    user,
    userPlan,
    plans,
    lastAffiliation
  )
  const membershipName = lib.membershipNameForUser(
    user,
    userPlan,
    plans,
    lastAffiliation
  )


  let directs = await User.find({ parentId: user.id })

  directs = directs.map(direct => {
    const d = model(direct, D)
    return { ...d }
  })

  const node = await Tree.findOne({ id: user.id })

  const allUsers = await User.find({})
  const childrenMap = lib.buildChildrenByParent(allUsers)
  const n_affiliates = lib.countDownlineByParent(childrenMap, user.id)

  const childs = node && Array.isArray(node.childs) ? node.childs : []

  let frontals = childs.length
    ? await User.find({ id: { $in: childs } })
    : []
  const transactions        = await Transaction.find({ user_id: user.id, virtual: {$in: [null, false]} })
  const virtualTransactions = await Transaction.find({ user_id: user.id, virtual:              true    })

  const ins         = acum(transactions,        {type: 'in' }, 'value')
  const outs        = acum(transactions,        {type: 'out'}, 'value')
  const insVirtual  = acum(virtualTransactions, {type: 'in' }, 'value')
  const outsVirtual = acum(virtualTransactions, {type: 'out'}, 'value')


  const banner = await Banner.findOne({})

  // GET dashboard config (Bono Viaje text) - Primero buscar configuración específica del usuario
  let dashboardConfig = await DashboardConfig.findOne({ id: 'travel_bonus', userId: user.id })
  
  // Si no existe configuración específica del usuario, buscar la configuración global
  // (configuraciones que no tienen el campo userId)
  if (!dashboardConfig) {
    dashboardConfig = await DashboardConfig.findOne({ 
      id: 'travel_bonus', 
      userId: { $exists: false }
    })
  }
  
  // Si no existe ninguna configuración, crear una global por defecto
  if (!dashboardConfig) {
    dashboardConfig = {
      id: 'travel_bonus',
      text: 'Tu progreso hacia el Bono Viaje se actualizará próximamente. ¡Sigue trabajando para alcanzar tus objetivos!'
    }
    await DashboardConfig.insert(dashboardConfig)
  }

  const estimatedResidualData = await getEstimatedResidualForUser(db, user.id)

  // response
  return res.json(success({
    name:       user.name,
    lastName:   user.lastName,
    affiliated: user.affiliated,
    _activated: user._activated,
    activated:  user.activated,
    plan:       userPlan,
    planLabel,
    membershipName,
    userPlanRaw: user.plan,
    country:    user.country,
    photo:      user.photo, 
    tree:       user.tree,
    email:      user.email,
    token:      user.token,
    address:   user.address,
    directs,
    frontals,
    n_affiliates,
    team: n_affiliates,

    banner,
    ins,
    insVirtual,
    outs,
    balance: (ins - outs),
   _balance: (insVirtual - outsVirtual),
    rank:    normalizeRankKey(user.rank),
    maxRank: normalizeRankKey(user.rank_max_history || user.rank),
    points:  user.points,
    affiliation_points: user.affiliation_points || 0,
    plans,
    total_points: user.total_points, // <-- Agregar todos los planes a la respuesta
    travelBonusText: dashboardConfig.text || 'Tu progreso hacia el Bono Viaje se actualizará próximamente. ¡Sigue trabajando para alcanzar tus objetivos!',
    estimatedResidual: estimatedResidualData.estimatedResidual || 0,
    estimatedResidualDetails: estimatedResidualData,
  }))
}
