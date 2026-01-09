import db from "../../../components/db-optimized";
import lib from "../../../components/lib";

const { User, Session, Plan, Product, Affiliation, Office, Tree, Transaction, Period } =
  db;
const { error, success, midd, rand, acum } = lib;

let tree;

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function buildPeriodKey(year, month) {
  const mm = String(month).padStart(2, "0");
  return `${year}-${mm}`;
}

function buildPeriodLabel(year, month) {
  const mName = MONTHS_ES[month - 1] || `Mes ${month}`;
  return `${mName} ${year}`;
}

/**
 * Obtiene el periodo abierto actual o crea uno nuevo.
 * 
 * IMPORTANTE: Esta función asigna el periodo ABIERTO en el momento de la compra,
 * no el periodo del mes de la fecha. Esto permite que:
 * - Un periodo puede iniciarse en cualquier fecha (ej: 2 de enero)
 * - Ese periodo puede cerrarse en cualquier fecha posterior (ej: 3 de febrero)
 * - Todas las compras entre el inicio y el cierre pertenecen a ese periodo,
 *   sin importar que se hayan hecho en un mes diferente
 * 
 * Ejemplo:
 * - Periodo "Enero 2025" iniciado el 2 de enero, cerrado el 3 de febrero
 * - Todas las compras del 2 de enero al 3 de febrero pertenecen a "Enero 2025"
 * - Incluso las compras del 1-3 de febrero pertenecen a "Enero 2025" (hasta que se cierre)
 */
async function getOrCreateOpenPeriod(now = new Date()) {
  // Buscar todos los periodos abiertos
  const openPeriods = await Period.find({ status: "open" });
  
  // Si hay periodos abiertos, usar el más reciente (por fecha de creación)
  // Esto asegura que se use el periodo que está actualmente activo
  if (openPeriods && openPeriods.length) {
    openPeriods.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return openPeriods[0];
  }

  // Si no hay periodos abiertos, crear uno nuevo del mes actual
  // Esto solo debería pasar si es la primera vez que se usa el sistema
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const key = buildPeriodKey(year, month);

  // Verificar si ya existe un periodo con esa key (puede estar cerrado)
  const existing = await Period.findOne({ key });
  if (existing && existing.status !== "closed") return existing;

  // Crear nuevo periodo
  const period = {
    id: rand(),
    key,
    year,
    month,
    label: buildPeriodLabel(year, month),
    status: "open",
    createdAt: now,
    closedAt: null,
  };
  await Period.insert(period);
  return period;
}

