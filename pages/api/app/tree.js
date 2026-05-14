import db  from "../../../components/db"
import lib from "../../../components/lib"

const { User, Session, Tree } = db
const { error, success, midd } = lib


export default async (req, res) => {
  await midd(req, res)

  let { session, id } = req.query

  // valid session
  session = await Session.findOne({ value: session })
  if(!session) return res.json(error('invalid session'))

  // get USER
  const user = await User.findOne({ id: session.id })

  // Si no se pasa id, usar el nodo raíz
  if (!id || id === 'null') id = user.id

  // Buscar el nodo solicitado
  const node = await Tree.findOne({ id })
  if (!node) return res.json(error('node not found'))

  // Traer datos de usuario para el nodo
  const nodeUser = await User.findOne({ id: node.id })

  // Leer el total_points ya almacenado
  const total_points = nodeUser.total_points || 0

  // Traer los hijos inmediatos
  let children = []
  let children_points = []
  if (node.childs && node.childs.length > 0) {
    // Buscar los nodos hijos
    const childNodes = await Tree.find({ id: { $in: node.childs } })
    // Traer los usuarios de los hijos
    const childUsers = await User.find({ id: { $in: node.childs } })
    // Ordenar childNodes y childUsers según el orden de node.childs
    const childNodesOrdered = node.childs.map(cid => childNodes.find(n => n.id === cid))
    const childUsersOrdered = node.childs.map(cid => childUsers.find(u => u.id === cid))
    // Mapear hijos con datos de usuario
    children = childNodesOrdered.map((childNode, idx) => {
      const childUser = childUsersOrdered[idx] || {}
      return {
        id: childNode.id,
        childs: childNode.childs,
        name: childUser.name,
        lastName: childUser.lastName,
        affiliated: childUser.affiliated,
        activated: childUser.activated,
        points: Number(childUser.points) || 0,
        affiliation_points: childUser.affiliation_points || 0,
        photo: childUser.photo,
        country: childUser.country,
        dni: childUser.dni,
        phone: childUser.phone,
        email: childUser.email,
        _rank: childUser.rank,
      }
    })
    // Calcular los puntos grupales de cada hijo directo en el mismo orden
    children_points = childUsersOrdered.map(childUser => childUser && childUser.total_points || 0)
  }

  // Nodo principal con datos de usuario
  const mainNode = {
    id: node.id,
    childs: node.childs,
    name: nodeUser.name,
    lastName: nodeUser.lastName,
    affiliated: nodeUser.affiliated,
    activated: nodeUser.activated,
    points: Number(nodeUser.points) || 0,
    affiliation_points: nodeUser.affiliation_points || 0,
    photo: nodeUser.photo,
    country: nodeUser.country,
    dni: nodeUser.dni,
    phone: nodeUser.phone,
    email: nodeUser.email,
    _rank: nodeUser.rank,
    total_points,
  }

  return res.json(success({
    node: mainNode,
    children,
    children_points,
  }))
}
