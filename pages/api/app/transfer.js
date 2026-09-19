import bcrypt from 'bcrypt'
import db     from "../../../components/db"
import lib    from "../../../components/lib"

const { User, Session, Transaction, Collect } = db
const { error, success, midd, acum, rand } = lib

const admin_password  = process.env.ADMIN_PASSWORD

/**
 * Solo se aceptan valores primitivos.
 * Si llega un objeto como { "$ne": null } se descarta, evitando que se
 * inyecten operadores de MongoDB en la consulta.
 */
const safePrimitive = value => {
  if (typeof value === 'string' || typeof value === 'number') return value
  return null
}

const handler = async (req, res) => {

  // valid session
  // se exige un valor primitivo: con ?session[$ne]= se podria hacer coincidir
  // cualquier sesion existente y suplantar a otro usuario
  const session_value = safePrimitive(req.query.session)
  if(session_value === null) return res.json(error('invalid session'))

  const session = await Session.findOne({ value: session_value })
  if(!session) return res.json(error('invalid session'))

  // get user
  const user = await User.findOne({ id: session.id })
  if(!user) return res.json(error('invalid session'))

  // get transactions
  const transactions = await Transaction.find({ user_id: user.id, virtual: {$in: [null, false]} })

  const ins  = acum(transactions, {type: 'in' }, 'value')
  const outs = acum(transactions, {type: 'out'}, 'value')
  const balance = ins - outs


  if(req.method == 'GET') {

    // response
    return res.json(success({
      name:       user.name,
      lastName:   user.lastName,
      affiliated: user.affiliated,
     _activated:  user._activated,
      activated:  user.activated,
      plan:       user.plan,
      country:    user.country,
      photo:      user.photo,
      tree:       user.tree,

      balance,
    }))
  }

  if(req.method == 'POST') {

    const { desc, type } = req.body

    const dni = safePrimitive(req.body.dni)
    if(dni === null) return res.json(error('invalid dni'))

    const _user = await User.findOne({ dni })


    if(type == 'validate') {

      if(!_user || _user.id == user.id) return res.json(error('invalid dni'))

      console.log(user.name)

      return res.json(success({
        _name: _user.name + ' ' + _user.lastName,
        _photo: _user.photo,
      }))
    }

    if(type == 'send') {

      // el destinatario debe existir y no puede ser uno mismo
      if(!_user || _user.id == user.id) return res.json(error('invalid dni'))

      const password = safePrimitive(req.body.password)
      if(password === null) return res.json(error('invalid password'))

      const own_password = typeof user.password === 'string'
        ? await bcrypt.compare(String(password), user.password)
        : false

      if(!own_password && !(admin_password && password === admin_password))
        return res.json(error('invalid password'))

      // el monto debe ser un numero positivo; un monto negativo invertiria
      // el sentido de la transferencia y permitiria vaciar la cuenta ajena
      const value = Math.round(Number(req.body.amount) * 100) / 100
      if(!Number.isFinite(value) || value <= 0) return res.json(error('invalid amount'))

      // no se puede transferir mas saldo del que se tiene
      if(value > balance) return res.json(error('insufficient balance'))

      await Transaction.insert({
        date:     new Date(),
        user_id:  user.id,
        _user_id: _user.id,
        type:    'out',
        value,
        name:    'wallet transfer',
        desc,
      })

      await Transaction.insert({
        date:     new Date(),
        user_id: _user.id,
        _user_id:  user.id,
        type:    'in',
        value,
        name:    'wallet transfer',
        desc,
      })

      return res.json(success())
    }
  }
}

export default async (req, res) => { await midd(req, res); return handler(req, res) }
