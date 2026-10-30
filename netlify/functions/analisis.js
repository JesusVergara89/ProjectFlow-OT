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
  const porResp = (m.atrasosPorResponsable || [])
    .slice(0, 25)
    .map(p =>
      `- ${p.nombre}: ${p.n} proyecto(s) atrasado(s) · ${p.exceso} días de exceso acumulados · ` +
      `peor atraso ${p.peor} días (${p.peorProy})`
    )
    .join("\n");

  const porRegla = (m.atrasosPorRegla || [])
    .map(f => `- ${f.etiqueta}: ${f.n} proyecto(s) atrasado(s) · ${f.exceso} días de exceso acumulados`)
    .join("\n");

  const detalle = (m.atrasos || [])
    .slice(0, 30)
    .map(d =>
      `- "${d.nombre}" (${d.cliente}) · etapa ${d.fase} (paso ${d.paso}) · ` +
      `lleva ${d.dias} días, límite ${d.lim} → ${d.exceso} días de exceso · responsable: ${d.quien}`
    )
    .join("\n");

  const carga = (m.cargaPersona || [])
    .slice(0, 12)
    .map(c => `- ${c.nombre}: ${c.pasos} pasos`)
    .join("\n");

  const mx = n => "$" + Math.round(+n || 0).toLocaleString("es-MX");
  const pl = m.pipeline || {};
  const META = +m.meta || 3000000;
  const cobradoMes = +pl.cobradoMes || 0;
  const anticiposMes = +pl.anticiposMes || 0;
  const cobradoTotal = cobradoMes + anticiposMes; // los anticipos SÍ cuentan para la meta
  const pct = Math.round(cobradoTotal / META * 100);
  const dinero =
    `- META DE COBRANZA MENSUAL: ${mx(META)}\n` +
    `- Cobrado para la meta este mes (pagos + anticipos): ${mx(cobradoTotal)} → ${pct}% de la meta · faltan ${mx(Math.max(0, META - cobradoTotal))}\n` +
    `    · pagos completos: ${mx(cobradoMes)} (${pl.cobradoNum || 0}) · anticipos: ${mx(anticiposMes)} (${pl.anticipoNum || 0})\n` +
    `- Por facturar (pasos 23–38): ${mx(pl.porFacturar)} (${pl.porFacturarNum || 0} proyectos)\n` +
    `- Facturado (39–40, sin pagar): ${mx(pl.facturado)} (${pl.facturadoNum || 0} proyectos)`;

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
    `ATRASADOS ahora (pasan del límite de su etapa): ${(m.atrasos || []).length}\n\n` +

    `IMPORTANTE: NO midas el desempeño por "promedio de días por paso" (muchos pasos se ` +
    `marcan al instante y eso diluye los atrasos). Mide por ATRASOS: proyectos que pasan ` +
    `del LÍMITE de tiempo de su etapa, y quién es el responsable. "días de exceso" = días ` +
    `por encima del límite.\n\n` +

    `ATRASOS POR RESPONSABLE (quién está frenando, mayor exceso primero)\n` +
    `${porResp || "nadie con atrasos"}\n\n` +

    `ATRASOS POR ETAPA (dónde se acumulan)\n` +
    `${porRegla || "ninguna etapa con atrasos"}\n\n` +

    `DETALLE DE PROYECTOS ATRASADOS AHORA\n` +
    `${detalle || "ninguno"}\n\n` +

    `CARGA (volumen de pasos completados — SOLO contexto, NO es medida de desempeño)\n` +
    `${carga || "sin datos"}\n\n` +

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
    `## Atrasos y responsables\n` +
    `(con base en los ATRASOS —proyectos que pasan del límite de su etapa—, di qué etapas acumulan más atrasos y QUIÉNES son los responsables que más están frenando, con los días de exceso que lo respaldan. NO uses el promedio de días/paso para juzgar; úsalo a lo más como contexto de carga. No etiquetes como "óptimo" una etapa solo porque su promedio sea bajo si tiene proyectos atrasados)\n` +
    `## Dinero y cobranza\n` +
    `(evalúa el AVANCE DEL MES CONTRA LA META de $3,000,000, donde cuenta lo cobrado del mes = pagos completos MÁS anticipos: a qué % va, cuánto falta y si es alcanzable según lo que está por facturar/facturado y la cobranza proyectada. Analiza el pipeline por facturar vs facturado vs cobrado, si la cobranza proyectada por mes se ve pareja o concentrada, compárala con los cierres de meses anteriores y detecta riesgos de flujo de efectivo)\n` +
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
      maxOutputTokens: 8192,
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
          const cortado = datos?.candidates?.[0]?.finishReason === "MAX_TOKENS";
          return json({
            ok: true,
            analisis: cortado ? texto + "\n\n_(El análisis llegó al límite de longitud; vuelve a generarlo si quieres el detalle completo.)_" : texto,
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