import { useEffect, useRef, useState } from "react";
import { FASES } from "../flow.js";
import { money, pad } from "../format.js";
import { paso, prioDe, PRIO, dias, detenido, diasTxt, evaluarAlerta, LEYENDA } from "../reglas.js";
import { nombreServicio } from "../servicios.js";

function Tarjeta({ p, onAbrir }) {
  const pa = paso(p);
  const det = detenido(p);
  const a = evaluarAlerta(p);
  const srv = nombreServicio(p.tipo);
  return (
    <button
      type="button"
      className={"card" + (a ? " en-alerta" : "")}
      style={a ? { borderColor: a.color, borderLeftWidth: 4, background: a.color + "22" } : undefined}
      title={a ? a.motivo : undefined}
      data-proyecto={p.id}
      onClick={() => onAbrir(p.id)}
    >
      <span className="c-tags">
        {srv && <span className="c-tipo">{srv}</span>}
        {p.ot && <span className="tag ot">{p.ot}</span>}
        {p.ejemplo && <span className="tag">Ejemplo</span>}
      </span>
      <span className="c-top">
        <span className="c-nombre">{p.nombre}</span>
      </span>
      <span className="c-cli">{p.cliente}{p.responsable ? ` · ${p.responsable}` : ""}</span>
      <span className="c-paso"><b>{pa.n}</b><span>{pa.txt}</span></span>
      <span className="c-pie">
        <span className={`prio prio-${prioDe(p)}`}>{PRIO[prioDe(p)]}</span>
        {p.pagado && <span className="tag pagado" title="Pagado por adelantado">Pagado</span>}
        {p.reporteEnviado
          ? <span className="tag reporte-ok" title="Reporte ya enviado al cliente">Reporte ✓</span>
          : (p.estado === "cerrado" || p.pagado) && <span className="tag reporte-falta" title="Se cobró pero aún no se envía el reporte">Sin reporte</span>}
        <span className="c-monto">{+p.monto ? money(p.monto) : ""}</span>
        <span className={"dias" + (det ? " warn" : "")} title="Tiempo en este paso">{diasTxt(dias(p))}</span>
      </span>
    </button>
  );
}

export default function Tablero({ items, onAbrir }) {
  const masAntiguoPrimero = (a, b) => Date.parse(a.pasoDesde) - Date.parse(b.pasoDesde);

  // Barra de scroll horizontal también ARRIBA, sincronizada con la del tablero.
  const topRef = useRef(null);
  const boardRef = useRef(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const medir = () => setAncho(el.scrollWidth);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener("resize", medir);
    return () => { ro.disconnect(); window.removeEventListener("resize", medir); };
  }, [items]);
  const syncDesdeTop = () => { if (boardRef.current && topRef.current) boardRef.current.scrollLeft = topRef.current.scrollLeft; };
  const syncDesdeBoard = () => { if (boardRef.current && topRef.current) topRef.current.scrollLeft = boardRef.current.scrollLeft; };

  return (
    <>
    <div className="leyenda" aria-label="Significado de los colores">
      {LEYENDA.map(l => (
        <span key={l.texto}><i className="pt" style={{ background: l.color }} /> {l.texto}</span>
      ))}
    </div>
    <div className="board-top" ref={topRef} onScroll={syncDesdeTop} aria-hidden="true">
      <div style={{ width: ancho }} />
    </div>
    <div className="board" ref={boardRef} onScroll={syncDesdeBoard}>
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
