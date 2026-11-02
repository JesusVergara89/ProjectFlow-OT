import { useEffect, useRef, useState } from "react";
import { leerAvatar, guardarAvatar, guardarEstado, suscribirPerfiles } from "../db.js";
import { procesarAvatar } from "../imagen.js";
import Avatar from "./Avatar.jsx";

// Estados disponibles para la burbuja (puedes añadir o quitar emojis).
const ESTADOS = ["😀", "😎", "😍", "🤒", "😴", "🏖️", "💻", "🔧", "🚗", "☕", "🔥", "✅", "📌", "🎯", "🚧"];

export default function AvatarUsuario({ usuario, grande = false, editable = true }) {
  const id = String(usuario?.usuario || "").toLowerCase();
  const nombre = usuario?.nombre || usuario?.usuario || "";
  const [url, setUrl] = useState(null);
  const [estado, setEstado] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(false);
  const inputRef = useRef(null);

  // Carga la foto y el estado actuales, y escucha cambios en tiempo real.
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    const cargar = () => leerAvatar(id).then(u => {
      if (!vivo) return;
      setUrl(u?.url || null);
      setEstado(u?.estado || "");
    });
    cargar();
    const cancelar = suscribirPerfiles(cargar);
    return () => { vivo = false; cancelar(); };
  }, [id]);

  // Cierra la vista grande con Escape.
  useEffect(() => {
    if (!abierto) return;
    const alTecla = e => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [abierto]);

  async function alElegir(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Elige un archivo de imagen.");
      return;
    }
    setError("");
    setSubiendo(true);
    try {
      const { base64, tipo } = await procesarAvatar(file);
      const r = await guardarAvatar({ base64, tipo });
      if (r?.url) setUrl(r.url);
    } catch (err) {
      setError(err.message || "No se pudo subir la foto.");
    } finally {
      setSubiendo(false);
    }
  }

  // Cambia (o quita) el estado. Optimista: se ve al instante y se guarda.
  async function elegirEstado(nuevo) {
    const anterior = estado;
    setEstado(nuevo);
    try {
      await guardarEstado(nuevo);
    } catch (err) {
      setEstado(anterior);
      setError(err.message || "No se pudo guardar el estado.");
    }
  }

  return (
    <>
      <button
        type="button"
        className={"avatar-usuario" + (grande ? " grande" : "") + (subiendo ? " cargando" : "")}
        onClick={() => setAbierto(true)}
        title={"Ver foto · " + nombre}
        aria-label={"Foto de perfil de " + nombre}
      >
        <Avatar nombre={nombre} url={url} clave={id} estado={estado} />
        {editable && (
          <span className="avatar-camara" aria-hidden="true">{subiendo ? "…" : "✎"}</span>
        )}
      </button>

      {abierto && (
        <div className="avatar-modal" onClick={() => setAbierto(false)}>
          <div
            className="avatar-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={"Foto de perfil de " + nombre}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn icon avatar-modal-x"
              aria-label="Cerrar"
              onClick={() => setAbierto(false)}
            >✕</button>

            <div className="avatar-grande-vista">
              <Avatar nombre={nombre} url={url} clave={id} size={220} estado={estado} />
            </div>
            <p className="avatar-modal-nombre">{nombre}</p>

            {editable && (
              <div className="avatar-estados">
                <span className="avatar-estados-tit">Estado</span>
                <div className="avatar-estados-grid">
                  {ESTADOS.map(e => (
                    <button
                      type="button"
                      key={e}
                      className={"avatar-estado-op" + (estado === e ? " activo" : "")}
                      onClick={() => elegirEstado(estado === e ? "" : e)}
                      aria-pressed={estado === e}
                      title={estado === e ? "Quitar estado" : "Poner " + e}
                    >{e}</button>
                  ))}
                  {estado && (
                    <button
                      type="button"
                      className="avatar-estado-op quitar"
                      onClick={() => elegirEstado("")}
                      title="Quitar estado"
                    >✕</button>
                  )}
                </div>
              </div>
            )}

            {editable && (
              <div className="avatar-modal-acciones">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => inputRef.current?.click()}
                  disabled={subiendo}
                >
                  {subiendo ? "Subiendo…" : (url ? "✎ Cambiar foto" : "✎ Subir foto")}
                </button>
              </div>
            )}
            {error && <p className="avatar-modal-error" role="alert">{error}</p>}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={alElegir}
      />
    </>
  );
}
