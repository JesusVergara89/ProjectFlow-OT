import { PASOS } from "./flow.js";
import { norm } from "./format.js";
 
export const RES = { "no-viable": "No viable", archivado: "Archivado", cerrado: "Cerrado y pagado" };
export const PRIO = { alta: "Alta", media: "Media", baja: "Baja" };
 
export const paso = p => PASOS[p.paso] || PASOS[1];
export const prioDe = p => (PRIO[p.prioridad] ? p.prioridad : "media");
export const diasTxt = d => (d === 0 ? "hoy" : d === 1 ? "1 día" : d + " días");
 
export function dias(p) {
  const t = Date.parse(p.pasoDesde);
  return isNaN(t) ? 0 : Math.max(0, Math.floor((Date.now() - t) / 864e5));
}
 
export const detenido = p => p.estado === "activo" && dias(p) > paso(p).fase.umbral;
 
// Días calendario transcurridos desde una fecha.
export const diasDesde = iso => {
  const t = Date.parse(iso);
  return isNaN(t) ? 0 : Math.max(0, Math.floor((Date.now() - t) / 864e5));
};
 
// Días hábiles (lunes a viernes) transcurridos desde una fecha.
export function diasHabilesDesde(iso) {
  const ini = new Date(iso);
  if (isNaN(ini)) return 0;
  const cur = new Date(ini);
  cur.setHours(0, 0, 0, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let d = 0;
  while (cur < hoy) {
    cur.setDate(cur.getDate() + 1);
    const g = cur.getDay();
    if (g !== 0 && g !== 6) d++;
  }
  return d;
}
 
// Momento en que el proyecto entró a la fase en la que está ahora.
export function entroFase(p) {
  const F = paso(p).fase;
  const h = p.historial || [];
  for (let i = h.length - 1; i >= 0; i--) {
    const f = PASOS[h[i].p]?.fase;
    if (f && f !== F) return h[i].f; // completó un paso de otra fase justo antes de entrar aquí
  }
  return p.creado;
}
 
// ============================================================
// LÍMITES DE TIEMPO Y ALERTAS — cada regla tiene su PROPIO color.
// Para cambiar un límite, color o mensaje, edita su entrada en REGLAS.
//   pasos    : en qué pasos aplica. Si es un grupo, el tiempo se mide desde que ENTRÓ al grupo.
//   dias     : límite. Si se pasa, se dispara la alerta.
//   habiles  : true = cuenta solo días hábiles (lun–vie).
//   color    : color de la tarjeta y del punto en la leyenda.
//   etiqueta : texto en la leyenda.
//   quien/que: arman el mensaje ("<quien> <que>").
// Gana la PRIMERA regla cuyo rango incluya el paso actual y se pase de tiempo.
// ============================================================
export const REGLAS = [
  { key: "solicitud",        pasos: [1, 2, 3, 4],                     dias: 1,  habiles: false, color: "#B45309",
    etiqueta: "Solicitud y viabilidad +1 día (1–4)",       quien: "Comercial", que: "no ha avanzado la solicitud y viabilidad" },
  // Los 3 días del levantamiento se cuentan DESDE que se marca hecho el levantamiento
  // (paso 6 completado → el proyecto entra al paso 7, «Se realizan alcances»).
  { key: "levantamiento",    pasos: [7,8, 9, 10],                              dias: 3,  habiles: false, color: "#E5484D",
    etiqueta: "Alcances +3 días tras levantamiento (7,8,9,10)",    quien: "Leonardo y German", que: "no han realizado los alcances tras el levantamiento" },
  { key: "huber-cotiza",     pasos: [9],                              dias: 1,  habiles: false, color: "#D6409F",
    etiqueta: "Huber +1 días cotizando materiales (9)",     quien: "Huber",    que: "no ha entregado la cotización de materiales/servicios" },
  { key: "comercial",        pasos: [11, 12, 13, 14, 15, 16], dias: 15, habiles: false, color: "#F76808",
    etiqueta: "Cotización y negociación +15 día (11–16)", quien: "Comercial", que: "no ha autorizado ni declinado la cotización" },
  { key: "crear-ot",         pasos: [17, 18, 19],                     dias: 1,  habiles: false, color: "#8E4EC6",
    etiqueta: "Crear OT +1 día (17–19)",                    quien: "Leonardo", que: "no ha creado la OT" },
  { key: "requisiciones",    pasos: [20, 21],                         dias: 1,  habiles: false, color: "#0588F0",
    etiqueta: "Requisiciones / almacén +1 día (20–21)",     quien: "Leonardo", que: "no ha gestionado las requisiciones (envío a almacén y compras)" },
  { key: "fecha-entrega",    pasos: [22],                             dias: 2,  habiles: false, color: "#E93D82",
    etiqueta: "Huber +2 días fecha de entrega (22)",        quien: "Huber",    que: "no ha generado la fecha de entrega" },
  { key: "programacion",     pasos: [23],                             dias: 2,  habiles: false, color: "#0D9488",
    etiqueta: "Programación +2 días (23)",                  quien: "Leonardo", que: "no ha programado el servicio con el cliente" },
  { key: "viaticos",         pasos: [24, 25],                         dias: 1,  habiles: false, color: "#0CA5E9",
    etiqueta: "Viáticos +1 día (24–25)",                    quien: "Leonardo", que: "no ha resuelto ni solicitado los viáticos" },
  { key: "autoriza-viaticos",pasos: [26],                             dias: 1,  habiles: false, color: "#3E63DD",
    etiqueta: "Adriana +1 día autorizar viáticos (26)",     quien: "Adriana",  que: "no ha autorizado ni gestionado los viáticos" },
  { key: "plan-calidad",     pasos: [27],                             dias: 1,  habiles: false, color: "#9333EA",
    etiqueta: "Plan de calidad +1 día (27)",                quien: "Leonardo", que: "no ha creado el plan de calidad" },
  { key: "documentacion",    pasos: [29],                             dias: 1,  habiles: true,  color: "#12A594",
    etiqueta: "Documentación +1 día hábil (29)",            quien: "Calidad",  que: "no ha entregado ni revisado la documentación" },
  { key: "cierre-parcial",   pasos: [30],                             dias: 1,  habiles: false, color: "#30A46C",
    etiqueta: "Cierre parcial OT +1 día (30)",              quien: "Leonardo", que: "no ha hecho el cierre parcial de la OT" },
  { key: "asigna-reporte",   pasos: [32],                             dias: 1,  habiles: false, color: "#C2410C",
    etiqueta: "Asignar responsable reporte +1 día (32)",    quien: "German",   que: "no ha asignado responsable del reporte" },
  { key: "reporte-tecnico",  pasos: [33],                             dias: 21, habiles: true,  color: "#6D28D9",
    etiqueta: "Reporte técnico +21 días hábiles (33)",      quien: "el responsable del reporte", que: "no ha entregado el reporte técnico" },
  { key: "reporte-a-calidad",pasos: [35],                             dias: 1,  habiles: false, color: "#EAB308",
    etiqueta: "Entregar reporte a calidad +1 día (35)",     quien: "el responsable del reporte", que: "no ha entregado el reporte a calidad" },
  { key: "revisa-reporte",   pasos: [36],                             dias: 1,  habiles: false, color: "#D97706",
    etiqueta: "Revisar reporte +1 día (36)",                quien: "Calidad",  que: "no ha revisado el reporte técnico" },
  { key: "entrega-cliente",  pasos: [38],                             dias: 1,  habiles: false, color: "#DB2777",
    etiqueta: "Entregar al cliente +1 día (38)",            quien: "Calidad",  que: "no ha entregado el reporte al cliente" },
];
// Nota: el paso 28 (ejecución del servicio) NO se vigila a propósito: es muy cambiante.

// Para dibujar la leyenda del tablero.
export const LEYENDA = REGLAS.map(r => ({ color: r.color, texto: r.etiqueta }));

const frase = (lim, hab) => `Más de ${lim} día${lim === 1 ? "" : "s"}${hab ? " hábil" + (lim === 1 ? "" : "es") : ""}`;

// Momento en que el proyecto entró al GRUPO de pasos de una regla
// (la última vez que estuvo en un paso fuera del grupo).
function entroGrupo(p, pasos) {
  const h = p.historial || [];
  for (let i = h.length - 1; i >= 0; i--) {
    if (!pasos.includes(h[i].p)) return h[i].f;
  }
  return p.creado;
}

// Evalúa la alerta de un proyecto. Devuelve null, o:
//   { key, color, etiqueta, quien, que, dias, lim, habiles, motivo }
export function evaluarAlerta(p) {
  if (p.estado !== "activo") return null;
  for (const r of REGLAS) {
    if (!r.pasos.includes(p.paso)) continue;
    const ini = entroGrupo(p, r.pasos);
    const d = r.habiles ? diasHabilesDesde(ini) : diasDesde(ini);
    if (d > r.dias) {
      return {
        key: r.key, color: r.color, etiqueta: r.etiqueta,
        quien: r.quien, que: r.que, dias: d, lim: r.dias, habiles: r.habiles,
        motivo: `${frase(r.dias, r.habiles)}: ${r.quien} ${r.que}`
      };
    }
  }
  return null;
}

// Color (hex) de la tarjeta, o null.
export const alerta = p => evaluarAlerta(p)?.color || null;
// Texto del tooltip de la tarjeta.
export const motivoDe = p => evaluarAlerta(p)?.motivo || "";
 
/** Completa el paso actual (con "si"/"no" si es una decisión) y devuelve el proyecto actualizado. */
export function avanzar(p, eleccion, nota, extra) {
  const q = structuredClone(p);
  const pa = paso(q);
  const ahora = new Date().toISOString();
  const e = { p: q.paso, f: ahora };
  if (eleccion) e.d = eleccion;
  if (nota) e.n = nota;
  if (extra && typeof extra === "object") Object.assign(e, extra); // p. ej. { img: url }
  q.historial = [...(q.historial || []), e];
  if (pa.tipo === "accion" && pa.fin) {
    q.estado = "cerrado";
    q.resultado = pa.fin;
    q.cerradoEn = ahora;
  } else {
    q.paso = pa.tipo === "decision" ? (eleccion === "si" ? pa.si : pa.no) : pa.next;
    q.pasoDesde = ahora;
  }
  return q;
}
 
export function deshacer(p) {
  const q = structuredClone(p);
  const h = q.historial || [];
  if (!h.length) return q;
  const e = h[h.length - 1];
  q.historial = h.slice(0, -1);
  q.paso = e.p;
  q.estado = "activo";
  delete q.resultado;
  delete q.cerradoEn;
  const prev = q.historial[q.historial.length - 1];
  q.pasoDesde = prev ? prev.f : q.creado;
  return q;
}
 
export function filtrar(lista, f) {
  const q = norm(f.q);
  return lista.filter(
    p =>
      (!q || norm(`${p.nombre} ${p.cliente} ${p.responsable || ""} ${p.ot || ""}`).includes(q)) &&
      (!f.resp || p.responsable === f.resp) &&
      (!f.area || p.area === f.area) &&
      (!f.tipo || p.tipo === f.tipo) &&
      (!f.cliente || p.cliente === f.cliente) &&
      (!f.prio || prioDe(p) === f.prio) &&
      (!f.pagado || (f.pagado === "si" ? !!p.pagado : !p.pagado)) &&
      (!f.facturado || (f.facturado === "si" ? !!p.facturado : !p.facturado)) &&
      (!f.reporte || (f.reporte === "si" ? !!p.reporteEnviado : !p.reporteEnviado)) &&
      (!f.paso || p.paso === f.paso) &&
      (!f.detenidos || detenido(p))
  );
}