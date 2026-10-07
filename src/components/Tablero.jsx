import { FASES } from "../flow.js";
import { money, pad } from "../format.js";
import { paso, prioDe, PRIO, dias, detenido, diasTxt, alerta, MOTIVO } from "../reglas.js";

function Tarjeta({ p, onAbrir }) {
  const pa = paso(p);
  const det = detenido(p);
  const al = alerta(p);
  return (
    <button
      type="button"
      className={"card" + (al ? " alerta-" + al : "")}
      title={al ? MOTIVO[al] : undefined}
      data-proyecto={p.id}
      onClick={() => onAbrir(p.id)}
    >
      <span className="c-top">
        <span className="c-nombre">{p.nombre}</span>
        {p.ejemplo && <span className="tag">Ejemplo</span>}
      </span>
      <span className="c-cli">{p.cliente}{p.responsable ? ` · ${p.responsable}` : ""}</span>
      <span className="c-paso"><b>{pa.n}</b><span>{pa.txt}</span></span>
      <span className="c-pie">
        <span className={`prio prio-${prioDe(p)}`}>{PRIO[prioDe(p)]}</span>
        <span className="c-monto">{+p.monto ? money(p.monto) : ""}</span>
        <span className={"dias" + (det ? " warn" : "")} title="Tiempo en este paso">{diasTxt(dias(p))}</span>
      </span>
    </button>
  );
}

export default function Tablero({ items, onAbrir }) {
  const masAntiguoPrimero = (a, b) => Date.parse(a.pasoDesde) - Date.parse(b.pasoDesde);
  return (
    <>
    <div className="leyenda" aria-label="Significado de los colores">
      <span><i className="pt pt-rojo" /> +5 días sin autorizar</span>
      <span><i className="pt pt-ambar" /> +6 días en planeación</span>
      <span><i className="pt pt-morado" /> +21 días hábiles sin entregar reporte</span>
      <span><i className="pt pt-naranja" /> +1 día hábil sin entregar documentación</span>
    </div>
    <div className="board">
      {FASES.map((f, i) => {
        const col = items.filter(p => paso(p).fase === f).sort(masAntiguoPrimero);
        const monto = col.reduce((a, p) => a + (+p.monto || 0), 0);
        return (
          <section className="col" key={f.id} aria-label={f.nombre}>
            <header className="colh">
              <span className="fnum">{pad(i + 1)}</span>
              <h2>{f.nombre}</h2>
              <span className="cnt">{col.length}</span>
              <span className="rng">pasos {f.rango[0]}–{f.rango[1]}{monto ? ` · ${money(monto)}` : ""}</span>
            </header>
            <div className="cards">
              {col.length
                ? col.map(p => <Tarjeta key={p.id} p={p} onAbrir={onAbrir} />)
                : <p className="vacio">Sin proyectos en esta fase</p>}
            </div>
          </section>
        );
      })}
    </div>
    </>
  );
}
