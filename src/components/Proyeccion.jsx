import { useState } from "react";
import { money, plural, repartirMonto } from "../format.js";
import { nombreServicio } from "../servicios.js";
import { mesActual, mesesDesdeHoy, nombreMes, nombreMesCorto } from "../meses.js";

/*
  Reporte financiero por etapa + proyección por mes (como la hoja).
  - Cada proyecto cae en UNA etapa según el paso en que va.
  - El dinero de cada proyecto (su MONTO) se coloca en la columna del mes
    tentativo de cobro (campo cobroMes, AAAAMM).
  - Si no tiene mes pero ya está cobrado (pagado o cerrado), cae en el MES EN CURSO.
  - Si no tiene mes y no está cobrado, va a "Sin fecha".
  - Se excluyen los descartados (no-viable / archivado).

  Rangos de etapa (por el paso):
    FACTURADO ................ 39–42 (Se realiza factura)
    EJECUTADO NO FACTURADO ... 30–38 (Cierre parcial de la OT)
    EN PROCESO ............... 23–29 (Se realiza programación)
    AUTORIZADO NO PROGRAMADO . 17–22 (Se entrega a planeación)
    PROYECCIÓN / CON CERTIDUMBRE . 1–16 (antes de autorizar)
*/
const GRUPOS = [
  { id: "cobrado",    titulo: "Cobrado",                                      min: null, max: null },
  { id: "facturado",  titulo: "Facturado",                                    min: 39, max: 42 },
  { id: "ejecutado",  titulo: "Ejecutado no facturado",                       min: 30, max: 38 },
  { id: "proceso",    titulo: "En proceso",                                   min: 23, max: 29 },
  { id: "autorizado", titulo: "Autorizado no programado",                     min: 17, max: 22 },
  { id: "proyeccion", titulo: "Proyección / con certidumbre de autorización", min: 1,  max: 16 }
];

// Ya cobrado: pagado por adelantado o proyecto cerrado (el dinero ya entró).
const esCobrado = p => !!p.pagado || p.resultado === "cerrado";

// Etapa de un proyecto: "Cobrado" si ya entró el dinero; si no, por el paso.
const grupoDe = p => {
  if (esCobrado(p)) return GRUPOS[0];
  const n = +(p && p.paso) || 1;
  if (n >= 39) return GRUPOS[1];
  return GRUPOS.find(g => g.min != null && n >= g.min && n <= g.max) || GRUPOS[GRUPOS.length - 1];
};

// Mes en que cae el dinero del proyecto (AAAAMM) o null (cobro en un solo pago).
const mesDe = p => {
  if (p.cobroMes) return p.cobroMes;
  if (p.pagado || p.resultado === "cerrado") return mesActual();
  return null;
};

// Pagos (cobros) de un proyecto: lista de { mes, monto }.
// - Normal: un solo cobro con el monto completo en su mes tentativo.
// - Diferido: el monto se divide en partes iguales y una cae en cada mes elegido.
const cobrosDe = p => {
  const monto = +p.monto || 0;
  const meses = Array.isArray(p.pagosMeses) ? p.pagosMeses.filter(Boolean) : [];
  if (p.diferido && meses.length) {
    const partes = repartirMonto(monto, meses.length);
    return meses.map((mes, i) => ({ mes: +mes || null, monto: partes[i] }));
  }
  return [{ mes: mesDe(p), monto }];
};

