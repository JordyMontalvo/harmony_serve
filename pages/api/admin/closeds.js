import db from "../../../components/db"
import lib from "../../../components/lib"

const { Product, User, Session, Affiliation, Activation } = db
const { midd, success, rand } = lib

const { Tree, Transaction, Closed } = db

let tree

// ============================================================================
// NUEVOS RANGOS HARMONY LIFE CORPORATION (10 RANGOS)
// ============================================================================

const Pay = {
  'MILLONARIO':          0,    // Rango 1
  'ORO':                 0,    // Rango 2
  'ESMERALDA':           0,    // Rango 3
  'PLATINO':             0,    // Rango 4
  'DIAMANTE':            0,    // Rango 5
  'DIAMANTE_AZUL':       0,    // Rango 6
  'DIAMANTE_EJECUTIVO':  0,    // Rango 7
  'DOBLE_DIAMANTE':      0,    // Rango 8
  'DIAMANTE_CORONA':     0,    // Rango 9
  'TOP_HARMONY':         0,    // Rango 10 (máximo)
}

const pays = [
  { 'name': 'MILLONARIO', 'payed': false },
  { 'name': 'ORO', 'payed': false },
  { 'name': 'ESMERALDA', 'payed': false },
  { 'name': 'PLATINO', 'payed': false },
  { 'name': 'DIAMANTE', 'payed': false },
  { 'name': 'DIAMANTE_AZUL', 'payed': false },
  { 'name': 'DIAMANTE_EJECUTIVO', 'payed': false },
  { 'name': 'DOBLE_DIAMANTE', 'payed': false },
  { 'name': 'DIAMANTE_CORONA', 'payed': false },
  { 'name': 'TOP_HARMONY', 'payed': false },
]

// Porcentajes por rango (para bonos residuales si se usan)
// Estos son los mismos porcentajes que en affiliations.js
let r = {
  'active':             [0.73, 0.05, 0.10, 0.04, 0.02],  // 5 niveles base
  'MILLONARIO':         [0.73, 0.05, 0.10, 0.04, 0.02],  // 5 niveles
  'ORO':                [0.73, 0.05, 0.10, 0.04, 0.02],  // 5 niveles
  'ESMERALDA':          [0.73, 0.05, 0.10, 0.04, 0.02, 0.02],  // 6 niveles
  'PLATINO':            [0.73, 0.05, 0.10, 0.04, 0.02, 0.02, 0.02],  // 7 niveles
  'DIAMANTE':           [0.73, 0.05, 0.10, 0.04, 0.02, 0.02, 0.02, 0.02],  // 8 niveles
  'DIAMANTE_AZUL':      [0.73, 0.05, 0.10, 0.04, 0.02, 0.02, 0.02, 0.02, 0.02],  // 9 niveles
  'DIAMANTE_EJECUTIVO': [0.73, 0.05, 0.10, 0.04, 0.02, 0.02, 0.02, 0.02, 0.02, 0.01],  // 10 niveles
  'DOBLE_DIAMANTE':     [0.73, 0.05, 0.10, 0.04, 0.02, 0.02, 0.02, 0.02, 0.02, 0.01, 0.01],  // 11 niveles
  'DIAMANTE_CORONA':    [0.73, 0.05, 0.10, 0.04, 0.02, 0.02, 0.02, 0.02, 0.02, 0.01, 0.01, 0.01],  // 12 niveles
  'TOP_HARMONY':        [0.73, 0.05, 0.10, 0.04, 0.02, 0.02, 0.02, 0.02, 0.02, 0.01, 0.01, 0.01, 0.01],  // 13 niveles
}

// Posiciones de rangos (para comparaciones)
const pos = {
  'none':               -1,
  'active':              0,
  'MILLONARIO':          1,
  'ORO':                 2,
  'ESMERALDA':           3,
  'PLATINO':             4,
  'DIAMANTE':            5,
  'DIAMANTE_AZUL':       6,
  'DIAMANTE_EJECUTIVO':  7,
  'DOBLE_DIAMANTE':      8,
  'DIAMANTE_CORONA':     9,
  'TOP_HARMONY':        10,
}

