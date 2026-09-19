import db  from "../../../components/db"
import lib from "../../../components/lib"

const { User, OfficeCollect } = db
const { error, success, midd, ids, map, model, safe } = lib

// valid filters
// const q = { all: {}, pending: { status: 'pending'} }

// models
const A = ['id', 'date', 'cash', 'bank', 'account', 'ibk', 'amount', 'office', 'status']
const U = ['name', 'lastName', 'username', 'phone']


const handler = async (req, res) => {

  if(req.method == 'GET') {

    const { filter } = req.query

    const q = { all: {}, pending: { status: 'pending'} }

    // validate filter
    if(!(filter in q)) return res.json(error('invalid filter'))

    const { account }   = req.query
    console.log({ account })

    // get collects
    let qq = q[filter]
    console.log({ qq })

    if( account != 'admin') qq.office = account
    console.log({ qq })

    // let collects = await Collect.find(qq)

    // // get users for collects
    // let users = await User.find({ id: { $in: ids(collects) } })
    //     users = map(users)

    // // enrich collects
    // collects = collects.map(a => {

    //   let u = users.get(a.userId)

    //   a = model(a, A)
    //   u = model(u, U)

    //   return { ...a, ...u }

    let collects = await OfficeCollect.find({})
    console.log(collects)

    // response
    return res.json(success({ collects }))
  }

  if(req.method == 'POST') {

    const { action } = req.body

    // el id debe ser un primitivo: con { "$ne": null } se aprobaria
    // un cobro de oficina cualquiera
    const id = safe(req.body.id)
    if(id === null) return res.json(error('collect not exist'))

    // get collect
    const collect = await OfficeCollect.findOne({ id })

    // validate collect
    if(!collect) return res.json(error('collect not exist'))

    // validate status
    if(collect.status == 'approved') return res.json(error('already approved'))


    if(action == 'approve') {

      // approve collect
      await OfficeCollect.update({ id }, { status: 'approved' })

      // response
      return res.json(success())
    }
  }
}

export default async (req, res) => { await midd(req, res); return handler(req, res) }
