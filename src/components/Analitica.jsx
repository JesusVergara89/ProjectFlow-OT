import { money, plural } from "../format.js";
import { dias, detenido, paso } from "../reglas.js";
import { FASES } from "../flow.js";
import { repartirMonto } from "../format.js";
import { mesActual, mesesDesdeHoy, nombreMes, nombreMesCorto } from "../meses.js";

/*
  Página de análisis: gráficas de dinero y de tendencias (atrasos).
  Hecha con SVG/divs simples (sin librerías) y los colores del tema.
*/

// Paleta categórica con los tokens del tema (distinguibles en claro y oscuro).
const PAL = ["var(--accent)", "var(--ok)", "var(--viol)", "var(--naranja)", "var(--rosa)", "var(--warn)", "var(--crit)"];

// --- mismas reglas de etapa y cobro que la Proyección ---
const ETAPAS = [
  { id: "cobrado",    titulo: "Cobrado",                    min: null, max: null },
  { id: "facturado",  titulo: "Facturado",                  min: 39, max: 42 },
  { id: "ejecutado",  titulo: "Ejecutado no facturado",     min: 30, max: 38 },
  { id: "proceso",    titulo: "En proceso",                 min: 23, max: 29 },
  { id: "autorizado", titulo: "Autorizado no programado",   min: 17, max: 22 },
  { id: "proyeccion", titulo: "Proyección",                 min: 1,  max: 16 }
];
const esCobrado = p => !!p.pagado || p.resultado === "cerrado";
const etapaDe = p => {
  if (esCobrado(p)) return ETAPAS[0];
  const n = +(p && p.paso) || 1;
  if (n >= 39) return ETAPAS[1];
  return ETAPAS.find(g => g.min != null && n >= g.min && n <= g.max) || ETAPAS[ETAPAS.length - 1];
};
const mesDe = p => {
  if (p.cobroMes) return p.cobroMes;
  if (p.pagado || p.resultado === "cerrado") return mesActual();
  return null;
};
const cobrosDe = p => {
  const monto = +p.monto || 0;
  const meses = Array.isArray(p.pagosMeses) ? p.pagosMeses.filter(Boolean) : [];
  if (p.diferido && meses.length) {
    const partes = repartirMonto(monto, meses.length);
    return meses.map((mes, i) => ({ mes: +mes || null, monto: partes[i] }));
  }
  return [{ mes: mesDe(p), monto }];
};

// --- componentes de gráfica ---

// Barras horizontales (para montos por categoría).
function BarrasH({ datos, formato = v => v, onClic }) {
  const max = Math.max(1, ...datos.map(d => d.valor));
  return (
    <div className="an-barras">
      {datos.map((d, i) => (
        <div className={"an-fila" + (onClic ? " clic" : "")} key={i}
             onClick={onClic ? () => onClic(d) : undefined}
             tabIndex={onClic ? 0 : undefined}
             onKeyDown={onClic ? e => { if (e.key === "Enter") onClic(d); } : undefined}>
          <span className="an-et" title={d.etiqueta}>{d.etiqueta}</span>
          <div className="an-track">
            <div className="an-barra" style={{ width: (d.valor / max * 100) + "%", background: d.color || "var(--accent)" }} />
          </div>
          <span className="an-val">{formato(d.valor)}</span>
        </div>
      ))}
    </div>
  );
}

// Barras verticales (para series por mes / por fase).
function BarrasV({ datos, formato = v => v }) {
  const max = Math.max(1, ...datos.map(d => d.valor));
  return (
    <div className="an-cols" style={{ "--an-h": "150px" }}>
      {datos.map((d, i) => (
        <div className="an-col" key={i} title={(d.titulo || d.etiqueta) + ": " + formato(d.valor)}>
          <span className="an-colval">{d.valor ? formato(d.valor) : ""}</span>
          <div className="an-colbar-wrap">
            <div className="an-colbar" style={{ height: (d.valor / max * 100) + "%", background: d.color || "var(--accent)" }} />
          </div>
          <span className="an-colet">{d.etiqueta}</span>
        </div>
      ))}
    </div>
  );
}

