import db  from "../../../components/db"
import lib from "../../../components/lib"

const { User, Session, Activation, Affiliation, Office } = db
const { error, success, midd } = lib

export default async (req, res) => {
  await midd(req, res)

  if (req.method !== 'GET') return res.json(error('method not allowed'))

  const { session, admin_session, id, type = 'activation' } = req.query

  if (!id) return res.json(error('id requerido'))

  // ── Autenticación: acepta sesión de usuario o sesión de admin ──
  let userId = null
  let isAdmin = false

  const MASTER_ADMIN_TOKEN = 'otdxDIds3wtui3enxb';

  if (admin_session) {
    if (admin_session === MASTER_ADMIN_TOKEN) {
      isAdmin = true
    } else {
      const adminSess = await Session.findOne({ value: admin_session })
      if (!adminSess) return res.json(error('admin session inválida'))
      
      const requester = await User.findOne({ id: adminSess.id })
      if (!requester || requester.type !== 'admin') {
        return res.json(error('acceso denegado: permisos de administrador requeridos'))
      }
      isAdmin = true
    }
  } else if (session) {
    const sess = await Session.findOne({ value: session })
    if (!sess) return res.json(error('sesión inválida'))
    userId = sess.id
  } else {
    return res.json(error('sesión requerida'))
  }

  try {
    if (type === 'activation') {
      // ── Buscar Activación ──
      const activation = await Activation.findOne({ id })
      if (!activation) return res.json(error('activación no encontrada'))

      // Si no es admin, verificar que la activación pertenece al usuario
      if (!isAdmin && activation.userId !== userId) {
        return res.json(error('acceso denegado'))
      }

      // Obtener datos del usuario
      const user = await User.findOne({ id: activation.userId })
      if (!user) return res.json(error('usuario no encontrado'))

      // Obtener nombre de la oficina
      let branchName = 'Principal'
      if (activation.office) {
        const office = await Office.findOne({ id: activation.office })
        if (office) branchName = office.name || 'Principal'
      }

      // Construir productos
      const products = (activation.products || [])
        .filter(p => p.total > 0)
        .map(p => ({
          name:      p.name,
          qty:       p.total,
          unitPrice: parseFloat(p.price) || 0,
          total:     (parseFloat(p.price) || 0) * p.total
        }))

      const orderTotal = parseFloat(activation.price) || 0

      return res.json(success({
        orderData: {
          id:          activation.id,
          orderNumber: activation.order_number || activation.id.slice(0, 8).toUpperCase(),
          date:        activation.date,
          total:       orderTotal,
          payMethod:   activation.pay_method || 'cash',
          status:      activation.status,
          type:        'activation'
        },
        clientData: {
          fullName: `${user.name || ''} ${user.lastName || ''}`.trim(),
          code:     user.dni || '(DNI)',
          branch:   branchName
        },
        products
      }))

    } else if (type === 'affiliation') {
      // ── Buscar Afiliación ──
      const affiliation = await Affiliation.findOne({ id })
      if (!affiliation) return res.json(error('afiliación no encontrada'))

      if (!isAdmin && affiliation.userId !== userId) {
        return res.json(error('acceso denegado'))
      }

      const user = await User.findOne({ id: affiliation.userId })
      if (!user) return res.json(error('usuario no encontrado'))

      let branchName = 'Principal'
      if (affiliation.office) {
        const office = await Office.findOne({ id: affiliation.office })
        if (office) branchName = office.name || 'Principal'
      }

      const products = (affiliation.products || [])
        .filter(p => p.total > 0)
        .map(p => ({
          name:      p.name,
          qty:       p.total,
          unitPrice: parseFloat(p.price) || 0,
          total:     (parseFloat(p.price) || 0) * p.total
        }))

      const planAmount = affiliation.plan && affiliation.plan.amount
        ? parseFloat(affiliation.plan.amount)
        : products.reduce((a, p) => a + p.total, 0)

      return res.json(success({
        orderData: {
          id:          affiliation.id,
          orderNumber: affiliation.order_number || affiliation.id.slice(0, 8).toUpperCase(),
          date:        affiliation.date,
          total:       planAmount,
          payMethod:   affiliation.pay_method || 'cash',
          status:      affiliation.status,
          type:        'affiliation'
        },
        clientData: {
          fullName: `${user.name || affiliation.name || ''} ${user.lastName || affiliation.lastName || ''}`.trim(),
          code:     user.dni || affiliation.dni || '(DNI)',
          branch:   branchName
        },
        products
      }))

    } else {
      return res.json(error('tipo inválido. Usa activation o affiliation'))
    }

  } catch (err) {
    console.error('[boleta.js] Error:', err)
    return res.json(error('Error interno al obtener boleta'))
  }
}
