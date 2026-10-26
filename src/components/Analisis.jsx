import { useMemo, useState } from "react";
import { Lateral } from "./Panel.jsx";
import { paso, detenido, dias } from "../reglas.js";
import { FASES } from "../flow.js";
import { money } from "../format.js";
import { analizarIA } from "../db.js";

const r1 = n => Math.round(n * 10) / 10;

// Calcula métricas de desempeño a partir del historial de los proyectos.
function calcular(items) {
  const vivos = items.filter(p => !p.archivado);
  const act = vivos.filter(p => p.estado === "activo");

  // Velocidad por persona: duración de cada paso = tiempo entre su término y el anterior.
  const personas = {};
  const fases = {};
  for (const p of vivos) {
    const h = p.historial || [];
    let prevF = p.creado;
    for (const e of h) {
      const quien = (e.nombre || e.u || "—").trim() || "—";
      const d = Math.max(0, (Date.parse(e.f) - Date.parse(prevF)) / 864e5);
      prevF = e.f;
      if (!personas[quien]) personas[quien] = { nombre: quien, pasos: 0, totalDias: 0, maxDias: 0, detenidos: 0 };
      personas[quien].pasos++;
      personas[quien].totalDias += d;
      personas[quien].maxDias = Math.max(personas[quien].maxDias, d);

      const fa = (require_fase(e.p));
      if (fa) {
        if (!fases[fa.id]) fases[fa.id] = { id: fa.id, nombre: fa.nombre, n: 0, totalDias: 0, umbral: fa.umbral };
        fases[fa.id].n++;
        fases[fa.id].totalDias += d;
      }
    }
  }

  // Proyectos detenidos ahora + responsable.
  const detenidos = act.filter(detenido).map(p => ({
    nombre: p.nombre, cliente: p.cliente, paso: p.paso, dias: dias(p),
    responsable: p.responsable || paso(p).txt.split(" - ").pop() || "—"
  })).sort((a, b) => b.dias - a.dias);
  for (const d of detenidos) {
    const quien = (d.responsable || "").trim();
    if (personas[quien]) personas[quien].detenidos++;
  }

  const listaPersonas = Object.values(personas)
    .map(x => ({ ...x, promDias: r1(x.pasos ? x.totalDias / x.pasos : 0), maxDias: r1(x.maxDias) }))
    .filter(x => x.pasos >= 2)
    .sort((a, b) => b.promDias - a.promDias);

  const listaFases = FASES.map(f => {
    const g = fases[f.id];
    return { nombre: f.nombre, n: g ? g.n : 0, promDias: r1(g && g.n ? g.totalDias / g.n : 0), umbral: f.umbral };
  }).filter(f => f.n > 0);

  return {
    activos: act.length,
    cerrados: vivos.length - act.length,
    personas: listaPersonas,
    fases: listaFases,
    detenidos
  };
}

// Fase (del flujo) a la que pertenece un paso.
function require_fase(n) {
  return FASES.find(f => n >= f.rango[0] && n <= f.rango[1]) || null;
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
    <Lateral onCerrar={onCerrar}>
      <div className="d-head">
        <div>
          <p className="eyebrow">Apoyo para decisiones</p>
          <h2 id="d-titulo">Análisis del equipo</h2>
        </div>
        <button type="button" className="btn icon" data-foco aria-label="Cerrar" onClick={onCerrar}>✕</button>
      </div>
      <div className="d-body">
        <p className="sig">
          Métricas calculadas de tu historial: {m.activos} activos, {m.cerrados} cerrados, {m.detenidos.length} detenidos.
        </p>

        <div className="d-sec">
          <h3>Velocidad por persona (más lento primero)</h3>
          {m.personas.length ? (
            <table className="proy-tabla">
              <thead>
                <tr><th>Persona</th><th className="num">Pasos</th><th className="num">Prom. días/paso</th><th className="num">Paso más lento</th><th className="num">Detenidos</th></tr>
              </thead>
              <tbody>
                {m.personas.map(p => (
                  <tr key={p.nombre}>
                    <td>{p.nombre}</td>
                    <td className="num">{p.pasos}</td>
                    <td className="num">{p.promDias}</td>
                    <td className="num">{p.maxDias}</td>
                    <td className="num">{p.detenidos || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="vacio">Aún no hay suficientes pasos completados para medir.</p>}
        </div>

        <div className="d-sec">
          <h3>Tiempo por fase</h3>
          {m.fases.length ? (
            <table className="proy-tabla">
              <thead><tr><th>Fase</th><th className="num">Pasos</th><th className="num">Prom. días</th><th className="num">Límite</th></tr></thead>
              <tbody>
                {m.fases.map(f => (
                  <tr key={f.nombre} className={f.promDias > f.umbral ? "fila-alerta" : ""}>
                    <td>{f.nombre}</td><td className="num">{f.n}</td><td className="num">{f.promDias}</td><td className="num">{f.umbral}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="vacio">Sin datos de fases todavía.</p>}
        </div>

        <div className="d-sec">
          <div className="fila" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Análisis con IA</h3>
            <button type="button" className="btn primary" onClick={pedir} disabled={cargando}>
              {cargando ? "Analizando…" : (analisis ? "Volver a analizar" : "✨ Analizar con IA")}
            </button>
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
