// Mensajería 1-a-1 entre usuarios, con proyecto anexable.
// Acciones (POST con { accion }):
//   usuarios -> padrón para elegir destinatario (sin mí)
//   enviar   -> { para, texto, proyectoId?, proyectoNombre? }
//   listar   -> mis mensajes (enviados y recibidos), recientes primero
//   leidos   -> marca como leídos los que recibí
import {
  json, usuarioDe, listaUsuarios,
  sbInsertarMensaje, sbLeerMensajes, sbMarcarMensajesLeidos
} from "./_lib/util.js";

export default async function handler(req) {
  const sesion = usuarioDe(req);
  if (!sesion) return json({ error: "Sesión no válida o expirada" }, 401);

  let cuerpo = {};
  try { cuerpo = await req.json(); } catch {}
  const accion = cuerpo.accion || "listar";
  const yo = String(sesion.usuario || "").toLowerCase();

  try {
    if (accion === "usuarios") {
      const usuarios = listaUsuarios()
        .map(u => ({ usuario: String(u.usuario || "").toLowerCase(), nombre: u.nombre || u.usuario }))
        .filter(u => u.usuario && u.usuario !== yo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      return json({ usuarios });
    }

    if (accion === "enviar") {
      const para = String(cuerpo.para || "").toLowerCase();
      const texto = String(cuerpo.texto || "").trim().slice(0, 2000);
      if (!para || !texto) return json({ error: "Falta destinatario o texto" }, 400);
      const existe = listaUsuarios().some(u => String(u.usuario || "").toLowerCase() === para);
      if (!existe) return json({ error: "Destinatario no válido" }, 400);
      const fila = {
        de: yo, para, texto,
        proyecto_id: cuerpo.proyectoId || null,
        proyecto_nombre: cuerpo.proyectoNombre || null
      };
      const r = await sbInsertarMensaje(fila);
      return json({ ok: true, mensaje: Array.isArray(r) ? r[0] : r });
    }

    if (accion === "leidos") {
      await sbMarcarMensajesLeidos(yo);
      return json({ ok: true });
    }

    // listar (por defecto)
    const mensajes = await sbLeerMensajes(yo);
    return json({ mensajes: mensajes || [] });
  } catch (e) {
    return json({ error: "No se pudo procesar el mensaje (" + e.message + ")" }, 502);
  }
}
