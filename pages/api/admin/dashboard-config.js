import db from "../../../components/db"
import lib from "../../../components/lib"

const { DashboardConfig, User } = db
const { error, success, midd, safe } = lib

export default async (req, res) => {
  await midd(req, res)

  if(req.method == 'GET') {
    const { userId } = req.query
    
    // Si se especifica un userId, obtener configuración específica del usuario
    if (userId) {
      let config = await DashboardConfig.findOne({ id: 'travel_bonus', userId })
      
      // Si no existe configuración del usuario, buscar la global
      if (!config) {
        config = await DashboardConfig.findOne({ 
          id: 'travel_bonus', 
          userId: { $exists: false }
        })
      }
      
      // Si no existe ninguna, crear una global por defecto
      if (!config) {
        config = {
          id: 'travel_bonus',
          text: 'Tu progreso hacia el Bono Viaje se actualizará próximamente. ¡Sigue trabajando para alcanzar tus objetivos!'
        }
        await DashboardConfig.insert(config)
      }
      
      // Obtener información del usuario
      const user = await User.findOne({ id: userId })
      
      return res.json(success({ config, user }))
    } else {
      // Obtener configuración global del dashboard
      let config = await DashboardConfig.findOne({ 
        id: 'travel_bonus', 
        userId: { $exists: false }
      })
      
      // Si no existe, crear uno por defecto
      if (!config) {
        config = {
          id: 'travel_bonus',
          text: 'Tu progreso hacia el Bono Viaje se actualizará próximamente. ¡Sigue trabajando para alcanzar tus objetivos!'
        }
        await DashboardConfig.insert(config)
      }

      // response
      return res.json(success({ config }))
    }
  }

  if(req.method == 'POST') {
    const { text, userId } = req.body

    if (!text || typeof text !== 'string') {
      return res.json(error('El texto es requerido'))
    }

    // Si se especifica un userId, crear/actualizar configuración específica del usuario
    if (userId) {
      // el userId debe ser un primitivo: con { "$ne": null } se alteraria
      // la configuración de un usuario cualquiera
      if (safe(userId) === null) return res.json(error('Usuario no encontrado'))

      // Verificar que el usuario exista
      const user = await User.findOne({ id: userId })
      if (!user) {
        return res.json(error('Usuario no encontrado'))
      }
      
      // Verificar si existe la configuración del usuario
      const existingConfig = await DashboardConfig.findOne({ id: 'travel_bonus', userId })
      
      if (existingConfig) {
        // Actualizar configuración del usuario
        await DashboardConfig.update({ id: 'travel_bonus', userId }, { text })
      } else {
        // Crear nueva configuración para el usuario
        await DashboardConfig.insert({
          id: 'travel_bonus',
          userId,
          text
        })
      }
      
      return res.json(success({ message: `Configuración actualizada correctamente para el usuario ${user.name} ${user.lastName}` }))
    } else {
      // Actualizar configuración global
      const existingConfig = await DashboardConfig.findOne({ 
        id: 'travel_bonus', 
        userId: { $exists: false }
      })
      
      if (existingConfig) {
        // Actualizar - usar el _id del documento encontrado para asegurar que se actualice el correcto
        await DashboardConfig.update({ _id: existingConfig._id }, { text })
      } else {
        // Crear nueva configuración global (sin campo userId)
        await DashboardConfig.insert({
          id: 'travel_bonus',
          text
        })
      }
      
      return res.json(success({ message: 'Configuración global actualizada correctamente' }))
    }
  }
}

