/* Datos FICTICIOS para el modo de prueba (usuario "prueba").
   Nada de esto toca Supabase ni tu base real: se cargan solo en el navegador.
   Los cambios que haga el usuario de prueba viven en memoria y se borran al recargar. */

const now = Date.now();
const dago = d => new Date(now - d * 864e5).toISOString();
const D = new Date(now - 6 * 3600e3);
const MES = D.getUTCFullYear() * 100 + (D.getUTCMonth() + 1);
const mesMas = n => { let y = Math.floor(MES / 100), m = MES % 100 + n; while (m > 12) { m -= 12; y++; } return y * 100 + m; };

// Quién aparece como autor de cada paso en el historial (para la "carga").
const nombrePorPaso = s => {
  if (s <= 4) return ["monse", "Monserrat Santillan"];
  if (s <= 10) return s % 2 ? ["leonardo", "Leonardo Navarro"] : ["german", "German Sainz"];
  if (s <= 16) return ["paola", "Paola Bañuelos"];
  if (s <= 27) return ["leonardo", "Leonardo Navarro"];
  if (s <= 30) return ["german", "German Sainz"];
  if (s <= 38) return ["miriam", "Miriam Roman"];
  return ["yuli", "Yuliana Navarro"];
};

let idc = 1;
function mk(o) {
  const paso = o.paso;
  const diasEnPaso = o.diasEnPaso ?? 2;
  const nPrev = paso - 1;
  const hist = [];
  for (let s = 1; s <= nPrev; s++) {
    const diasAtras = diasEnPaso + (nPrev - s) * 1.3;
    const [u, nombre] = nombrePorPaso(s);
    hist.push({ p: s, f: dago(diasAtras), u, nombre });
  }
  return {
    id: "demo-" + (idc++),
    nombre: o.nombre, cliente: o.cliente, tipo: o.tipo, area: o.area || "",
    responsable: o.responsable || "", responsableReporte: o.responsableReporte || "",
    prioridad: o.prioridad || "media", monto: o.monto || 0, anticipo: o.anticipo || 0,
    pagado: !!o.pagado, facturado: !!o.facturado,
    cobradoMes: o.cobradoMes || null, pagadoMes: o.pagadoMes || null, anticipoMes: o.anticipoMes || null,
    reporteEnviado: !!o.reporteEnviado, cobroMes: o.cobroMes || null,
    diferido: !!o.diferido, pagosNum: o.pagosNum || 0, pagosMeses: o.pagosMeses || [],
    ot: o.ot || "", archivado: false,
    fechaServicio: o.fechaServicio || "", fechaServicioFin: "",
    responsableServicio: o.responsableServicio || "", apoyo: o.apoyo || [],
    estado: o.estado || "activo", resultado: o.resultado,
    paso, creado: dago(o.creadoDias ?? (diasEnPaso + nPrev * 1.3 + 2)),
    pasoDesde: dago(diasEnPaso), cerradoEn: o.cerradoEn,
    historial: hist, ejemplo: false, creadoPor: "prueba"
  };
}

