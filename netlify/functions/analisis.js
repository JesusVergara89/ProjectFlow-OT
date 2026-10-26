import { json, usuarioDe } from "./_lib/util.js";

// Análisis con IA usando Google Gemini (tiene una cuota GRATIS, sin tarjeta).
// Recibe las MÉTRICAS ya calculadas por el cliente y pide un diagnóstico.
//
// Variables de entorno (en Netlify, SIN prefijo VITE_, son secretas):
//   GEMINI_API_KEY = tu llave gratis de https://aistudio.google.com/apikey
//   GEMINI_MODEL   = (opcional) por defecto "gemini-1.5-flash" (gratis).
const KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// Lista los modelos que SÍ soportan generateContent (para ayudar si el modelo falla).
async function modelosDisponibles() {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(KEY)}`);
    const d = await r.json().catch(() => ({}));
    return (d.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map(m => String(m.name || "").replace(/^models\//, ""))
      .slice(0, 20);
  } catch {
    return [];
  }
}

// Solo admin / Leonardo pueden pedir el análisis (controla acceso).
function puede(sesion) {
  const u = String(sesion.usuario || "").toLowerCase();
  return sesion.rol === "admin" || u === "leonardo";
}

const resumen = m => {
  const personas = (m.personas || []).slice(0, 25).map(p =>
    `- ${p.nombre}: ${p.pasos} pasos completados · ${p.promDias} días/paso en promedio · paso más lento ${p.maxDias} días` +
    (p.detenidos ? ` · ${p.detenidos} proyecto(s) detenido(s) a su cargo ahora` : "")
  ).join("\n");
  const fases = (m.fases || []).map(f =>
    `- ${f.nombre}: ${f.n} pasos · ${f.promDias} días/paso en promedio (límite sugerido ${f.umbral} días)`
  ).join("\n");
  const det = (m.detenidos || []).slice(0, 20).map(d =>
    `- "${d.nombre}" (${d.cliente}) · paso ${d.paso} · ${d.dias} días detenido · responsable: ${d.responsable}`
  ).join("\n");
  return (
    `RESUMEN GENERAL\n` +
    `Proyectos activos: ${m.activos} · cerrados: ${m.cerrados} · detenidos ahora: ${(m.detenidos || []).length}\n\n` +
    `VELOCIDAD POR PERSONA (más lento primero)\n${personas || "sin datos"}\n\n` +
    `TIEMPO POR FASE\n${fases || "sin datos"}\n\n` +
    `PROYECTOS DETENIDOS AHORA\n${det || "ninguno"}`
  );
};

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const sesion = usuarioDe(req);
  if (!sesion) return json({ error: "Sesión no válida o expirada" }, 401);
  if (!puede(sesion)) return json({ error: "Solo el administrador puede usar el análisis con IA." }, 403);
  if (!KEY) return json({ error: "Falta configurar GEMINI_API_KEY en Netlify." }, 500);

  let cuerpo;
  try { cuerpo = await req.json(); } catch { return json({ error: "Petición inválida" }, 400); }
  const m = cuerpo?.metricas;
  if (!m) return json({ error: "Faltan las métricas" }, 400);

  const sistema =
    "Eres un analista de operaciones para un despacho de ingeniería eléctrica que da seguimiento a proyectos " +
    "en un flujo de 42 pasos (de la solicitud al cobro). Analizas datos reales de desempeño del equipo. " +
    "Respondes SIEMPRE en español, con Markdown, de forma concisa y ACCIONABLE. " +
    "No inventes datos que no estén en el resumen. Sé directo pero respetuoso: señala cuellos de botella y " +
    "quiénes son más lentos con base en los números, y da recomendaciones concretas para mejorar.";

  const pregunta =
    `Con estos datos de desempeño, dame un análisis para tomar decisiones:\n\n${resumen(m)}\n\n` +
    `Estructura la respuesta así:\n` +
    `## Diagnóstico rápido\n(3–5 viñetas con lo más importante)\n` +
    `## Quiénes están frenando el flujo\n(personas y/o fases más lentas, con el dato que lo respalda)\n` +
    `## Recomendaciones\n(acciones concretas y priorizadas)\n` +
    `## Riesgos a vigilar\n(proyectos o patrones que podrían empeorar)`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(KEY)}`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: [{ role: "user", parts: [{ text: pregunta }] }],
        generationConfig: { maxOutputTokens: 1600, temperature: 0.4 }
      })
    });
  } catch (e) {
    return json({ error: "No se pudo contactar a la IA: " + e.message }, 502);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404) {
      const lista = await modelosDisponibles();
      const sug = lista.length ? ` Modelos disponibles en tu cuenta: ${lista.join(", ")}. Pon uno en la variable GEMINI_MODEL.` : "";
      return json({ error: `El modelo "${MODEL}" no existe para tu API key.${sug}` }, 502);
    }
    return json({ error: `La IA respondió error (${res.status}): ${data?.error?.message || "desconocido"}` }, 502);
  }
  const texto = (data?.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || "").join("").trim();
  if (!texto) return json({ error: "La IA no devolvió texto." }, 502);

  return json({ ok: true, analisis: texto, modelo: MODEL });
}
