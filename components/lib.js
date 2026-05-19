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
      if (rid == null || rid === "") {
        const nm = planVal.name || planVal.label;
        if (nm != null && String(nm).trim() !== "") return false;
        return true;
      }
      const s = String(rid).trim().toLowerCase();
      return s === "default" || s === "none" || s === "null" || s === "undefined";
    }
    const s = String(planVal).trim().toLowerCase();
    return s === "default" || s === "none" || s === "null" || s === "undefined";
  }

  /** Misma lógica que Harmony-admin Users.vue getPlanLabel */
  adminPlanLabel(val) {
    if (!val) return "";
    const id = typeof val === "object" ? val.id || val.plan_id : val;
    const name = typeof val === "object" ? val.name : undefined;

    if (
      id === "basic" ||
      name === "DISTRIBUIDOR" ||
      name === "EJECUTIVO" ||
      name === "Ejecutivo"
    ) {
      return "DISTRIBUIDOR";
    }
    if (
      id === "standard" ||
      id === "business" ||
      name === "EMPRESARIO" ||
      name === "Empresario" ||
      name === "Distribuidor" ||
      name === "DISTRIBUIDOR (ANTIGUO)"
    ) {
      return "EMPRESARIO";
    }
    if (id === "master" || name === "MASTER" || name === "Master") return "MASTER";
    if (id === "vip" || name === "VIP" || name === "Vip") return "VIP";

    if (typeof val === "object") {
      return (val.name || "").toUpperCase();
    }
    return String(val).toUpperCase();
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

    if (user.n != null && user.n !== "") {
      const n = Number(user.n);
      if (Number.isFinite(n)) {
        const byN = plansCatalog.find((p) => p && Number(p.n) === n);
        if (byN && byN.id) return String(byN.id);
      }
    }

    const pts = Number(user.affiliation_points);
    if (!Number.isFinite(pts) || pts <= 0) return null;

    for (const p of plansCatalog) {
      if (!p || this.planLooksUnset(p.id)) continue;
      const ap = Number(p.affiliation_points);
      if (Number.isFinite(ap) && ap === pts) return String(p.id);
    }

    let best = null;
    let bestDiff = Infinity;
    for (const p of plansCatalog) {
      if (!p || this.planLooksUnset(p.id)) continue;
      const ap = Number(p.affiliation_points);
      if (!Number.isFinite(ap)) continue;
      const diff = Math.abs(ap - pts);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = p;
      }
    }
    if (best && best.id && bestDiff <= 8) return String(best.id);

    return null;
  }

  normalizePlanKey(val) {
    return String(val || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  planNameFromField(planField) {
    if (planField == null || planField === "") return null;
    if (
      typeof planField === "object" &&
      planField !== null &&
      !(planField instanceof Date)
    ) {
      const n = planField.name || planField.label;
      return n != null && String(n).trim() !== "" ? String(n).trim() : null;
    }
    return null;
  }

  findPlanInCatalog(plansCatalog, hints = {}) {
    if (!Array.isArray(plansCatalog) || !plansCatalog.length) return null;
    const norm = (v) => this.normalizePlanKey(v);

    if (hints.id != null && !this.planLooksUnset(hints.id)) {
      const row = plansCatalog.find((p) => p && norm(p.id) === norm(hints.id));
      if (row) return row;
    }

    if (hints.name) {
      const want = norm(hints.name);
      const byName = plansCatalog.find((p) => p && norm(p.name) === want);
      if (byName) return byName;
    }

    const pts = Number(hints.affiliationPoints);
    if (Number.isFinite(pts) && pts > 0) {
      const byPts = plansCatalog.find(
        (p) => p && Number(p.affiliation_points) === pts
      );
      if (byPts) return byPts;
    }

    return null;
  }

  /**
   * Etiqueta final para UI: prueba plan crudo del usuario, id resuelto y afiliación
   * (misma prioridad que ve el admin en la tabla de usuarios).
   */
  resolvePlanLabelForUser(user, resolvedPlanId, plansCatalog, lastAffiliationRecord) {
    const candidates = [
      user && user.plan,
      resolvedPlanId,
      lastAffiliationRecord && lastAffiliationRecord.plan,
    ];

    for (const c of candidates) {
      const admin = this.adminPlanLabel(c);
      if (admin) return admin;
      if (c == null || c === "" || this.planLooksUnset(c)) continue;
      const lbl = this.planDisplayLabel(c, plansCatalog);
      if (lbl && lbl !== "SIN MEMBRESÍA") return lbl;
    }

    if (user && Array.isArray(plansCatalog) && plansCatalog.length) {
      const guessed = this.inferPlanFromAffiliationPoints(user, plansCatalog);
      if (guessed) {
        const admin = this.adminPlanLabel(guessed);
        if (admin) return admin;
        return this.planDisplayLabel(guessed, plansCatalog);
      }
    }

    return "SIN MEMBRESÍA";
  }

  /** Etiqueta visible alineada con Harmony-admin Users.getPlanLabel */
  planDisplayLabel(planVal, plansCatalog) {
    if (planVal == null || planVal === "") return "SIN MEMBRESÍA";

    const adminFirst = this.adminPlanLabel(planVal);
    if (adminFirst) return adminFirst;

    if (this.planLooksUnset(planVal)) return "SIN MEMBRESÍA";

    let id =
      typeof planVal === "object" ? planVal.id || planVal.plan_id : planVal;
    let name = typeof planVal === "object" ? planVal.name : null;

    const hintName =
      name ||
      (typeof planVal === "string" && !this.planLooksUnset(planVal)
        ? planVal
        : null);

    const row = this.findPlanInCatalog(plansCatalog, {
      id,
      name: hintName,
      affiliationPoints:
        typeof planVal === "object" ? planVal.affiliation_points : null,
    });
    if (row) {
      id = row.id;
      name = row.name;
    }

    const idNorm = this.normalizePlanKey(id);
    const nameNorm = this.normalizePlanKey(name);

    if (
      idNorm === "basic" ||
      idNorm === "distribuidor" ||
      nameNorm === "distribuidor" ||
      nameNorm === "ejecutivo"
    ) {
      return "DISTRIBUIDOR";
    }
    if (
      idNorm === "standard" ||
      idNorm === "business" ||
      nameNorm === "empresario" ||
      nameNorm === "distribuidorantiguo"
    ) {
      return "EMPRESARIO";
    }
    if (idNorm === "master" || nameNorm === "master") return "MASTER";
    if (idNorm === "vip" || nameNorm === "vip") return "VIP";
    if (idNorm === "early") return "CLIENTE PREFERENTE";

    if (name) return String(name).toUpperCase();
    if (id && !this.planLooksUnset(id)) return String(id).toUpperCase();
    return "SIN MEMBRESÍA";
  }

  resolvePlanFieldToId(planField, affiliationPoints, plansCatalog) {
    const id = this.rawPlanId(planField);
    if (id && !this.planLooksUnset(id)) {
      if (Array.isArray(plansCatalog) && plansCatalog.length) {
        const row = this.findPlanInCatalog(plansCatalog, {
          id,
          affiliationPoints,
        });
        if (row && row.id) return String(row.id);
      }
      return String(id);
    }

    const nm = this.planNameFromField(planField);
    if (nm && Array.isArray(plansCatalog) && plansCatalog.length) {
      const row = this.findPlanInCatalog(plansCatalog, {
        name: nm,
        affiliationPoints,
      });
      if (row && row.id) return String(row.id);
    }

    if (nm) {
      const n = this.normalizePlanKey(nm);
      if (n === "distribuidor" || n === "ejecutivo") return "basic";
      if (n === "empresario") return "business";
      if (n === "master") return "master";
      if (n === "vip") return "vip";
    }

    if (typeof planField === "string" && !this.planLooksUnset(planField)) {
      const s = String(planField).trim();
      if (Array.isArray(plansCatalog) && plansCatalog.length) {
        const row = this.findPlanInCatalog(plansCatalog, {
          id: s,
          name: s,
          affiliationPoints,
        });
        if (row && row.id) return String(row.id);
      }
      return s;
    }

    return null;
  }

  /**
   * Id de plan homogéneo (string) desde usuario o última afiliación.
   * Con catálogo: resuelve por nombre, id legacy o puntos de afiliación.
   */
  resolveUserPlanId(user, lastAffiliationRecord, plansCatalog = null) {
    if (!user) return "default";

    const fromUser = this.resolvePlanFieldToId(
      user.plan,
      user.affiliation_points,
      plansCatalog
    );
    if (fromUser && !this.planLooksUnset(fromUser)) return fromUser;

    const affId = this.affiliationDocPlanId(lastAffiliationRecord);
    if (affId && !this.planLooksUnset(affId)) {
      if (Array.isArray(plansCatalog) && plansCatalog.length) {
        const row = this.findPlanInCatalog(plansCatalog, { id: affId });
        if (row && row.id) return String(row.id);
      }
      return String(affId);
    }

    if (lastAffiliationRecord && lastAffiliationRecord.plan) {
      const affPts =
        typeof lastAffiliationRecord.plan === "object" &&
        lastAffiliationRecord.plan !== null
          ? lastAffiliationRecord.plan.affiliation_points
          : user.affiliation_points;
      const fromAffPlan = this.resolvePlanFieldToId(
        lastAffiliationRecord.plan,
        affPts,
        plansCatalog
      );
      if (fromAffPlan && !this.planLooksUnset(fromAffPlan)) return fromAffPlan;
    }

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