export default async (req, res) => {
  await midd(req, res);

  // valid session
  let { session } = req.query;
  session = await Session.findOne({ value: session });
  if (!session) return res.json(error("invalid session"));

  // get USER, PLANS, PRODUCTS, AFFILIATION, y TRANSACTIONS en paralelo
  const [
    user,
    plans,
    products,
    affiliation,
    affiliations,
    transactions,
    _transactions
  ] = await Promise.all([
    User.findOne({ id: session.id }).catch(err => {
      console.error('[Affiliation API] Error loading user:', err);
      return null;
    }),
    Plan.find({}).catch(err => {
      console.error('[Affiliation API] Error loading plans:', err);
      return [];
    }),
    Product.find({}).catch(err => {
      console.error('[Affiliation API] Error loading products:', err);
      return [];
    }),
    Affiliation.findOneLast({
      userId: session.id,
      status: { $in: ["pending", "approved"] },
    }).catch(err => {
      console.error('[Affiliation API] Error loading affiliation:', err);
      return null;
    }),
    Affiliation.find({
      userId: session.id,
      status: "approved",
    }).catch(err => {
      console.error('[Affiliation API] Error loading affiliations:', err);
      return [];
    }),
    Transaction.find({
      user_id: session.id,
      virtual: { $in: [null, false] },
    }).catch(err => {
      console.error('[Affiliation API] Error loading transactions:', err);
      return [];
    }),
    Transaction.find({
      user_id: session.id,
      virtual: true,
    }).catch(err => {
      console.error('[Affiliation API] Error loading virtual transactions:', err);
      return [];
    })
  ]);

  // Validar que user no sea null antes de continuar
  if (!user) {
    return res.json(error("User not found"));
  }

  // Filtrar planes según afiliación existente
  let filteredPlans = plans;
  if (affiliation && affiliation.status == "approved") {
    if (affiliation.plan.id == "basic") {
      filteredPlans = plans.filter((_, index) => index > 0);
    }
    if (affiliation.plan.id == "standard") {
      filteredPlans = plans.filter((_, index) => index > 1);
    }
    if (affiliation.plan.id == "master") {
      filteredPlans = [];
    }
  }

  const ins = acum(transactions, { type: "in" }, "value");
  const outs = acum(transactions, { type: "out" }, "value");
  const _ins = acum(_transactions, { type: "in" }, "value");
  const _outs = acum(_transactions, { type: "out" }, "value");

  const balance = ins - outs;
  const _balance = _ins - _outs;

  if (req.method == "GET") {
    // Obtener oficinas en paralelo con las otras consultas
    const offices = await Office.find({ active: { $ne: false } }).catch(err => {
      console.error('[Affiliation API] Error loading offices:', err);
      return [];
    });
    
    console.log("[Affiliation API] Oficinas cargadas:", offices.map(o => ({ 
      id: o.id, 
      name: o.name, 
      address: o.address,
      horario: o.horario,
      dias: o.dias,
      accounts: o.accounts 
    })));
    console.log("[API App Affiliation] Estructura completa del primer producto:", products.length > 0 ? products[0] : "No hay productos");
    console.log("[API App Affiliation] Campos disponibles en productos:", products.length > 0 ? Object.keys(products[0]) : "No hay productos");

    return res.json(
      success({
        name: user.name,
        lastName: user.lastName,
        affiliated: user.affiliated,
        _activated: user._activated,
        activated: user.activated,
        plan: user.plan,
        country: user.country,
        photo: user.photo,
        tree: user.tree,
        dni: user.dni,
        token: user.token,

        filteredPlans,
        products,
        affiliation,
        affiliations,
        offices,

        balance,
        _balance,
      })
    );
  }

  if (req.method == "POST") {
    let {
      products,
      plan,
      voucher,
      voucher2,
      office,
      check,
      pay_method,
      bank,
      date,
      voucher_number,
    } = req.body;
    
    console.log('Affiliation POST - voucher:', voucher ? 'existe' : 'null');
    console.log('Affiliation POST - voucher2:', voucher2 ? voucher2 : 'null');

    // Validación obligatoria: Oficina de recojo (PDE)
    // Evita afiliaciones/upgrade sin oficina seleccionada.
    const officeId = office != null ? String(office).trim() : ""
    if (!officeId) return res.json(error("Selecciona una Oficina de Recojo (PDE)."))
    const officeDoc = await Office.findOne({ id: officeId, active: { $ne: false } })
    if (!officeDoc) return res.json(error("La Oficina de Recojo (PDE) seleccionada no es válida."))

    // Buscar el plan seleccionado
    plan = plans.find((e) => e.id == plan.id);
    console.log({ plan });

    let transactions = [];
    let amounts;
    let type = "affiliation";
    let previousPlan = null;
    let difference = null;

    // Detectar si es upgrade
    // Buscar la afiliación aprobada de mayor plan (más alto ya pagado)
    let highestAffiliation = null;
    if (affiliations && affiliations.length > 0) {
      highestAffiliation = affiliations.reduce((prev, curr) => {
        // Compara por monto del plan
        return curr.plan.amount > prev.plan.amount ? curr : prev;
      }, affiliations[0]);
    }
    if (
      highestAffiliation &&
      plan &&
      plan.amount > highestAffiliation.plan.amount
    ) {
      type = "upgrade";
      previousPlan = highestAffiliation.plan;
      // Calcular diferencia
      difference = {
        amount: plan.amount - highestAffiliation.plan.amount,
        points:
          (plan.affiliation_points || 0) -
          (highestAffiliation.plan.affiliation_points || 0),
        products: products.map((p, i) => ({
          ...p,
          total: p.total - (highestAffiliation.products[i]?.total || 0),
        })),
      };
      // Para upgrades, solo registrar la diferencia de productos
      products = difference.products;
    }

    if (!check) {
      // Si es upgrade, solo cobrar la diferencia
      const price = type === "upgrade" ? difference.amount : plan.amount;

      const a = _balance < price ? _balance : price;
      const r = price - _balance > 0 ? price - _balance : 0;
      const b = balance < r ? balance : r;
      const c = price - a - b;
      console.log({ a, b, c });

      const id1 = rand();
      const id2 = rand();

      amounts = [a, b, c];

      if (a) {
        transactions.push(id1);
        await Transaction.insert({
          id: id1,
          date: new Date(),
          user_id: user.id,
          type: "out",
          value: a,
          name: type,
          virtual: true,
        });
      }

      if (b) {
        transactions.push(id2);
        await Transaction.insert({
          id: id2,
          date: new Date(),
          user_id: user.id,
          type: "out",
          value: b,
          name: type,
          virtual: false,
        });
      }
    }

    const period = await getOrCreateOpenPeriod(new Date());
    await Affiliation.insert({
      id: rand(),
      date: new Date(),
      userId: user.id,
      products,
      plan,
      voucher,
      voucher2: voucher2 || null,
      office,
      period_key: period.key,
      period_label: period.label,
      status: "pending",
      delivered: false,
      transactions,
      amounts,
      pay_method,
      bank,
      voucher_date: date,
      voucher_number,
      type,
      previousPlan,
      difference,
    });

    return res.json(success());
  }
};