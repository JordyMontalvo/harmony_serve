import db from "../../../components/db"
import lib from "../../../components/lib"

const { Office, Product, Recharge } = db
const { success, midd } = lib


export default async (req, res) => {
  await midd(req, res)

  let offices   = await Office.find({}) // Admin ve todas las oficinas
  let products  = await Product.find({})
  let recharges = await Recharge.find({})

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

  if(req.method == 'GET') {

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

    // Filtrar oficinas null o undefined
    const filteredOffices = (offices || []).filter(o => o !== null && o !== undefined);

    return res.json(success({ offices: filteredOffices }))
  }

  if(req.method == 'POST') {

    const { id, products, office } = req.body
    // console.log({ products })

    if(products) {
      // const office = await Office.findOne({ id })
      const office = offices.find(e => e.id == id)
      // console.log(office)

      products.forEach((p, i) => {
        // console.log({ i , p })
        office.products[i].total += products[i].total
      })

      // console.log(office)

      await Office.update(
        { id },
        { products: office.products }
      )

      await Recharge.insert({
        date:    new Date(),
        office_id: id,
        products
      })

    }

    if(office) {
      console.log(' update office ', office)
      
      if(id) {
        // Actualizar oficina existente
        await Office.update(
          { id },
          {
            phone:    office.phone,
            name:     office.name,
            address:  office.address,
            googleMapsUrl: office.googleMapsUrl,
            accounts: office.accounts,
            cci:      office.cci,
            horario:  office.horario,
            dias:     office.dias,
          }
        )
      } else {
        // Crear nueva oficina
        const newOffice = {
          id: Date.now().toString(), // Generar ID único
          phone: office.phone,
          name: office.name,
          address: office.address,
          googleMapsUrl: office.googleMapsUrl || "",
          accounts: office.accounts || "",
          cci: office.cci || "",
          horario: office.horario || "",
          dias: office.dias || "",
          active: true, // Nueva oficina activa por defecto
          products: [], // Inicializar array de productos vacío
          recharges: [] // Inicializar array de recargas vacío
        }
        
        await Office.insert(newOffice)
        
        // Retornar la nueva oficina creada
        return res.json(success({ office: newOffice }))
      }
    }

    // Solo retornar success() si no se creó una nueva oficina
    return res.json(success())
  }

  if(req.method == 'DELETE') {
    const { id } = req.body

    if(!id) {
      return res.status(400).json({ error: true, message: 'ID de oficina requerido' })
    }

    try {
      // Desactivar la oficina en lugar de eliminarla (soft delete)
      await Office.update({ id }, { active: false })
      
      return res.json(success({ message: 'Oficina desactivada exitosamente' }))
    } catch (error) {
      console.error('Error al desactivar oficina:', error)
      return res.status(500).json({ error: true, message: 'Error interno del servidor' })
    }
  }

  if(req.method == 'PATCH') {
    const { id, action } = req.body

    if(!id) {
      return res.status(400).json({ error: true, message: 'ID de oficina requerido' })
    }

    try {
      if(action === 'reactivate') {
        // Reactivar oficina desactivada
        await Office.update({ id }, { active: true })
        return res.json(success({ message: 'Oficina reactivada exitosamente' }))
      }
      
      return res.status(400).json({ error: true, message: 'Acción no válida' })
    } catch (error) {
      console.error('Error al reactivar oficina:', error)
      return res.status(500).json({ error: true, message: 'Error interno del servidor' })
    }
  }
}
