import db  from "../../../components/db"
import lib from "../../../components/lib"

const { Session } = db
const { midd, safe } = lib


const Logout = async (req, res) => {

  // debe ser un primitivo: con { "$ne": null } se cerraria la sesion
  // de otro usuario, no la propia
  const session = safe(req.body.session)

  if(session !== null) await Session.delete(session)

  return res.end()
}

export default async (req, res) => { await midd(req, res); return Logout(req, res) }
