import { json, usuarioDe, sbLeerProyectos, sbLeerCierres, sbUpsertCierre } from "./_lib/util.js";
import { totalesDelMes, mesesConDinero } from "../../src/dinero.js";

// Congela (si falta) la "foto" de dinero de cada mes YA TERMINADO y devuelve
// todas las fotos. Idempotente: nunca recalcula un mes que ya tiene foto, así
// queda fija aunque después se editen proyectos. El mes en curso NO se congela
// (ese se ve en vivo en los KPIs).

// Mes AAAAMM en horario de México (UTC-6).
function mesActualMx() {
  const d = new Date(Date.now() - 6 * 3600e3);
  return d.getUTCFullYear() * 100 + (d.getUTCMonth() + 1);
}

// Fila de Supabase (snake) -> campos que usa dinero.js (camel).
const aDinero = r => ({
  archivado: !!r.archivado,
  monto: +r.monto || 0,
  anticipo: +r.anticipo || 0,
  anticipoMes: +r.anticipo_mes || 0,
  paso: +r.paso || 1,
  estado: r.estado,
  resultado: r.resultado || undefined,
  historial: Array.isArray(r.historial) ? r.historial : [],
  cerradoEn: r.cerrado_en || undefined,
  pasoDesde: r.paso_desde,
  creado: r.creado
});

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const sesion = usuarioDe(req);
  if (!sesion) return json({ error: "Sesión no válida o expirada" }, 401);

  let proyectos, cierres;
  try {
    [proyectos, cierres] = await Promise.all([sbLeerProyectos(), sbLeerCierres()]);
  } catch (e) {
    return json({ error: e.message }, 502);
  }

  const lista = (proyectos || []).map(aDinero);
  const actual = mesActualMx();
  const yaFoto = new Set((cierres || []).map(c => Number(c.mes)));

  // Meses con dinero, EXCLUYENDO el mes en curso (ese va en vivo).
  const meses = new Set();
  for (const m of mesesConDinero(lista)) {
    if (m && m < actual) meses.add(m);
  }

  let nuevos = 0;
  for (const mes of meses) {
    if (yaFoto.has(mes)) continue; // ya congelado: no lo tocamos
    const t = totalesDelMes(lista, mes);
    try {
      await sbUpsertCierre({
        mes,
        cobrado: t.cobrado,          // saldo cobrado (llegó al paso 41) ese mes
        pagado: t.cobrado,
        anticipos: t.anticipos,
        total: t.total,              // cobrado + anticipos del mes
        cobrado_num: t.cobradoNum,
        pagado_num: t.cobradoNum,
        anticipo_num: t.anticipoNum,
        creado: new Date().toISOString()
      });
      nuevos++;
    } catch (e) {
      console.error("cierre mes", mes, e.message);
    }
  }

  let todas = cierres;
  if (nuevos > 0) {
    try { todas = await sbLeerCierres(); } catch { /* usa las previas */ }
  }

  return json({ ok: true, nuevos, cierres: todas || [] });
}
