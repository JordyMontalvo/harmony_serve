import db from "../../../components/db";
import lib from "../../../components/lib";

const { Affiliation, User, Tree, Token, Transaction, Office, Closed } = db;
const { error, success, midd, ids, parent_ids, map, model, rand } = lib;

const A = [
  "id",
  "date",
  "plan",
  "voucher",
  "voucher2",
  "status",
  "office",
  "delivered",
  "pay_method",
  "bank",
  "voucher_date",
  "voucher_number",
  "amounts",
  "products",
  "transactions", // Asegúrate de que este campo esté en tu modelo
  "type", // NUEVO: mostrar tipo de afiliación
  "previousPlan", // NUEVO: mostrar plan anterior si es upgrade
  "difference", // NUEVO: mostrar diferencia si es upgrade
];
const U = ["name", "lastName", "dni", "phone"];

let users = null;
let tree = null;

// ============================================================================
// NUEVA LÓGICA HARMONY LIFE CORPORATION
// Sistema de pagos por PORCENTAJES sobre PUNTOS (no sobre soles)
// Todos los paquetes pagan 5 niveles básicos
// ============================================================================

// Tabla de porcentajes para los primeros 5 niveles
// Estos porcentajes se aplican sobre los PUNTOS del afiliado
const PERCENTAGE_TABLE_5_LEVELS = [
  0.73,  // Nivel 1: 73%
  0.05,  // Nivel 2: 5%
  0.10,  // Nivel 3: 10%
  0.04,  // Nivel 4: 4%
  0.02   // Nivel 5: 2%
];

// REGLA ESPECIAL: Distribuidor paga fijo S/ 50 en nivel 1 solamente
const DISTRIBUTOR_FIXED_PAYMENT = 50;

let pays = [];

/**
 * Nueva función de pago de bonos por PORCENTAJES sobre PUNTOS
 * 
 * @param {string} userId - ID del usuario que recibirá el bono
 * @param {number} level - Nivel actual (0-4 para niveles 1-5)
 * @param {string} affiliationId - ID de la afiliación que genera el bono
 * @param {number} affiliatedPoints - PUNTOS del afiliado (no soles)
 * @param {string} affiliatedPlan - Plan del afiliado (basic, standard, master, vip)
 * @param {string} affiliatedUserId - ID del usuario afiliado
 * @param {boolean} migration - Si es migración o afiliación
 */
async function pay_bonus_percentage(
  userId,
  level,
  affiliationId,
  affiliatedPoints,
  affiliatedPlan,
  affiliatedUserId,
  migration = false
) {
  // Límite: Solo 5 niveles básicos
  if (level >= 5) return;

  const user = users.find((e) => e.id === userId);
  const node = tree.find((e) => e.id === userId);

  // Si el usuario no existe, termina la recursión
  if (!user || !node) return;

  // Verificar si el usuario está activo
  const isActive = user._activated || user.activated;
  const virtual = !isActive;
  const name = migration ? "migration bonus" : "affiliation bonus";

  // REGLA ESPECIAL: Distribuidor solo paga nivel 1 con monto fijo
  if (affiliatedPlan === 'basic' && level >= 1) {
    // Distribuidor solo paga nivel 0 (nivel 1), continuar hacia arriba sin pagar
    if (node.parent) {
      await pay_bonus_percentage(
        node.parent,
        level + 1,
        affiliationId,
        affiliatedPoints,
        affiliatedPlan,
        affiliatedUserId,
        migration
      );
    }
    return;
  }

  // Calcular el pago
  let payment = 0;

  if (isActive) {
    // CASO ESPECIAL: Distribuidor recibe pago fijo en nivel 1
    if (affiliatedPlan === 'basic' && level === 0) {
      payment = DISTRIBUTOR_FIXED_PAYMENT; // S/ 50 fijo
    } else {
      // Caso normal: Porcentaje sobre puntos
      const percentage = PERCENTAGE_TABLE_5_LEVELS[level];
      payment = affiliatedPoints * percentage;
    }

    // Solo insertar transacción si hay pago
    if (payment > 0) {
      const transactionId = rand();
      await Transaction.insert({
        id: transactionId,
        date: new Date(),
        user_id: user.id,
        type: "in",
        value: payment,
        name,
        affiliation_id: affiliationId,
        virtual,
        _user_id: affiliatedUserId,
        // Campos adicionales para tracking
        level: level + 1, // Guardar nivel (1-5)
        percentage: affiliatedPlan === 'basic' && level === 0 ? null : PERCENTAGE_TABLE_5_LEVELS[level],
        points_base: affiliatedPoints
      });
      pays.push(transactionId);
    }
  }

  // Continuar hacia arriba (siempre, hasta 5 niveles)
  if (node.parent) {
    await pay_bonus_percentage(
      node.parent,
      level + 1,
      affiliationId,
      affiliatedPoints,
      affiliatedPlan,
      affiliatedUserId,
      migration
    );
  }
}