// Barra apilada simple (composición del dinero).
function Apilada({ partes, total, formato }) {
  const t = total || partes.reduce((a, p) => a + p.valor, 0) || 1;
  return (
    <div>
      <div className="an-apilada">
        {partes.map((p, i) => (
          p.valor > 0 ? <div key={i} className="an-seg" style={{ width: (p.valor / t * 100) + "%", background: p.color }}
                             title={p.etiqueta + ": " + formato(p.valor)} /> : null
        ))}
      </div>
      <div className="an-leyenda">
        {partes.map((p, i) => (
          <span className="an-leg" key={i}>
            <i style={{ background: p.color }} /> {p.etiqueta}: <b>{formato(p.valor)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Analitica({ items, onAbrir }) {
  // Universo de dinero: vivos o cerrados-pagados; fuera descartados y archivados.
  const base = items.filter(p => !p.archivado && p.resultado !== "no-viable" && p.resultado !== "archivado");
  const activos = items.filter(p => p.estado === "activo" && !p.archivado);

  // ---- KPIs de dinero ----
  const cerradosPagados = base.filter(p => p.resultado === "cerrado");
  const prepagadosVivos = base.filter(p => p.resultado !== "cerrado" && p.pagado);
  const anticiposVivos = base.filter(p => p.resultado !== "cerrado" && !p.pagado && (+p.anticipo || 0) > 0);
  const suma = l => l.reduce((a, p) => a + (+p.monto || 0), 0);
  const sumaAnt = l => l.reduce((a, p) => a + (+p.anticipo || 0), 0);
  const cobrado = suma(cerradosPagados) + suma(prepagadosVivos) + sumaAnt(anticiposVivos);
  const porCobrar = base.reduce((a, p) => a + (esCobrado(p) ? 0 : Math.max(0, (+p.monto || 0) - (+p.anticipo || 0))), 0);
  const anticipos = sumaAnt(anticiposVivos);
  const pipeline = suma(base); // monto total en juego

  // ---- Dinero por etapa ----
  const porEtapa = ETAPAS.map((e, i) => ({
    etiqueta: e.titulo,
    valor: base.filter(p => etapaDe(p).id === e.id).reduce((a, p) => a + (+p.monto || 0), 0),
    color: PAL[i % PAL.length]
  }));

  // ---- Cobros proyectados por mes (6 meses, deferidos repartidos) ----
  const cols = mesesDesdeHoy(6);
  const primero = cols[0], ultimo = cols[cols.length - 1];
  const colMes = mp => {
    if (!mp) return "sin";
    if (mp <= primero) return primero;
    if (mp > ultimo) return "post";
    return cols.includes(mp) ? mp : "post";
  };
  const totalMes = colKey => base.reduce((a, p) =>
    a + cobrosDe(p).reduce((s, c) => s + (colMes(c.mes) === colKey ? c.monto : 0), 0), 0);
  const porMes = cols.map(ym => ({ etiqueta: nombreMesCorto(ym), titulo: nombreMes(ym), valor: totalMes(ym), color: "var(--accent)" }));

  // ---- Proyectos activos por fase (conteo) ----
  const porFase = FASES.map((f, i) => ({
    etiqueta: f.nombre.split(" ")[0],
    titulo: f.nombre,
    valor: activos.filter(p => paso(p).fase.id === f.id).length,
    color: PAL[i % PAL.length]
  }));

  // ---- Atrasos: top proyectos más pasados de su umbral ----
  const conAtraso = activos
    .map(p => {
      const d = dias(p);
      const umbral = paso(p).fase.umbral;
      return { p, dias: d, over: d - umbral, umbral };
    })
    .filter(x => x.over > 0)
    .sort((a, b) => b.over - a.over);
  const topAtraso = conAtraso.slice(0, 10).map(x => ({
    etiqueta: x.p.nombre,
    valor: x.over,
    color: x.over > x.umbral ? "var(--crit)" : "var(--warn)",
    id: x.p.id
  }));

  // ---- Detenidos por fase (conteo) ----
  const detPorFase = FASES.map((f, i) => ({
    etiqueta: f.nombre.split(" ")[0],
    titulo: f.nombre,
    valor: activos.filter(p => detenido(p) && paso(p).fase.id === f.id).length,
    color: PAL[i % PAL.length]
  })).filter(d => d.valor > 0);

  const money0 = v => money(v);
  const num = v => String(v);

  return (
    <div className="analitica">
      {/* KPIs de dinero */}
      <section className="an-card an-kpis">
        <div className="an-kpi"><span className="an-kpi-l">Cobrado</span><span className="an-kpi-v ok">{money(cobrado)}</span></div>
        <div className="an-kpi"><span className="an-kpi-l">Por cobrar</span><span className="an-kpi-v">{money(porCobrar)}</span></div>
        <div className="an-kpi"><span className="an-kpi-l">Anticipos</span><span className="an-kpi-v">{money(anticipos)}</span></div>
        <div className="an-kpi"><span className="an-kpi-l">Total en juego</span><span className="an-kpi-v">{money(pipeline)}</span></div>
      </section>

      {/* Composición del dinero */}
      <section className="an-card">
        <header className="an-h"><h2>Composición del dinero</h2></header>
        <Apilada
          partes={[
            { etiqueta: "Cobrado", valor: cobrado, color: "var(--ok)" },
            { etiqueta: "Por cobrar", valor: porCobrar, color: "var(--accent)" }
          ]}
          formato={money0}
        />
      </section>

      {/* Dinero por etapa */}
      <section className="an-card">
        <header className="an-h"><h2>Dinero por etapa</h2><span className="an-sub">{base.length} {plural(base.length, "proyecto", "proyectos")}</span></header>
        <BarrasH datos={porEtapa} formato={money0} />
      </section>

      {/* Cobros proyectados por mes */}
      <section className="an-card">
        <header className="an-h"><h2>Cobros proyectados por mes</h2><span className="an-sub">próximos 6 meses</span></header>
        <BarrasV datos={porMes} formato={money0} />
      </section>

      {/* Proyectos activos por fase */}
      <section className="an-card">
        <header className="an-h"><h2>Proyectos activos por fase</h2><span className="an-sub">{activos.length} activos</span></header>
        <BarrasV datos={porFase} formato={num} />
      </section>

      {/* Atrasos */}
      <section className="an-card">
        <header className="an-h">
          <h2>Mayores atrasos</h2>
          <span className="an-sub">días pasados del límite de su fase · {conAtraso.length} con atraso</span>
        </header>
        {topAtraso.length
          ? <BarrasH datos={topAtraso} formato={d => d + (d === 1 ? " día" : " días")} onClic={onAbrir ? d => onAbrir(d.id) : undefined} />
          : <p className="vacio">Ningún proyecto pasado de su límite. 🎉</p>}
      </section>

      {/* Detenidos por fase */}
      <section className="an-card">
        <header className="an-h"><h2>Detenidos por fase</h2><span className="an-sub">{activos.filter(detenido).length} detenidos</span></header>
        {detPorFase.length
          ? <BarrasV datos={detPorFase} formato={num} />
          : <p className="vacio">No hay proyectos detenidos.</p>}
      </section>
    </div>
  );
}
