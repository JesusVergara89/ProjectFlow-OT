import { useEffect, useState } from "react";
import { Lateral } from "./Panel.jsx";
import { apiGet } from "../auth.js";
import { fecha, hora } from "../format.js";

const ETIQUETA = {
  ingreso: "Inició sesión",
  crear: "Creó el proyecto",
  editar: "Editó datos",
  avanzar: "Avanzó un paso",
  deshacer: "Deshizo un avance",
  eliminar: "Eliminó el proyecto"
};

const CAMPO = {
  nombre: "Proyecto", cliente: "Cliente", responsable: "Responsable",
  prioridad: "Prioridad", monto: "Monto", estado: "Estado", resultado: "Resultado", paso: "Paso"
};

function Detalle({ accion, d }) {
  if (!d) return null;
  if (accion === "avanzar") {
    return (
      <span className="h-n">
        Paso {d.paso_antes} → {d.paso_despues}
        {d.decision ? ` · decisión: ${d.decision === "si" ? "Sí" : "No"}` : ""}
        {d.nota ? ` · “${d.nota}”` : ""}
      </span>
    );
  }
  if (accion === "deshacer") {
    return <span className="h-n">Paso {d.paso_antes} → {d.paso_despues}</span>;
  }
  if (accion === "crear") {
    return <span className="h-n">{d.cliente}{d.responsable ? ` · ${d.responsable}` : ""}</span>;
  }
  if (accion === "editar" && d.cambios) {
    const entradas = Object.entries(d.cambios);
    if (!entradas.length) return null;
    return (
      <span className="h-n">
        {entradas.map(([c, v]) => `${CAMPO[c] || c}: ${v.antes ?? "—"} → ${v.ahora ?? "—"}`).join(" · ")}
      </span>
    );
  }
  return null;
}

export default function Bitacora({ onCerrar }) {
  const [estado, setEstado] = useState({ cargando: true, error: "", registros: [] });

  useEffect(() => {
    let vivo = true;
    apiGet("bitacora")
      .then(r => vivo && setEstado({ cargando: false, error: "", registros: r.registros || [] }))
      .catch(e => vivo && setEstado({ cargando: false, error: e.message, registros: [] }));
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <Lateral onCerrar={onCerrar}>
      <div className="d-head">
        <div>
          <p className="eyebrow">Rastro de actividad</p>
          <h2 id="d-titulo">Bitácora</h2>
        </div>
        <button type="button" className="btn icon" data-foco aria-label="Cerrar" onClick={onCerrar}>✕</button>
      </div>
      <div className="d-body">
        {estado.cargando ? (
          <p className="vacio-g">Cargando…</p>
        ) : estado.error ? (
          <p className="error">{estado.error}</p>
        ) : !estado.registros.length ? (
          <p className="vacio-g">Todavía no hay actividad registrada.</p>
        ) : (
          <ol className="hist">
            {estado.registros.map((r, i) => (
              <li key={r.id || i}>
                <span className="h-f">{fecha(r.creado)}<br />{hora(r.creado)}</span>
                <div>
                  <span className="h-t">
                    <b>{r.nombre || r.usuario}</b> · {ETIQUETA[r.accion] || r.accion}
                    {r.proyecto_nombre ? <> — {r.proyecto_nombre}</> : null}
                  </span>
                  <Detalle accion={r.accion} d={r.detalle} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Lateral>
  );
}