const bonuses = {
  gold: [],
  sapphire: [],
  ruby: [],
  diamond: [],
}


function total_points(id) {

  const node = tree.find(e => e.id == id)

  if(!node) return

  node.total_points = node.points + node.affiliation_points

  node.childs.forEach(_id => {
    node.total_points += total_points(_id)
  })

  return node.total_points
}


function calc_range(arr, p) {

  const n = arr.length

  if(n >= 4 && arr.reduce((a, b, c) => a + (b > (c == 0 ? 0.2619 : 0.25)   * 21000 ? (c == 0 ? 0.2619 : 0.25)   * 21000 : b), 0) >= 21000) return 'RUBI'
  if(n >= 4 && arr.reduce((a, b, c) => a + (b > (c == 0 ? 0.2768 : 0.25)   * 9000  ? (c == 0 ? 0.2768 : 0.25)   * 9000  : b), 0) >= 9000)  return 'sapphire'
  if(n >= 3 && arr.reduce((a, b, c) => a + (b > (c == 0 ? 0.3637 : 0.3334) * 3300  ? (c == 0 ? 0.3637 : 0.3334) * 3300  : b), 0) >= 3300)  return 'gold'
  if(n >= 3 && arr.reduce((a, b, c) => a + (b > (c == 0 ? 0.4167 : 0.3334) * 1800  ? (c == 0 ? 0.4167 : 0.3334) * 1800  : b), 0) >= 1800)  return 'silver'
  if(n >= 2 && arr.reduce((a, b, c) => a + (b > (c == 0 ? 0.5556 : 0.50)   * 900   ? (c == 0 ? 0.5556 : 0.50)   * 900   : b), 0) >= 900 )  return 'master'
  if(n >= 2 && arr.reduce((a, b, c) => a + (b > (c == 0 ? 0.6667 : 0.50)   * 300   ? (c == 0 ? 0.6667 : 0.50)   * 300   : b), 0) >= 300 )  return 'star'

  return 'active'
}


function rank(node) {

  if(node._activated || node.activated) node.rank = calc_range(node.total, node.points)
  else node.rank = 'none'

  node.childs.forEach(_id => {
    const _node = tree.find(e => e.id == _id)
    rank(_node)
  })
}


function levels() {
  for(let node of tree) {
    if(node.rank == 'DIAMANTE ESTRELLA') node.levels = 15
    if(node.rank == 'TRIPLE DIAMANTE')   node.levels = 15
    if(node.rank == 'DOBLE DIAMANTE')    node.levels = 15
    if(node.rank == 'DIAMANTE')   node.levels = 15
    if(node.rank == 'RUBI')       node.levels = 15
    if(node.rank == 'sapphire')   node.levels = 14
    if(node.rank == 'gold')   node.levels = 13
    if(node.rank == 'silver') node.levels = 11
    if(node.rank == 'master') node.levels = 9
    if(node.rank == 'star')   node.levels = 6
    if(node.rank == 'active') node.levels = 3
  }
}


function find_rank(id, name) {
  const node = tree.find(e => e.id == id)

  const i = pos[node.rank]
  const j = pos[name]

  if(i >= j) return true

  for (let _id of node.childs) {
    if(find_rank(_id, name)) return true
  }

  return false
}

