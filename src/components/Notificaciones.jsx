import { useState } from "react";
import { Lateral } from "./Panel.jsx";
import { evaluarAlerta, paso, dias, diasTxt } from "../reglas.js";
import { usuariosPaso } from "../permisos.js";

// ¿El atraso es "mío"? Si trabajo el paso actual, o si mi usuario/nombre
// aparece como responsable (servicio, reporte, alcance) o apoyo del proyecto.
export function esMio(p, usuario) {
  const u = String(usuario?.usuario || "").toLowerCase();
  const nombre = String(usuario?.nombre || "").toLowerCase();
  if (!u) return false;
  const equipo = (usuariosPaso(p.paso, p) || []).map(x => String(x).toLowerCase());
  if (equipo.includes(u)) return true;
  const campos = [p.responsable, p.responsableReporte, p.responsableServicio, p.responsableAlcance, ...(p.apoyo || [])]
    .map(x => String(x || "").toLowerCase());
  return campos.some(c => c && (c === u || (nombre && c === nombre)));
}

// Lista de atrasos (proyectos activos con alerta) que son míos.
export function misAtrasos(items, usuario) {
  return (items || []).filter(p => !p.archivado && p.estado === "activo" && evaluarAlerta(p) && esMio(p, usuario));
}

export default function Notificaciones({ items, usuario, onCerrar, onAbrir }) {
  const [modo, setModo] = useState("mios"); // "mios" | "todos"

  const atrasos = (items || [])
    .filter(p => !p.archivado && p.estado === "activo")
    .map(p => ({ p, a: evaluarAlerta(p) }))
    .filter(x => x.a);
  const mios = atrasos.filter(x => esMio(x.p, usuario));
  const lista = (modo === "mios" ? mios : atrasos).sort((x, y) => y.a.dias - x.a.dias);

  return (
    <Lateral onCerrar={onCerrar}>
      <div className="d-head">
        <div>
          <p className="eyebrow">Notificaciones</p>
          <h2 id="d-titulo">Atrasos</h2>
        </div>
        <button type="button" className="btn icon" data-foco aria-label="Cerrar" onClick={onCerrar}>✕</button>
      </div>

      <div className="notis-tabs">
        <button type="button" className={"notis-tab" + (modo === "mios" ? " activo" : "")} onClick={() => setModo("mios")}>
          Míos <span>{mios.length}</span>
        </button>
        <button type="button" className={"notis-tab" + (modo === "todos" ? " activo" : "")} onClick={() => setModo("todos")}>
          En conjunto <span>{atrasos.length}</span>
        </button>
      </div>

      <div className="d-body">
        {!lista.length ? (
          <p className="vacio-g">{modo === "mios" ? "No tienes atrasos. ¡Bien!" : "No hay atrasos en este momento."}</p>
        ) : (
          <ul className="notis-lista">
            {lista.map(({ p, a }) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="notis-item"
                  style={{ borderLeftColor: a.color }}
                  onClick={() => onAbrir(p.id)}
                  title={"Abrir " + p.nombre}
                >
                  <span className="notis-pt" style={{ background: a.color }} aria-hidden="true" />
                  <span className="notis-main">
                    <span className="notis-nom">{p.nombre} <small>· {p.cliente}</small></span>
                    <span className="notis-motivo">{a.motivo}</span>
                    <span className="notis-meta">Paso {paso(p).n} · {paso(p).txt} · {diasTxt(dias(p))}</span>
                  </span>
                  <span className="notis-ir" aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Lateral>
  );
}
