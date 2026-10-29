import { useMemo, useState } from "react";
import { Lateral } from "./Panel.jsx";
import { paso, evaluarAlerta } from "../reglas.js";
import { money, repartirMonto } from "../format.js";
import { mesActual, mesesDesdeHoy, nombreMes, nombreMesCorto } from "../meses.js";
import { faseDinero, saldoDe, totalesVivos, totalesDelMes, mesesConDinero } from "../dinero.js";
import { analizarIA } from "../db.js";

const r1 = n => Math.round(n * 10) / 10;
const META_MENSUAL = 3000000; // meta de cobranza del mes (MXN)

// --- Impresión del análisis (abre una ventana limpia y manda a imprimir) ---
const escHtml = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inlineHtml = s => escHtml(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
function mdToHtml(md) {
  const L = String(md || "").split("\n");
  let html = "", enLista = false, i = 0;
  const cerrar = () => { if (enLista) { html += "</ul>"; enLista = false; } };
  while (i < L.length) {
    const t = L[i].trim();
    const sig = (L[i + 1] || "").trim();
    if (t.startsWith("|") && /^[\s|:-]+$/.test(sig) && sig.includes("-")) {
      cerrar();
      const cab = t.split("|").slice(1, -1).map(c => c.trim());
      html += "<table><thead><tr>" + cab.map(c => `<th>${inlineHtml(c)}</th>`).join("") + "</tr></thead><tbody>";
      i += 2;
      while (i < L.length && L[i].trim().startsWith("|")) {
        const cs = L[i].trim().split("|").slice(1, -1).map(c => c.trim());
        html += "<tr>" + cs.map(c => `<td>${inlineHtml(c)}</td>`).join("") + "</tr>";
        i++;
      }
      html += "</tbody></table>"; continue;
    }
    if (t.startsWith("## ")) { cerrar(); html += `<h3>${inlineHtml(t.slice(3))}</h3>`; }
    else if (t.startsWith("# ")) { cerrar(); html += `<h2>${inlineHtml(t.slice(2))}</h2>`; }
    else if (t.startsWith("- ") || t.startsWith("* ")) { if (!enLista) { html += "<ul>"; enLista = true; } html += `<li>${inlineHtml(t.slice(2))}</li>`; }
    else if (!t) { cerrar(); }
    else { cerrar(); html += `<p>${inlineHtml(t)}</p>`; }
    i++;
  }
  cerrar();
  return html;
}
function imprimir(texto) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Análisis del equipo</title>` +
    `<style>body{font-family:system-ui,-apple-system,Arial,sans-serif;max-width:820px;margin:24px auto;padding:0 20px;color:#111;line-height:1.5}` +
    `h1{font-size:20px;margin:0 0 2px}h2{font-size:17px;margin:18px 0 6px}h3{font-size:15px;color:#274C8F;margin:14px 0 4px}` +
    `p{margin:6px 0}ul{margin:6px 0 10px;padding-left:20px}li{margin:3px 0}` +
    `table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #ccc;padding:4px 8px;text-align:left;font-size:13px}` +
    `th{background:#f2f4f8}.meta{color:#666;font-size:12px;margin-bottom:12px}@media print{body{margin:0}}</style></head>` +
    `<body><h1>Análisis del equipo — Tablero de Proyectos y OT</h1>` +
    `<p class="meta">Generado el ${new Date().toLocaleString("es-MX")} · Meta de cobranza mensual: $${META_MENSUAL.toLocaleString("es-MX")}</p>` +
    mdToHtml(texto) + `</body></html>`
  );
  w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch { /* el usuario puede imprimir manual */ } }, 250);
  return true;
}

// Mes tentativo de cobro de un proyecto (igual que en Proyección).
const mesDeCobro = p => {
  if (p.cobroMes) return p.cobroMes;
  if (p.resultado === "cerrado") return mesActual();
  return null;
};
// Cobros de un proyecto: un pago, o varios si es diferido.
const cobrosDe = p => {
  const monto = +p.monto || 0;
  const meses = Array.isArray(p.pagosMeses) ? p.pagosMeses.filter(Boolean) : [];
  if (p.diferido && meses.length) {
    const partes = repartirMonto(monto, meses.length);
    return meses.map((mes, i) => ({ mes: +mes || null, monto: partes[i] }));
  }
  return [{ mes: mesDeCobro(p), monto }];
};

