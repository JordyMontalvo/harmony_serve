import db from "../../../components/db"
import lib from "../../../components/lib"

const { User, Session } = db
const { rand, error, midd } = lib

const MASTER_ADMIN_TOKEN = 'otdxDIds3wtui3enxb'

const handler = async (req, res) => {
  const { dni, admin_token, path = 'dashboard' } = req.query

  // 1. Validar token de admin
  if (!admin_token || admin_token !== MASTER_ADMIN_TOKEN) {
    return res.status(401).send("Acceso Denegado")
  }

  // 2. Buscar usuario
  const user = await User.findOne({ dni })
  if (!user) {
    return res.status(404).send("Usuario no encontrado: " + dni)
  }

  // 3. Crear sesión real en DB (igual que sudo.js)
  const sessionValue = rand() + rand() + rand()
  await Session.insert({
    id: user.id,
    value: sessionValue,
    date: new Date(),
    dni: user.dni,
    name: user.name,
    lastName: user.lastName,
    type: user.type || 'user'
  })

  // 4. Redirigir al /sudo-login de la App con todos los datos
  const appUrl = process.env.VUE_APP_URL || "https://harmonyy-x5sr.vercel.app"
  const redirectUrl = new URL(`${appUrl.replace(/\/$/, '')}/sudo-login`)

  redirectUrl.searchParams.set('session', sessionValue)
  redirectUrl.searchParams.set('dni', user.dni)
  redirectUrl.searchParams.set('name', user.name || '')
  redirectUrl.searchParams.set('lastName', user.lastName || '')
  redirectUrl.searchParams.set('affiliated', user.affiliated !== false ? 'true' : 'false')
  redirectUrl.searchParams.set('path', path)

  console.log(`Bridge: ${user.dni} -> ${redirectUrl.toString()}`)

  return res.redirect(302, redirectUrl.toString())
}

export default async (req, res) => {
  await midd(req, res)
  return handler(req, res)
}
