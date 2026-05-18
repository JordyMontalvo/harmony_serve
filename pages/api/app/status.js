import db  from "../../../components/db"
import lib from "../../../components/lib"

const { User, Session, Tree, Affiliation } = db
const { error, success, midd, map } = lib


let tree
let users
let activateds

function count(id) {

  if(!tree[id]) return 0

  if(users.get(id).activated) activateds++

  const a = tree[id].childs

  let ret = 0

  a.forEach(id => { if(id != null) ret += (count(id) + 1) })

  return ret
}


export default async (req, res) => {
  await midd(req, res)

  let { session } = req.query

  // valid session
  session = await Session.findOne({ value: session })
  if(!session) return res.json(error('invalid session'))

  // get USER
  const user = await User.findOne({ id: session.id || session.userId })

  // get team
  tree = await Tree.find({})
  activateds = 0

  const ids = tree.map(e => e.id)

  users = await User.find({ id: { $in: ids } })
  users = map(users)

  tree = tree.reduce((a, b) => { a[`${b.id}`] = b; return a }, {})

  const team = count(user.id)

  if(user.activated) activateds--

  // Buscar última afiliación (aprobada o pendiente) como fallback robusto para el plan
  const lastAffiliation = await Affiliation.findOneLast({
    userId: user.id,
    status: { $in: ["approved", "pending"] }
  }).catch(() => null)

  const userPlan = (user.plan && user.plan !== "default")
    ? user.plan
    : (lastAffiliation && lastAffiliation.plan ? lastAffiliation.plan.id : "default")

  // response
  return res.json(success({
    name:            user.name,
    lastName:        user.lastName,
    affiliated:      user.affiliated,
    activated:       user.activated,
    date:            user.date,
    affiliationDate: user.affiliationDate,
    plan:            userPlan,
    country:         user.country,
    photo:           user.photo,


    rank:            user.rank,
    team,
    activateds,
    unactivateds:    team - activateds,
  }))
}
