import {
  json, usuarioDe, sbLeerProyecto, sbUpsertProyecto, sbInsertarBitacora
} from "./_lib/util.js";
import { puedeConPaso, etiquetaPermiso } from "../../src/permisos.js";

// app -> columnas de la tabla
const aDb = p => ({
  id: p.id,
  nombre: p.nombre,
  cliente: p.cliente,
  tipo: p.tipo || "",
  area: p.area || "",
  responsable: p.responsable || "",
  responsable_reporte: p.responsableReporte || "",
  prioridad: p.prioridad,
  monto: p.monto || 0,
  estado: p.estado,
  resultado: p.resultado ?? null,
  paso: p.paso,
  creado: p.creado,
  paso_desde: p.pasoDesde,
  cerrado_en: p.cerradoEn ?? null,
  historial: p.historial || [],
  ejemplo: Boolean(p.ejemplo)
});

const CAMPOS = ["nombre", "cliente", "tipo", "area", "responsable", "prioridad", "monto", "estado", "resultado", "paso"];

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const sesion = usuarioDe(req);
  if (!sesion) return json({ error: "Sesión no válida o expirada" }, 401);

  let cuerpo;
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Petición inválida" }, 400);
  }

  const p = cuerpo.proyecto;
  const accion = String(cuerpo.accion || "editar");
  if (!p || !p.id || !p.nombre) return json({ error: "Proyecto incompleto" }, 400);

  // Fila previa (para calcular el cambio y para firmar el autor del avance en el servidor).
  let previo = null;
  try {
    const r = await sbLeerProyecto(p.id);
    if (r) {
      previo = { ...r, historial: r.historial || [], pasoDesde: r.paso_desde, responsableReporte: r.responsable_reporte || "" };
    }
  } catch (e) {
    return json({ error: "No se pudo leer el proyecto (" + e.message + ")" }, 502);
  }

  // Editar datos del proyecto: solo el admin y quien lo creó.
  if (accion === "editar" && previo) {
    const creador = String(previo.creado_por || "").toLowerCase();
    const esAdmin = sesion.rol === "admin";
    const esCreador = creador && creador === String(sesion.usuario || "").toLowerCase();
    if (!esAdmin && !esCreador) {
      return json(
        { error: "Solo el administrador y quien creó el proyecto pueden editar sus datos." },
        403
      );
    }
  }

  // Permiso por paso: solo ciertas personas pueden avanzar o deshacer cada paso.
  if ((accion === "avanzar" || accion === "deshacer") && previo) {
    const pasoAccion = previo.paso;
    if (!puedeConPaso(sesion.usuario, sesion.rol, pasoAccion, previo)) {
      return json(
        { error: `No tienes permiso para completar el paso ${pasoAccion}. Solo pueden: ${etiquetaPermiso(pasoAccion, previo)}.` },
        403
      );
    }
  }

  const historial = Array.isArray(p.historial) ? [...p.historial] : [];
  let detalle = {};

  if (accion === "avanzar") {
    // El servidor marca quién hizo el último avance (no se confía en el cliente).
    const i = historial.length - 1;
    if (i >= 0) {
      historial[i] = { ...historial[i], u: sesion.usuario, nombre: sesion.nombre };
      detalle = {
        paso_antes: previo ? previo.paso : null,
        paso_despues: p.paso,
        decision: historial[i].d || null,
        nota: historial[i].n || null,
        estado: p.estado
      };
    }
  } else if (accion === "deshacer") {
    detalle = { paso_antes: previo ? previo.paso : null, paso_despues: p.paso };
  } else if (accion === "crear") {
    detalle = { nombre: p.nombre, cliente: p.cliente, tipo: p.tipo || "", area: p.area || "", responsable: p.responsable || "", prioridad: p.prioridad, monto: p.monto || 0 };
  } else {
    // editar: cambios campo por campo respecto a lo que había.
    const cambios = {};
    const base = previo || {};
    for (const c of CAMPOS) {
      const antes = base[c] ?? null;
      const ahora = p[c] ?? null;
      if (String(antes) !== String(ahora)) cambios[c] = { antes, ahora };
    }
    detalle = { cambios };
  }

  const fila = aDb({ ...p, historial });
  // Al crear, el servidor marca quién fue el autor (no se confía en el cliente).
  if (accion === "crear") fila.creado_por = sesion.usuario;

  try {
    await sbUpsertProyecto(fila);
  } catch (e) {
    return json({ error: "No se pudo guardar (" + e.message + ")" }, 502);
  }

  try {
    await sbInsertarBitacora({
      usuario: sesion.usuario,
      nombre: sesion.nombre,
      accion,
      proyecto_id: p.id,
      proyecto_nombre: p.nombre,
      detalle,
      creado: new Date().toISOString()
    });
  } catch (e) {
    console.error("bitacora guardar:", e.message);
  }

  return json({ ok: true, historial });
}
