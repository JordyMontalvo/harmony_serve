import db from "../../../components/db"
import lib from "../../../components/lib"

const { Office, Product, OfficeCollect } = db
const { success, midd, rand, error } = lib
const { safe } = lib


export default async (req, res) => {

  // secure middleware
  await midd(req, res)


  if(req.method == 'GET') {

    const { id } = req.query
    console.log({ id })

    // get products
    let office = await Office.findOne({ id })
    const products = await Product.find({})


    office.products = office.products.map(p => {
      const product = products.find(e => e.id == p.id)
      p.name = product.name

      return p
    })

    // response
    return res.json(success({ office }))

  }

  if(req.method == 'POST') {

    const { amount } = req.body

    // el id debe ser un primitivo: con { "$ne": null } se descontaria
    // el beneficio de una oficina cualquiera
    const id = safe(req.body.id)
    if(id === null) return res.json(error('invalid id'))

    console.log('post ...', id, amount)

    let office = await Office.findOne({ id })
    if(!office) return res.json(error('office not exist'))

    const _id = rand()

    // save new collect
    await OfficeCollect.insert({
      id: _id,
      date: new Date(),
      office,
      amount,
      status: 'pending',
    })

    const profit = office.profit - amount

    await Office.update({ id }, { profit })

    return res.json(success())
  }
}