// Calcula métricas de desempeño a partir del historial de los proyectos.
function calcular(items) {
  const vivos = items.filter(p => !p.archivado);
  const act = vivos.filter(p => p.estado === "activo");

  // ----- ATRASOS ACTUALES -----
  // Un proyecto está atrasado cuando pasa el LÍMITE DE TIEMPO de su etapa
  // (reglas de alerta), que ya traen el responsable. No se mide por promedio
  // de días/paso (eso diluye los atrasos y todo sale "óptimo").
  const atrasos = [];
  for (const p of act) {
    const a = evaluarAlerta(p);
    if (!a) continue;
    atrasos.push({
      nombre: p.nombre, cliente: p.cliente, paso: p.paso,
      fase: paso(p).fase.nombre, regla: a.etiqueta,
      quien: (a.quien || "—").trim() || "—",
      dias: a.dias, lim: a.lim, exceso: Math.max(0, a.dias - a.lim)
    });
  }
  atrasos.sort((x, y) => y.exceso - x.exceso);

  // Atrasos agrupados por RESPONSABLE (quién está frenando).
  const porResp = {};
  for (const t of atrasos) {
    if (!porResp[t.quien]) porResp[t.quien] = { nombre: t.quien, n: 0, exceso: 0, peor: 0, peorProy: "" };
    porResp[t.quien].n++;
    porResp[t.quien].exceso += t.exceso;
    if (t.exceso > porResp[t.quien].peor) { porResp[t.quien].peor = t.exceso; porResp[t.quien].peorProy = t.nombre; }
  }
  const atrasosPorResponsable = Object.values(porResp).sort((a, b) => b.exceso - a.exceso);

  // Atrasos agrupados por ETAPA/regla (dónde se acumulan).
  const porRegla = {};
  for (const t of atrasos) {
    const k = t.regla || t.fase;
    if (!porRegla[k]) porRegla[k] = { etiqueta: k, n: 0, exceso: 0 };
    porRegla[k].n++; porRegla[k].exceso += t.exceso;
  }
  const atrasosPorRegla = Object.values(porRegla).sort((a, b) => b.exceso - a.exceso);

  // Carga (volumen de pasos completados) — SOLO contexto, no mide desempeño.
  const carga = {};
  for (const p of vivos) for (const e of (p.historial || [])) {
    const q = (e.nombre || e.u || "—").trim() || "—";
    carga[q] = (carga[q] || 0) + 1;
  }
  const cargaPersona = Object.entries(carga)
    .map(([nombre, pasos]) => ({ nombre, pasos })).sort((a, b) => b.pasos - a.pasos).slice(0, 15);

  // ----- DINERO -----
  const MES = mesActual();
  const tv = totalesVivos(vivos);                 // por facturar / facturado (saldos en vivo)
  const tMes = totalesDelMes(vivos, MES);          // cobrado + anticipos de este mes
  const pipeline = {
    porFacturar: Math.round(tv.porFacturar), porFacturarNum: tv.porFacturarNum,
    facturado: Math.round(tv.facturado), facturadoNum: tv.facturadoNum,
    cobradoMes: Math.round(tMes.cobrado), cobradoNum: tMes.cobradoNum,
    anticiposMes: Math.round(tMes.anticipos), anticipoNum: tMes.anticipoNum
  };

  // ----- COBRANZA PROYECTADA POR MES (próximos 6 meses + posterior + sin fecha) -----
  const baseProy = vivos.filter(p => p.resultado !== "no-viable" && p.resultado !== "archivado");
  const cols = mesesDesdeHoy(6);
  const ultimo = cols[cols.length - 1];
  const bucket = {}; cols.forEach(ym => { bucket[ym] = 0; });
  let posterior = 0, sinFecha = 0;
  for (const p of baseProy) {
    for (const c of cobrosDe(p)) {
      if (!c.mes) { sinFecha += c.monto; continue; }
      if (c.mes <= cols[0]) bucket[cols[0]] += c.monto;
      else if (c.mes > ultimo) posterior += c.monto;
      else if (bucket[c.mes] != null) bucket[c.mes] += c.monto;
      else posterior += c.monto;
    }
  }
  const proyeccion = cols.map(ym => ({ ym, mes: nombreMes(ym), corto: nombreMesCorto(ym), monto: Math.round(bucket[ym]) }));
  if (posterior > 0) proyeccion.push({ ym: "post", mes: "Posterior", corto: "Posterior", monto: Math.round(posterior) });
  if (sinFecha > 0) proyeccion.push({ ym: "sin", mes: "Sin fecha", corto: "Sin fecha", monto: Math.round(sinFecha) });

  // ----- CIERRES DE MESES ANTERIORES -----
  const historialMeses = [];
  for (const mm of mesesConDinero(vivos)) {
    if (mm < MES) {
      const t = totalesDelMes(vivos, mm);
      historialMeses.push({ mes: nombreMes(mm), cobrado: Math.round(t.cobrado), anticipos: Math.round(t.anticipos) });
    }
  }

  return {
    activos: act.length,
    cerrados: vivos.length - act.length,
    atrasos,
    atrasosPorResponsable,
    atrasosPorRegla,
    cargaPersona,
    pipeline,
    proyeccion,
    historialMeses,
    meta: META_MENSUAL
  };
}

