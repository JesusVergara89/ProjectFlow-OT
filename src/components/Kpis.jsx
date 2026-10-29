import { money, plural } from "../format.js";
import { paso, detenido } from "../reglas.js";
import { mesActual, nombreMes, nombreMesCorto } from "../meses.js";
import { totalesDelMes, totalesVivos, mesesConDinero } from "../dinero.js";

export default function Kpis({ items, soloDetenidos, onToggleDetenidos, cierres = [] }) {
  const vivos = items.filter(p => !p.archivado);
  const act = vivos.filter(p => p.estado === "activo");
  const cerrados = vivos.length - act.length;
  const enFase = id => act.filter(p => paso(p).fase.id === id);
  const cot = enFase("cotizacion");
  const plan = enFase("planeacion");
  const eje = act.filter(p => ["ejecucion", "reporte"].includes(paso(p).fase.id));
  const det = act.filter(detenido);

  // Dinero por fase, EN VIVO (saldos actuales).
  const tv = totalesVivos(vivos);

  // Dinero que entró ESTE MES (se reinicia solo el día 1).
  const MES = mesActual();
  const tMes = totalesDelMes(vivos, MES);

  // Foto de meses anteriores (congelada); si falta alguno, se calcula en vivo.
  const porMes = new Map();
  for (const c of cierres || []) {
    const m = Number(c.mes);
    porMes.set(m, { mes: m, cobrado: +c.cobrado || 0, anticipos: +c.anticipos || 0, total: +c.total || 0 });
  }
  for (const m of mesesConDinero(vivos)) {
    if (m < MES && !porMes.has(m)) {
      const t = totalesDelMes(vivos, m);
      porMes.set(m, { mes: m, cobrado: t.cobrado, anticipos: t.anticipos, total: t.total });
    }
  }
  const historial = [...porMes.values()].filter(h => h.mes < MES).sort((a, b) => b.mes - a.mes).slice(0, 12);

  return (
    <>
    <section className="kpis" aria-label="Resumen">
      <div className="kpi">
        <span className="k-l">Proyectos activos</span>
        <span className="k-v">{act.length}</span>
        <span className="k-s">{cerrados} {plural(cerrados, "cerrado", "cerrados")}</span>
      </div>
      <div className="kpi">
        <span className="k-l">En cotización</span>
        <span className="k-v">{cot.length}</span>
        <span className="k-s">{plan.length} por planear</span>
      </div>
      <div className="kpi">
        <span className="k-l">En ejecución</span>
        <span className="k-v">{eje.length}</span>
        <span className="k-s">pasos 28–38</span>
      </div>
      <div className="kpi">
        <span className="k-l">Por facturar</span>
        <span className="k-v">{money(tv.porFacturar)}</span>
        <span className="k-s">{tv.porFacturarNum} {plural(tv.porFacturarNum, "proyecto", "proyectos")} · pasos 23–38</span>
      </div>
      <div className="kpi kpi-facturado">
        <span className="k-l">Facturado</span>
        <span className="k-v">{money(tv.facturado)}</span>
        <span className="k-s">{tv.facturadoNum} {plural(tv.facturadoNum, "proyecto", "proyectos")} · pasos 39–40, sin pagar</span>
      </div>
      <div className="kpi">
        <span className="k-l">Anticipos · {nombreMesCorto(MES)}</span>
        <span className="k-v">{money(tMes.anticipos)}</span>
        <span className="k-s">{tMes.anticipoNum} {plural(tMes.anticipoNum, "proyecto con anticipo", "proyectos con anticipo")} este mes</span>
      </div>
      <div className="kpi kpi-cobrado">
        <span className="k-l">Cobrado · {nombreMesCorto(MES)}</span>
        <span className="k-v">{money(tMes.total)}</span>
        <span className="k-s">
          {tMes.cobradoNum} {plural(tMes.cobradoNum, "pagado", "pagados")} (paso 41)
          {tMes.anticipos > 0 && ` + ${money(tMes.anticipos)} en anticipos`}
        </span>
      </div>
      <button
        type="button"
        className={"kpi" + (det.length ? " warn" : "")}
        aria-pressed={soloDetenidos}
        onClick={onToggleDetenidos}
      >
        <span className="k-l">Detenidos</span>
        <span className="k-v">{det.length}</span>
        <span className="k-s">{soloDetenidos ? "Mostrando solo detenidos" : "Pasan del tiempo de su fase"}</span>
      </button>
    </section>

    {historial.length > 0 && (
      <section className="cierres-hist" aria-label="Dinero de meses anteriores">
        <h3>Cierres de meses anteriores <span>(foto congelada al cambiar de mes)</span></h3>
        <div className="cierres-row">
          {historial.map(h => (
            <div className="cierre" key={h.mes} title={nombreMes(h.mes)}>
              <span className="c-mes">{nombreMesCorto(h.mes)}</span>
              <span className="c-tot">{money(h.total)}</span>
              <span className="c-br">Cobrado {money(h.cobrado)} · Anticipos {money(h.anticipos)}</span>
            </div>
          ))}
        </div>
      </section>
    )}
    </>
  );
}