function is_rank(node, rank) {

  let total = 0, M, M1, M2

  const n = node.childs.length

  const arr = node.total

  // if (rank == 'RUBI')              { M  =  21000; M1 =  5500; M2 =  5250 } /
  if (rank == 'DIAMANTE')          { M  =  60000; M1 = 13000; M2 = 12000 }
  if (rank == 'DOBLE DIAMANTE')    { M  = 115000; M1 = 23000; M2 = 23000 }
  if (rank == 'TRIPLE DIAMANTE')   { M  = 225000; M1 = 37500; M2 = 37500 }
  if (rank == 'DIAMANTE ESTRELLA') { M  = 520000; M1 = 87000; M2 = 86700 }

  for(const [i, a] of arr.entries()) {
    if(i == 0) total += arr[i] > M1 ? M1 : arr[i]
    if(i >= 1) total += arr[i] > M2 ? M2 : arr[i]
  }

  let count = 0

  // if (rank == 'RUBI')              for (const _id of node.childs) if(find_rank(_id, 'gold'))     count += 1
  if (rank == 'DIAMANTE')          for (const _id of node.childs) if(find_rank(_id, 'sapphire')) count += 1
  if (rank == 'DOBLE DIAMANTE')    for (const _id of node.childs) if(find_rank(_id, 'RUBI'))     count += 1
  if (rank == 'TRIPLE DIAMANTE')   for (const _id of node.childs) if(find_rank(_id, 'RUBI'))     count += 1
  if (rank == 'DIAMANTE ESTRELLA') for (const _id of node.childs) if(find_rank(_id, 'DIAMANTE')) count += 1

  // if (rank == 'RUBI')              if(total >= M && n >= 4 && count >= 3) return true
  if (rank == 'DIAMANTE')          if(total >= M && n >= 5 && count >= 4) return true
  if (rank == 'DOBLE DIAMANTE')    if(total >= M && n >= 5 && count >= 4) return true
  if (rank == 'TRIPLE DIAMANTE')   if(total >= M && n >= 6 && count >= 5) return true
  if (rank == 'DIAMANTE ESTRELLA') if(total >= M && n >= 6 && count >= 5) return true

  return false
}


function pay_residual(id, n, user) {

  if(n == 13) return

  let node = tree.find(e => e.id == id)
  let _id  = node.parent

  if(node._activated || node.activated) {

    let rr = node.activated ? 1 : 0.5

    if(node.levels > n) {
      node.residual_bonus += r[node.rank][n] * user.points * rr

      if(r[node.rank][n] * user.points * rr > 0) {
        node.residual_bonus_arr.push({
          n,
          dni:  user.dni,
          name: user.name,
          val:  user.points,
          r:    r[node.rank][n],
          rr,
          amount: r[node.rank][n] * user.points * rr
        })
      }
    }

    if(_id) pay_residual(_id, n+1, user)

  } else

    if(_id) pay_residual(_id, n, user)
}


