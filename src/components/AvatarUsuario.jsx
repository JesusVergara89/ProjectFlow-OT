import { useEffect, useRef, useState } from "react";
import { leerAvatar, guardarAvatar, suscribirPerfiles } from "../db.js";
import { procesarAvatar } from "../imagen.js";
import Avatar from "./Avatar.jsx";

export default function AvatarUsuario({ usuario, grande = false, editable = true }) {
  const id = String(usuario?.usuario || "").toLowerCase();
  const nombre = usuario?.nombre || usuario?.usuario || "";
  const [url, setUrl] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(false);
  const inputRef = useRef(null);

  // Carga la foto actual y escucha cambios en tiempo real.
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    leerAvatar(id).then(u => vivo && setUrl(u || null));
    const cancelar = suscribirPerfiles(() => {
      leerAvatar(id).then(u => vivo && setUrl(u || null));
    });
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

  return (
    <>
      <button
        type="button"
        className={"avatar-usuario" + (grande ? " grande" : "") + (subiendo ? " cargando" : "")}
        onClick={() => setAbierto(true)}
        title={"Ver foto · " + nombre}
        aria-label={"Foto de perfil de " + nombre}
      >
        <Avatar nombre={nombre} url={url} clave={id} />
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
              <Avatar nombre={nombre} url={url} clave={id} size={220} />
            </div>
            <p className="avatar-modal-nombre">{nombre}</p>

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
