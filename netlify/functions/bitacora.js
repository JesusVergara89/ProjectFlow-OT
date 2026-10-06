import { json, usuarioDe, sbLeerBitacora } from "./_lib/util.js";

export default async function handler(req) {
  const sesion = usuarioDe(req);
  if (!sesion) return json({ error: "Sesión no válida o expirada" }, 401);

  const limite = Math.min(1000, Math.max(1, Number(new URL(req.url).searchParams.get("limite")) || 300));

  try {
    const filas = await sbLeerBitacora(limite);
    return json({ registros: filas || [] });
  } catch (e) {
    return json({ error: "No se pudo leer la bitácora (" + e.message + ")" }, 502);
  }
}
