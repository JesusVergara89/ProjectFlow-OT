import { json, usuarioDe, sbLeerBitacora, sbLeerBitacoraRango, sbLeerBitacoraFechas } from "./_lib/util.js";

// Hora local de CDMX. México no usa horario de verano desde 2022, así que
// la diferencia con UTC es fija de -06:00 todo el año.
const TZ = "-06:00";

// Convierte un ISO (UTC) al día local CDMX en formato YYYY-MM-DD.
function diaLocal(iso) {
  const t = new Date(iso);
  if (isNaN(t)) return "";
  return new Date(t.getTime() - 6 * 3600 * 1000).toISOString().slice(0, 10);
}

export default async function handler(req) {
  const sesion = usuarioDe(req);
  if (!sesion) return json({ error: "Sesión no válida o expirada" }, 401);

  const params = new URL(req.url).searchParams;

  try {
    // 1) Lista de días disponibles, con su conteo (para la barra de navegación).
    if (params.get("modo") === "dias") {
      const filas = await sbLeerBitacoraFechas();
      const cuenta = new Map();
      for (const f of filas || []) {
        const dia = diaLocal(f.creado);
        if (dia) cuenta.set(dia, (cuenta.get(dia) || 0) + 1);
      }
      const dias = [...cuenta.entries()]
        .map(([dia, n]) => ({ dia, n }))
        .sort((a, b) => (a.dia < b.dia ? 1 : -1)); // más reciente primero
      return json({ dias });
    }

    // 2) Registros de un día concreto (YYYY-MM-DD en hora local CDMX).
    const dia = params.get("dia");
    if (dia && /^\d{4}-\d{2}-\d{2}$/.test(dia)) {
      const desde = `${dia}T00:00:00${TZ}`;
      const hasta = new Date(new Date(desde).getTime() + 24 * 3600 * 1000).toISOString();
      const filas = await sbLeerBitacoraRango(desde, hasta);
      return json({ registros: filas || [] });
    }

    // 3) Por defecto: los últimos N (compatibilidad).
    const limite = Math.min(1000, Math.max(1, Number(params.get("limite")) || 300));
    const filas = await sbLeerBitacora(limite);
    return json({ registros: filas || [] });
  } catch (e) {
    return json({ error: "No se pudo leer la bitácora (" + e.message + ")" }, 502);
  }
}
