import db from "../../../components/db"
import lib from "../../../components/lib"

const { Office, Product, Recharge } = db
const { success, midd } = lib

export default async (req, res) => {
  await midd(req, res)

  if(req.method == 'GET') {
    // Usuarios solo ven oficinas activas
    let offices = await Office.find({ active: { $ne: false } })
    let products = await Product.find({})
    let recharges = await Recharge.find({})

    // Procesar oficinas como en el endpoint de admin pero solo las activas
    for (let office of offices) {
      for (let product of products) {
        const p = office.products.find(e => e.id == product.id)

        if(!p)
          office.products.push({
            id: product.id,
            total: 0,
          })
      }
    }

    offices = offices.map(office => {
      office.products = office.products
        .map(p => {
          const product = products.find(e => e.id == p.id)
          
          // Si el producto no existe, retornar null para filtrarlo después
          if (!product) {
            return null
          }
          
          p.name = product.name
          return p
        })
        .filter(p => p !== null) // Filtrar productos que no existen

      office.recharges = recharges.filter(r => r.office_id == office.id)

      return office
    })

    console.log("🔍 [DEBUG] Oficinas para usuarios (checkout):", offices.map(o => ({ id: o.id, name: o.name, active: o.active })));

    // Filtrar oficinas null o undefined
    const filteredOffices = (offices || []).filter(o => o !== null && o !== undefined);

    return res.json(success({ offices: filteredOffices }))
  }

  // Los usuarios no pueden hacer POST/DELETE/PATCH a oficinas
  return res.status(403).json({ error: true, message: 'No autorizado' })
} 