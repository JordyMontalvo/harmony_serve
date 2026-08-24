import db from "../../../components/db"
import lib from "../../../components/lib"

const { User } = db
const { error, success, midd } = lib

export default async (req, res) => {
  await midd(req, res)

  if (req.method !== 'GET') {
    return res.status(405).json(error('Method not allowed'))
  }

  const query = String(req.query.query || req.query.code || req.query.dni || "").trim()

  if (!query) {
    return res.json(error('Query parameter required'))
  }

  const queryUpper = query.toUpperCase()

  // Buscar por DNI o por Token (código)
  const user = await User.findOne({
    $or: [
      { dni: query },
      { token: queryUpper },
      { token: query }
    ]
  })

  if (!user) {
    return res.json(success({ found: false }))
  }

  return res.json(success({
    found: true,
    id: user.id,
    dni: user.dni,
    name: user.name,
    lastName: user.lastName,
    token: user.token
  }))
}
