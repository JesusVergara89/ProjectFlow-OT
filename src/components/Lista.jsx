import { money, norm } from "../format.js";
import { paso, RES, dias, detenido, diasTxt, alerta, MOTIVO } from "../reglas.js";

const valor = {
  nombre: p => norm(p.nombre),
  monto: p => +p.monto || 0,
  dias: p => (p.estado === "activo" ? dias(p) : -1),
  paso: p => p.paso
};

function EstadoPill({ p }) {
  if (p.estado === "cerrado") {
    return <span className={"pill " + (p.resultado === "cerrado" ? "ok" : "neutro")}>{RES[p.resultado] || "Cerrado"}</span>;
  }
  return detenido(p) ? <span className="pill warn">Detenido</span> : <span className="pill">En curso</span>;
}

export default function Lista({ items, orden, onOrden, onAbrir }) {
  const { k, dir } = orden;
  const filas = [...items].sort((a, b) => {
    const x = valor[k](a);
    const y = valor[k](b);
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });

  const Th = ({ clave, children, num }) => (
    <th className={num ? "num" : ""} aria-sort={k === clave ? (dir > 0 ? "ascending" : "descending") : "none"}>
      <button type="button" className="th-b" onClick={() => onOrden(clave)}>
        {children}
        <span aria-hidden="true">{k === clave ? (dir > 0 ? " ↑" : " ↓") : ""}</span>
      </button>
    </th>
  );

  return (
    <div className="tabla-wrap">
      <table>
        <thead>
          <tr>
            <Th clave="nombre">Proyecto</Th>
            <th className="sin-orden">Responsable</th>
            <Th clave="paso">Paso actual</Th>
            <th className="sin-orden">Fase</th>
            <Th clave="monto" num>Monto</Th>
            <Th clave="dias" num>En el paso</Th>
            <th className="sin-orden">Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={7} style={{ cursor: "default", color: "var(--muted)" }}>
                Ningún proyecto coincide con los filtros.
              </td>
            </tr>
          )}
          {filas.map(p => {
            const pa = paso(p);
            const al = alerta(p);
            return (
              <tr key={p.id} className={al ? "alerta-" + al : ""} title={al ? MOTIVO[al] : undefined} onClick={() => onAbrir(p.id)}>
                <td>
                  <button
                    type="button"
                    className="t-nombre"
                    data-proyecto={p.id}
                    onClick={e => { e.stopPropagation(); onAbrir(p.id); }}
                  >
                    {p.nombre}
                  </button>
                  <span className="t-sub">{p.cliente}{p.ejemplo ? " · ejemplo" : ""}</span>
                </td>
                <td>{p.responsable || "—"}</td>
                <td><span className="t-paso"><b>{pa.n}</b><span>{pa.txt}</span></span></td>
                <td>{pa.fase.nombre}</td>
                <td className="num">{+p.monto ? money(p.monto) : "—"}</td>
                <td className="num">{p.estado === "activo" ? diasTxt(dias(p)) : "—"}</td>
                <td><EstadoPill p={p} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
