import { useEffect, useMemo, useRef, useState } from "react";
import { Lateral } from "./Panel.jsx";
import { hora, fecha, norm } from "../format.js";
import { usuariosMensajes, leerMensajes, enviarMensaje, marcarMensajesLeidos } from "../db.js";

export default function Mensajes({ usuario, items = [], onCerrar, onAbrir }) {
  const yo = String(usuario?.usuario || "").toLowerCase();
  const [usuarios, setUsuarios] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [para, setPara] = useState("");
  const [texto, setTexto] = useState("");
  const [proy, setProy] = useState(""); // id del proyecto anexado
  const [proyBusca, setProyBusca] = useState(""); // texto del buscador de proyecto
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef(null);

  // Proyectos activos para anexar, con un texto buscable por todas sus variables.
  const proyectos = useMemo(
    () => (items || [])
      .filter(p => !p.archivado)
      .map(p => ({
        p,
        busca: norm([
          p.nombre, p.cliente, p.ot, p.tipo, p.area, p.prioridad,
          p.responsable, p.responsableReporte, p.responsableServicio, p.responsableAlcance,
          ...(p.apoyo || [])
        ].filter(Boolean).join(" "))
      }))
      .sort((a, b) => String(a.p.nombre).localeCompare(String(b.p.nombre), "es")),
    [items]
  );
  const proySel = useMemo(() => proyectos.find(x => String(x.p.id) === proy)?.p || null, [proyectos, proy]);
  const proyFiltrados = useMemo(() => {
    const q = norm(proyBusca.trim());
    const base = q ? proyectos.filter(x => x.busca.includes(q)) : proyectos;
    return base.slice(0, 8);
  }, [proyectos, proyBusca]);
  const nombreDe = useMemo(() => {
    const m = { [yo]: (usuario?.nombre || usuario?.usuario || "Yo") };
    for (const u of usuarios) m[u.usuario] = u.nombre;
    return m;
  }, [usuarios, yo, usuario]);

  async function recargar() {
    try {
      const ms = await leerMensajes();
      setMensajes(ms);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [us, ms] = await Promise.all([usuariosMensajes(), leerMensajes()]);
        if (!vivo) return;
        setUsuarios(us);
        setMensajes(ms);
        setCargando(false);
        marcarMensajesLeidos().catch(() => {});
      } catch (e) { if (vivo) { setError(e.message); setCargando(false); } }
    })();
    return () => { vivo = false; };
  }, []);

  // Ordenados viejo→nuevo para leerlos como conversación.
  const orden = useMemo(() => [...mensajes].sort((a, b) => a.creado.localeCompare(b.creado)), [mensajes]);

  useEffect(() => { finRef.current?.scrollIntoView({ block: "end" }); }, [orden.length]);

  async function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!para || !t || enviando) return;
    setEnviando(true);
    setError("");
    try {
      await enviarMensaje({ para, texto: t, proyectoId: proySel?.id || null, proyectoNombre: proySel?.nombre || null });
      setTexto("");
      setProy("");
      setProyBusca("");
      await recargar();
    } catch (err) {
      setError(err.message || "No se pudo enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Lateral onCerrar={onCerrar}>
      <div className="d-head">
        <div>
          <p className="eyebrow">Mensajería interna</p>
          <h2 id="d-titulo">Mensajes</h2>
        </div>
        <button type="button" className="btn icon" data-foco aria-label="Cerrar" onClick={onCerrar}>✕</button>
      </div>

      <div className="d-body msgs-body">
        {cargando ? (
          <p className="vacio-g">Cargando…</p>
        ) : !orden.length ? (
          <p className="vacio-g">Aún no hay mensajes. Escribe el primero abajo.</p>
        ) : (
          <ul className="msgs-lista">
            {orden.map(m => {
              const mio = String(m.de).toLowerCase() === yo;
              const otro = mio ? m.para : m.de;
              return (
                <li key={m.id} className={"msg " + (mio ? "mio" : "recibido")}>
                  <div className="msg-burbuja">
                    <span className="msg-quien">
                      {mio ? `Tú → ${nombreDe[String(m.para).toLowerCase()] || m.para}` : (nombreDe[String(m.de).toLowerCase()] || m.de)}
                    </span>
                    <span className="msg-texto">{m.texto}</span>
                    {m.proyecto_id && (
                      <button
                        type="button"
                        className="msg-proy"
                        onClick={() => onAbrir?.(m.proyecto_id)}
                        title={"Abrir " + (m.proyecto_nombre || "proyecto")}
                      >
                        📎 {m.proyecto_nombre || "Proyecto"}
                      </button>
                    )}
                    <span className="msg-hora">{fecha(m.creado)} · {hora(m.creado)}{!mio && !m.leido ? " · nuevo" : ""}</span>
                  </div>
                </li>
              );
            })}
            <li ref={finRef} />
          </ul>
        )}
      </div>

      <form className="msgs-redactar" onSubmit={enviar}>
        <div className="msgs-fila">
          <select value={para} onChange={e => setPara(e.target.value)} required>
            <option value="">Para…</option>
            {usuarios.map(u => <option key={u.usuario} value={u.usuario}>{u.nombre}</option>)}
          </select>
        </div>

        {/* Anexar proyecto: buscador por nombre, empresa, responsable, OT, tipo… */}
        <div className="msgs-adjuntar">
          {proySel ? (
            <div className="msgs-adj-chip">
              📎 <b>{proySel.nombre}</b> <span>· {proySel.cliente}{proySel.ot ? ` · OT ${proySel.ot}` : ""}</span>
              <button type="button" onClick={() => { setProy(""); setProyBusca(""); }} aria-label="Quitar proyecto">✕</button>
            </div>
          ) : (
            <>
              <input
                type="text"
                className="msgs-adj-busca"
                placeholder="📎 Anexar proyecto: busca por nombre, empresa, responsable, OT…"
                value={proyBusca}
                onChange={e => setProyBusca(e.target.value)}
              />
              {proyBusca.trim() && (
                <ul className="msgs-adj-res">
                  {proyFiltrados.length === 0 ? (
                    <li className="msgs-adj-vacio">Sin coincidencias</li>
                  ) : proyFiltrados.map(({ p }) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => { setProy(String(p.id)); setProyBusca(""); }}>
                        <span className="msgs-adj-nom">{p.nombre}</span>
                        <span className="msgs-adj-meta">{p.cliente}{p.responsable ? ` · ${p.responsable}` : ""}{p.ot ? ` · OT ${p.ot}` : ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        <div className="msgs-fila">
          <textarea
            rows={2}
            placeholder="Escribe un mensaje… (p. ej. «Ya te autoricé, crea la OT»)"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviar(e); }}
          />
          <button type="submit" className="btn primary" disabled={enviando || !para || !texto.trim()}>
            {enviando ? "Enviando…" : "Enviar"}
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </Lateral>
  );
}
