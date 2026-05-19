const { corsMiddleware } = require("../middleware/middleware-cors");

class Lib {
  constructor() {
    this.midd = this.midd.bind(this);
  }

  rand() {
    return Math.random().toString(36).substr(2);
  }
  error(msg) {
    return { error: true, msg };
  }
  success(opts) {
    return { error: false, ...opts };
  }

  midd(req, res) {
    return new Promise((resolve, reject) => {
      corsMiddleware(req, res, (result) => {
        if (result instanceof Error) return reject(result);
        return resolve(result);
      });
    });
  }

  acum(a, query, field) {
    const x = Object.keys(query)[0];
    const y = Object.values(query)[0];

    return a
      .filter((i) => i[x] == y)
      .map((i) => i[field])
      .reduce((a, b) => a + b, 0);
  }

  ids(a) {
    return a.map((i) => i.userId);
  }
  _ids(a) {
    return a.map((i) => i.id);
  }
  parent_ids(a) {
    return a.map((i) => i.parentId);
  }

  map(a) {
    return new Map(a.map((i) => [i.id, i]));
  }
  _map(a) {
    return new Map(a.map((i) => [i.userId, i]));
  }

  model(obj, model) {
    let ret = {};

    for (let key in obj) if (model.includes(key)) ret[key] = obj[key];

    return ret;
  }

  planLooksUnset(planVal) {
    if (planVal == null || planVal === "") return true;
    if (
      typeof planVal === "object" &&
      planVal !== null &&
      !(planVal instanceof Date)
    ) {
      const rid =
        planVal.id !== undefined && planVal.id !== null
          ? planVal.id
          : planVal.plan_id;
      if (rid == null || rid === "") return true;
      const s = String(rid).trim().toLowerCase();
      return s === "default" || s === "none" || s === "null" || s === "undefined";
    }
    const s = String(planVal).trim().toLowerCase();
    return s === "default" || s === "none" || s === "null" || s === "undefined";
  }

  rawPlanId(planField) {
    if (planField == null || planField === "") return null;
    if (typeof planField === "object" && planField !== null && !(planField instanceof Date)) {
      const id = planField.id || planField.plan_id;
      return id ? String(id) : null;
    }
    const str = String(planField).trim();
    return str ? str : null;
  }

  /**
   * Intenta obtener id de paquete desde documento afiliación (formas viejas/anidadas).
   */
  affiliationDocPlanId(aff) {
    if (!aff) return null;
    const fromNested = this.rawPlanId(aff.plan);
    if (fromNested && !this.planLooksUnset(fromNested)) return fromNested;
    const flat =
      aff.planId ||
      aff.plan_id ||
      aff.selectedPlanId ||
      aff.packId ||
      (typeof aff.selectedPlan === "string" ? aff.selectedPlan : null);
    const raw = this.rawPlanId(flat);
    if (raw && !this.planLooksUnset(raw)) return raw;
    return null;
  }

  /**
   * Si el usuario tiene puntos de afiliación típicos de un paquete, infiere plan (BD sin campo plan).
   */
  inferPlanFromAffiliationPoints(user, plansCatalog) {
    if (!user || !Array.isArray(plansCatalog)) return null;
    const pts = Number(user.affiliation_points);
    if (!Number.isFinite(pts) || pts <= 0) return null;
    for (const p of plansCatalog) {
      if (!p || this.planLooksUnset(p.id)) continue;
      const ap = Number(p.affiliation_points);
      if (Number.isFinite(ap) && ap === pts) return String(p.id);
    }
    return null;
  }

  /**
   * Id de plan homogéneo (string) desde usuario o última afiliación.
   */
  resolveUserPlanId(user, lastAffiliationRecord) {
    if (!user) return "default";
    const upId = this.rawPlanId(user.plan);
    if (upId && !this.planLooksUnset(upId)) return String(upId);

    let fromAff = this.affiliationDocPlanId(lastAffiliationRecord);
    if (fromAff && !this.planLooksUnset(fromAff)) return String(fromAff);

    return "default";
  }

  finalizePlanWithGuesses(userPlan, user, plansCatalog) {
    if (!this.planLooksUnset(userPlan)) return userPlan;
    const guessed = user && this.inferPlanFromAffiliationPoints(user, plansCatalog);
    return guessed || "default";
  }

  /**
   * De todas las afiliaciones del usuario en memoria, elige la mejor para inferir plan:
   * excluye rechazadas; prioriza aprobadas; si no hay, pendientes; orden por fecha.
   */
  pickBestAffiliationFromList(list) {
    if (!Array.isArray(list) || !list.length) return null;
    const norm = (s) => String(s || "").toLowerCase().trim();
    const bad = new Set(["rejected", "cancelled", "canceled"]);
    const viable = list.filter((a) => {
      if (!a || bad.has(norm(a.status))) return false;
      const st = norm(a.status);
      const hasPack =
        Boolean(this.affiliationDocPlanId(a)) ||
        (a.plan != null && a.plan !== "") ||
        (typeof a.plan === "object" &&
          a.plan !== null &&
          Object.keys(a.plan).length > 0);
      if (hasPack) return true;
      return st === "approved" || st === "pending";
    });
    if (!viable.length) return null;
    const approved = viable.filter((a) => norm(a.status) === "approved");
    const pending = viable.filter((a) => norm(a.status) === "pending");
    const pool = approved.length ? approved : pending.length ? pending : viable;
    pool.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return pool[0] || null;
  }

  /** Carga afiliaciones por userId o user_id (registros viejos) y elige la mejor fila. */
  async pickAffiliationForPlanResolution(Affiliation, userId) {
    const list = await Affiliation.find({
      $or: [{ userId: userId }, { user_id: userId }],
    }).catch(() => []);
    return this.pickBestAffiliationFromList(list);
  }

  // Actualiza total_points de un nodo y propaga hacia arriba
  async updateTotalPointsCascade(User, Tree, userId) {
    // 1. Obtener el nodo del árbol
    const node = await Tree.findOne({ id: userId });
    if (!node) return;

    // 2. Obtener el usuario
    const user = await User.findOne({ id: userId });
    if (!user) return;

    // 3. Calcular el total de los hijos
    let childrenTotal = 0;
    if (node.childs && node.childs.length > 0) {
      const childUsers = await User.find({ id: { $in: node.childs } });
      childrenTotal = childUsers.reduce((acc, c) => acc + (c.total_points || 0), 0);
    }

    // 4. Calcular el total_points propio
    const total_points = (user.points || 0) + (user.affiliation_points || 0) + childrenTotal;

    // 5. Guardar el total_points en el usuario
    await User.update({ id: userId }, { total_points });

    // 6. Propagar hacia arriba si tiene padre
    if (node.parent) {
      await this.updateTotalPointsCascade(User, Tree, node.parent);
    }
  }
}

export default new Lib()