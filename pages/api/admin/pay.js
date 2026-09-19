import db  from "../../../components/db"
import lib from "../../../components/lib"

const { Transaction, User } = db
const { error, success, midd, rand, safe } = lib


export default async (req, res) => {
  await midd(req, res)

  if(req.method == 'GET') {
    const users = await User.find({})

    let pays = await Transaction.find({ name: 'pay' })

    for (let p of pays) {
      const user = users.find(e => e.id == p.user_id)
      p.user = user
    }

    return res.json(success({
      pays,
    }))
  }

  if(req.method == 'POST') {

    const { amount, desc } = req.body

    // el dni debe ser un primitivo: con { "$ne": null } se acreditaria
    // saldo a un usuario cualquiera sin conocer su documento
    const dni = safe(req.body.dni)
    if(dni === null) return res.json(error('dni not found'))

    const user = await User.findOne({ dni })

    if(!user) return res.json(error('dni not found'))

    // el importe debe ser un numero positivo
    const value = Math.round(parseFloat(amount) * 100) / 100
    if(!Number.isFinite(value) || value <= 0) return res.json(error('invalid amount'))

    await Transaction.insert({
      id:      rand(),
      date:    new Date(),
      user_id: user.id,
      type:   'in',
      value,
      desc,
      virtual: false,
      name: 'pay',
    })

    return res.json(success())
  }
}
