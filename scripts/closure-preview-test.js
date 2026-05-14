#!/usr/bin/env node
/**
 * Prueba el preview de cierre (POST action=new) contra un servidor ya en marcha.
 * No guarda nada en BD. Requiere .env con DB o servidor con Mongo conectado.
 *
 * Comprueba invariantes del cálculo (residual vs detalle, rango vs PP, niveles, compresión).
 *
 * Uso:
 *   CLOSURE_TEST_URL=http://127.0.0.1:3000 node scripts/closure-preview-test.js
 *   npm run test:closure
 *
 * Opcional:
 *   CLOSURE_TEST_VERBOSE=1 — listar cada fallo de invariante
 *   CLOSURE_TEST_AUDIT=0 — desactiva el listado usuario por usuario (por defecto está activo)
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") })

const http = require("http")
const https = require("https")

const rawUrl =
  process.env.CLOSURE_TEST_URL || "http://127.0.0.1:3000"
const url = new URL("/api/admin/closeds", rawUrl.replace(/\/$/, ""))
const VERBOSE = process.env.CLOSURE_TEST_VERBOSE === "1"
const AUDIT =
  process.env.CLOSURE_TEST_AUDIT !== "0"
const EPS = 0.02

const body = JSON.stringify({ action: "new" })

/** Misma tabla que en pages/api/admin/closeds.js */
const RANK_MAX_LEVELS = {
  SIN_RANGO: 3,
  MILLONARIO: 5,
  ORO: 5,
  ESMERALDA: 6,
  PLATINO: 7,
  DIAMANTE: 8,
  DIAMANTE_AZUL: 9,
  DIAMANTE_EJECUTIVO: 10,
  DOBLE_DIAMANTE: 11,
  DIAMANTE_CORONA: 12,
  TOP_HARMONY: 30,
}

const pos = {
  none: -1,
  SIN_RANGO: 0,
  MILLONARIO: 1,
  ORO: 2,
  ESMERALDA: 3,
  PLATINO: 4,
  DIAMANTE: 5,
  DIAMANTE_AZUL: 6,
  DIAMANTE_EJECUTIVO: 7,
  DOBLE_DIAMANTE: 8,
  DIAMANTE_CORONA: 9,
  TOP_HARMONY: 10,
}

function normalizeRankKey(rank) {
  if (!rank) return "SIN_RANGO"
  let s = String(rank)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/Á/g, "A")
    .replace(/É/g, "E")
    .replace(/Í/g, "I")
    .replace(/Ó/g, "O")
    .replace(/Ú/g, "U")
  if (s === "NONE" || s === "NO_RANK" || s === "SINRANGO" || s === "ACTIVE")
    return "SIN_RANGO"
  return s
}

function depthForClosureRank(rankKey) {
  if (rankKey === "none") return 0
  const k = normalizeRankKey(rankKey)
  return RANK_MAX_LEVELS[k] ?? RANK_MAX_LEVELS.SIN_RANGO
}

function rankAllowsResidualDynamicCompression(rank) {
  if (!rank || rank === "none") return false
  const p = pos[normalizeRankKey(rank)]
  return typeof p === "number" && p >= pos.PLATINO
}

function request() {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: 120000,
    }

    const req = lib.request(opts, (res) => {
      const chunks = []
      res.on("data", (c) => {
        chunks.push(c)
      })
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8")
        resolve({ status: res.statusCode, headers: res.headers, text })
      })
    })
    req.on("error", reject)
    req.on("timeout", () => {
      req.destroy()
      reject(new Error("timeout esperando respuesta"))
    })
    req.write(body)
    req.end()
  })
}

function sumLineAmounts(node) {
  return (node.residual_bonus_arr || []).reduce(
    (s, x) => s + Number(x.amount || 0),
    0
  )
}

