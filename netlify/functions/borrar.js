import {
  json, usuarioDe, sbLeerProyecto, sbBorrarProyecto, sbInsertarBitacora
} from "./_lib/util.js";

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

  const id = String(cuerpo.id || "");
  if (!id) return json({ error: "Falta el id" }, 400);

  let previo = null;
  try {
    previo = await sbLeerProyecto(id);
  } catch {
    /* si no se puede leer, igual se intenta borrar */
  }

  try {
    await sbBorrarProyecto(id);
  } catch (e) {
    return json({ error: "No se pudo eliminar (" + e.message + ")" }, 502);
  }

  try {
    await sbInsertarBitacora({
      usuario: sesion.usuario,
      nombre: sesion.nombre,
      accion: "eliminar",
      proyecto_id: id,
      proyecto_nombre: previo?.nombre || cuerpo.nombre || null,
      detalle: { cliente: previo?.cliente || null, paso: previo?.paso ?? null },
      creado: new Date().toISOString()
    });
  } catch (e) {
    console.error("bitacora borrar:", e.message);
  }

  return json({ ok: true });
}