const handler = async (req, res) => {
  if (req.method == "GET") {
    // Obtener parámetros de paginación
    const { filter, page = 1, limit = 20, search } = req.query;
    console.log(
      "Received request with page:",
      page,
      "and limit:",
      limit,
      "search:",
      search
    );

    // Convertir a números
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const q = {
      all: {},
      pending: { status: "pending" },
      approved: { status: "approved" },
    };

    if (!(filter in q)) return res.json(error("invalid filter"));

    const { account } = req.query;

    // get AFFILIATIONS
    let qq = q[filter];

    if (account != "admin") qq.office = account;
    try {
      // Primero obtener todas las afiliaciones que coinciden con el filtro
      let allAffiliations = await Affiliation.find(qq);

      // get USERS for affiliations
      users = await User.find({});
      users = map(users);

      // Apply search if search parameter exists
      if (search) {
        const searchLower = search.toLowerCase();
        allAffiliations = allAffiliations.filter((aff) => {
          const user = users.get(aff.userId);
          return (
            user &&
            (user.name?.toLowerCase().includes(searchLower) ||
              user.lastName?.toLowerCase().includes(searchLower) ||
              user.dni?.toLowerCase().includes(searchLower) ||
              user.phone?.toLowerCase().includes(searchLower))
          );
        });
      }

      // Ordenar manualmente por fecha (del más reciente al más antiguo)
      allAffiliations.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Obtener el total antes de paginar
      const totalAffiliations = allAffiliations.length;

      // Aplicar paginación manualmente
      let affiliations = allAffiliations.slice(
        (pageNum - 1) * limitNum,
        pageNum * limitNum
      );

      // Obtener solo los usuarios necesarios para las afiliaciones paginadas
      users = await User.find({ id: { $in: ids(affiliations) } });
      users = map(users);

      // enrich affiliations
      affiliations = affiliations.map((a) => {
        let u = users.get(a.userId);
        a = model(a, A);
        u = model(u, U);
        return { ...a, ...u };
      });

      let parents = await User.find({ id: { $in: parent_ids(affiliations) } });

      // Devolver los resultados con información de paginación
      return res.json(
        success({
          affiliations,
          total: totalAffiliations,
          totalPages: Math.ceil(totalAffiliations / limitNum),
          currentPage: pageNum,
        })
      );
    } catch (err) {
      console.error("Database error:", err);
      return res.status(500).json(error("Database error"));
    }
  }

  if (req.method == "POST") {
    const { id, action } = req.body;

    // get affiliation
    let affiliation = await Affiliation.findOne({ id });

    // validate affiliation
    if (!affiliation) return res.json(error("affiliation not exist"));

    if (action == "approve" || action == "reject") {
      if (affiliation.status == "approved")
        return res.json(error("already approved"));
      if (affiliation.status == "rejected")
        return res.json(error("already rejected"));
    }

    if (action == "approve") {
      // approve AFFILIATION
      // Marcar delivered como false para nuevas aprobaciones (control manual)
      await Affiliation.update({ id }, { status: "approved", delivered: false });

      // update USER
      const user = await User.findOne({ id: affiliation.userId });

      // NUEVA LÓGICA: NO hay upgrades, siempre es afiliación completa
      // Actualizar usuario con el plan completo
      
      // REGLA ESPECIAL: Distribuidor (basic) inactivo al registrarse
      const isDistributor = affiliation.plan.id === 'basic';
      const shouldActivate = !isDistributor; // Todos activos EXCEPTO Distribuidor

      await User.update(
        { id: user.id },
        {
          affiliated: true,
          _activated: shouldActivate,  // Distribuidor: false, Otros: true
          activated: shouldActivate,   // Distribuidor: false, Otros: true
          affiliation_date: new Date(),
          plan: affiliation.plan.id,
          n: affiliation.plan.n,
          affiliation_points: affiliation.plan.affiliation_points,
        }
      );
      // CRÍTICO: Actualizar total_points después de la afiliación
      await lib.updateTotalPointsCascade(User, Tree, user.id);

      if (!user.tree) {
        // reserve Token
        const token = await Token.findOne({ free: true });
        if (!token) return res.json(error("token not available"));
        await Token.update({ value: token.value }, { free: false });

        // insert to tree
        // Usar parent.id directamente (ya no se usa apalancamiento/coverage)
        // Si el parent tiene coverage, usar ese ID; si no, usar parent.id
        const parent = await User.findOne({ id: user.parentId });
        const _id = parent.coverage?.id || parent.id;
        let node = await Tree.findOne({ id: _id });

        node.childs.push(user.id);

        await Tree.update({ id: _id }, { childs: node.childs });
        await Tree.insert({ id: user.id, childs: [], parent: _id });

        // update USER
        await User.update(
          { id: user.id },
          {
            tree: true,
            token: token.value,
          }
        );
      }

      // PAY AFFILIATION BONUS - NUEVA LÓGICA
      tree = await Tree.find({});
      users = await User.find({});
      pays = [];

      const plan = affiliation.plan.id;
      const affiliationPoints = affiliation.plan.affiliation_points; // PUNTOS, no monto
      const isMigration = user.plan !== "default"; // Si ya tenía un plan, es migración

      // Llamar a la nueva función con PUNTOS
      await pay_bonus_percentage(
        user.parentId,
        0, // Empezar en nivel 0 (nivel 1)
        affiliation.id,
        affiliationPoints, // PUNTOS del afiliado
        plan,
        user.id,
        isMigration
      );

      // Actualizar la afiliación con las transacciones
      await Affiliation.update({ id }, { transactions: pays }); // Aquí se agregan las IDs de las transacciones

      // UPDATE STOCK
      const office_id = affiliation.office;
      const products = affiliation.products;

      const office = await Office.findOne({ id: office_id });

      products.forEach((p, i) => {
        if (office.products[i]) office.products[i].total -= products[i].total;
      });

      await Office.update(
        { id: office_id },
        {
          products: office.products,
        }
      );

      // migrar transacciones virtuales solo las que fueron creadas después del último cierre
      // y que NO sean transacciones "closed reset" (compensaciones de cierre)
      // y que NO sean transacciones que ya fueron compensadas por "closed reset"
      const allClosings = await Closed.find({});
      const lastClosed = allClosings.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      
      // Obtener todas las transacciones "closed reset" del usuario, ordenadas por fecha
      const closedResetTransactions = await Transaction.find({
        user_id: user.id,
        name: "closed reset",
        virtual: true
      });
      
      // Ordenar los "closed reset" por fecha (más antiguos primero)
      closedResetTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Obtener TODAS las transacciones virtuales del usuario (excepto "closed reset")
      // para procesarlas en orden cronológico
      let allVirtualTransactions = await Transaction.find({
        user_id: user.id,
        virtual: true,
        name: { $ne: "closed reset" }
      });
      
      // Ordenar por fecha (más antiguas primero)
      allVirtualTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Identificar qué transacciones fueron compensadas por cada "closed reset"
      // IMPORTANTE: Una transacción solo puede ser compensada UNA VEZ
      const compensatedTransactionIds = new Set(); // Usar Set para evitar duplicados
      
      // Para cada "closed reset", identificar las transacciones que compensó
      for (const resetTransaction of closedResetTransactions) {
        // Obtener todas las transacciones virtuales que existían ANTES o EN la fecha del reset
        // y que NO hayan sido compensadas previamente
        const transactionsAvailableForReset = allVirtualTransactions.filter(t => {
          // Solo considerar transacciones que existían antes o en la fecha del reset
          const transactionDate = new Date(t.date);
          const resetDate = new Date(resetTransaction.date);
          return transactionDate <= resetDate && !compensatedTransactionIds.has(t.id);
        });
        
        // Simular la compensación: sumar transacciones hasta alcanzar el valor del reset
        let remainingToCompensate = Math.abs(resetTransaction.value); // Valor absoluto porque es negativo
        const transactionsToCompensate = [];
        
        for (const transaction of transactionsAvailableForReset) {
          if (remainingToCompensate <= 0) break;
          
          // Solo considerar transacciones de tipo "in" (entradas)
          if (transaction.type === 'in') {
            if (transaction.value <= remainingToCompensate) {
              // Esta transacción fue completamente compensada
              transactionsToCompensate.push(transaction.id);
              remainingToCompensate -= transaction.value;
            } else {
              // Esta transacción fue parcialmente compensada
              // Por ahora, la consideramos compensada completamente
              // En el futuro se podría manejar compensaciones parciales
              transactionsToCompensate.push(transaction.id);
              remainingToCompensate = 0;
              break;
            }
          }
        }
        
        // Agregar los IDs de las transacciones que fueron compensadas por este reset
        transactionsToCompensate.forEach(id => compensatedTransactionIds.add(id));
      }
      
      let virtualTransactionsQuery = {
        user_id: user.id,
        virtual: true,
        name: { $ne: "closed reset" } // Excluir transacciones de compensación de cierre
      };
      
      // Si hay un cierre anterior, solo migrar transacciones creadas después de ese cierre
      if (lastClosed) {
        virtualTransactionsQuery.date = { $gte: lastClosed.date };
      }
      
      const transactions = await Transaction.find(virtualTransactionsQuery);
      
      // Filtrar transacciones que NO fueron compensadas por "closed reset"
      const validTransactions = transactions.filter(transaction => {
        // Si esta transacción está en la lista de compensadas, no migrarla
        return !compensatedTransactionIds.has(transaction.id);
      });

      for (let transaction of validTransactions) {
        console.log({ transaction });
        await Transaction.update({ id: transaction.id }, { virtual: false });
      }
    }

    if (action == "reject") {
      await Affiliation.update({ id }, { status: "rejected" });

      // revert transactions
      if (affiliation.transactions) {
        for (let transactionId of affiliation.transactions) {
          await Transaction.delete({ id: transactionId });
        }
      }
    }

    if (action == "check") {
      await Affiliation.update({ id }, { delivered: true });
    }

    if (action == "uncheck") {
      await Affiliation.update({ id }, { delivered: false });
    }

    if (action == "revert") {
      console.log("revert");

      const user = await User.findOne({ id: affiliation.userId });

      await Affiliation.delete({ id });

      const transactions = affiliation.transactions;
      console.log(transactions);

      for (let id of transactions) {
        await Transaction.delete({ id });
      }

      const affiliations = await Affiliation.find({
        userId: user.id,
        status: "approved",
      });

      if (affiliations.length) {
        affiliation = affiliations[affiliations.length - 1];

        await User.update(
          { id: user.id },
          {
            // affiliated: false,
            _activated: false,
            activated: false,
            plan: affiliation.plan.id,
            affiliation_date: affiliation.date,
            affiliation_points: affiliation.plan.affiliation_points,
            n: affiliation.plan.n,
          }
        );
      } else {
        await User.update(
          { id: user.id },
          {
            affiliated: false,
            _activated: false,
            activated: false,
            plan: "default",
            affiliation_date: null,
            affiliation_points: 0,
            n: 0,
          }
        );
      }

      // UPDATE STOCK
      console.log("UPDATE STOCK ...");
      const office_id = affiliation.office;
      const products = affiliation.products;

      const office = await Office.findOne({ id: office_id });

      products.forEach((p, i) => {
        if (office.products[i]) office.products[i].total += products[i].total;
      });

      await Office.update(
        { id: office_id },
        {
          products: office.products,
        }
      );
    }

    return res.json(success());
  }
};

export default async (req, res) => {
  await midd(req, res);
  return handler(req, res);
};