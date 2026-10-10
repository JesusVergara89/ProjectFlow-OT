// ============================================================
// Alertas por WhatsApp (CallMeBot) — Netlify Scheduled Function.
// Corre 1 vez al día (ver "schedule" abajo), revisa todos los proyectos
// y manda un WhatsApp a las personas configuradas cuando se dispara
// cualquiera de las 5 alertas de tiempo que ya calcula src/reglas.js.
//
// Variables de entorno (en Netlify, SIN prefijo VITE_, son secretas):
//   WHATSAPP_DEST = JSON con las personas que reciben los avisos, p.ej.:
//     [
//       {"nombre":"Jesus","phone":"+521444XXXXXXX","apikey":"123456"},
//       {"nombre":"Leonardo","phone":"+521444XXXXXXX","apikey":"234567"}
//     ]
//   (phone en formato internacional; apikey lo da CallMeBot a cada número).
// ============================================================

import { json, sbLeerProyectos, sbLeerAvisos, sbInsertarAviso, sbBorrarAviso } from "./_lib/util.js";
import { evaluarAlerta, paso } from "../../src/reglas.js";

// Cada cuántos días se REPITE el aviso si la fase sigue sin avanzar (tono alarmante).
const DIAS_REPETIR = 7;

// Fila de Supabase (snake_case) -> forma que esperan las reglas (camelCase).
const aApp = r => ({
  id: r.id,
  nombre: r.nombre,
  cliente: r.cliente,
  responsable: r.responsable || "",
  responsableReporte: r.responsable_reporte || "",
  estado: r.estado,
  resultado: r.resultado || undefined,
  paso: r.paso,
  creado: r.creado,
  pasoDesde: r.paso_desde,
  historial: r.historial || []
});

const dur = a => `${a.dias} día${a.dias === 1 ? "" : "s"}${a.habiles ? " hábil" + (a.dias === 1 ? "" : "es") : ""}`;

// Mensaje de WhatsApp. reincidencia=true -> ya se había avisado y SIGUE detenido (más alarmante).
function mensaje(p, a, reincidencia) {
  const pa = paso(p);
  const fase = pa.fase?.nombre || "";
  if (reincidencia) {
    return (
      `🚨🚨 *SIGUE DETENIDO* 🚨🚨\n` +
      `*${p.nombre}* — ${p.cliente}\n` +
      `${a.quien} ${a.que} desde hace ${dur(a)} y la fase "${fase}" NO ha avanzado.\n` +
      `Esto ya está muy fuera de tiempo. Hay que resolverlo HOY.`
    );
  }
  return (
    `⚠️ *${p.nombre}* — ${p.cliente}\n` +
    `${a.quien} ${a.que} (lleva ${dur(a)}).\n` +
    `Fase: ${fase} · paso ${pa.n}.`
  );
}

const destinatarios = () => {
  try {
    const arr = JSON.parse(process.env.WHATSAPP_DEST || "[]");
    return Array.isArray(arr) ? arr.filter(d => d.phone && d.apikey) : [];
  } catch {
    return [];
  }
};

const dormir = ms => new Promise(r => setTimeout(r, ms));

// Envío por CallMeBot (un GET por persona). Devuelve true si Meta/CallMeBot lo aceptó.
async function enviarWhatsApp(dest, texto) {
  const url =
    "https://api.callmebot.com/whatsapp.php" +
    `?phone=${encodeURIComponent(dest.phone)}` +
    `&text=${encodeURIComponent(texto)}` +
    `&apikey=${encodeURIComponent(dest.apikey)}`;
  try {
    const res = await fetch(url);
    const txt = (await res.text()) || "";
    const limpio = txt.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); // quita HTML
    // CallMeBot responde 200 aunque falle: el error va en el TEXTO.
    // Señales de fallo típicas: APIKey inválida, número no autorizado, etc.
    const falla = /error|invalid|apikey|you need|not allowed|didn'?t|must send|no autoriz/i.test(limpio);
    const ok = res.ok && !falla;
    console.log(`[callmebot] ${dest.nombre || dest.phone}: ${res.status} ${ok ? "OK" : "FALLÓ"} — ${limpio.slice(0, 160)}`);
    return ok;
  } catch (e) {
    console.error(`[callmebot] ${dest.phone}: ${e.message}`);
    return false;
  }
}

export default async function handler() {
  const dest = destinatarios();
  if (!dest.length) {
    console.error("WHATSAPP_DEST vacío o inválido: no hay a quién avisar.");
    return json({ ok: false, error: "Sin destinatarios configurados" }, 200);
  }

  let proyectos, avisos;
  try {
    [proyectos, avisos] = await Promise.all([sbLeerProyectos(), sbLeerAvisos()]);
  } catch (e) {
    console.error("Lectura Supabase:", e.message);
    return json({ ok: false, error: e.message }, 502);
  }

  console.log(`[alertas] destinatarios=${dest.length} proyectos=${proyectos.length} avisos_previos=${avisos.length}`);

  // Último aviso por "id|color": cuándo se mandó (para repetir cada semana).
  const ultimoAviso = new Map(avisos.map(a => [`${a.proyecto_id}|${a.tipo}`, Date.parse(a.enviado_en)]));
  // Lo que está en alerta AHORA.
  const activos = new Set();

  let enviados = 0;

  for (const r of proyectos) {
    const p = aApp(r);
    const a = evaluarAlerta(p); // null si no hay alerta
    if (!a) continue;
    const clave = `${p.id}|${a.key}`;
    activos.add(clave);

    const previo = ultimoAviso.get(clave);
    const reincidencia = previo != null;
    // Si ya se avisó y no han pasado los días de repetición, no repetir todavía.
    if (reincidencia && Date.now() - previo < DIAS_REPETIR * 864e5) {
      console.log(`[alertas] "${p.nombre}" (${a.key}) ya avisado hace poco, aún no repito.`);
      continue;
    }

    const texto = mensaje(p, a, reincidencia);
    console.log(`[alertas] "${p.nombre}" ${a.key}${reincidencia ? " (REPETICIÓN)" : ""} -> enviando a ${dest.length}`);
    let algunoOk = false;
    for (const d of dest) {
      const ok = await enviarWhatsApp(d, texto);
      console.log(`[alertas]   -> ${d.nombre || d.phone}: ${ok ? "OK" : "FALLÓ"}`);
      algunoOk = algunoOk || ok;
      await dormir(1500); // CallMeBot pide no mandar en ráfaga
    }
    if (algunoOk) {
      try {
        await sbInsertarAviso(p.id, a.key); // (re)sella la fecha para el próximo ciclo semanal
        enviados++;
      } catch (e) {
        console.error("Guardar aviso:", e.message);
      }
    }
  }

  // Limpieza: si una alerta ya no aplica (el proyecto avanzó o cerró),
  // borra su registro para que pueda volver a dispararse en el futuro.
  for (const a of avisos) {
    const clave = `${a.proyecto_id}|${a.tipo}`;
    if (!activos.has(clave)) {
      try {
        await sbBorrarAviso(a.proyecto_id, a.tipo);
      } catch (e) {
        console.error("Borrar aviso:", e.message);
      }
    }
  }

  console.log(`[alertas] RESUMEN: en_alerta=${activos.size} enviados=${enviados} destinatarios=${dest.length}`);
  return json({ ok: true, enviados, en_alerta: activos.size, destinatarios: dest.length });
}

// 15:00 UTC = 9:00 a.m. en Ciudad de México (UTC-6). Cambia la hora aquí si quieres.
export const config = { schedule: "0 15 * * *" };