export default async (req, res) => {
  await midd(req, res)

  if(req.method == 'GET') {

    let closeds = await Closed.find({})

    return res.json(success({ closeds }))
  }

  if(req.method == 'POST') { ; console.log('POST ...')

    const { action } = req.body

    if (action == 'new') { ; console.log('new ...')

      const users = await User.find({ tree: true })
            tree  = await Tree.find({})

      tree.forEach(node => {
        const user = users.find(e => e.id == node.id)

        node.parentId           = user.parentId
        node.plan               = user.plan
        node.dni                = user.dni
        node.name               = user.name + ' ' + user.lastName
        node.activated          = user.activated
        node._activated         = user._activated ? user._activated : false
        node.points             = Number(user.points)
        node.affiliation_points = user.affiliation_points ? user.affiliation_points : 0
        // node.closeds            = user.closeds ? user.closeds : []
        node.pays               = user.pays ? user.pays : pays
        node.bonuses            = user.bonuses ? user.bonuses : bonuses
        node.n_inactives        = user.n_inactives ? user.n_inactives : 0
        node.residual_bonus     = 0
        node.residual_bonus_arr = []
        node._pays              = []
      })

      total_points('5f0e0b67af92089b5866bcd0')
      console.log('1')

      tree.forEach(node => {

        node.total = []
        node._total = []

        node.childs.forEach(_id => {

          const _node = tree.find(e => e.id == _id)

          node.total.push(_node.total_points)
          node._total.push(_node.total_points)
        })

        node.total.sort((a, b) => b - a)
      })

      rank(tree[0])
      console.log('2')

      // for(let node of tree) if(is_rank(node, 'RUBI'))              node.rank = 'RUBI'
      for(let node of tree) if(is_rank(node, 'DIAMANTE'))          node.rank = 'DIAMANTE'
      for(let node of tree) if(is_rank(node, 'DOBLE DIAMANTE'))    node.rank = 'DOBLE DIAMANTE'
      for(let node of tree) if(is_rank(node, 'TRIPLE DIAMANTE'))   node.rank = 'TRIPLE DIAMANTE'
      for(let node of tree) if(is_rank(node, 'DIAMANTE ESTRELLA')) node.rank = 'DIAMANTE ESTRELLA'

      levels()
      console.log('3')

      for(let node of tree) if(node.parent) pay_residual(node.parent, 0, node)
      console.log('4')

      for(let node of tree) {

        let directs = tree.filter(e => e.affiliation_points && e.parenId == node.id && (e.plan == 'business' || e.plan == 'master'))

        directs.sort((a, b) => {
          if(a.plan == b.plan) return  0

          if(a.plan == 'master' && b.plan == 'business') return -1

          return 1
        })

        if(directs.length >= 5) {

          const value = (directs[4].plan == 'master') ? 250 : 100

          await Transaction.insert({
            date:    new Date(),
            user_id: node.id,
            type:   'in',
            value,
            name:   'fast bonus',
          })
          console.log('4 4')
        }
      }


      for (let node of tree) {

        const { rank } = node

        if(rank != 'none') {

          const pos = node.pays.findIndex(e => e.name == rank)

          if(pos != -1) {

            for(let i = 0; i <= pos; i++) {

              const pay = node.pays[i]

              if(!pay.payed) {

                const value = Pay[pay.name]

                pay.value = value

                node._pays.push(pay)
              }
            }
          }
        }
      }
      console.log('5')

      const affiliations = await Affiliation.find({ closed: false })
      const activations  = await  Activation.find({ closed: false })

      return res.json(success({ tree, affiliations, activations }))
    }

    if (action == 'save') { ; console.log('save ...')

      const { tree, affiliations, activations } = req.body.data

      let users = []

      for (let node of tree) {
        if (node.rank != 'none') {
          users.push({
            name:           node.name,
            activated:      node.activated,
           _activated:      node._activated,
            points:         node.points,
            total:          node._total,
            rank:           node.rank,
            residual_bonus: node.residual_bonus,
          })
        }
      }
      console.log('1')

      await Closed.insert({
        id:   rand(),
        date: new Date(),
        users,
        tree,
        affiliations,
        activations,
      })
      console.log('2')

      for (let node of tree) {

        const { rank } = node

        if(rank != 'none') {

          await Transaction.insert({
            date:    new Date(),
            user_id: node.id,
            type:   'in',
            value:   node.residual_bonus,
            name:   'residual',
          })
          console.log('3')


          const pos = node.pays.findIndex(e => e.name == rank)

          if(pos != -1) {

            for(let i = 0; i <= pos; i++) {

              const pay = node.pays[i]

              if(!pay.payed) {

                const value = Pay[pay.name]

                await Transaction.insert({
                  date:    new Date(),
                  user_id: node.id,
                  type:   'in',
                  value:   value,
                  name:   'closed bonus',
                })
                console.log('4')

                pay.payed = true
              }
            }
          }

          if(rank == 'sapphire') node.bonuses['sapphire'].push(true)
          if(rank == 'ruby')     node.bonuses['ruby'].push(true)
          if(rank == 'gold')     node.bonuses['gold'].push(true)
          if(rank == 'diamond')  node.bonuses['diamond'].push(true)
        }

        if(!node.activated) node.n_inactives + 1
      }
      console.log('5')

      await User.updateMany({}, {
        activated: false,
       _activated: false,
        rank: 'none',
        points: 0,
        affiliation_points: 0,
      })
      console.log('6')

      for (let node of tree) {
        if(node.rank != 'none') {

          await User.updateOne(
            { id: node.id },
            {
              rank:               node.rank,
              pays:               node.pays,
              closeds:            node.closeds,
              bonuses:            node.bonuses,
              n_inactives:        node.n_inactives,
            },
          )
          console.log('7')
        }
      }
      console.log('8')

      await Affiliation.updateMany({}, { closed: true })
      await Activation.updateMany ({}, { closed: true })

      console.log('9')


      const virtualTransactions = await Transaction.find({ virtual: true })

      for(let transaction of virtualTransactions) {
        await Transaction.delete(
          { id: transaction.id }
        )
      }
    }

    // response
    return res.json(success({}))
  }
}


export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
}
