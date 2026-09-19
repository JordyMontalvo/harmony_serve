import bcrypt from "bcrypt";
import db from "../../../components/db";
import lib from "../../../components/lib";

const { User, Transaction, Closed } = db;
const { error, success, midd, model, safe } = lib;

// valid filters
// const q = { all: {}, affiliated: { affiliated: true }, activated: { activated: true } }

// models
const U = [
  "id",
  "date",
  "name",
  "lastName",
  "dni",
  "email",
  "phone",
  "department",
  "affiliated",
  "activated",
  "token",
  "points",
  "balance",
  "parent",
  "virtualbalance",
  "country",
  "rank",
  "birthdate",
  "address",
  "city",
  "plan",
  "affiliation_points",
];

const handler = async (req, res) => {
  if (req.method == "GET") {
    console.log("GET ...");

    const { filter, page = 1, limit = 20, search, showAvailable, showVirtualBalance } = req.query;
    console.log(
      "Received request with page:",
      page,
      "and limit:",
      limit,
      "search:",
      search,
      "showAvailable:",
      showAvailable,
      "showVirtualBalance:",
      showVirtualBalance
    );

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const q = {
      all: {},
      affiliated: { affiliated: true },
      activated: { activated: true },
    };

    // validate filter
    if (!(filter in q)) return res.json(error("invalid filter"));

    // get users
    let allUsers = await User.find(q[filter]);

    const transaction = await Transaction.find({
      virtual: { $in: [null, false] },
    }); // Asegúrate de que esta línea esté antes de usar 'transactions'

    const virtualTransactions = await Transaction.find({ virtual: true });

    // Filtrar usuarios con saldo disponible
    if (showAvailable === "true") {
      allUsers = allUsers.filter((user) => {
        const ins = transaction
          .filter((i) => i.user_id == user.id && i.type == "in")
          .reduce((a, b) => a + parseFloat(b.value), 0);
        const outs = transaction
          .filter((i) => i.user_id == user.id && i.type == "out")
          .reduce((a, b) => a + parseFloat(b.value), 0);
        return ins - outs > 0; // Solo usuarios con saldo disponible
      });
    }

    // Filtrar usuarios con saldo no disponible
    if (showVirtualBalance === "true" || showVirtualBalance === true) {
      console.log(`🔍 Filtrando usuarios con saldo no disponible...`);
      console.log(`📊 Total usuarios antes del filtro: ${allUsers.length}`);
      console.log(`📊 Total transacciones virtuales: ${virtualTransactions.length}`);
      
      // Obtener todas las transacciones "closed reset" agrupadas por usuario
      const closedResetTransactionsByUser = {};
      const allClosedResetTransactions = await Transaction.find({
        name: "closed reset",
        virtual: true
      });
      
      for (const resetTransaction of allClosedResetTransactions) {
        if (!closedResetTransactionsByUser[resetTransaction.user_id]) {
          closedResetTransactionsByUser[resetTransaction.user_id] = [];
        }
        closedResetTransactionsByUser[resetTransaction.user_id].push(resetTransaction);
      }
      
      // Ordenar los "closed reset" por fecha para cada usuario
      for (const userId in closedResetTransactionsByUser) {
        closedResetTransactionsByUser[userId].sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      
      // Obtener todas las transacciones virtuales (excepto "closed reset") agrupadas por usuario
      const allVirtualTransactionsByUser = {};
      const allVirtualTransactionsExceptReset = await Transaction.find({
        virtual: true,
        name: { $ne: "closed reset" }
      });
      
      for (const transaction of allVirtualTransactionsExceptReset) {
        if (!allVirtualTransactionsByUser[transaction.user_id]) {
          allVirtualTransactionsByUser[transaction.user_id] = [];
        }
        allVirtualTransactionsByUser[transaction.user_id].push(transaction);
      }
      
      // Ordenar las transacciones virtuales por fecha para cada usuario
      for (const userId in allVirtualTransactionsByUser) {
        allVirtualTransactionsByUser[userId].sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      
      const filteredUsers = [];
      const beforeFilterCount = allUsers.length;
      
      allUsers = allUsers.filter((user) => {
        // Obtener transacciones "closed reset" del usuario
        const userClosedResets = closedResetTransactionsByUser[user.id] || [];
        
        // Obtener transacciones virtuales del usuario (excepto "closed reset")
        const userVirtualTransactions = allVirtualTransactionsByUser[user.id] || [];
        
        // Identificar qué transacciones fueron compensadas por cada "closed reset"
        const compensatedTransactionIds = new Set();
        
        for (const resetTransaction of userClosedResets) {
          const transactionsAvailableForReset = userVirtualTransactions.filter(t => {
            const transactionDate = new Date(t.date);
            const resetDate = new Date(resetTransaction.date);
            return transactionDate <= resetDate && !compensatedTransactionIds.has(t.id);
          });
          
          let remainingToCompensate = Math.abs(resetTransaction.value);
          
          for (const transaction of transactionsAvailableForReset) {
            if (remainingToCompensate <= 0) break;
            
            if (transaction.type === 'in') {
              if (transaction.value <= remainingToCompensate) {
                compensatedTransactionIds.add(transaction.id);
                remainingToCompensate -= transaction.value;
              } else {
                compensatedTransactionIds.add(transaction.id);
                remainingToCompensate = 0;
                break;
              }
            }
          }
        }
        
        // Calcular saldo virtual excluyendo transacciones compensadas
        const validVirtualTransactions = userVirtualTransactions.filter(t => 
          !compensatedTransactionIds.has(t.id)
        );
        
        const virtualIns = validVirtualTransactions
          .filter((i) => i.type === "in")
          .reduce((a, b) => a + parseFloat(b.value || 0), 0);
        const virtualOuts = validVirtualTransactions
          .filter((i) => i.type === "out")
          .reduce((a, b) => a + parseFloat(b.value || 0), 0);
        const virtualBalance = virtualIns - virtualOuts;
        const hasVirtualBalance = virtualBalance > 0;
        
        if (hasVirtualBalance) {
          console.log(`✅ Usuario ${user.name} ${user.lastName} (ID: ${user.id}) tiene saldo no disponible: ${virtualBalance.toFixed(2)}`);
          filteredUsers.push(`${user.name} ${user.lastName} (${virtualBalance.toFixed(2)})`);
        }
        
        return hasVirtualBalance; // Solo usuarios con saldo no disponible
      });
      
      console.log(`📊 Total usuarios después del filtro: ${allUsers.length} (de ${beforeFilterCount})`);
      console.log(`📋 Usuarios con saldo no disponible encontrados: ${filteredUsers.length}`);
      if (filteredUsers.length > 0) {
        console.log(`📋 Lista: ${filteredUsers.slice(0, 10).join(', ')}${filteredUsers.length > 10 ? '...' : ''}`);
      } else {
        console.log(`⚠️ No se encontraron usuarios con saldo no disponible`);
      }
    }

    // Apply search if search parameter exists
    const normalize = (str) =>
      (str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const searchNormalized = normalize(search);

    allUsers = allUsers.filter((user) => {
      return (
        normalize(user.name).includes(searchNormalized) ||
        normalize(user.lastName).includes(searchNormalized) ||
        normalize(user.dni).includes(searchNormalized) ||
        normalize(user.country).includes(searchNormalized) ||
        normalize(user.phone).includes(searchNormalized) ||
        normalize(user.city).includes(searchNormalized)
      );
    });
    console.log({ allUsers });

    // Ordenar usuarios por fecha (más reciente primero)
    allUsers.sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalUsers = allUsers.length;

    // Aplicar paginación
    const skip = (pageNum - 1) * limitNum;
    let users = allUsers.slice(skip, skip + limitNum);

    // Obtener los padres antes de usarlos
    const parentIds = users.filter((i) => i.parentId).map((i) => i.parentId);
    const parents = await User.find({ id: { $in: parentIds } });

    // Asegúrate de que los padres se obtengan antes de usarlos
    users = users.map((user) => {
      if (user.parentId) {
        const i = parents.findIndex((el) => el.id == user.parentId);
        if (i !== -1) {
          user.parent = parents[i]; // Asigna el objeto padre al usuario
        }
      }
      return user; // Asegúrate de devolver el usuario modificado
    });

    const transactions = await Transaction.find({
      virtual: { $in: [null, false] },
    });
    console.log("transactions ...");

    // parse user
    const totalBalance = allUsers.reduce((total, user) => {
      const ins = transactions
        .filter((i) => i.user_id == user.id && i.type == "in")
        .reduce((a, b) => a + parseFloat(b.value), 0);
      const outs = transactions
        .filter((i) => i.user_id == user.id && i.type == "out")
        .reduce((a, b) => a + parseFloat(b.value), 0);
      return total + (ins - outs); // Sumar el saldo de cada usuario
    }, 0);

    // Calcular el saldo no disponible
    const totalVirtualBalance = allUsers.reduce((total, user) => {
      const virtualIns = virtualTransactions
        .filter((i) => i.user_id == user.id && i.type == "in")
        .reduce((a, b) => a + parseFloat(b.value), 0);
      const virtualOuts = virtualTransactions
        .filter((i) => i.user_id == user.id && i.type == "out")
        .reduce((a, b) => a + parseFloat(b.value), 0);
      return total + (virtualIns - virtualOuts); // Sumar el saldo virtual de cada usuario
    }, 0);

    // Calcular el saldo para los usuarios que se están enviando
    users = users.map((user) => {
      const ins = transactions
        .filter((i) => i.user_id == user.id && i.type == "in")
        .reduce((a, b) => a + parseFloat(b.value), 0);
      const outs = transactions
        .filter((i) => i.user_id == user.id && i.type == "out")
        .reduce((a, b) => a + parseFloat(b.value), 0);
      user.balance = ins - outs;

      const virtualIns = virtualTransactions
        .filter((i) => i.user_id == user.id && i.type == "in")
        .reduce((a, b) => a + parseFloat(b.value), 0);
      const virtualOuts = virtualTransactions
        .filter((i) => i.user_id == user.id && i.type == "out")
        .reduce((a, b) => a + parseFloat(b.value), 0);
      user.virtualbalance = virtualIns - virtualOuts;

      return user; // Asegúrate de devolver el usuario modificado
    });
    // console.log({ users })

    // parse user
    users = users.map((user) => {
      const u = model(user, U);
      // Asegurar que virtualbalance siempre sea un número (no null/undefined)
      u.virtualbalance = user.virtualbalance != null ? Number(user.virtualbalance) : 0;
      return { ...u };
    });
    // Cambia esto para obtener todos los usuarios

    // Calcular el saldo total de todos los usuarios

    // response con información de paginación
    return res.json(
      success({
        users,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limitNum),
        currentPage: pageNum,
        totalBalance,
        totalVirtualBalance,
      })
    );
  }

  if (req.method == "POST") {
    console.log("POST ...");

    const { action } = req.body;

    // el id debe ser un primitivo: con { "$ne": null } se editaria un
    // usuario cualquiera o se migrarian sus transacciones virtuales
    const id = safe(req.body.id);
    if (id === null) return res.json(error("invalid id"));

    console.log({ action, id });

    if (action == "migrate") {
      console.log("migrate ...");

      // migrar transacciones virtuales solo las que fueron creadas después del último cierre
      // y que NO sean transacciones "closed reset" (compensaciones de cierre)
      // y que NO sean transacciones que ya fueron compensadas por "closed reset"
      // Primero obtener la fecha del último cierre
      const lastClosed = await Closed.findOne({}, { sort: { date: -1 } });
      
      // Obtener todas las transacciones "closed reset" del usuario, ordenadas por fecha
      const closedResetTransactions = await Transaction.find({
        user_id: id,
        name: "closed reset",
        virtual: true
      });
      
      // Ordenar los "closed reset" por fecha (más antiguos primero)
      closedResetTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Obtener TODAS las transacciones virtuales del usuario (excepto "closed reset")
      // para procesarlas en orden cronológico
      let allVirtualTransactions = await Transaction.find({
        user_id: id,
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
        user_id: id,
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
      
      // console.log({ transactions })

      for (let transaction of validTransactions) {
        console.log({ transaction });

        await Transaction.update({ id: transaction.id }, { virtual: false });
      }
    }

    if (action == "name") {
      // console.log('edit name ...')

      const {
        _name,
        _lastName,
        _password,
        _points,
        _rank,
        city,
        plan,
        affiliation_points,
      } = req.body.data;

      // ambos se usan como filtro de busqueda: deben ser primitivos, o se
      // saltaria la comprobacion de dni duplicado y se reasignaria
      // el patrocinador a un usuario cualquiera
      const _dni        = safe(req.body.data._dni);
      const _parent_dni = safe(req.body.data._parent_dni);
      // nunca se registra _password: los logs de Heroku son legibles
      console.log({
        _name,
        _lastName,
        _dni,
        _parent_dni,
        _points,
        _rank,
        city,
        plan,
        affiliation_points,
      });

      const user = await User.findOne({ id });

      if (_dni != user.dni) {
        // error dni
        const user2 = await User.findOne({ dni: _dni });

        if (user2) return res.json(error("invalid dni"));
      }

      await User.update(
        { id },
        {
          name: _name,
          lastName: _lastName,
          dni: _dni,
          points: _points,
          rank: _rank,
          city,
          plan,
          affiliation_points,
        }
      );

      if (_password) {
        const password = await bcrypt.hash(_password, 12);

        await User.update({ id }, { password });
      }

      if (_parent_dni) {
        const parent = await User.findOne({ dni: _parent_dni });

        if (!parent) return res.json(error("invalid parent dni"));
        if (parent.id == user.id) return res.json(error("invalid parent dni"));

        await User.update({ id }, { parentId: parent.id });
      }
    }

    // response
    return res.json(success({}));
  }
};

export default async (req, res) => {
  await midd(req, res);
  return handler(req, res);
};