export const PROYECTOS_DEMO = [
  // --- Atrasos (para mostrar la medición por atraso/responsable) ---
  mk({ nombre: "Termografía CT-04 (DEMO)", cliente: "Minera del Norte", tipo: "termografias", area: "ingenieria", responsable: "German Sainz", prioridad: "alta", monto: 180000, paso: 7, diasEnPaso: 12 }),
  mk({ nombre: "Levantamiento SE Planta 2 (DEMO)", cliente: "Cementos Pacífico", tipo: "mtto-subestaciones", area: "planeacion", responsable: "Leonardo Navarro", prioridad: "alta", monto: 420000, paso: 9, diasEnPaso: 9 }),
  mk({ nombre: "Cotización Arcflash Nave A (DEMO)", cliente: "Autopartes MX", tipo: "arcflash", area: "ingenieria", responsable: "Monserrat Santillan", prioridad: "media", monto: 260000, paso: 12, diasEnPaso: 22, cobroMes: mesMas(1) }),
  mk({ nombre: "Crear OT Tierras Bodega (DEMO)", cliente: "Logística del Bajío", tipo: "tierras-fisicas", area: "planeacion", responsable: "Leonardo Navarro", prioridad: "media", monto: 95000, paso: 19, diasEnPaso: 4, ot: "26-118" }),
  mk({ nombre: "Reporte técnico Calidad Energía (DEMO)", cliente: "Hotelera del Sol", tipo: "calidad-energia", area: "ingenieria", responsable: "German Sainz", responsableReporte: "mikeas", prioridad: "alta", monto: 310000, paso: 33, diasEnPaso: 28, cobroMes: mesMas(1) }),

  // --- Por facturar (23–38) ---
  mk({ nombre: "Mtto Subestación Línea 3 (DEMO)", cliente: "Industrias Vega", tipo: "mtto-subestaciones", area: "planeacion", responsable: "Leonardo Navarro", monto: 540000, anticipo: 150000, anticipoMes: MES, paso: 28, diasEnPaso: 3, ot: "26-120", cobroMes: mesMas(1), fechaServicio: dago(-5).slice(0, 10), responsableServicio: "Felix" }),
  mk({ nombre: "Estudio de Iluminación Almacén (DEMO)", cliente: "Comercial Herrera", tipo: "iluminacion", area: "ingenieria", responsable: "Monserrat Santillan", monto: 130000, paso: 30, diasEnPaso: 2, ot: "26-121", cobroMes: mesMas(2) }),
  mk({ nombre: "Coordinación de Protecciones (DEMO)", cliente: "Papelera Central", tipo: "coordinacion-protecciones", area: "ingenieria", responsable: "German Sainz", monto: 380000, paso: 36, diasEnPaso: 1, ot: "26-122", cobroMes: mesMas(2) }),

  // --- Facturado (39–40, sin pagar) ---
  mk({ nombre: "Tierras Físicas Subestación (DEMO)", cliente: "Agroindustrias Díaz", tipo: "tierras-fisicas", area: "planeacion", responsable: "Leonardo Navarro", monto: 220000, paso: 39, diasEnPaso: 2, ot: "26-115", cobroMes: MES }),
  mk({ nombre: "Servicios Correctivos Tablero (DEMO)", cliente: "Textiles Unidos", tipo: "servicios-correctivos", area: "planeacion", responsable: "Leonardo Navarro", monto: 175000, paso: 40, diasEnPaso: 1, ot: "26-116", cobroMes: MES }),

  // --- Cobrado este mes (41–42) ~ para la meta ---
  mk({ nombre: "Diagramas Unifilares Planta (DEMO)", cliente: "Minera del Norte", tipo: "diagramas-unifilares", area: "ingenieria", responsable: "German Sainz", monto: 720000, paso: 42, diasEnPaso: 1, ot: "26-108", estado: "cerrado", resultado: "cerrado", cerradoEn: dago(1) }),
  mk({ nombre: "Mtto Preventivo SE Oriente (DEMO)", cliente: "Cementos Pacífico", tipo: "mtto-subestaciones", area: "planeacion", responsable: "Leonardo Navarro", monto: 650000, paso: 41, diasEnPaso: 2, ot: "26-110" }),
  mk({ nombre: "Curso NOM-029 (DEMO)", cliente: "Autopartes MX", tipo: "cursos", area: "comercial", responsable: "Paola Bañuelos", monto: 85000, paso: 42, diasEnPaso: 2, ot: "26-112", estado: "cerrado", resultado: "cerrado", cerradoEn: dago(2) }),

  // --- Pagado por adelantado (prepago) ---
  mk({ nombre: "Suministro de Tablero (DEMO)", cliente: "Constructora Robles", tipo: "suministros", area: "planeacion", responsable: "Leonardo Navarro", monto: 760000, paso: 23, diasEnPaso: 2, pagado: true, pagadoMes: MES, ot: "26-123" }),

  // --- Etapas tempranas (pipeline) ---
  mk({ nombre: "Solicitud Auditoría Eléctrica (DEMO)", cliente: "Alimentos del Valle", tipo: "auditorias-tecnicas", area: "ingenieria", responsable: "Monserrat Santillan", monto: 290000, paso: 3, diasEnPaso: 1, cobroMes: mesMas(3) }),
  mk({ nombre: "Curso Seguridad Eléctrica (DEMO)", cliente: "Logística del Bajío", tipo: "cursos", area: "comercial", responsable: "Paola Bañuelos", monto: 60000, paso: 17, diasEnPaso: 1, cobroMes: mesMas(1) })
];

// Fotos de perfil (vacío -> se muestran iniciales).
export const PERFILES_DEMO = {};

