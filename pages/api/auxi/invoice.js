import db  from "../../../components/db"
import lib from "../../../components/lib"

const { Activation, Affiliation, User, Office, Product } = db
const { error, success, midd, safe } = lib


const Invoice = async (req, res) => {

  // debe ser un primitivo: con { "$ne": null } se devolverian los datos
  // personales de una compra cualquiera
  const id = safe(JSON.parse(req.body).id)
  if(id === null) return res.json(error('invalid id'))

  // get activation
  const activation  = await Activation.findOne({ id })
  const affiliation = await Affiliation.findOne({ id })
  // console.log(activation)

  // get products
  let products = activation ? activation.products : affiliation.plan.products
  // console.log(products)

  // products = products.filter(product => product.total > 0)
  // console.log(products)

  if(!activation) {
    console.log(products)

    const _products = await Product.find({})

    products.forEach(group => {
      group.list.forEach(product => {

        const p = _products.find(p => p.id == product.id)

        product.name  = p.name
        product.price = p.price
        console.log(product.name)
      })
    })

    products = products[0].list
  }

  products = products.filter(product => product.total > 0)


  const userId = activation ? activation.userId : affiliation.userId
  const user = await User.findOne({ id: userId })
  // console.log({ user })


  const office = activation ? await Office.findOne({ id: activation.office }) : await Office.findOne({ id: affiliation.office })


  // response
  return res.json(success({
    products,
    user,
    office,
  }))
}

export default async (req, res) => { await midd(req, res); return Invoice(req, res) }
