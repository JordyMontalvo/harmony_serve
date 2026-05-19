/**
 * MÓDULO DE CÁLCULO DE RANGOS - SISTEMA HARMONY
 * 
 * Nuevo sistema Unilevel con:
 * - PP (Puntaje Personal): max(puntos_productos, puntos_afiliacion)
 * - PG (Puntaje Grupal): total del grupo sin puntos propios (el caller suele pasar total_points − PP)
 * - Activos Directos: directos con activated=true (sin _activated) o PP >= 180 (al menos uno)
 * - Rangos Directos: directos que alcanzaron el rango requerido en el cierre evaluado
 */

const { ranksHarmony } = require('./ranks-config-harmony')

/**
 * Calcula el PP (Puntaje Personal) de un usuario
 * PP = max(puntos_productos, puntos_afiliacion)
 */
function calcularPP(usuario) {
  const puntosProductos = usuario.puntos_productos || 0
  const puntosAfiliacion = usuario.puntos_afiliacion || 0
  return Math.max(puntosProductos, puntosAfiliacion)
}

/**
 * Obtiene el PG (Puntaje Grupal) de un usuario
 * PG = total_points (ya calculado en la red)
 */
function obtenerPG(usuario) {
  return usuario.total_points || 0
}

function isActivoDbFlag(value) {
  return (
    value === true ||
    value === 1 ||
    value === "true" ||
    value === "TRUE" ||
    value === "1"
  )
}

function isUsuarioActivoHarmony(usuario) {
  if (!usuario) return false
  const pp = calcularPP(usuario)
  return isActivoDbFlag(usuario.activated) || pp >= 180
}

/**
 * Cuenta los Activos Directos de un usuario
 * Activo Directo = directo con activated=true o PP >= 180 (al menos uno)
 */
function contarActivosDirectos(usuario, todosUsuarios) {
  if (!usuario.directos || usuario.directos.length === 0) {
    return 0
  }

  let activosDirectos = 0
  
  for (const directoId of usuario.directos) {
    const directo = todosUsuarios.find(u => u.id === directoId)
    if (directo && isUsuarioActivoHarmony(directo)) {
      activosDirectos++
    }
  }

  return activosDirectos
}

/**
 * Cuenta directos que alcanzaron el rango requerido (o superior) en el cierre evaluado.
 * Especificación Harmony: "Rangos directos" = personas afiliadas directamente que
 * calificaron ese rango en el periodo (no se busca en profundidad de pierna).
 */
function contarPiernasConRango(usuario, todosUsuarios, rangosCalculados, rangoRequerido) {
  if (!usuario.directos || usuario.directos.length === 0) {
    return 0
  }

  const _rangoMatch = ranksHarmony.find(r => r.name === rangoRequerido)
  const idRangoRequerido = _rangoMatch ? _rangoMatch.id : 0
  let piernasConRango = 0

  for (const directoId of usuario.directos) {
    const rangoDirecto = rangosCalculados[directoId] || 0
    if (rangoDirecto >= idRangoRequerido) {
      piernasConRango++
    }
  }

  return piernasConRango
}

/**
 * Verifica si un usuario cumple los requisitos para un rango específico
 */
function cumpleRequisitosRango(usuario, rango, todosUsuarios, rangosCalculados, logs = []) {
  const pp = calcularPP(usuario)
  const pg = obtenerPG(usuario)
  const activosDirectos = contarActivosDirectos(usuario, todosUsuarios)

  logs.push(`\n🎯 Evaluando ${rango.name} para ${usuario.name}:`)
  logs.push(`  PP requerido: ${rango.pp_required} | PP actual: ${pp}`)
  logs.push(`  PG requerido: ${rango.pg_required} | PG actual: ${pg}`)
  logs.push(`  Activos Directos requeridos: ${rango.activos_directos_required} | Actual: ${activosDirectos}`)

  // 1. Verificar PP
  if (pp < rango.pp_required) {
    logs.push(`  ❌ No cumple PP`)
    return false
  }

  // 2. Verificar PG
  if (pg < rango.pg_required) {
    logs.push(`  ❌ No cumple PG`)
    return false
  }

  // 3. Verificar Activos Directos
  if (activosDirectos < rango.activos_directos_required) {
    logs.push(`  ❌ No cumple Activos Directos`)
    return false
  }

  // 4. Verificar Rangos Directos (si aplica)
  if (rango.rangos_directos_required) {
    const piernasConRango = contarPiernasConRango(
      usuario,
      todosUsuarios,
      rangosCalculados,
      rango.rangos_directos_required.rango
    )
    
    logs.push(`  Piernas con ${rango.rangos_directos_required.rango} requeridas: ${rango.rangos_directos_required.cantidad_piernas} | Actual: ${piernasConRango}`)
    
    if (piernasConRango < rango.rangos_directos_required.cantidad_piernas) {
      logs.push(`  ❌ No cumple Rangos Directos`)
      return false
    }
  }

  logs.push(`  ✅ CUMPLE TODOS LOS REQUISITOS PARA ${rango.name}`)
  return true
}

/**
 * Calcula el rango de un usuario
 * Retorna el ID del rango (1-10) o 0 si no califica
 */
