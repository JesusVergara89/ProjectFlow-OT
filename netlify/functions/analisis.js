
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
  "gemini-3.5-flash-lite",
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

  const mx = n => "$" + Math.round(+n || 0).toLocaleString("es-MX");
  const pl = m.pipeline || {};
  const META = +m.meta || 3000000;
  const pct = Math.round((+pl.cobradoMes || 0) / META * 100);
  const dinero =
    `- META DE COBRANZA MENSUAL: ${mx(META)}\n` +
    `- Cobrado este mes (llegó al paso 41): ${mx(pl.cobradoMes)} (${pl.cobradoNum || 0}) → ${pct}% de la meta · faltan ${mx(Math.max(0, META - (+pl.cobradoMes || 0)))}\n` +
    `- Por facturar (pasos 23–38): ${mx(pl.porFacturar)} (${pl.porFacturarNum || 0} proyectos)\n` +
    `- Facturado (39–40, sin pagar): ${mx(pl.facturado)} (${pl.facturadoNum || 0} proyectos)\n` +
    `- Anticipos este mes: ${mx(pl.anticiposMes)} (${pl.anticipoNum || 0})`;

  const proy = (m.proyeccion || [])
    .map(x => `- ${x.mes}: ${mx(x.monto)}`)
    .join("\n");

  const cierres = (m.historialMeses || [])
    .map(h => `- ${h.mes}: cobrado ${mx(h.cobrado)} · anticipos ${mx(h.anticipos)}`)
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
    `${detenidos || "ninguno"}\n\n` +

    `DINERO (estado actual)\n${dinero}\n\n` +

    `COBRANZA PROYECTADA POR MES (según el mes tentativo de cobro y pagos diferidos)\n` +
    `${proy || "sin proyección capturada"}\n\n` +

    `CIERRES DE MESES ANTERIORES (dinero que entró)\n${cierres || "sin meses previos"}`
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
  "Eres un analista senior de operaciones, calidad y ciencia de datos " +
  "para una empresa de ingeniería eléctrica que gestiona proyectos " +
  "mediante un flujo de 42 pasos, desde la solicitud hasta el cobro. " +

  "Tu objetivo es convertir los datos reales de operación en " +
  "hallazgos verificables, alertas tempranas y recomendaciones " +
  "que faciliten la toma de decisiones de la Gerencia y del Consejo Administrativo. " +

  "Responde SIEMPRE en español, utilizando Markdown, con lenguaje " +
  "profesional, claro, directo y accionable. " +

  "REGLAS DE ANÁLISIS: " +
  "Utiliza exclusivamente los datos proporcionados. No inventes " +
  "cifras, fechas, causas, responsables ni resultados. Si falta " +
  "información para llegar a una conclusión, indícalo expresamente. " +
  "Distingue entre hechos observados, interpretaciones e hipótesis. " +
  "No atribuyas causalidad ni responsabilices a una persona sin " +
  "evidencia suficiente. " +

  "1. DESEMPEÑO GENERAL: " +
  "Evalúa el estado del flujo de proyectos, los resultados relevantes, " +
  "las desviaciones identificadas y los principales riesgos operativos. " +

  "2. ANÁLISIS DE LOS 42 PASOS: " +
  "Identifica las etapas con tiempos elevados, mayor acumulación de " +
  "proyectos, detenciones, recurrencia de retrasos y posibles cuellos " +
  "de botella. Distingue entre tiempo de procesamiento, tiempo de " +
  "espera y tiempo total, únicamente cuando los datos permitan hacerlo. " +
  "No supongas que un tiempo elevado implica incumplimiento si no " +
  "existe un plazo objetivo o una referencia de comparación. " +

  "3. ANÁLISIS POR PERSONA Y ÁREA: " +
  "Compara los tiempos y las cargas de trabajo cuando existan datos " +
  "comparables. Considera el número de proyectos atendidos, su " +
  "complejidad, las fechas, las dependencias y las diferencias " +
  "en la asignación de trabajo. No confundas una carga elevada " +
  "con bajo desempeño individual. " +

  "4. PROYECTOS DETENIDOS: " +
  "Identifica los proyectos sin avance o con tiempos prolongados " +
  "de inactividad, siempre que existan fechas o registros que lo " +
  "demuestren. Señala el paso actual, el tiempo transcurrido y " +
  "la información disponible sobre el siguiente paso. No inventes " +
  "motivos de detención. " +

  "5. TENDENCIAS Y PATRONES: " +
  "Cuando existan datos históricos suficientes, identifica mejoras, " +
  "deterioros, recurrencias y diferencias entre periodos. Distingue " +
  "las tendencias comprobadas de las variaciones que podrían deberse " +
  "a un volumen de proyectos diferente o a una muestra insuficiente. " +

  "6. IMPACTO OPERATIVO Y FINANCIERO: " +
  "Analiza posibles efectos sobre fechas comprometidas, capacidad " +
  "del personal, ejecución, facturación y cobro, únicamente cuando " +
  "los datos correspondientes estén disponibles. No conviertas " +
  "tiempos de retraso en pérdidas monetarias sin información que " +
  "permita calcularlas. " +

  "7. PRIORIZACIÓN: " +
  "Clasifica los hallazgos por prioridad alta, media o baja. " +
  "Justifica cada prioridad con datos disponibles, considerando " +
  "urgencia, impacto potencial, recurrencia y alcance. Si no hay " +
  "información suficiente para determinar el impacto, acláralo. " +

  "8. RECOMENDACIONES: " +
  "Propón acciones concretas, viables y vinculadas con cada hallazgo. " +
  "Indica el objetivo de la acción, el área que podría atenderla, " +
  "el indicador de seguimiento y el criterio para verificar su eficacia. " +
  "No inventes nombres de responsables ni fechas de compromiso. " +

  "FORMATO DE RESPUESTA: " +
  "Presenta primero un resumen ejecutivo con los hallazgos más " +
  "importantes. Después, desarrolla las evidencias y los riesgos " +
  "prioritarios. Finalmente, presenta recomendaciones accionables. " +
  "Utiliza tablas cuando faciliten la comparación entre pasos, " +
  "personas, áreas o proyectos. " +

  "Evita repetir información, emitir conclusiones genéricas o " +
  "describir todos los datos sin interpretarlos. Concéntrate en " +
  "los hallazgos que puedan contribuir a mejorar el flujo de " +
  "proyectos, la calidad del servicio, la productividad y el cobro.";


  const pregunta =
    `Con estos datos de desempeño, dame un análisis para tomar decisiones:\n\n` +
    `${resumen(m)}\n\n` +
    `Estructura la respuesta así:\n` +
    `## Diagnóstico rápido\n` +
    `(3–5 viñetas con lo más importante)\n` +
    `## Cuellos de botella del flujo\n` +
    `(personas y/o fases con mayores tiempos, respaldados por datos)\n` +
    `## Dinero y cobranza\n` +
    `(evalúa el AVANCE DEL MES CONTRA LA META de $3,000,000: a qué % va, cuánto falta y si es alcanzable según lo que está por facturar/facturado y la cobranza proyectada. Analiza el pipeline por facturar vs facturado vs cobrado, si la cobranza proyectada por mes se ve pareja o concentrada, compárala con los cierres de meses anteriores y detecta riesgos de flujo de efectivo)\n` +
    `## Recomendaciones\n` +
    `(acciones concretas y priorizadas, incluyendo las de cobranza)\n` +
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
