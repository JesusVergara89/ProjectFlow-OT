import { money, plural } from "../format.js";
import { paso, detenido } from "../reglas.js";

export default function Kpis({ items, soloDetenidos, onToggleDetenidos }) {
  const act = items.filter(p => p.estado === "activo");
  const cerrados = items.length - act.length;
  const enFase = id => act.filter(p => paso(p).fase.id === id);
  const suma = l => l.reduce((a, p) => a + (+p.monto || 0), 0);
  const sumaAnticipo = l => l.reduce((a, p) => a + (+p.anticipo || 0), 0);
  // Saldo por cobrar = monto menos el anticipo ya pagado (nunca negativo).
  const saldo = l => l.reduce((a, p) => a + Math.max(0, (+p.monto || 0) - (+p.anticipo || 0)), 0);
  const cot = enFase("cotizacion");
  const plan = enFase("planeacion");
  // En ejecución incluye tanto "Ejecución del servicio" como "Reporte y calidad".
  const eje = act.filter(p => ["ejecucion", "reporte"].includes(paso(p).fase.id));
  const cob = act.filter(p => ["facturacion", "cobro"].includes(paso(p).fase.id));
  const cerradosPagados = items.filter(p => p.resultado === "cerrado"); // cobro total (monto completo)
  const conAnticipo = act.filter(p => (+p.anticipo || 0) > 0); // proyectos con anticipo
  // Cobrado = monto completo de los proyectos cerrados + anticipos de los que AÚN no cierran.
  // Ese anticipo ya es dinero en la empresa, aunque el proyecto siga abierto. En los cerrados
  // no se suma el anticipo aparte porque ya va incluido dentro de su monto completo.
  const anticiposVivos = items.filter(p => p.resultado !== "cerrado" && (+p.anticipo || 0) > 0);
  const totalCobrado = suma(cerradosPagados) + sumaAnticipo(anticiposVivos);
  const det = act.filter(detenido);

  return (
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
        <span className="k-l">Anticipos</span>
        <span className="k-v">{money(sumaAnticipo(conAnticipo))}</span>
        <span className="k-s">{conAnticipo.length} {plural(conAnticipo.length, "proyecto con anticipo", "proyectos con anticipo")}</span>
      </div>
      <div className="kpi">
        <span className="k-l">Cobrado</span>
        <span className="k-v">{money(totalCobrado)}</span>
        <span className="k-s">
          {cerradosPagados.length} {plural(cerradosPagados.length, "cerrado", "cerrados")}
          {anticiposVivos.length > 0 && ` + ${money(sumaAnticipo(anticiposVivos))} en anticipos`}
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
  );
}
