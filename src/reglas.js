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
// LÍMITES DE TIEMPO Y ALERTAS
// Los colores agrupan por tipo de atraso; el mensaje dice el detalle (quién/qué).
//   rojo    = Comercial / levantamiento / cotización sin avanzar
//   rosa    = Huber sin responder (cotización de materiales o fecha de entrega)
//   ambar   = Planeación sin avanzar (OT, requisiciones, programación, viáticos, plan de calidad)
//   naranja = Documentación / cierre / entrega de calidad sin avanzar
//   morado  = Reporte técnico sin entregar
// ============================================================

// Límites por FASE completa (se mide desde que el proyecto entró a la fase).
export const LIM_FASE = {
  alcance: 3,     // pasos 5–7: levantamiento y entrega a comercial (días calendario)
  cotizacion: 2,  // pasos 8–16: hasta autorizar o declinar (días calendario)
};

// Límite especial del paso 9 (Huber cotiza materiales), se mide dentro del paso.
export const LIM_HUBER9 = 2;

// Límites por PASO (se miden desde que entró al paso). d = días calendario, h = días hábiles.
export const LIM_PASO = {
  17: { d: 1, color: "ambar",   quien: "Leonardo", que: "no ha creado la OT" },
  18: { d: 1, color: "ambar",   quien: "Leonardo", que: "no ha validado los alcances para crear la OT" },
  19: { d: 1, color: "ambar",   quien: "Leonardo", que: "no ha creado la OT" },
  20: { d: 1, color: "ambar",   quien: "Leonardo", que: "no ha definido si existen requisiciones" },
  21: { d: 1, color: "ambar",   quien: "Leonardo", que: "no ha enviado a almacén y compras" },
  22: { d: 2, color: "rosa",    quien: "Huber",    que: "no ha generado la fecha de entrega" },
  23: { d: 2, color: "ambar",   quien: "Leonardo", que: "no ha programado el servicio con el cliente" },
  24: { d: 1, color: "ambar",   quien: "Leonardo", que: "no ha resuelto si se ocupan viáticos foráneos" },
  25: { d: 1, color: "ambar",   quien: "Leonardo", que: "no ha solicitado los viáticos a administración" },
  26: { d: 1, color: "ambar",   quien: "Adriana",  que: "no ha autorizado ni gestionado los viáticos" },
  27: { d: 1, color: "ambar",   quien: "Leonardo", que: "no ha creado el plan de calidad" },
  // 28 (ejecución del servicio) NO se vigila: es muy cambiante.
  29: { h: 1, color: "naranja", quien: "Calidad",  que: "no ha entregado/revisado la documentación" },
  30: { d: 1, color: "naranja", quien: "Leonardo", que: "no ha hecho el cierre parcial de la OT" },
  32: { d: 1, color: "naranja", quien: "German",   que: "no ha asignado responsable del reporte" },
  33: { h: 21, color: "morado", quien: "el responsable del reporte", que: "no ha entregado el reporte técnico" },
  35: { d: 1, color: "naranja", quien: "el responsable del reporte", que: "no ha entregado el reporte a calidad" },
  36: { d: 1, color: "naranja", quien: "Calidad",  que: "no ha revisado el reporte técnico" },
  38: { d: 1, color: "naranja", quien: "Calidad",  que: "no ha entregado el reporte al cliente" },
};

const frase = (lim, hab) => `Más de ${lim} día${lim === 1 ? "" : "s"}${hab ? " hábil" + (lim === 1 ? "" : "es") : ""}`;

// Evalúa la alerta de un proyecto. Devuelve null, o un objeto:
//   { color, quien, que, dias, lim, habiles, motivo }
export function evaluarAlerta(p) {
  if (p.estado !== "activo") return null;
  const n = p.paso;
  const enFase = diasDesde(entroFase(p));
  const enPaso = diasDesde(p.pasoDesde);
  const enPasoHab = diasHabilesDesde(p.pasoDesde);

  // Fase 5–7: levantamiento y entrega a comercial (máx. 3 días).
  if (n >= 5 && n <= 7 && enFase > LIM_FASE.alcance) {
    return hecho("rojo", "Leonardo y German", "no han terminado el levantamiento y la entrega a comercial", enFase, LIM_FASE.alcance, false);
  }

  // Fase 8–16: cotización y negociación (máx. 2 días hasta autorizar o declinar).
  if (n >= 8 && n <= 16) {
    // El paso 9 (Huber cotiza materiales) tiene su propio límite y mensaje.
    if (n === 9 && enPaso > LIM_HUBER9) {
      return hecho("rosa", "Huber", "no ha entregado la cotización de materiales/servicios", enPaso, LIM_HUBER9, false);
    }
    if (enFase > LIM_FASE.cotizacion) {
      return hecho("rojo", "Comercial", "no ha autorizado ni declinado la cotización", enFase, LIM_FASE.cotizacion, false);
    }
  }

  // Pasos 17–38: límite por paso.
  const c = LIM_PASO[n];
  if (c) {
    const hab = c.h != null;
    const lim = hab ? c.h : c.d;
    const d = hab ? enPasoHab : enPaso;
    if (d > lim) return hecho(c.color, c.quien, c.que, d, lim, hab);
  }

  return null;
}

function hecho(color, quien, que, dias, lim, habiles) {
  return { color, quien, que, dias, lim, habiles, motivo: `${frase(lim, habiles)}: ${quien} ${que}` };
}

// Color de la tarjeta (compatibilidad): null | "rojo" | "rosa" | "ambar" | "naranja" | "morado".
export const alerta = p => evaluarAlerta(p)?.color || null;
// Texto del tooltip de la tarjeta.
export const motivoDe = p => evaluarAlerta(p)?.motivo || "";
 
/** Completa el paso actual (con "si"/"no" si es una decisión) y devuelve el proyecto actualizado. */
export function avanzar(p, eleccion, nota) {
  const q = structuredClone(p);
  const pa = paso(q);
  const ahora = new Date().toISOString();
  const e = { p: q.paso, f: ahora };
  if (eleccion) e.d = eleccion;
  if (nota) e.n = nota;
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
      (!q || norm(`${p.nombre} ${p.cliente} ${p.responsable || ""}`).includes(q)) &&
      (!f.resp || p.responsable === f.resp) &&
      (!f.area || p.area === f.area) &&
      (!f.prio || prioDe(p) === f.prio) &&
      (!f.paso || p.paso === f.paso) &&
      (!f.detenidos || detenido(p))
  );
}