function calcularRangoUsuario(usuario, todosUsuarios, rangosCalculados, logs = []) {
  logs.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  logs.push(`🔍 CALCULANDO RANGO: ${usuario.name}`)
  logs.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  // Verificar activación mínima
  const pp = calcularPP(usuario)
  if (pp < 180) {
    logs.push(`❌ Usuario no activo (PP: ${pp} < 180)`)
    return 0
  }

  // Evaluar rangos de mayor a menor
  const rangosOrdenados = [...ranksHarmony].sort((a, b) => b.id - a.id)

  for (const rango of rangosOrdenados) {
    if (cumpleRequisitosRango(usuario, rango, todosUsuarios, rangosCalculados, logs)) {
      logs.push(`\n🎉 RANGO ASIGNADO: ${rango.name}`)
      return rango.id
    }
  }

  logs.push(`\n⚠️ No cumple ningún rango específico, permanece ACTIVO`)
  return 0
}

/**
 * Calcula rangos para todos los usuarios
 * Retorna objeto { userId: rangoId }
 */
function calcularRangosTodos(usuarios, logs = []) {
  const rangosCalculados = {}

  logs.push(`\n╔═══════════════════════════════════════════════════════════╗`)
  logs.push(`║          INICIO DE CÁLCULO DE RANGOS HARMONY              ║`)
  logs.push(`╚═══════════════════════════════════════════════════════════╝\n`)

  // PASO 1: Calcular rangos base (sin dependencia de rangos directos)
  logs.push(`\n📋 PASO 1: Calculando rangos base (MILLONARIO a PLATINO)...`)
  
  const rangosBase = ranksHarmony.filter(r => !r.rangos_directos_required)
  
  for (const usuario of usuarios) {
    // Solo evaluar rangos base en esta pasada
    const rangosOrdenados = [...rangosBase].sort((a, b) => b.id - a.id)
    
    for (const rango of rangosOrdenados) {
      if (cumpleRequisitosRango(usuario, rango, usuarios, rangosCalculados, logs)) {
        rangosCalculados[usuario.id] = rango.id
        break
      }
    }
    
    if (!rangosCalculados[usuario.id]) {
      rangosCalculados[usuario.id] = 0 // ACTIVO
    }
  }

  // PASO 2: Calcular rangos altos (con dependencia de rangos directos)
  logs.push(`\n📋 PASO 2: Calculando rangos altos (DIAMANTE a TOP HARMONY)...`)
  
  const rangosAltos = ranksHarmony.filter(r => r.rangos_directos_required).sort((a, b) => a.id - b.id)
  
  // Iterar múltiples veces porque un usuario puede subir de rango y afectar a otros
  let cambiosEnIteracion = true
  let iteracion = 1
  
  while (cambiosEnIteracion && iteracion <= 10) {
    logs.push(`\n🔄 Iteración ${iteracion} de rangos altos...`)
    cambiosEnIteracion = false
    
    for (const usuario of usuarios) {
      const rangoActual = rangosCalculados[usuario.id] || 0
      
      for (const rango of rangosAltos) {
        // Solo evaluar si este rango es superior al actual
        if (rango.id > rangoActual) {
          if (cumpleRequisitosRango(usuario, rango, usuarios, rangosCalculados, logs)) {
            logs.push(`  🔺 ${usuario.name} sube de rango ${rangoActual} a ${rango.id} (${rango.name})`)
            rangosCalculados[usuario.id] = rango.id
            cambiosEnIteracion = true
            break // Pasar al siguiente usuario
          }
        }
      }
    }
    
    if (!cambiosEnIteracion) {
      logs.push(`  ✅ No hay más cambios, cálculo completado`)
    }
    
    iteracion++
  }

  logs.push(`\n╔═══════════════════════════════════════════════════════════╗`)
  logs.push(`║          CÁLCULO DE RANGOS COMPLETADO                     ║`)
  logs.push(`╚═══════════════════════════════════════════════════════════╝\n`)

  return rangosCalculados
}

/**
 * Genera un reporte de rangos
 */
function generarReporte(usuarios, rangosCalculados) {
  const reporte = []
  
  reporte.push(`\n╔═══════════════════════════════════════════════════════════╗`)
  reporte.push(`║              REPORTE FINAL DE RANGOS                      ║`)
  reporte.push(`╚═══════════════════════════════════════════════════════════╝\n`)

  const conteoRangos = {}
  ranksHarmony.forEach(r => conteoRangos[r.name] = 0)
  conteoRangos['ACTIVO'] = 0

  for (const usuario of usuarios) {
    const rangoId = rangosCalculados[usuario.id] || 0
    const _rn = ranksHarmony.find(r => r.id === rangoId)
    const rangoNombre = _rn ? _rn.name : 'ACTIVO'
    const pp = calcularPP(usuario)
    const pg = obtenerPG(usuario)

    conteoRangos[rangoNombre]++

    reporte.push(`👤 ${usuario.name.padEnd(20)} | Rango: ${rangoNombre.padEnd(20)} | PP: ${pp.toString().padStart(6)} | PG: ${pg.toString().padStart(8)}`)
  }

  reporte.push(`\n${'─'.repeat(63)}`)
  reporte.push(`\n📊 RESUMEN DE RANGOS:\n`)
  
  for (const [rango, cantidad] of Object.entries(conteoRangos)) {
    if (cantidad > 0) {
      reporte.push(`   ${rango.padEnd(20)}: ${cantidad} usuario(s)`)
    }
  }

  return reporte.join('\n')
}

module.exports = {
  calcularPP,
  obtenerPG,
  isUsuarioActivoHarmony,
  contarActivosDirectos,
  contarPiernasConRango,
  cumpleRequisitosRango,
  calcularRangoUsuario,
  calcularRangosTodos,
  generarReporte
}
