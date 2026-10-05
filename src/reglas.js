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
