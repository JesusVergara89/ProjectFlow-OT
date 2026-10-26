
import { json, usuarioDe } from "./_lib/util.js";

// Análisis de proyectos con Google Gemini mediante Netlify Functions.
//
// Variables de entorno:
// GEMINI_API_KEY  = clave API de Google AI Studio.
// GEMINI_MODEL    = opcional; modelo específico disponible en tu cuenta.
//
// La clave API debe permanecer en el servidor. No utilizar VITE_.

const KEY = process.env.GEMINI_API_KEY || "";
const MODEL_FIJO = (process.env.GEMINI_MODEL || "")
  .trim()
  .replace(/^models\//, "");

const EXCLUIR =
  /image|tts|embedding|nano-banana|customtools|vision|aqa|audio|live|robotics/i;

// Modelos preferidos: solo se utilizarán si Google los devuelve
// en la lista de modelos compatibles con generateContent.
const PREFERIDOS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview"
];
// Consulta los modelos accesibles con la clave API.
async function obtenerModelos() {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(KEY)}`;

  const respuesta = await fetch(url);
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(
      datos?.error?.message ||
      `No se pudieron consultar los modelos. HTTP ${respuesta.status}`
    );
  }

  return (datos.models || [])
    .filter(modelo =>
      (modelo.supportedGenerationMethods || [])
        .includes("generateContent")
    )
    .map(modelo =>
      String(modelo.name || "").replace(/^models\//, "")
    )
    .filter(nombre =>
      nombre && !EXCLUIR.test(nombre)
    );
}

// Selecciona modelos reales disponibles para la cuenta.
// Si se define GEMINI_MODEL, se respeta exclusivamente ese modelo.
async function candidatos() {
  if (MODEL_FIJO) {
    return [MODEL_FIJO];
  }

  const disponibles = await obtenerModelos();
  const conjunto = new Set(disponibles);

  const preferidosDisponibles = PREFERIDOS.filter(
    nombre => conjunto.has(nombre)
  );

  const restantes = disponibles.filter(
    nombre => !PREFERIDOS.includes(nombre)
  );

  return [
    ...preferidosDisponibles,
    ...restantes
  ].slice(0, 6);
}

// Permisos: administrador o usuario Leonardo.
function puede(sesion) {
  const usuario = String(sesion.usuario || "").toLowerCase();

  return sesion.rol === "admin" || usuario === "leonardo";
}

// Construye el resumen de métricas para la IA.
const resumen = m => {
  const personas = (m.personas || [])
    .slice(0, 25)
    .map(p =>
      `- ${p.nombre}: ${p.pasos} pasos completados · ` +
      `${p.promDias} días/paso en promedio · ` +
      `paso más lento ${p.maxDias} días` +
      (p.detenidos
        ? ` · ${p.detenidos} proyecto(s) detenido(s) a su cargo ahora`
        : "")
    )
    .join("\n");

  const fases = (m.fases || [])
    .map(f =>
      `- ${f.nombre}: ${f.n} pasos · ${f.promDias} días/paso ` +
      `en promedio (límite sugerido ${f.umbral} días)`
    )
    .join("\n");

  const detenidos = (m.detenidos || [])
    .slice(0, 20)
    .map(d =>
      `- "${d.nombre}" (${d.cliente}) · paso ${d.paso} · ` +
      `${d.dias} días detenido · responsable: ${d.responsable}`
    )
    .join("\n");

  return (
    `RESUMEN GENERAL\n` +
    `Proyectos activos: ${m.activos} · ` +
    `cerrados: ${m.cerrados} · ` +
    `detenidos ahora: ${(m.detenidos || []).length}\n\n` +

    `VELOCIDAD POR PERSONA (más lento primero)\n` +
    `${personas || "sin datos"}\n\n` +

    `TIEMPO POR FASE\n` +
    `${fases || "sin datos"}\n\n` +

    `PROYECTOS DETENIDOS AHORA\n` +
    `${detenidos || "ninguno"}`
  );
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const sesion = usuarioDe(req);

  if (!sesion) {
    return json({
      error: "Sesión no válida o expirada"
    }, 401);
  }

  if (!puede(sesion)) {
    return json({
      error: "Solo el administrador puede usar el análisis con IA."
    }, 403);
  }

  if (!KEY) {
    return json({
      error: "Falta configurar GEMINI_API_KEY en Netlify."
    }, 500);
  }

  let cuerpo;

  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Petición inválida" }, 400);
  }

  const m = cuerpo?.metricas;

  if (!m) {
    return json({ error: "Faltan las métricas" }, 400);
  }

  const sistema =
    "Eres un analista de operaciones para una empresa de ingeniería " +
    "eléctrica que da seguimiento a proyectos en un flujo de 42 pasos, " +
    "desde la solicitud hasta el cobro. Analizas datos reales de " +
    "desempeño del equipo. Respondes SIEMPRE en español, con Markdown, " +
    "de forma concisa y accionable. No inventes datos que no estén " +
    "en el resumen. Sé directo y respetuoso. Identifica cuellos de " +
    "botella y personas o fases con tiempos elevados, respaldando " +
    "tus conclusiones con los datos disponibles. Distingue entre " +
    "tiempos elevados, proyectos detenidos y causas comprobadas: " +
    "no atribuyas causalidad ni responsabilices a una persona " +
    "sin evidencia suficiente. Propón recomendaciones concretas.";

  const pregunta =
    `Con estos datos de desempeño, dame un análisis para tomar decisiones:\n\n` +
    `${resumen(m)}\n\n` +
    `Estructura la respuesta así:\n` +
    `## Diagnóstico rápido\n` +
    `(3–5 viñetas con lo más importante)\n` +
    `## Cuellos de botella del flujo\n` +
    `(personas y/o fases con mayores tiempos, respaldados por datos)\n` +
    `## Recomendaciones\n` +
    `(acciones concretas y priorizadas)\n` +
    `## Riesgos a vigilar\n` +
    `(proyectos o patrones que podrían empeorar)`;

  const cuerpoIA = JSON.stringify({
    systemInstruction: {
      parts: [{ text: sistema }]
    },
    contents: [{
      role: "user",
      parts: [{ text: pregunta }]
    }],
    generationConfig: {
      maxOutputTokens: 1600,
      temperature: 0.4
    }
  });

  let modelos;

  try {
    modelos = await candidatos();
  } catch (error) {
    console.error("Error consultando modelos Gemini:", error.message);

    return json({
      error:
        `No se pudieron consultar los modelos de Gemini: ${error.message}`
    }, 502);
  }

  if (!modelos.length) {
    return json({
      error:
        "Google no devolvió modelos compatibles con generateContent " +
        "para esta clave API. Revisa los permisos y la disponibilidad " +
        "de modelos en Google AI Studio."
    }, 502);
  }

  // Mantiene la compatibilidad con la API actual de generateContent.
  const versiones = ["v1beta", "v1"];
  const intentados = [];
  let ultimoErr = "No se recibió una respuesta válida.";

  for (const modelo of modelos) {
    for (const version of versiones) {
      const url =
        `https://generativelanguage.googleapis.com/${version}/models/` +
        `${encodeURIComponent(modelo)}:generateContent` +
        `?key=${encodeURIComponent(KEY)}`;

      let respuesta;
      let datos;

      try {
        respuesta = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: cuerpoIA
        });

        datos = await respuesta.json().catch(() => ({}));
      } catch (error) {
        ultimoErr = error.message || "Error de conexión con Google.";
        intentados.push(`${modelo}@${version}: error de conexión`);
        continue;
      }

      if (respuesta.ok) {
        const texto = (
          datos?.candidates?.[0]?.content?.parts || []
        )
          .map(parte => parte.text || "")
          .join("")
          .trim();

        if (texto) {
          return json({
            ok: true,
            analisis: texto,
            modelo,
            versionAPI: version
          });
        }

        ultimoErr =
          datos?.promptFeedback?.blockReason
            ? `Solicitud bloqueada: ${datos.promptFeedback.blockReason}`
            : "Google respondió sin texto generado.";

        intentados.push(`${modelo}@${version}: respuesta vacía`);
        continue;
      }

      ultimoErr =
        datos?.error?.message ||
        `HTTP ${respuesta.status}`;

      intentados.push(
        `${modelo}@${version}: HTTP ${respuesta.status}`
      );

      // Un error de modelo o versión permite intentar otra alternativa.
      // Los errores de autenticación, cuota o permisos se reportan.
      if (![400, 404].includes(respuesta.status)) {
        console.error("Error de Gemini:", ultimoErr);

        return json({
          error: `Gemini respondió con un error: ${ultimoErr}`,
          modelo,
          versionAPI: version
        }, 502);
      }
    }
  }

  console.error("Ningún modelo de Gemini respondió:", intentados);

  return json({
    error:
      `Ningún modelo respondió. Modelos probados: ` +
      `${intentados.join(", ") || "ninguno"}. ` +
      `Último error: ${ultimoErr}. ` +
      `Revisa los modelos disponibles en Google AI Studio y ` +
      `la variable GEMINI_MODEL si has fijado un modelo específico.`
  }, 502);
}
