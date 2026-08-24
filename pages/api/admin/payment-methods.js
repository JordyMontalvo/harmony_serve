import db from "../../../components/db"
import lib from "../../../components/lib"

const { PaymentMethod } = db
const { success, midd } = lib

export default async (req, res) => {
  await midd(req, res)

  if(req.method == 'GET') {
    try {
      const paymentMethods = await PaymentMethod.find({})
      return res.json(success({ paymentMethods }))
    } catch (error) {
      console.error('Error al obtener métodos de pago:', error)
      return res.status(500).json({ error: true, message: 'Error interno del servidor' })
    }
  }

  if(req.method == 'POST') {
    const { paymentMethod } = req.body

    if(!paymentMethod) {
      return res.status(400).json({ error: true, message: 'Datos del método de pago requeridos' })
    }

    // Validar campos obligatorios
    if(!paymentMethod.cuenta || !paymentMethod.titular || !paymentMethod.banco || !paymentMethod.tipo) {
      return res.status(400).json({ 
        error: true, 
        message: 'Los campos cuenta, titular, banco y tipo son obligatorios' 
      })
    }

    try {
      // Verificar si ya existe un método con la misma cuenta
      const existingMethod = await PaymentMethod.findOne({ cuenta: paymentMethod.cuenta })
      if(existingMethod) {
        return res.status(400).json({ 
          error: true, 
          message: 'Ya existe un método de pago con esta cuenta' 
        })
      }

      const newPaymentMethod = {
        id: Date.now().toString(), // Generar ID único
        cuenta: paymentMethod.cuenta,
        titular: paymentMethod.titular,
        banco: paymentMethod.banco,
        tipo: paymentMethod.tipo,
        cci: paymentMethod.cci || "",
        requiresVoucher: paymentMethod.requiresVoucher !== undefined ? Boolean(paymentMethod.requiresVoucher) : true,
        active: paymentMethod.active !== undefined ? paymentMethod.active : true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await PaymentMethod.insert(newPaymentMethod)
      
      return res.json(success({ paymentMethod: newPaymentMethod }))
    } catch (error) {
      console.error('Error al crear método de pago:', error)
      return res.status(500).json({ error: true, message: 'Error interno del servidor' })
    }
  }

  if(req.method == 'PUT') {
    const { id, paymentMethod } = req.body

    if(!id) {
      return res.status(400).json({ error: true, message: 'ID del método de pago requerido' })
    }

    if(!paymentMethod) {
      return res.status(400).json({ error: true, message: 'Datos del método de pago requeridos' })
    }

    // Validar campos obligatorios
    if(!paymentMethod.cuenta || !paymentMethod.titular || !paymentMethod.banco || !paymentMethod.tipo) {
      return res.status(400).json({ 
        error: true, 
        message: 'Los campos cuenta, titular, banco y tipo son obligatorios' 
      })
    }

    try {
      // Verificar si el método existe
      const existingMethod = await PaymentMethod.findOne({ id })
      if(!existingMethod) {
        return res.status(404).json({ 
          error: true, 
          message: 'Método de pago no encontrado' 
        })
      }

      // Verificar si ya existe otro método con la misma cuenta (excluyendo el actual)
      const duplicateMethod = await PaymentMethod.findOne({ 
        cuenta: paymentMethod.cuenta,
        id: { $ne: id }
      })
      if(duplicateMethod) {
        return res.status(400).json({ 
          error: true, 
          message: 'Ya existe otro método de pago con esta cuenta' 
        })
      }

      // Excluir campos que no deben ser actualizados (_id, id)
      const { _id, id: paymentMethodId, ...paymentMethodData } = paymentMethod
      
      const updatedPaymentMethod = {
        ...paymentMethodData,
        updatedAt: new Date()
      }
      
      await PaymentMethod.update({ id }, updatedPaymentMethod)
      
      return res.json(success({ paymentMethod: { ...existingMethod, ...updatedPaymentMethod } }))
    } catch (error) {
      console.error('Error al actualizar método de pago:', error)
      return res.status(500).json({ error: true, message: 'Error interno del servidor' })
    }
  }

  if(req.method == 'PATCH') {
    const { id, action } = req.body

    if(!id) {
      return res.status(400).json({ error: true, message: 'ID del método de pago requerido' })
    }

    if(!action) {
      return res.status(400).json({ error: true, message: 'Acción requerida' })
    }

    try {
      // Verificar si el método existe
      const existingMethod = await PaymentMethod.findOne({ id })
      if(!existingMethod) {
        return res.status(404).json({ 
          error: true, 
          message: 'Método de pago no encontrado' 
        })
      }

      if(action === 'activate') {
        await PaymentMethod.update({ id }, { 
          active: true, 
          updatedAt: new Date() 
        })
        return res.json(success({ message: 'Método de pago activado exitosamente' }))
      }
      
      if(action === 'deactivate') {
        await PaymentMethod.update({ id }, { 
          active: false, 
          updatedAt: new Date() 
        })
        return res.json(success({ message: 'Método de pago desactivado exitosamente' }))
      }
      
      return res.status(400).json({ error: true, message: 'Acción no válida' })
    } catch (error) {
      console.error('Error al actualizar estado del método de pago:', error)
      return res.status(500).json({ error: true, message: 'Error interno del servidor' })
    }
  }

  if(req.method == 'DELETE') {
    const { id } = req.body

    if(!id) {
      return res.status(400).json({ error: true, message: 'ID del método de pago requerido' })
    }

    try {
      // Verificar si el método existe
      const existingMethod = await PaymentMethod.findOne({ id })
      if(!existingMethod) {
        return res.status(404).json({ 
          error: true, 
          message: 'Método de pago no encontrado' 
        })
      }

      // Eliminar el método de pago
      await PaymentMethod.deleteOne({ id })
      
      return res.json(success({ message: 'Método de pago eliminado exitosamente' }))
    } catch (error) {
      console.error('Error al eliminar método de pago:', error)
      return res.status(500).json({ error: true, message: 'Error interno del servidor' })
    }
  }
}
