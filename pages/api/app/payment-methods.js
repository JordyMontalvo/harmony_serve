import db from "../../../components/db"
import lib from "../../../components/lib"

const { PaymentMethod, Session } = db
const { success, error, midd } = lib

export default async (req, res) => {
  await midd(req, res)

  let { session } = req.query

  // valid session
  session = await Session.findOne({ value: session })
  if(!session) return res.json(error('invalid session'))

  if(req.method == 'GET') {
    try {
      // Obtener solo métodos de pago activos
      const paymentMethods = await PaymentMethod.find({ active: true })
      
      // Formatear los datos para que sean compatibles con el frontend
      const formattedMethods = paymentMethods.map(method => ({
        id: method.id,
        name: method.banco,
        account: method.cuenta,
        holder: method.titular,
        type: method.tipo,
        cci: method.cci || "",
        requiresVoucher: method.requiresVoucher !== undefined ? Boolean(method.requiresVoucher) : true,
        active: method.active
      }))
      
      return res.json(success({ paymentMethods: formattedMethods }))
    } catch (error) {
      console.error('Error al obtener métodos de pago:', error)
      return res.status(500).json({ error: true, message: 'Error interno del servidor' })
    }
  }

  return res.status(405).json({ error: true, message: 'Método no permitido' })
}