// Render muy simple de Markdown (encabezados, viñetas y negritas).
function Markdown({ texto }) {
  const lineas = String(texto || "").split("\n");
  const out = [];
  let lista = [];
  const cerrarLista = i => { if (lista.length) { out.push(<ul key={"u" + i}>{lista}</ul>); lista = []; } };
  const inline = s => {
    const partes = s.split(/(\*\*[^*]+\*\*)/g);
    return partes.map((t, i) => t.startsWith("**") && t.endsWith("**")
      ? <b key={i}>{t.slice(2, -2)}</b> : <span key={i}>{t}</span>);
  };
  lineas.forEach((ln, i) => {
    const t = ln.trim();
    if (t.startsWith("## ")) { cerrarLista(i); out.push(<h3 key={i}>{inline(t.slice(3))}</h3>); }
    else if (t.startsWith("# ")) { cerrarLista(i); out.push(<h2 key={i}>{inline(t.slice(2))}</h2>); }
    else if (t.startsWith("- ") || t.startsWith("* ")) { lista.push(<li key={i}>{inline(t.slice(2))}</li>); }
    else if (!t) { cerrarLista(i); }
    else { cerrarLista(i); out.push(<p key={i}>{inline(t)}</p>); }
  });
  cerrarLista("fin");
  return <div className="md">{out}</div>;
}

