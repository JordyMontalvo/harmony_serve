import db  from "../../../components/db"
import lib from "../../../components/lib"

const { User  } = db
const { error, success, midd, safe } = lib


const Check = async (req, res) => {

  // debe ser un primitivo: con { "$ne": null } se tomaria un usuario
  // cualquiera y se le borrarian dni, telefono y direccion
  const check = safe(req.body.check)
  if(check === null) return res.json(error('invalid check string'))

  // valid check string
  const user = await User.findOne({ check })
  if(!user) return res.json(error('invalid check string'))

  // valid verified user
  if(user.verified) return res.json(success())

  // update user
  await User.update({ id: user.id }, {
    verified:   true,
    affiliated: false,
    activated:  false,
    phone:   null,
    dni:     null,
    address: null,
  })

  // response
  return res.json(success())
}

export default async (req, res) => { await midd(req, res); return Check(req, res) }
