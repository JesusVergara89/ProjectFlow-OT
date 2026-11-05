import { useEffect, useState } from "react";
import { Lateral } from "./Panel.jsx";
import { apiGet } from "../auth.js";
import { fecha, hora } from "../format.js";
import Avatar from "./Avatar.jsx";
import { leerAvatares, suscribirPerfiles } from "../db.js";

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
  prioridad: "Prioridad", monto: "Monto", estado: "Estado", resultado: "Resultado", paso: "Paso",
  reporte_enviado: "Reporte enviado", pagado: "Pagado", facturado: "Facturado"
};

// Día local CDMX (YYYY-MM-DD) para un desfase de días desde hoy.
function diaLocal(offset = 0) {
  return new Date(Date.now() - 6 * 3600 * 1000 + offset * 86400000).toISOString().slice(0, 10);
}
function etiquetaChip(dia) {
  if (dia === diaLocal(0)) return "Hoy";
  if (dia === diaLocal(-1)) return "Ayer";
  const d = new Date(dia + "T12:00:00-06:00");
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
}
function tituloDia(dia) {
  if (!dia) return "";
  const d = new Date(dia + "T12:00:00-06:00");
  const t = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

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

// Un registro de la bitácora. conFecha=true muestra fecha+hora (modo proyecto),
// si no solo la hora (modo día). verProyecto=true muestra el nombre del proyecto.
function Registro({ r, avatares, conFecha, verProyecto }) {
  const u = String(r.usuario || "").toLowerCase();
  return (
    <li>
      <span className="h-f">{conFecha ? <>{fecha(r.creado)}<br /></> : null}{hora(r.creado)}</span>
      <div className="h-main">
        <Avatar
          nombre={r.nombre || r.usuario}
          url={avatares[u]?.url}
          estado={avatares[u]?.estado}
          clave={r.usuario}
          size={34}
          className="h-avatar"
        />
        <div className="h-cuerpo">
          <span className="h-t">
            <b>{r.nombre || r.usuario}</b> · {ETIQUETA[r.accion] || r.accion}
            {verProyecto && r.proyecto_nombre ? <> — {r.proyecto_nombre}</> : null}
          </span>
          <Detalle accion={r.accion} d={r.detalle} />
        </div>
      </div>
    </li>
  );
}

export default function Bitacora({ onCerrar }) {
  // Selector de proyecto
  const [proyectos, setProyectos] = useState([]);
  const [proySel, setProySel] = useState(""); // "" = todos (vista por día)

  // Vista por día
  const [dias, setDias] = useState([]);
  const [diaSel, setDiaSel] = useState("");
  const [cargandoDias, setCargandoDias] = useState(true);
  const [errDias, setErrDias] = useState("");

  const [reg, setReg] = useState({ cargando: false, error: "", registros: [] });
  const [avatares, setAvatares] = useState({});

  // Lista de días (vista "todos").
  useEffect(() => {
    let vivo = true;
    apiGet("bitacora?modo=dias")
      .then(r => {
        if (!vivo) return;
        const ds = r.dias || [];
        setDias(ds);
        setCargandoDias(false);
        if (ds.length) setDiaSel(d => d || ds[0].dia);
      })
      .catch(e => { if (vivo) { setErrDias(e.message); setCargandoDias(false); } });
    return () => { vivo = false; };
  }, []);

  // Lista de proyectos con actividad.
  useEffect(() => {
    let vivo = true;
    apiGet("bitacora?modo=proyectos")
      .then(r => vivo && setProyectos(r.proyectos || []))
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  // Carga registros según el modo: por proyecto, o por día.
  useEffect(() => {
    let vivo = true;
    if (proySel) {
      setReg(s => ({ ...s, cargando: true, error: "" }));
      apiGet("bitacora?proyecto=" + encodeURIComponent(proySel))
        .then(r => vivo && setReg({ cargando: false, error: "", registros: r.registros || [] }))
        .catch(e => vivo && setReg({ cargando: false, error: e.message, registros: [] }));
    } else if (diaSel) {
      setReg(s => ({ ...s, cargando: true, error: "" }));
      apiGet("bitacora?dia=" + diaSel)
        .then(r => vivo && setReg({ cargando: false, error: "", registros: r.registros || [] }))
        .catch(e => vivo && setReg({ cargando: false, error: e.message, registros: [] }));
    }
    return () => { vivo = false; };
  }, [proySel, diaSel]);

  // Fotos de perfil (en vivo).
  useEffect(() => {
    let vivo = true;
    leerAvatares().then(m => vivo && setAvatares(m));
    const cancelar = suscribirPerfiles(() => {
      leerAvatares().then(m => vivo && setAvatares(m));
    });
    return () => { vivo = false; cancelar(); };
  }, []);

  const idx = dias.findIndex(d => d.dia === diaSel);
  const irNuevo = () => { if (idx > 0) setDiaSel(dias[idx - 1].dia); };
  const irViejo = () => { if (idx >= 0 && idx < dias.length - 1) setDiaSel(dias[idx + 1].dia); };
  const proyNombre = proyectos.find(p => String(p.id) === String(proySel))?.nombre || "";

  return (
    <Lateral onCerrar={onCerrar}>
      <div className="d-head">
        <div>
          <p className="eyebrow">Rastro de actividad</p>
          <h2 id="d-titulo">Bitácora</h2>
        </div>
        <button type="button" className="btn icon" data-foco aria-label="Cerrar" onClick={onCerrar}>✕</button>
      </div>

      {/* Selector de proyecto */}
      <div className="bita-filtro">
        <label htmlFor="bita-proy">Proyecto</label>
        <select
          id="bita-proy"
          className="select"
          value={proySel}
          onChange={e => setProySel(e.target.value)}
        >
          <option value="">Todos (por día)</option>
          {proyectos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre} ({p.n})</option>
          ))}
        </select>
        {proySel && (
          <button type="button" className="btn" onClick={() => setProySel("")}>← Volver a días</button>
        )}
      </div>

      {/* Barra de días (solo en modo "todos") */}
      {!proySel && !cargandoDias && !errDias && dias.length > 0 && (
        <div className="bita-dias-barra">
          <button type="button" className="bita-flecha" onClick={irNuevo} disabled={idx <= 0} aria-label="Día más reciente" title="Día más reciente">‹</button>
          <div className="bita-dias" role="tablist" aria-label="Días con actividad">
            {dias.map(d => (
              <button
                type="button"
                key={d.dia}
                role="tab"
                aria-selected={d.dia === diaSel}
                className={"bita-dia" + (d.dia === diaSel ? " activo" : "")}
                onClick={() => setDiaSel(d.dia)}
                title={tituloDia(d.dia) + ` · ${d.n} ${d.n === 1 ? "registro" : "registros"}`}
              >
                <span className="bita-dia-t">{etiquetaChip(d.dia)}</span>
                <span className="bita-dia-n">{d.n}</span>
              </button>
            ))}
          </div>
          <button type="button" className="bita-flecha" onClick={irViejo} disabled={idx < 0 || idx >= dias.length - 1} aria-label="Día más antiguo" title="Día más antiguo">›</button>
        </div>
      )}

      <div className="d-body">
        {/* MODO PROYECTO */}
        {proySel ? (
          <>
            <p className="bita-dia-titulo">
              {proyNombre}
              {!reg.cargando && <span> · {reg.registros.length} {reg.registros.length === 1 ? "registro" : "registros"} en total</span>}
            </p>
            {reg.cargando ? (
              <p className="vacio-g">Cargando…</p>
            ) : reg.error ? (
              <p className="error">{reg.error}</p>
            ) : !reg.registros.length ? (
              <p className="vacio-g">Sin actividad para este proyecto.</p>
            ) : (
              <ol className="hist">
                {reg.registros.map((r, i) => (
                  <Registro key={r.id || i} r={r} avatares={avatares} conFecha verProyecto={false} />
                ))}
              </ol>
            )}
          </>
        ) : cargandoDias ? (
          <p className="vacio-g">Cargando…</p>
        ) : errDias ? (
          <p className="error">{errDias}</p>
        ) : !dias.length ? (
          <p className="vacio-g">Todavía no hay actividad registrada.</p>
        ) : (
          /* MODO DÍA */
          <>
            <p className="bita-dia-titulo">
              {tituloDia(diaSel)}
              {!reg.cargando && <span> · {reg.registros.length} {reg.registros.length === 1 ? "registro" : "registros"}</span>}
            </p>
            {reg.cargando ? (
              <p className="vacio-g">Cargando…</p>
            ) : reg.error ? (
              <p className="error">{reg.error}</p>
            ) : !reg.registros.length ? (
              <p className="vacio-g">Sin actividad este día.</p>
            ) : (
              <ol className="hist">
                {reg.registros.map((r, i) => (
                  <Registro key={r.id || i} r={r} avatares={avatares} conFecha={false} verProyecto />
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </Lateral>
  );
}
