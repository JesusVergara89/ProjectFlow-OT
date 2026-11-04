/* Ritmo de cobranza contra la meta mensual.
   La meta ($3,000,000) se reparte en 4 semanas iguales de $750,000 que se
   ACUMULAN: semana 1 → 750k, semana 2 → 1.5M, semana 3 → 2.25M, semana 4 → 3M.
   "Real" = dinero que entró (cobros + anticipos) por su fecha registrada.
   Devuelve series por día y por semana (ideal vs real) y el cierre del mes. */
import { mesActual } from "./meses.js";
import { faseDinero, mesCobrado, montoCobrado, mesDeISO } from "./dinero.js";

export const META_MENSUAL = 3000000;

// Semanas del mes: 4 cubetas por rango de días (la 4a absorbe 29–31).
const SEM_INI = [1, 8, 15, 22];
const semIni = w => SEM_INI[w];
const semFin = (w, nDias) => (w === 3 ? nDias : [7, 14, 21][w]);
const cubeta = d => (d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3);

function diasDelMes(ym) {
  const y = Math.floor(ym / 100), m = ym % 100;
  return new Date(y, m, 0).getDate();
}

// Día (1..31) de un ISO SOLO si cae en el mes ym; si no, null.
function diaEnMes(iso, ym) {
  const d = new Date(iso);
  if (isNaN(d)) return null;
  if (d.getFullYear() * 100 + (d.getMonth() + 1) !== ym) return null;
  return d.getDate();
}

// Mejor fecha conocida en que un proyecto entró a "cobrado".
function isoCobro(p) {
  const h = p.historial || [];
  for (let i = h.length - 1; i >= 0; i--) if (h[i].p === 40 && h[i].f) return h[i].f;
  return p.cerradoEn || p.pasoDesde || p.creado || null;
}
// Mejor fecha conocida de un anticipo dentro del mes ym.
function isoAnticipo(p, ym) {
  const h = p.historial || [];
  for (let i = h.length - 1; i >= 0; i--) if (h[i].f && mesDeISO(h[i].f) === ym) return h[i].f;
  if (p.creado && mesDeISO(p.creado) === ym) return p.creado;
  return null;
}

export function ritmoMeta(lista, opciones = {}) {
  const ym = opciones.mes || mesActual();
  const meta = opciones.meta || META_MENSUAL;
  const nDias = diasDelMes(ym);
  const esMesActual = ym === mesActual();
  const hoy = esMesActual ? Math.min(new Date().getDate(), nDias) : nDias;
  const metaSemana = meta / 4;

  // Dinero real repartido por día. Lo que no tenga día (prepago/anticipo sin
  // fecha) cae en "hoy", para que el acumulado de HOY cuadre con el total real.
  const porDia = new Array(nDias + 1).fill(0);
  let totalReal = 0;
  const sinDia = Math.max(1, hoy);

  for (const p of lista || []) {
    if (!p || p.archivado) continue;
    const fase = faseDinero(p);
    if (fase === "cobrado" && mesCobrado(p) === ym) {
      const monto = montoCobrado(p);
      if (monto > 0) {
        porDia[diaEnMes(isoCobro(p), ym) || sinDia] += monto;
        totalReal += monto;
      }
    } else if (fase && fase !== "cobrado" && (+p.anticipo || 0) > 0 && (+p.anticipoMes || 0) === ym) {
      const a = +p.anticipo || 0;
      porDia[diaEnMes(isoAnticipo(p, ym), ym) || sinDia] += a;
      totalReal += a;
    }
  }

  // IDEAL = línea recta por tiempo: 4 semanas de 7 días (28 días "meta"),
  // cada día vale meta/28 (≈ $107,142 con $3M). Llega a la meta el día 28 y
  // de ahí se mantiene. No depende de lo real; es "lo que debería ser".
  const idealDiario = meta / 28;

  // Serie acumulada por día: real (lo que es) vs ideal (lo que debería ser).
  const diario = [];
  let acReal = 0;
  for (let d = 1; d <= nDias; d++) {
    acReal += porDia[d];
    const idealAcum = Math.min(meta, d * idealDiario);
    diario.push({
      dia: d,
      real: Math.round(porDia[d]),
      realAcum: Math.round(acReal),
      idealAcum: Math.round(idealAcum),
      dif: Math.round(acReal - idealAcum),
      transcurrido: !esMesActual || d <= hoy
    });
  }

  // Serie acumulada por semana (4 cubetas).
  const semanas = [0, 1, 2, 3].map(w => {
    const ini = semIni(w), fin = semFin(w, nDias);
    const real = diario.slice(ini - 1, fin).reduce((s, x) => s + x.real, 0);
    const realAcum = diario[fin - 1].realAcum;
    const metaAcum = (w + 1) * metaSemana;
    return {
      semana: w + 1, ini, fin,
      metaSemana: Math.round(metaSemana),
      metaAcum: Math.round(metaAcum),
      real: Math.round(real),
      realAcum: Math.round(realAcum),
      dif: Math.round(realAcum - metaAcum),
      transcurrida: !esMesActual || hoy >= ini
    };
  });

  const realHoy = Math.round(totalReal);
  const idealHoy = esMesActual ? diario[hoy - 1].idealAcum : meta;
  const diasRestantes = Math.max(0, nDias - hoy);
  const falta = Math.max(0, meta - realHoy);
  const ritmoNecesarioDia = diasRestantes > 0 ? Math.round(falta / diasRestantes) : falta;
  const semActual = esMesActual ? cubeta(hoy) + 1 : 4;
  const diasRestSemana = esMesActual ? Math.max(0, semFin(semActual - 1, nDias) - hoy) : 0;
  const metaSemActualAcum = semActual * metaSemana;
  const faltaSemana = Math.max(0, Math.round(metaSemActualAcum - realHoy));
  const ritmoNecesarioSemana = diasRestSemana > 0 ? Math.round(faltaSemana / diasRestSemana) : faltaSemana;
  const proyeccionFin = esMesActual && hoy > 0 ? Math.round((realHoy / hoy) * nDias) : realHoy;

  return {
    ym, meta, nDias, hoy, esMesActual, metaSemana: Math.round(metaSemana),
    diario, semanas,
    realHoy, idealHoy, dif: realHoy - idealHoy,
    pct: Math.round((realHoy / meta) * 100),
    diasRestantes, falta, ritmoNecesarioDia,
    semActual, faltaSemana, ritmoNecesarioSemana,
    proyeccionFin, pctProyeccion: Math.round((proyeccionFin / meta) * 100),
    alcanza: proyeccionFin >= meta
  };
}

// Resumen compacto para mandar al análisis con IA (sin la serie día a día).
export function ritmoResumen(lista, opciones = {}) {
  const r = ritmoMeta(lista, opciones);
  return {
    meta: r.meta, dia: r.hoy, diasMes: r.nDias, diasRestantes: r.diasRestantes,
    realHoy: r.realHoy, idealHoy: r.idealHoy, dif: r.dif, pct: r.pct,
    falta: r.falta, ritmoNecesarioDia: r.ritmoNecesarioDia,
    semanaActual: r.semActual, ritmoNecesarioSemana: r.ritmoNecesarioSemana,
    proyeccionFin: r.proyeccionFin, pctProyeccion: r.pctProyeccion, alcanza: r.alcanza,
    semanas: r.semanas.map(s => ({
      semana: s.semana, metaAcum: s.metaAcum, realAcum: s.realAcum, dif: s.dif, transcurrida: s.transcurrida
    }))
  };
}
