// ============================================================
// Alertas por Telegram — Netlify Scheduled Function.
// Corre 1 vez al día (ver "schedule" abajo), revisa todos los proyectos
// y manda un mensaje de Telegram a las personas/grupo configurados cuando
// se dispara cualquiera de las alertas de tiempo que calcula src/reglas.js.
//
// A diferencia de CallMeBot, Telegram CONFIRMA la entrega real: su API
// responde { ok: true } solo si el mensaje se entregó. Por eso solo se
// "sella" el aviso (anti-spam) cuando de verdad salió.
//
// Variables de entorno (en Netlify, SIN prefijo VITE_, son secretas):
//   TELEGRAM_BOT_TOKEN = token del bot que te da @BotFather, p. ej. "123456:ABC-DEF..."
//   TELEGRAM_DEST = JSON con los destinos (chat_id de cada persona o del grupo):
//     [
//       {"nombre":"Jesus","chat_id":"123456789"},
//       {"nombre":"Equipo","chat_id":"-1001234567890"}
//     ]
//   (chat_id lo obtienes escribiéndole al bot y leyendo getUpdates; ver TELEGRAM-SETUP.md)
// ============================================================

import { json, sbLeerProyectos, sbLeerAvisos, sbInsertarAviso, sbBorrarAviso } from "./_lib/util.js";
import { evaluarAlerta, paso } from "../../src/reglas.js";

// Cada cuántos días se REPITE el aviso si la fase sigue sin avanzar (tono alarmante).
const DIAS_REPETIR = 7;

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

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

// Escapa lo que va dentro de HTML de Telegram (parse_mode=HTML).
const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Mensaje. reincidencia=true -> ya se había avisado y SIGUE detenido (más alarmante).
function mensaje(p, a, reincidencia) {
  const pa = paso(p);
  const fase = pa.fase?.nombre || "";
  if (reincidencia) {
    return (
      `🚨🚨 <b>SIGUE DETENIDO</b> 🚨🚨\n` +
      `<b>${esc(p.nombre)}</b> — ${esc(p.cliente)}\n` +
      `${esc(a.quien)} ${esc(a.que)} desde hace ${dur(a)} y la fase "${esc(fase)}" NO ha avanzado.\n` +
      `Esto ya está fuera de tiempo. Hay que resolverlo HOY.`
    );
  }
  return (
    `⚠️ <b>${esc(p.nombre)}</b> — ${esc(p.cliente)}\n` +
    `${esc(a.quien)} ${esc(a.que)} (lleva ${dur(a)}).\n` +
    `Fase: ${esc(fase)} · paso ${pa.n}.`
  );
}

const destinatarios = () => {
  try {
    const arr = JSON.parse(process.env.TELEGRAM_DEST || "[]");
    return Array.isArray(arr) ? arr.filter(d => d.chat_id) : [];
  } catch {
    return [];
  }
};

const dormir = ms => new Promise(r => setTimeout(r, ms));

// Envío por Telegram. Devuelve true solo si Telegram CONFIRMA la entrega (ok:true).
async function enviarTelegram(dest, texto) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: dest.chat_id,
        text: texto,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && data.ok === true;
    console.log(`[telegram] ${dest.nombre || dest.chat_id}: ${ok ? "OK" : "FALLÓ"}${ok ? "" : " — " + (data.description || res.status)}`);
    return ok;
  } catch (e) {
    console.error(`[telegram] ${dest.chat_id}: ${e.message}`);
    return false;
  }
}

export default async function handler() {
  if (!TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN vacío: no hay bot para enviar.");
    return json({ ok: false, error: "Falta TELEGRAM_BOT_TOKEN" }, 200);
  }
  const dest = destinatarios();
  if (!dest.length) {
    console.error("TELEGRAM_DEST vacío o inválido: no hay a quién avisar.");
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
      const ok = await enviarTelegram(d, texto);
      console.log(`[alertas]   -> ${d.nombre || d.chat_id}: ${ok ? "OK" : "FALLÓ"}`);
      algunoOk = algunoOk || ok;
      await dormir(300);
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
