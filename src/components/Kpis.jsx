import { money, plural } from "../format.js";
import { paso, detenido } from "../reglas.js";

export default function Kpis({ items, soloDetenidos, onToggleDetenidos }) {
  const act = items.filter(p => p.estado === "activo");
  const cerrados = items.length - act.length;
  const enFase = id => act.filter(p => paso(p).fase.id === id);
  const suma = l => l.reduce((a, p) => a + (+p.monto || 0), 0);
  const cot = enFase("cotizacion");
  const eje = enFase("ejecucion");
  const cob = act.filter(p => ["facturacion", "cobro"].includes(paso(p).fase.id));
  const cobrado = items.filter(p => p.resultado === "cerrado"); // proyectos ya cobrados
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
        <span className="k-s">{money(suma(cot))}</span>
      </div>
      <div className="kpi">
        <span className="k-l">En ejecución</span>
        <span className="k-v">{eje.length}</span>
        <span className="k-s">{money(suma(eje))}</span>
      </div>
      <div className="kpi">
        <span className="k-l">Por facturar y cobrar</span>
        <span className="k-v">{money(suma(cob))}</span>
        <span className="k-s">{cob.length} {plural(cob.length, "proyecto", "proyectos")}</span>
      </div>
      <div className="kpi">
        <span className="k-l">Cobrado</span>
        <span className="k-v">{money(suma(cobrado))}</span>
        <span className="k-s">{cobrado.length} {plural(cobrado.length, "proyecto cobrado", "proyectos cobrados")}</span>
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
