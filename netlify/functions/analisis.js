import { json, usuarioDe } from "./_lib/util.js";

// Análisis con IA usando Google Gemini (tiene una cuota GRATIS, sin tarjeta).
// Recibe las MÉTRICAS ya calculadas por el cliente y pide un diagnóstico.
//
// Variables de entorno (en Netlify, SIN prefijo VITE_, son secretas):
//   GEMINI_API_KEY = tu llave gratis de https://aistudio.google.com/apikey
//   GEMINI_MODEL   = (opcional) fuerza un modelo; si no, se autodetecta uno que funcione.
const KEY = process.env.GEMINI_API_KEY || "";
const MODEL_FIJO = process.env.GEMINI_MODEL || ""; // si se define, se usa solo ese

// Orden de preferencia (texto, gratis/baratos primero). Se intersecta con lo
// que realmente tenga la cuenta.
const PREFERIDOS = [
  "gemini-flash-latest", "gemini-2.5-flash", "gemini-3-flash-preview",
  "gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-flash-lite-latest",
  "gemini-pro-latest", "gemini-2.5-pro"
];
// Modelos que NO sirven para este texto (imagen, voz, embeddings, etc.).
const EXCLUIR = /image|tts|embedding|nano-banana|customtools|vision|aqa/i;

// Modelos de la cuenta que soportan generateContent, ya ordenados por preferencia.
async function candidatos() {
  if (MODEL_FIJO) return [MODEL_FIJO];
  let lista = [];
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(KEY)}`);
    const d = await r.json().catch(() => ({}));
    lista = (d.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map(m => String(m.name || "").replace(/^models\//, ""))
      .filter(n => n && !EXCLUIR.test(n));
  } catch { /* usa los de respaldo */ }
  if (!lista.length) lista = [...PREFERIDOS];
  const enLista = n => lista.includes(n);
  const orden = [...PREFERIDOS.filter(enLista), ...lista.filter(n => !PREFERIDOS.includes(n))];
  return orden.slice(0, 6);
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

  const cuerpoIA = JSON.stringify({
    systemInstruction: { parts: [{ text: sistema }] },
    contents: [{ role: "user", parts: [{ text: pregunta }] }],
    generationConfig: { maxOutputTokens: 1600, temperature: 0.4 }
  });

  // Prueba una lista de versiones de API y de modelos hasta que uno responda.
  const versiones = ["v1beta", "v1"];
  const modelos = await candidatos();
  let ultimoErr = "";
  const intentados = [];

  for (const model of modelos) {
    for (const ver of versiones) {
      const url = `https://generativelanguage.googleapis.com/${ver}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(KEY)}`;
      let res, data;
      try {
        res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: cuerpoIA });
        data = await res.json().catch(() => ({}));
      } catch (e) {
        ultimoErr = e.message; continue;
      }
      if (res.ok) {
        const texto = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
        if (texto) return json({ ok: true, analisis: texto, modelo: model });
        ultimoErr = "respuesta vacía"; continue;
      }
      ultimoErr = data?.error?.message || `HTTP ${res.status}`;
      intentados.push(`${model}@${ver}`);
      if (res.status !== 404 && res.status !== 400) {
        // Error no relacionado con el modelo (p. ej. llave inválida o cuota): no sigas probando.
        return json({ error: `La IA respondió error: ${ultimoErr}` }, 502);
      }
    }
  }

  return json({
    error: `Ningún modelo respondió. Probé: ${intentados.join(", ") || "ninguno"}. Último error: ${ultimoErr}. ` +
      `Si tienes un modelo de texto preferido, ponlo en la variable GEMINI_MODEL.`
  }, 502);
}