export default function Proyeccion({ items, onAbrir }) {
  const [numMeses, setNumMeses] = useState(4); // mes en curso + 3
  const [mesSel, setMesSel] = useState(null);  // columna de mes seleccionada para ver el detalle

  // Solo proyectos vivos o cerrados-pagados; fuera los descartados y los archivados.
  const base = items.filter(p => !p.archivado && p.resultado !== "no-viable" && p.resultado !== "archivado");

  const cols = mesesDesdeHoy(numMeses);
  const primero = cols[0];
  const ultimo = cols[cols.length - 1];

  // Columna (colKey) donde cae un mes AAAAMM: un mes de la ventana, "post" o "sin".
  const columnaMes = mp => {
    if (!mp) return "sin";
    if (mp <= primero) return primero;     // vencido o del mes en curso
    if (mp > ultimo) return "post";
    return cols.includes(mp) ? mp : "post";
  };

  const sumaMonto = l => l.reduce((a, p) => a + (+p.monto || 0), 0);
  // Monto de un proyecto que cae en una columna (suma los pagos que caen ahí).
  const montoEnCol = (p, colKey) =>
    cobrosDe(p).reduce((a, c) => a + (columnaMes(c.mes) === colKey ? c.monto : 0), 0);

  // Agrupa por etapa y, dentro, por columna de mes.
  const porGrupo = {};
  GRUPOS.forEach(g => { porGrupo[g.id] = []; });
  base.forEach(p => { porGrupo[grupoDe(p).id].push(p); });

  const hayPost = base.some(p => cobrosDe(p).some(c => columnaMes(c.mes) === "post"));
  const haySin = base.some(p => cobrosDe(p).some(c => columnaMes(c.mes) === "sin"));

  // Columnas de la matriz: meses + (posterior) + (sin fecha).
  const columnas = [
    ...cols.map(ym => ({ key: ym, etiqueta: nombreMesCorto(ym), titulo: nombreMes(ym) })),
    ...(hayPost ? [{ key: "post", etiqueta: "Posterior", titulo: `Después de ${nombreMes(ultimo)}` }] : []),
    ...(haySin ? [{ key: "sin", etiqueta: "Sin fecha", titulo: "Sin mes proyectado" }] : [])
  ];

  const montoEnCelda = (grupoId, colKey) =>
    porGrupo[grupoId].reduce((a, p) => a + montoEnCol(p, colKey), 0);

  const totalColumna = colKey => base.reduce((a, p) => a + montoEnCol(p, colKey), 0);
  const granTotal = sumaMonto(base);

  const toggleMes = colKey => setMesSel(m => (m === colKey ? null : colKey));
  const colSel = mesSel ? columnas.find(c => c.key === mesSel) : null;
  const proyectosSel = colSel
    ? base.filter(p => montoEnCol(p, mesSel) > 0).sort((a, b) => montoEnCol(b, mesSel) - montoEnCol(a, mesSel))
    : [];

  return (
    <div className="proy">
      {/* Matriz: etapas (filas) × meses (columnas) */}
      <section className="proy-grupo">
        <header className="proy-h">
          <h2>Proyección de cobros por mes</h2>
          <span className="proy-cnt">{base.length} {plural(base.length, "proyecto", "proyectos")}</span>
        </header>
        <div className="proy-scroll">
          <table className="proy-tabla proy-matriz">
            <thead>
              <tr>
                <th>Etapa</th>
                {columnas.map(c => (
                  <th key={c.key} className={"num mes-th" + (mesSel === c.key ? " sel" : "")}
                      title={"Ver proyectos de " + c.titulo}
                      onClick={() => toggleMes(c.key)}>
                    {c.etiqueta}
                  </th>
                ))}
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {GRUPOS.map(g => (
                <tr key={g.id}>
                  <td>{g.titulo}</td>
                  {columnas.map(c => {
                    const v = montoEnCelda(g.id, c.key);
                    return (
                      <td key={c.key} className={"num mes-td" + (mesSel === c.key ? " sel" : "")}
                          onClick={() => toggleMes(c.key)}>
                        {v ? money(v) : "—"}
                      </td>
                    );
                  })}
                  <td className="num"><b>{money(sumaMonto(porGrupo[g.id]))}</b></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="proy-sum">
                <td>Total por mes</td>
                {columnas.map(c => (
                  <td key={c.key} className={"num mes-td" + (mesSel === c.key ? " sel" : "")}
                      onClick={() => toggleMes(c.key)}>
                    {money(totalColumna(c.key))}
                  </td>
                ))}
                <td className="num">{money(granTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="fila" style={{ marginTop: 10 }}>
          <button type="button" className="btn" onClick={() => setNumMeses(n => n + 3)}>+ Más meses</button>
          {numMeses > 4 && (
            <button type="button" className="btn ghost" onClick={() => setNumMeses(n => Math.max(4, n - 3))}>− Menos</button>
          )}
        </div>

        {colSel && (
          <div className="proy-detalle-mes">
            <header className="proy-h">
              <h3>Proyectos en {colSel.titulo}</h3>
              <span className="proy-total">{money(totalColumna(mesSel))}</span>
              <span className="proy-cnt">{proyectosSel.length} {plural(proyectosSel.length, "proyecto", "proyectos")}</span>
              <button type="button" className="btn ghost" style={{ marginLeft: "auto" }} onClick={() => setMesSel(null)}>Cerrar</button>
            </header>
            {proyectosSel.length ? (
              <table className="proy-tabla">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Cliente</th>
                    <th>Etapa</th>
                    <th className="num">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectosSel.map(p => (
                    <tr key={p.id} onClick={() => onAbrir(p.id)} tabIndex={0}
                        onKeyDown={e => { if (e.key === "Enter") onAbrir(p.id); }}>
                      <td>
                        {p.nombre}
                        {p.pagado ? <span className="tag pagado">Pagado</span> : null}
                        {p.diferido && (p.pagosMeses || []).filter(Boolean).length > 1
                          ? <span className="tag">1 de {(p.pagosMeses || []).filter(Boolean).length} pagos</span> : null}
                      </td>
                      <td>{p.cliente}</td>
                      <td>{grupoDe(p).titulo}</td>
                      <td className="num">{montoEnCol(p, mesSel) ? money(montoEnCol(p, mesSel)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="vacio">Sin proyectos en este mes.</p>
            )}
          </div>
        )}
      </section>

      {/* Detalle por etapa */}
      {GRUPOS.map(g => {
        const l = [...porGrupo[g.id]].sort((a, b) => (+b.monto || 0) - (+a.monto || 0));
        return (
          <section className="proy-grupo" key={g.id}>
            <header className="proy-h">
              <h2>{g.titulo}</h2>
              <span className="proy-total">{money(sumaMonto(l))}</span>
              <span className="proy-cnt">{l.length} {plural(l.length, "proyecto", "proyectos")}</span>
            </header>
            {l.length ? (
              <table className="proy-tabla">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Mes de cobro</th>
                    <th className="num">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {l.map(p => (
                    <tr key={p.id} onClick={() => onAbrir(p.id)} tabIndex={0}
                        onKeyDown={e => { if (e.key === "Enter") onAbrir(p.id); }}>
                      <td>{p.nombre}{p.pagado ? <span className="tag pagado">Pagado</span> : null}</td>
                      <td>{p.cliente}</td>
                      <td>{nombreServicio(p.tipo) || "—"}</td>
                      <td>
                        {p.diferido && (p.pagosMeses || []).filter(Boolean).length
                          ? (p.pagosMeses || []).filter(Boolean).map(nombreMes).join(" · ")
                          : nombreMes(mesDe(p))}
                      </td>
                      <td className="num">{+p.monto ? money(p.monto) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="proy-sum">
                    <td colSpan={4}>Total {g.titulo.toLowerCase()}</td>
                    <td className="num">{money(sumaMonto(l))}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p className="vacio">Sin proyectos en esta etapa · total {money(0)}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