export default function Analisis({ items, onCerrar }) {
  const m = useMemo(() => calcular(items), [items]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [analisis, setAnalisis] = useState("");

  async function pedir() {
    setError(""); setCargando(true); setAnalisis("");
    try {
      const r = await analizarIA(m);
      setAnalisis(r.analisis || "");
    } catch (e) {
      setError(e.message || "No se pudo generar el análisis.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Lateral onCerrar={onCerrar} className="drawer-izq drawer-ancho">
      <div className="d-head">
        <div>
          <p className="eyebrow">Apoyo para decisiones</p>
          <h2 id="d-titulo">Análisis del equipo</h2>
        </div>
        <button type="button" className="btn icon" data-foco aria-label="Cerrar" onClick={onCerrar}>✕</button>
      </div>
      <div className="d-body">
        <p className="sig">
          {m.activos} proyectos activos · {m.cerrados} cerrados · <b>{m.atrasos.length} atrasados</b> (pasan del límite de tiempo de su etapa).
        </p>

        <div className="d-sec">
          <h3>Dinero</h3>
          <div className="kpis-mini">
            <div className="km"><span className="km-l">Por facturar</span><span className="km-v">{money(m.pipeline.porFacturar)}</span></div>
            <div className="km"><span className="km-l">Facturado</span><span className="km-v">{money(m.pipeline.facturado)}</span></div>
            <div className="km"><span className="km-l">Cobrado (mes)</span><span className="km-v">{money(m.pipeline.cobradoMes + m.pipeline.anticiposMes)}</span></div>
            <div className="km"><span className="km-l">Anticipos (mes)</span><span className="km-v">{money(m.pipeline.anticiposMes)}</span></div>
          </div>
          <div className="meta-barra">
            <div className="meta-top">
              <span>Meta mensual: <b>{money(m.meta)}</b></span>
              <span>{Math.round(((m.pipeline.cobradoMes + m.pipeline.anticiposMes )/ m.meta) * 100)}% · {money(m.pipeline.cobradoMes + m.pipeline.anticiposMes)} cobrado</span>
            </div>
            <div className="meta-track"><div className="meta-fill" style={{ width: Math.min(100, Math.round((m.pipeline.cobradoMes / m.meta) * 100)) + "%" }} /></div>
            <span className="sig">Faltan {money(Math.max(0, m.meta - (m.pipeline.cobradoMes + m.pipeline.anticiposMes)))} para la meta del mes.</span>
          </div>
        </div>

        <div className="d-sec">
          <h3>Cobranza proyectada por mes</h3>
          {m.proyeccion.some(x => x.monto) ? (
            <table className="proy-tabla">
              <thead><tr><th>Mes</th><th className="num">Cobro proyectado</th></tr></thead>
              <tbody>
                {m.proyeccion.map(x => (
                  <tr key={x.ym}><td>{x.mes}</td><td className="num">{x.monto ? money(x.monto) : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="vacio">Aún no hay cobros proyectados (define el mes tentativo de cobro en los proyectos).</p>}
        </div>

        {m.historialMeses.length > 0 && (
          <div className="d-sec">
            <h3>Cierres de meses anteriores</h3>
            <table className="proy-tabla">
              <thead><tr><th>Mes</th><th className="num">Cobrado</th><th className="num">Anticipos</th></tr></thead>
              <tbody>
                {m.historialMeses.map(h => (
                  <tr key={h.mes}><td>{h.mes}</td><td className="num">{money(h.cobrado)}</td><td className="num">{money(h.anticipos)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="d-sec">
          <h3>Atrasos por responsable (quién está frenando)</h3>
          {m.atrasosPorResponsable.length ? (
            <table className="proy-tabla">
              <thead>
                <tr><th>Responsable</th><th className="num">Proyectos atrasados</th><th className="num">Días de exceso (suma)</th><th className="num">Peor atraso</th></tr>
              </thead>
              <tbody>
                {m.atrasosPorResponsable.map(p => (
                  <tr key={p.nombre} className="fila-alerta">
                    <td>{p.nombre}</td>
                    <td className="num">{p.n}</td>
                    <td className="num">{p.exceso}</td>
                    <td className="num" title={p.peorProy}>{p.peor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="vacio">No hay proyectos atrasados ahora mismo. 🎉</p>}
        </div>

        <div className="d-sec">
          <h3>Atrasos por etapa (dónde se acumulan)</h3>
          {m.atrasosPorRegla.length ? (
            <table className="proy-tabla">
              <thead><tr><th>Etapa / regla</th><th className="num">Proyectos</th><th className="num">Días de exceso (suma)</th></tr></thead>
              <tbody>
                {m.atrasosPorRegla.map(f => (
                  <tr key={f.etiqueta} className="fila-alerta">
                    <td>{f.etiqueta}</td><td className="num">{f.n}</td><td className="num">{f.exceso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="vacio">Sin atrasos por etapa.</p>}
        </div>

        {m.atrasos.length > 0 && (
          <div className="d-sec">
            <h3>Proyectos atrasados ahora (detalle)</h3>
            <table className="proy-tabla">
              <thead><tr><th>Proyecto</th><th>Etapa</th><th>Responsable</th><th className="num">Días</th><th className="num">Exceso</th></tr></thead>
              <tbody>
                {m.atrasos.slice(0, 40).map((t, i) => (
                  <tr key={i} className="fila-alerta">
                    <td>{t.nombre}</td><td>{t.fase}</td><td>{t.quien}</td>
                    <td className="num">{t.dias}</td><td className="num">+{t.exceso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="d-sec">
          <div className="fila" style={{ justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <h3 style={{ margin: 0 }}>Análisis con IA</h3>
            <div className="fila" style={{ gap: 8 }}>
              {analisis && (
                <button type="button" className="btn" onClick={() => imprimir(analisis)}>🖨 Imprimir</button>
              )}
              <button type="button" className="btn primary" onClick={pedir} disabled={cargando}>
                {cargando ? "Analizando…" : (analisis ? "Volver a analizar" : "✨ Analizar con IA")}
              </button>
            </div>
          </div>
          {error && <p className="sig" style={{ color: "var(--crit)" }}>{error}</p>}
          {!analisis && !cargando && !error && (
            <p className="sig">La IA revisa estas métricas y te da diagnóstico y recomendaciones para decidir.</p>
          )}
          {analisis && <Markdown texto={analisis} />}
        </div>
      </div>
    </Lateral>
  );
}
