import { useState } from "react";
import { money, plural } from "../format.js";
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
  { id: "facturado",  titulo: "Facturado",                                    min: 39, max: 42 },
  { id: "ejecutado",  titulo: "Ejecutado no facturado",                       min: 30, max: 38 },
  { id: "proceso",    titulo: "En proceso",                                   min: 23, max: 29 },
  { id: "autorizado", titulo: "Autorizado no programado",                     min: 17, max: 22 },
  { id: "proyeccion", titulo: "Proyección / con certidumbre de autorización", min: 1,  max: 16 }
];

const grupoDe = paso => {
  const n = +paso || 1;
  if (n >= 39) return GRUPOS[0];
  return GRUPOS.find(g => n >= g.min && n <= g.max) || GRUPOS[GRUPOS.length - 1];
};

// Mes en que cae el dinero del proyecto (AAAAMM) o null.
const mesDe = p => {
  if (p.cobroMes) return p.cobroMes;
  if (p.pagado || p.resultado === "cerrado") return mesActual();
  return null;
};

export default function Proyeccion({ items, onAbrir }) {
  const [numMeses, setNumMeses] = useState(4); // mes en curso + 3

  // Solo proyectos vivos o cerrados-pagados; fuera los descartados.
  const base = items.filter(p => p.resultado !== "no-viable" && p.resultado !== "archivado");

  const cols = mesesDesdeHoy(numMeses);
  const primero = cols[0];
  const ultimo = cols[cols.length - 1];

  // Columna de un proyecto: un AAAAMM de la ventana, "post" (más adelante) o "sin".
  const columnaDe = p => {
    const mp = mesDe(p);
    if (!mp) return "sin";
    if (mp <= primero) return primero;     // vencido o del mes en curso
    if (mp >= ultimo && mp !== ultimo) return "post";
    return cols.includes(mp) ? mp : "post";
  };

  const sumaMonto = l => l.reduce((a, p) => a + (+p.monto || 0), 0);

  // Agrupa por etapa y, dentro, por columna de mes.
  const porGrupo = {};
  GRUPOS.forEach(g => { porGrupo[g.id] = []; });
  base.forEach(p => { porGrupo[grupoDe(p.paso || 1).id].push(p); });

  const hayPost = base.some(p => columnaDe(p) === "post");
  const haySin = base.some(p => columnaDe(p) === "sin");

  // Columnas de la matriz: meses + (posterior) + (sin fecha).
  const columnas = [
    ...cols.map(ym => ({ key: ym, etiqueta: nombreMesCorto(ym), titulo: nombreMes(ym) })),
    ...(hayPost ? [{ key: "post", etiqueta: "Posterior", titulo: `Después de ${nombreMes(ultimo)}` }] : []),
    ...(haySin ? [{ key: "sin", etiqueta: "Sin fecha", titulo: "Sin mes proyectado" }] : [])
  ];

  const montoEnCelda = (grupoId, colKey) =>
    porGrupo[grupoId].reduce((a, p) => a + (columnaDe(p) === colKey ? (+p.monto || 0) : 0), 0);

  const totalColumna = colKey => base.reduce((a, p) => a + (columnaDe(p) === colKey ? (+p.monto || 0) : 0), 0);
  const granTotal = sumaMonto(base);

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
                {columnas.map(c => <th key={c.key} className="num" title={c.titulo}>{c.etiqueta}</th>)}
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {GRUPOS.map(g => (
                <tr key={g.id}>
                  <td>{g.titulo}</td>
                  {columnas.map(c => {
                    const v = montoEnCelda(g.id, c.key);
                    return <td key={c.key} className="num">{v ? money(v) : "—"}</td>;
                  })}
                  <td className="num"><b>{money(sumaMonto(porGrupo[g.id]))}</b></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="proy-sum">
                <td>Total por mes</td>
                {columnas.map(c => <td key={c.key} className="num">{money(totalColumna(c.key))}</td>)}
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
                      <td>{nombreMes(mesDe(p))}</td>
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