function collectInvariants(tree) {
  const byRank = {}
  const issues = {
    residualMismatch: [],
    lineFormula: [],
    rankPP: [],
    levelsMismatch: [],
    hqPP: [],
    hqPuntosPropios: [],
    hqNiveles: [],
    compressionFlag: [],
    noneReceivesResidual: [],
    parentMissing: [],
  }

  const idSet = new Set(tree.map((n) => String(n.id)))

  for (const n of tree) {
    const r = n.rank || "none"
    byRank[r] = (byRank[r] || 0) + 1

    const bonus = Number(n.residual_bonus || 0)
    const fromLines = sumLineAmounts(n)
    if (Math.abs(bonus - fromLines) > EPS) {
      issues.residualMismatch.push({
        id: n.id,
        name: n.name,
        residual_bonus: bonus,
        suma_lineas: fromLines,
        n_lineas: (n.residual_bonus_arr || []).length,
      })
    }

    for (const line of n.residual_bonus_arr || []) {
      const exp =
        Number(line.r) * Number(line.val) * Number(line.rr)
      const amt = Number(line.amount || 0)
      if (Math.abs(exp - amt) > EPS) {
        issues.lineFormula.push({
          id: n.id,
          cobrador: n.name,
          line,
          esperado: exp,
          amount: amt,
        })
      }
    }

    const hq = n._harmony_qualification || {}
    const pp = Number(
      hq.pp !== undefined && hq.pp !== null ? hq.pp : n.points ?? 0
    )

    if (r === "none" && pp >= 180) {
      issues.rankPP.push({
        tipo: "none_con_pp_alto",
        id: n.id,
        name: n.name,
        pp,
        rank: r,
      })
    }
    if (r !== "none" && pp < 180) {
      issues.rankPP.push({
        tipo: "cualificado_sin_pp_suficiente",
        id: n.id,
        name: n.name,
        pp,
        rank: r,
      })
    }

    const expLevels = depthForClosureRank(r)
    const gotLevels = Number(n.levels)
    if (gotLevels !== expLevels) {
      issues.levelsMismatch.push({
        id: n.id,
        name: n.name,
        rank: r,
        niveles_api: gotLevels,
        niveles_esperados: expLevels,
      })
    }

    const pts = Number(n.points || 0)
    const ap = Number(n.affiliation_points || 0)
    if (
      hq.pp !== undefined &&
      hq.pp !== null &&
      String(hq.pp) !== "" &&
      Math.abs(Number(hq.pp) - pts) > EPS
    ) {
      issues.hqPP.push({
        id: n.id,
        name: n.name,
        hq_pp: hq.pp,
        node_points: pts,
      })
    }

    const sumPropios = Number(hq.puntos_propios_suma_activ_mas_afil)
    if (
      hq.puntos_propios_suma_activ_mas_afil !== undefined &&
      Math.abs(sumPropios - (pts + ap)) > EPS
    ) {
      issues.hqPuntosPropios.push({
        id: n.id,
        name: n.name,
        esperado: pts + ap,
        hq: sumPropios,
      })
    }

    if (
      hq.niveles_residual_permitidos !== undefined &&
      Number(hq.niveles_residual_permitidos) !== gotLevels
    ) {
      issues.hqNiveles.push({
        id: n.id,
        name: n.name,
        hq_niveles: hq.niveles_residual_permitidos,
        node_levels: gotLevels,
      })
    }

    const expComp = rankAllowsResidualDynamicCompression(r)
    if (
      hq.compresion_residual_activa !== undefined &&
      Boolean(hq.compresion_residual_activa) !== expComp
    ) {
      issues.compressionFlag.push({
        id: n.id,
        name: n.name,
        rank: r,
        hq_compresion: hq.compresion_residual_activa,
        esperado: expComp,
      })
    }

    if (r === "none" && Math.abs(bonus) > EPS) {
      issues.noneReceivesResidual.push({
        id: n.id,
        name: n.name,
        residual_bonus: bonus,
      })
    }

    if (n.parent != null && n.parent !== "" && !idSet.has(String(n.parent))) {
      issues.parentMissing.push({ id: n.id, parent: n.parent })
    }
  }

  return { byRank, issues }
}

