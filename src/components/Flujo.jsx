import { FASES, LISTA, PASOS } from "../flow.js";
import { pad, plural } from "../format.js";
import { RES } from "../reglas.js";

function Salida({ etiqueta, desde, a }) {
  const atras = a < desde;
  return (
    <span className={"sal" + (atras ? " atras" : "")}>
      {etiqueta && <span className={"v" + (etiqueta === "Sí" ? " v-si" : "")}>{etiqueta}</span>}
      <span aria-hidden="true">{atras ? "↩" : "→"}</span>
      <span className="sr">{atras ? "regresa al paso" : "va al paso"}</span>
      <b>{a}</b> <span>{PASOS[a].txt}</span>
    </span>
  );
}

function FilaPaso({ x, cuenta, onVerPaso }) {
  return (
    <li className="paso-f">
      <span className="sn">{x.n}</span>
      <div className="sb">
        <div className="st">
          {x.txt}
          {x.tipo === "decision" && <> <span className="tag dec">Decisión</span></>}
        </div>
        {x.tipo === "decision" ? (
          <>
            <Salida etiqueta="Sí" desde={x.n} a={x.si} />
            <Salida etiqueta="No" desde={x.n} a={x.no} />
          </>
        ) : x.fin ? (
          <span className="sal fin">Fin · {RES[x.fin]}</span>
        ) : (
          <Salida desde={x.n} a={x.next} />
        )}
      </div>
      {cuenta > 0 && (
        <button type="button" className="cuenta" onClick={() => onVerPaso(x.n)}>
          {cuenta} {plural(cuenta, "proyecto", "proyectos")}
        </button>
      )}
    </li>
  );
}

export default function Flujo({ items, onVerPaso }) {
  const cuenta = {};
  items.filter(p => p.estado === "activo").forEach(p => { cuenta[p.paso] = (cuenta[p.paso] || 0) + 1; });

  return (
    <div className="fases">
      {FASES.map((f, i) => {
        const pasos = LISTA.filter(x => x.fase === f);
        const n = pasos.reduce((a, x) => a + (cuenta[x.n] || 0), 0);
        return (
          <section className="fase" key={f.id}>
            <header className="fase-h">
              <span className="fnum">{pad(i + 1)}</span>
              <h2>{f.nombre}</h2>
              <span className="fase-s">
                pasos {f.rango[0]}–{f.rango[1]} · se marca detenido tras {f.umbral} días · {n} {plural(n, "proyecto", "proyectos")}
              </span>
            </header>
            <ol className="pasos">
              {pasos.map(x => (
                <FilaPaso key={x.n} x={x} cuenta={cuenta[x.n] || 0} onVerPaso={onVerPaso} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
