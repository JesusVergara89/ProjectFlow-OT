import { money, plural } from "../format.js";
import { paso, detenido } from "../reglas.js";
import { mesActual, nombreMes, nombreMesCorto } from "../meses.js";
import { totalesDelMes, mesesConDinero } from "../dinero.js";

export default function Kpis({ items, soloDetenidos, onToggleDetenidos, cierres = [] }) {
  const vivos = items.filter(p => !p.archivado); // los archivados no cuentan en ningún KPI
  const act = vivos.filter(p => p.estado === "activo");
  const cerrados = vivos.length - act.length;
  const enFase = id => act.filter(p => paso(p).fase.id === id);
  const saldoDe = p => (p.pagado ? 0 : Math.max(0, (+p.monto || 0) - (+p.anticipo || 0)));
  const saldo = l => l.reduce((a, p) => a + saldoDe(p), 0);
  const cot = enFase("cotizacion");
  const plan = enFase("planeacion");
  const eje = act.filter(p => ["ejecucion", "reporte"].includes(paso(p).fase.id));
  const cob = act.filter(p => ["facturacion", "cobro"].includes(paso(p).fase.id));
  const det = act.filter(detenido);

  // --- Dinero DEL MES EN CURSO (se reinicia solo el día 1 de cada mes) ---
  const MES = mesActual();
  const tMes = totalesDelMes(vivos, MES);

  // --- Foto de meses anteriores: usa los cierres congelados; si falta alguno,
  //     lo calcula en vivo para que se vea de inmediato. ---
  const porMes = new Map();
  for (const c of cierres || []) {
    const m = Number(c.mes);
    porMes.set(m, { mes: m, total: +c.total || 0, pagado: +c.pagado || 0, anticipos: +c.anticipos || 0, facturado: +c.facturado || 0 });
  }
  for (const m of mesesConDinero(vivos)) {
    if (m < MES && !porMes.has(m)) {
      const t = totalesDelMes(vivos, m);
      porMes.set(m, { mes: m, total: t.total, pagado: t.pagado, anticipos: t.anticipos, facturado: t.facturado });
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
        <span className="k-s">{money(saldo(cot))}</span>
      </div>
      <div className="kpi">
        <span className="k-l">Por planear</span>
        <span className="k-v">{money(saldo(plan))}</span>
        <span className="k-s">{plan.length} {plural(plan.length, "proyecto", "proyectos")}</span>
      </div>
      <div className="kpi">
        <span className="k-l">En ejecución</span>
        <span className="k-v">{eje.length}</span>
        <span className="k-s">{money(saldo(eje))}</span>
      </div>
      <div className="kpi">
        <span className="k-l">Por facturar y cobrar</span>
        <span className="k-v">{money(saldo(cob))}</span>
        <span className="k-s">saldo de {cob.length} {plural(cob.length, "proyecto", "proyectos")} (menos anticipos)</span>
      </div>
      <div className="kpi">
        <span className="k-l">Anticipos · {nombreMesCorto(MES)}</span>
        <span className="k-v">{money(tMes.anticipos)}</span>
        <span className="k-s">{tMes.anticipoNum} {plural(tMes.anticipoNum, "proyecto con anticipo", "proyectos con anticipo")} este mes</span>
      </div>
      <div className="kpi kpi-facturado">
        <span className="k-l">Facturado · {nombreMesCorto(MES)}</span>
        <span className="k-v">{money(tMes.facturado)}</span>
        <span className="k-s">{tMes.facturadoNum} {plural(tMes.facturadoNum, "facturado sin pagar", "facturados sin pagar")}</span>
      </div>
      <div className="kpi kpi-cobrado">
        <span className="k-l">Cobrado · {nombreMesCorto(MES)}</span>
        <span className="k-v">{money(tMes.total)}</span>
        <span className="k-s">
          {tMes.pagadoNum} {plural(tMes.pagadoNum, "pagado", "pagados")}
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
              <span className="c-br">
                Cobrado {money(h.total)} · Facturado {money(h.facturado)}
              </span>
            </div>
          ))}
        </div>
      </section>
    )}
    </>
  );
}
