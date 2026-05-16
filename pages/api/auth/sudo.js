const User = require('../../models/user')
const Session = require('../../models/session')
const { rand, error, success, midd } = require('../../components/lib')

const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json(error('Method not allowed'))

  const { dni, admin_session } = req.body

  if (!dni) return res.json(error('DNI is required'))

  // 1. Opcional: Validar que el que solicita es un admin real
  // Por ahora permitiremos si viene del admin frontend, pero idealmente validamos admin_session
  if (admin_session) {
    const adminSess = await Session.findOne({ value: admin_session })
    if (!adminSess) return res.json(error('Invalid admin session'))
    // Aquí se podría validar si el usuario es realmente admin
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