function printVerbose(issues) {
  for (const [k, arr] of Object.entries(issues)) {
    if (!Array.isArray(arr) || !arr.length) continue
    console.log("")
    console.log(`--- ${k} (${arr.length}) ---`)
    console.log(JSON.stringify(arr, null, 2))
  }
}

/**
 * Revisión nodo a nodo: hijos rotos, cualificados detallados, orígenes de residual (quién aporta volumen en líneas).
 */
function perUserAudit(tree) {
  const idSet = new Set(tree.map((n) => String(n.id)))
  const childBroken = []

  for (const n of tree) {
    for (const cid of n.childs || []) {
      if (!idSet.has(String(cid))) {
        childBroken.push({
          padre_id: n.id,
          padre: n.name,
          hijo_id_faltante: cid,
        })
      }
    }
  }

  const qualified = tree
    .filter((n) => n.rank && n.rank !== "none")
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "es"))
    .map((n) => {
      const hq = n._harmony_qualification || {}
      const bonus = Number(n.residual_bonus || 0)
      const lines = n.residual_bonus_arr || []
      return {
        id: n.id,
        dni: n.dni || null,
        nombre: n.name,
        rank: n.rank,
        niveles: n.levels,
        pp: hq.pp,
        pg_sin_propio: hq.pg_grupal_sin_propio,
        activos_directos: hq.activos_directos,
        rango_calculado: hq.rango_calculado_nombre,
        residual: Number(bonus.toFixed(2)),
        lineas_residual: lines.length,
        compresion: Boolean(hq.compresion_residual_activa),
        plan: hq.plan != null ? hq.plan : n.plan,
      }
    })

  /** Quién “origina” cada línea de residual (campo name/dni de la línea) */
  const aportesPorOrigen = new Map()
  for (const n of tree) {
    for (const line of n.residual_bonus_arr || []) {
      const origen =
        (line.dni ? String(line.dni) + " — " : "") + (line.name || "?")
      const sig = (aportesPorOrigen.get(origen) || 0) + Number(line.amount || 0)
      aportesPorOrigen.set(origen, sig)
    }
  }
  const aportesOrdenados = [...aportesPorOrigen.entries()]
    .map(([origen, total]) => ({ origen, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total)

  const sospechosos = []
  for (const n of tree) {
    const notas = []
    const r = n.rank || "none"
    if (r !== "none" && !n._harmony_qualification)
      notas.push("cualificado sin _harmony_qualification")
    const bonus = Number(n.residual_bonus || 0)
    const nLin = (n.residual_bonus_arr || []).length
    if (Math.abs(bonus) > EPS && nLin === 0)
      notas.push("residual>0 pero sin líneas")
    if (nLin > 0 && Math.abs(bonus) <= EPS)
      notas.push("tiene líneas pero residual ~0")
    if (notas.length)
      sospechosos.push({
        id: n.id,
        nombre: n.name,
        rank: r,
        notas,
      })
  }

  return {
    childBroken,
    qualified,
    aportesOrdenados,
    sospechosos,
  }
}

function main() {
  console.log("=== Prueba preview cierre (POST action=new) + invariantes ===")
  console.log("URL:", url.toString())
  console.log("Hora:", new Date().toISOString())
  console.log("")

  request()
    .then(({ status, text }) => {
      console.log("HTTP:", status)
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.log("Cuerpo no JSON (primeros 400 chars):")
        console.log(text.slice(0, 400))
        process.exit(status >= 400 ? 1 : 0)
      }

      if (data.error === true) {
        console.log("Error API:", data.msg || data)
        process.exit(1)
      }

      const tree = data.tree
      if (!Array.isArray(tree)) {
        console.log("Respuesta OK pero sin array tree. Keys:", Object.keys(data))
        process.exit(1)
      }

      if (!Array.isArray(data.affiliations)) {
        console.warn("Aviso: affiliations no es array")
      }
      if (!Array.isArray(data.activations)) {
        console.warn("Aviso: activations no es array")
      }

      const qualified = tree.filter((n) => n.rank && n.rank !== "none")
      const sumRes = qualified.reduce(
        (s, n) => s + Number(n.residual_bonus || 0),
        0
      )
      const sumLines = qualified.reduce(
        (s, n) => s + (n.residual_bonus_arr || []).length,
        0
      )
      const sumAllLineAmounts = tree.reduce((s, n) => s + sumLineAmounts(n), 0)

      const { byRank, issues } = collectInvariants(tree)

      console.log("Nodos en árbol:", tree.length)
      console.log("Distribución rank:", JSON.stringify(byRank))
      console.log("Filas con rango != none (tabla admin):", qualified.length)
      console.log("Suma bono residual (nodos cualificados):", sumRes.toFixed(2))
      console.log(
        "Suma importes líneas detalle (todos los nodos):",
        sumAllLineAmounts.toFixed(2)
      )
      console.log(
        "Coincide suma residual con suma líneas:",
        Math.abs(sumRes - sumAllLineAmounts) < EPS ? "SÍ" : "NO (revisar)"
      )
      console.log("Líneas detalle residual (total filas):", sumLines)

      const sample = qualified.slice(0, 3).map((n) => ({
        name: n.name,
        rank: n.rank,
        levels: n.levels,
        residual: Number(n.residual_bonus || 0).toFixed(2),
        pp: n._harmony_qualification && n._harmony_qualification.pp,
      }))
      console.log(
        "Muestra (3 primeras filas cualificadas):",
        JSON.stringify(sample, null, 2)
      )

      const counts = {}
      let fail = false
      for (const [k, arr] of Object.entries(issues)) {
        if (!Array.isArray(arr)) continue
        counts[k] = arr.length
        if (arr.length) fail = true
      }

      console.log("")
      console.log("--- Invariantes ---")
      console.log(JSON.stringify(counts, null, 2))
      if (VERBOSE && fail) printVerbose(issues)

      if (fail) {
        console.log("")
        console.log(
          "FALLO: hay violaciones de invariantes. Re-ejecuta con CLOSURE_TEST_VERBOSE=1 para el detalle."
        )
        if (!VERBOSE) {
          const firstKey = Object.keys(issues).find(
            (k) => Array.isArray(issues[k]) && issues[k].length
          )
          if (firstKey) {
            console.log("Primer tipo con errores:", firstKey)
            console.log("Ejemplo:", JSON.stringify(issues[firstKey][0], null, 2))
          }
        }
        process.exit(1)
      }

      if (AUDIT) {
        const audit = perUserAudit(tree)
        console.log("")
        console.log("--- Auditoría usuario por usuario ---")
        console.log(
          "Referencias hijo→padre rotas (hijo_id no existe en árbol):",
          audit.childBroken.length
        )
        if (audit.childBroken.length) {
          console.log(JSON.stringify(audit.childBroken.slice(0, 20), null, 2))
          if (audit.childBroken.length > 20)
            console.log(`… y ${audit.childBroken.length - 20} más`)
        }

        console.log("")
        console.log(
          "Cualificados (rank != none), ordenados por nombre:",
          audit.qualified.length
        )
        console.log(JSON.stringify(audit.qualified, null, 2))

        console.log("")
        console.log(
          "Origen del volumen en líneas de residual (suma de amount por persona que genera la línea):"
        )
        console.log(JSON.stringify(audit.aportesOrdenados, null, 2))

        console.log("")
        console.log(
          "Sospechosos adicionales (inconsistencias residuo/líneas o HQ faltante):",
          audit.sospechosos.length
        )
        if (audit.sospechosos.length)
          console.log(JSON.stringify(audit.sospechosos, null, 2))
      }

      console.log("")
      console.log(
        "OK — preview e invariantes básicos OK. Logs servidor: líneas POST ... / new ... / 1 / 2 — rangos ... / 3 / 4 en pages/api/admin/closeds.js"
      )
      process.exit(0)
    })
    .catch((err) => {
      console.error("Fallo de red o servidor apagado:", err.message)
      console.error(
        "Arranca el API (ej. NODE_OPTIONS=--openssl-legacy-provider npm run dev) y vuelve a ejecutar."
      )
      process.exit(1)
    })
}

main()
