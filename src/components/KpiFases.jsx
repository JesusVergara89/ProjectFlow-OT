import { money, plural } from "../format.js";
import { PASOS } from "../flow.js";

// Grupos de pasos para el tablero de KPI por fase.
// El "dinero" es la suma del MONTO ESTIMADO de los proyectos ACTIVOS cuyo
// paso actual cae dentro de cada grupo.
const GRUPOS = [
  { id: "planeacion", nombre: "Dinero en Planeación", pasos: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27] },
  { id: "ejecucion",  nombre: "Dinero en Ejecución de servicios", pasos: [28] },
  { id: "cierre",     nombre: "Dinero en Cierre parcial de OT",    pasos: [30] },
];

export default function KpiFases({ items, onAbrir }) {
  const activos = items.filter(p => p.estado === "activo" && !p.archivado);

  const grupos = GRUPOS.map(g => {
    const set = new Set(g.pasos);
    const enFase = activos.filter(p => set.has(+p.paso));
    const conDinero = enFase
      .filter(p => (+p.monto || 0) > 0)
      .sort((a, b) => (+b.monto || 0) - (+a.monto || 0));
    const sinDinero = enFase.filter(p => !((+p.monto || 0) > 0));
    const total = conDinero.reduce((a, p) => a + (+p.monto || 0), 0);
    return { ...g, conDinero, sinDinero, total };
  });

  return (
    <div className="kpi-fases">
      <div className="kpi-fases-grid">
        {grupos.map(g => (
          <section className="kpi-fase" key={g.id}>
            <header className="kpi-fase-h">
              <span className="k-l">{g.nombre}</span>
              <span className="k-v">{money(g.total)}</span>
              <span className="k-s">
                {g.conDinero.length} {plural(g.conDinero.length, "proyecto con monto", "proyectos con monto")} · pasos {g.pasos[0]}
                {g.pasos.length > 1 ? `–${g.pasos[g.pasos.length - 1]}` : ""}
              </span>
            </header>

            {g.conDinero.length > 0 ? (
              <ul className="kpi-fase-list">
                {g.conDinero.map(p => (
                  <li key={p.id}>
                    <button type="button" className="kpi-fase-item" onClick={() => onAbrir(p.id)}>
                      <span className="kf-nom">
                        {p.ot ? <b className="kf-ot">{p.ot}</b> : null} {p.nombre}
                      </span>
                      <span className="kf-sub">
                        Paso {p.paso} · {PASOS[p.paso]?.txt || ""}
                      </span>
                      <span className="kf-monto">{money(+p.monto || 0)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="kpi-fase-vacio">Sin proyectos con monto en esta fase.</p>
            )}

            {g.sinDinero.length > 0 && (
              <div className="kpi-fase-aviso">
                <div className="kf-aviso-h">
                  ⚠ {g.sinDinero.length} {plural(g.sinDinero.length, "proyecto sin monto", "proyectos sin monto")} en esta fase
                </div>
                <p className="kf-aviso-txt">
                  Captura su monto estimado para que las estimaciones de esta fase sean más reales.
                </p>
                <ul className="kpi-fase-list">
                  {g.sinDinero.map(p => (
                    <li key={p.id}>
                      <button type="button" className="kpi-fase-item sin-dinero" onClick={() => onAbrir(p.id)}>
                        <span className="kf-nom">
                          {p.ot ? <b className="kf-ot">{p.ot}</b> : null} {p.nombre}
                        </span>
                        <span className="kf-sub">
                          Paso {p.paso} · {PASOS[p.paso]?.txt || ""}
                        </span>
                        <span className="kf-monto kf-falta">Sin monto</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
