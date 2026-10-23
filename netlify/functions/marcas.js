import {
  json, usuarioDe, sbLeerMarcas, sbUpsertMarca, sbBorrarMarca, sbLeerProyecto,
  destinatariosTelegram, enviarTelegram, escHtml
} from "./_lib/util.js";
import { SUPER_ADMIN } from "../../src/permisos.js";

// Marcas privadas de "proyecto atrasado". SOLO el súper admin (por su usuario,
// no por el rol) puede leerlas, ponerlas o quitarlas. Al poner una, además
// manda la notificación por Telegram a los destinatarios configurados.
const SUPER = String(process.env.SUPER_ADMIN || SUPER_ADMIN || "").toLowerCase();

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const sesion = usuarioDe(req);
  if (!sesion) return json({ error: "Sesión no válida o expirada" }, 401);
  if (String(sesion.usuario || "").toLowerCase() !== SUPER) {
    return json({ error: "No autorizado" }, 403);
  }

  let cuerpo;
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Petición inválida" }, 400);
  }
  const accion = String(cuerpo.accion || "listar");

  if (accion === "listar") {
    try {
      const filas = await sbLeerMarcas();
      const marcas = {};
      for (const f of filas) marcas[f.proyecto_id] = { atrasado: !!f.atrasado, mensaje: f.mensaje || "" };
      return json({ ok: true, marcas });
    } catch (e) {
      return json({ error: e.message }, 502);
    }
  }

  if (accion === "guardar") {
    const id = cuerpo.proyectoId;
    const mensaje = String(cuerpo.mensaje || "").slice(0, 500);
    if (!id) return json({ error: "Falta el proyecto" }, 400);

    try {
      await sbUpsertMarca(id, mensaje);
    } catch (e) {
      return json({ error: e.message }, 502);
    }

    // Notificación por Telegram (no bloquea el guardado si falla).
    let proy = null;
    try { proy = await sbLeerProyecto(id); } catch { /* ignora */ }
    const dest = destinatariosTelegram();
    let telegram = { intentados: dest.length, enviados: 0 };
    if (dest.length) {
      const texto =
        `🔴 <b>PROYECTO ATRASADO</b>\n` +
        `<b>${escHtml(proy?.nombre || "")}</b>${proy?.cliente ? ` — ${escHtml(proy.cliente)}` : ""}\n` +
        `${escHtml(mensaje || "Marcado como atrasado por el súper admin.")}`;
      for (const d of dest) {
        const ok = await enviarTelegram(d, texto);
        if (ok) telegram.enviados++;
      }
    }
    return json({ ok: true, telegram });
  }

  if (accion === "borrar") {
    const id = cuerpo.proyectoId;
    if (!id) return json({ error: "Falta el proyecto" }, 400);
    try {
      await sbBorrarMarca(id);
    } catch (e) {
      return json({ error: e.message }, 502);
    }
    return json({ ok: true });
  }

  return json({ error: "Acción desconocida" }, 400);
}
