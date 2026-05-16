import db from "../../../components/db"
import lib from "../../../components/lib"

const { User, Session } = db
const { rand, error, success, midd } = lib

const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json(error('Method not allowed'))

  const { dni, admin_session } = req.body

  if (!dni) return res.json(error('DNI is required'))

  // 1. Validar estrictamente que el que solicita es un admin real
  const MASTER_ADMIN_TOKEN = 'otdxDIds3wtui3enxb';

  if (!admin_session) {
    return res.json(error('Acceso denegado: Se requiere sesión de administrador'))
  }

  // Si es el token maestro del admin frontend, permitimos
  if (admin_session === MASTER_ADMIN_TOKEN) {
    console.log("Sudo: Acceso concedido mediante Master Token");
  } else {
    const adminSess = await Session.findOne({ value: admin_session })
    if (!adminSess) {
      return res.json(error('Sesión de administrador inválida o expirada'))
    }

    // Verificar si el usuario de la sesión es admin (validando en la colección User)
    const requester = await User.findOne({ id: adminSess.id })
    if (!requester || requester.type !== 'admin') {
      return res.json(error('Acceso denegado: No tienes permisos de administrador'))
    }
  }

  // 2. Buscar al usuario objetivo
  const user = await User.findOne({ dni })
  if (!user) return res.json(error('User not found'))

  // 3. Crear una sesión para ese usuario
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

  return res.json(success({
    session: sessionValue,
    user: {
      id: user.id,
      dni: user.dni,
      name: user.name,
      lastName: user.lastName,
      affiliated: user.affiliated
    }
  }))
}

export default async (req, res) => {
  await midd(req, res)
  return handler(req, res)
}
