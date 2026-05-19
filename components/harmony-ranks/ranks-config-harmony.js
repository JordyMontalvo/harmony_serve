/**
 * CONFIGURACIÓN DEL NUEVO SISTEMA DE RANGOS HARMONY
 * 
 * Sistema Unilevel con requisitos:
 * - PP (Puntaje Personal): max(puntos_productos, puntos_afiliacion)
 * - PG (Puntaje Grupal): total_points (volumen total de toda la organización)
 * - Activos Directos: directos con PP >= 180
 * - Rangos Directos: piernas con usuarios que cerraron el rango requerido
 */

const ranksHarmony = [
  {
    id: 1,
    name: 'MILLONARIO',
    pp_required: 180,
    pg_required: 1200,
    activos_directos_required: 0,
    rangos_directos_required: null, // No requiere rangos directos
    activacion_minima: 180
  },
  {
    id: 2,
    name: 'ORO',
    pp_required: 180,
    pg_required: 2500,
    activos_directos_required: 2,
    rangos_directos_required: null,
    activacion_minima: 180
  },
  {
    id: 3,
    name: 'ESMERALDA',
    pp_required: 180,
    pg_required: 5000,
    activos_directos_required: 2,
    rangos_directos_required: null,
    activacion_minima: 180
  },
  {
    id: 4,
    name: 'PLATINO',
    pp_required: 180,
    pg_required: 12000,
    activos_directos_required: 4,
    rangos_directos_required: null,
    activacion_minima: 180
  },
  {
    id: 5,
    name: 'DIAMANTE',
    pp_required: 225,
    pg_required: 30000,
    activos_directos_required: 4,
    rangos_directos_required: {
      rango: 'ESMERALDA',
      cantidad_piernas: 3
    },
    activacion_minima: 180
  },
  {
    id: 6,
    name: 'DIAMANTE AZUL',
    pp_required: 270,
    pg_required: 50000,
    activos_directos_required: 5,
    rangos_directos_required: {
      rango: 'PLATINO',
      cantidad_piernas: 3
    },
    activacion_minima: 180
  },
  {
    id: 7,
    name: 'DIAMANTE EJECUTIVO',
    pp_required: 270,
    pg_required: 110000,
    activos_directos_required: 5,
    rangos_directos_required: {
      rango: 'DIAMANTE',
      cantidad_piernas: 3
    },
    activacion_minima: 180
  },
  {
    id: 8,
    name: 'DOBLE DIAMANTE',
    pp_required: 270,
    pg_required: 230000,
    activos_directos_required: 6,
    rangos_directos_required: {
      rango: 'DIAMANTE AZUL',
      cantidad_piernas: 3
    },
    activacion_minima: 180
  },
  {
    id: 9,
    name: 'DIAMANTE CORONA',
    pp_required: 270,
    pg_required: 400000,
    activos_directos_required: 6,
    rangos_directos_required: {
      rango: 'DIAMANTE EJECUTIVO',
      cantidad_piernas: 3
    },
    activacion_minima: 180
  },
  {
    id: 10,
    name: 'TOP HARMONY',
    pp_required: 270,
    pg_required: 1300000,
    activos_directos_required: 8,
    rangos_directos_required: {
      rango: 'DOBLE DIAMANTE',
      cantidad_piernas: 3
    },
    activacion_minima: 180
  }
]

module.exports = {
  ranksHarmony
}