// Cierres de meses anteriores (foto de dinero).
export const CIERRES_DEMO = [
  { mes: mesMas(-1), cobrado: 2650000, pagado: 2650000, anticipos: 180000, total: 2830000, cobrado_num: 6, pagado_num: 6, anticipo_num: 1 },
  { mes: mesMas(-2), cobrado: 1980000, pagado: 1980000, anticipos: 95000, total: 2075000, cobrado_num: 5, pagado_num: 5, anticipo_num: 1 }
];

// Marcas privadas de súper admin (vacío en demo).
export const MARCAS_DEMO = {};

// Bitácora de ejemplo.
export const BITACORA_DEMO = [
  { id: 1, creado: dago(0.1), usuario: "yuli", nombre: "Yuliana Navarro", accion: "avanzar", proyecto_nombre: "Diagramas Unifilares Planta (DEMO)", detalle: { paso_antes: 41, paso_despues: 42, estado: "cerrado" } },
  { id: 2, creado: dago(0.4), usuario: "leonardo", nombre: "Leonardo Navarro", accion: "editar", proyecto_nombre: "Mtto Subestación Línea 3 (DEMO)", detalle: { cambios: { monto: { antes: 500000, ahora: 540000 } } } },
  { id: 3, creado: dago(1), usuario: "german", nombre: "German Sainz", accion: "avanzar", proyecto_nombre: "Coordinación de Protecciones (DEMO)", detalle: { paso_antes: 35, paso_despues: 36 } },
  { id: 4, creado: dago(1.2), usuario: "monse", nombre: "Monserrat Santillan", accion: "crear", proyecto_nombre: "Solicitud Auditoría Eléctrica (DEMO)", detalle: { cliente: "Alimentos del Valle", responsable: "Monserrat Santillan" } },
  { id: 5, creado: dago(2), usuario: "paola", nombre: "Paola Bañuelos", accion: "avanzar", proyecto_nombre: "Curso NOM-029 (DEMO)", detalle: { paso_antes: 41, paso_despues: 42, estado: "cerrado" } },
  { id: 6, creado: dago(2.5), usuario: "prueba", nombre: "Usuario de prueba", accion: "ingreso", detalle: {} }
];

// Análisis de ejemplo (para mostrar la IA sin llamar a la API ni gastar cuota).
export const ANALISIS_DEMO =
`## Resumen ejecutivo
- **5 proyectos atrasados** de 16 activos. El mayor foco está en **Levantamiento y alcances** y en **Reporte técnico**.
- La cobranza del mes va en **~2.1 M de la meta de 3 M (≈70%)**; es alcanzable si se acelera lo ya **Facturado** ($395 K).
- Los responsables que más frenan son **German Sainz** y **Leonardo Navarro**, por acumulación en levantamiento/reporte, no por lentitud por paso.

## Atrasos y responsables
| Responsable | Proyectos atrasados | Días de exceso |
|---|---|---|
| German Sainz | 2 | ~16 |
| Monserrat Santillan | 1 | ~7 |
| Leonardo Navarro | 1 | ~3 |
| Responsable de reporte | 1 | ~7 |

- **Levantamiento y alcances** concentra los atrasos más caros (proyectos de alta prioridad detenidos >9 días sobre el límite).
- El **reporte técnico** de Hotelera del Sol lleva 28 días: riesgo directo para facturar y cobrar.

## Dinero y cobranza
- Avance de meta: **70%**, faltan ~$895 K. Con lo **Facturado** ($395 K) más 1–2 cobros de lo que está **Por facturar** se alcanza.
- La cobranza proyectada se concentra en el mes próximo; conviene empujar los proyectos "Sin fecha" para dar visibilidad.

## Recomendaciones
1. **Desatorar levantamientos** (German/Leonardo): reunión diaria de 10 min hasta bajar de 3 el número de atrasados.
2. **Cerrar el reporte de Hotelera del Sol** esta semana para liberar su facturación.
3. **Gestionar cobro de lo Facturado** ($395 K) antes de fin de mes para asegurar la meta.

## Riesgos a vigilar
- Proyectos de alta prioridad detenidos en levantamiento pueden arrastrar la fecha comprometida del servicio.
- Dependencia fuerte en pocos responsables para las etapas técnicas.

_(Análisis de ejemplo del modo de prueba.)_`;
