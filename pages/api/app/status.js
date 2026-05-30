import db  from "../../../components/db"
import lib from "../../../components/lib"

const { User, Session, Affiliation, Plan } = db
const { error, success, midd, map } = lib

export default async (req, res) => {
  await midd(req, res)

  let { session } = req.query

  // valid session
  session = await Session.findOne({ value: session })
  if(!session) return res.json(error('invalid session'))

  // get USER
  const user = await User.findOne({ id: session.id || session.userId })
  if (!user) return res.json(error("User not found"))

  const allUsers = await User.find({})
  const users = map(allUsers)
  const childrenMap = lib.buildChildrenByParent(allUsers)

  const team = lib.countDownlineByParent(childrenMap, user.id)
  const activateds = lib.countDownlineActivatedByParent(childrenMap, users, user.id)

  const lastAffiliation = await lib.pickAffiliationForPlanResolution(
    Affiliation,
    user.id
  )

  const catalog = await Plan.find({}).catch(() => [])

  const userPlanRaw = lib.resolveUserPlanId(user, lastAffiliation, catalog)
  const userPlan = lib.finalizePlanWithGuesses(userPlanRaw, user, catalog)
  const planLabel = lib.resolvePlanLabelForUser(
    user,
    userPlan,
    catalog,
    lastAffiliation
  )

  // response
  return res.json(success({
    name:            user.name,
    lastName:        user.lastName,
    affiliated:      user.affiliated,
    activated:       user.activated,
    date:            user.date,
    affiliationDate: user.affiliationDate,
    plan:            userPlan,
    planLabel,
    country:         user.country,
    photo:           user.photo,


    rank:            user.rank,
    team,
    activateds,
    unactivateds:    team - activateds,
  }))
}
