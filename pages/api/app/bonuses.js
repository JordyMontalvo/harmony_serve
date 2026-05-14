import db  from "../../../components/db"
import lib from "../../../components/lib"

const { User, Session, Transaction } = db
const { error, success, midd, acum } = lib


const handler = async (req, res) => {

  let { session } = req.query

  // valid session
  session = await Session.findOne({ value: session })
  if(!session) return res.json(error('invalid session'))

  // get USER
  const user = await User.findOne({ id: session.id })

  const bonuses = {
    platino: [],
    diamante: [],
    diamante_azul: [],
    diamante_ejecutivo: [],
  }

  // response
  return res.json(success({
    pays:    user.pays,
    bonuses: user.bonuses || bonuses,
  }))
}

export default async (req, res) => { await midd(req, res); return handler(req, res) }
