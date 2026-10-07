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
 
// Límites de tiempo (en días). Cámbialos aquí si necesitas otros valores.
export const LIMITES = { autorizacion: 5, planeacion: 6, reporteHabiles: 21, entregaDocumentación: 1 };
 
// Tipo de alerta de la tarjeta por tiempo excedido: null | "rojo" | "ambar" | "morado".
export function alerta(p) {
  if (p.estado !== "activo") return null;
  const n = p.paso;
  if (n < 13 && diasDesde(p.creado) > LIMITES.autorizacion) return "rojo";
  if (n >= 17 && n <= 23 && diasDesde(entroFase(p)) > LIMITES.planeacion) return "ambar";
  if (n >= 30 && n <= 35 && diasHabilesDesde(entroFase(p)) > LIMITES.reporteHabiles) return "morado";
  if (n === 28 && diasHabilesDesde(p.pasoDesde) > LIMITES.entregaDocumentación) return "naranja";
  return null;
}
 
export const MOTIVO = {
  rojo: "Más de 5 días desde la solicitud sin llegar a autorización (paso 13)",
  ambar: "Más de 6 días en planeación sin programar el servicio",
  morado: "Más de 21 días hábiles sin entregar el reporte",
  naranja: "Más de 1 día hábil sin entregar la documentación al cliente",
};
 
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
      (!f.prio || prioDe(p) === f.prio) &&
      (!f.paso || p.paso === f.paso) &&
      (!f.detenidos || detenido(p))
  );
}