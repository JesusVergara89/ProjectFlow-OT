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
import { alerta, MOTIVO, dias, diasDesde, diasHabilesDesde, entroFase } from "../../src/reglas.js";

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

// ¿Cuántos días lleva en la condición que disparó la alerta? (para el texto)
function diasDeAlerta(p, tipo) {
  switch (tipo) {
    case "rosa":    return `${diasDesde(p.pasoDesde)} días`;
    case "rojo":    return `${diasDesde(p.creado)} días`;
    case "ambar":   return `${diasDesde(entroFase(p))} días`;
    case "morado":  return `${diasHabilesDesde(entroFase(p))} días hábiles`;
    case "naranja": return `${diasHabilesDesde(p.pasoDesde)} días hábiles`;
    default:        return `${dias(p)} días`;
  }
}

// Mensaje final que recibe la persona por WhatsApp.
function mensaje(p, tipo) {
  const quien = p.responsableReporte || p.responsable || "el responsable";
  const t = diasDeAlerta(p, tipo);
  const cab = `*${p.nombre}* — ${p.cliente}`;
  const cuerpo = {
    rojo:    `lleva ${t} sin autorizar ni declinar (Cotización y negociación). ${quien} necesita darle salida.`,
    rosa:    `Huber lleva ${t} en el paso 9 sin entregar la cotización de materiales/servicios.`,
    ambar:   `lleva ${t} en planeación sin programar el servicio. Responsable: ${quien}.`,
    morado:  `lleva ${t} sin entregar el reporte técnico. Responsable del reporte: ${quien}.`,
    naranja: `lleva ${t} sin entregar la documentación al cliente. Responsable: ${quien}.`
  }[tipo] || MOTIVO[tipo] || "requiere atención.";
  return `⚠️ ${cab} ${cuerpo}`;
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
    const txt = await res.text();
    if (!res.ok) {
      console.error(`CallMeBot ${dest.phone}: ${res.status} ${txt.slice(0, 120)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`CallMeBot ${dest.phone}: ${e.message}`);
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

  // Lo que YA se avisó: clave "id|tipo".
  const yaAvisado = new Set(avisos.map(a => `${a.proyecto_id}|${a.tipo}`));
  // Lo que está en alerta AHORA.
  const activos = new Set();

  let enviados = 0;

  for (const r of proyectos) {
    const p = aApp(r);
    const tipo = alerta(p); // null si no hay alerta
    if (!tipo) continue;
    const clave = `${p.id}|${tipo}`;
    activos.add(clave);
    if (yaAvisado.has(clave)) continue; // ya se avisó esta misma alerta, no repetir

    const texto = mensaje(p, tipo);
    let algunoOk = false;
    for (const d of dest) {
      const ok = await enviarWhatsApp(d, texto);
      algunoOk = algunoOk || ok;
      await dormir(1500); // CallMeBot pide no mandar en ráfaga
    }
    if (algunoOk) {
      try {
        await sbInsertarAviso(p.id, tipo);
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

  return json({ ok: true, enviados, en_alerta: activos.size, destinatarios: dest.length });
}

// 15:00 UTC = 9:00 a.m. en Ciudad de México (UTC-6). Cambia la hora aquí si quieres.
export const config = { schedule: "0 15 * * *" };
