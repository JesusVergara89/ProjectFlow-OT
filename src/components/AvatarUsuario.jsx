import { useEffect, useRef, useState } from "react";
import { leerAvatar, guardarAvatar, suscribirPerfiles } from "../db.js";
import { procesarAvatar } from "../imagen.js";

/** Iniciales a partir del nombre a mostrar (máx. 2 letras). */
function inicialesDe(txt) {
  const partes = String(txt || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const a = partes[0][0] || "";
  const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (a + b).toUpperCase();
}

/** Color estable derivado del usuario (para el fondo de las iniciales). */
function tonoDe(clave) {
  let h = 0;
  for (const c of String(clave || "")) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export default function AvatarUsuario({ usuario, grande = false }) {
  const id = String(usuario?.usuario || "").toLowerCase();
  const nombre = usuario?.nombre || usuario?.usuario || "";
  const [url, setUrl] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
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

  const tono = tonoDe(id || nombre);

  return (
    <button
      type="button"
      className={"avatar-usuario" + (grande ? " grande" : "") + (subiendo ? " cargando" : "")}
      onClick={() => inputRef.current?.click()}
      title={subiendo ? "Subiendo foto…" : "Cambiar mi foto · " + nombre}
      aria-label={"Foto de perfil de " + nombre}
      disabled={subiendo}
    >
      {url ? (
        <img src={url} alt={nombre} />
      ) : (
        <span
          className="avatar-iniciales"
          style={{ background: `hsl(${tono} 48% 42%)` }}
        >
          {inicialesDe(nombre)}
        </span>
      )}
      <span className="avatar-camara" aria-hidden="true">
        {subiendo ? "…" : "✎"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={alElegir}
      />
      {error && <span className="avatar-error" role="alert">{error}</span>}
    </button>
  );
}
