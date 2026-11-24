import { useEffect, useState } from "react";
import Avatar from "./Avatar.jsx";
import { sesion } from "../auth.js";
import { suscribirPresencia, leerAvatares, suscribirPerfiles } from "../db.js";

// Muestra en vivo quién tiene la página abierta (Supabase Realtime Presence).
export default function EnLinea() {
  const yo = sesion() || {};
  const id = String(yo.usuario || "").toLowerCase();
  const nombre = yo.nombre || yo.usuario || "";
  const [gente, setGente] = useState([]);
  const [avatares, setAvatares] = useState({});
  const [sel, setSel] = useState(null); // usuario seleccionado para ver en grande

  // Presencia: se anuncia y escucha quién entra/sale.
  useEffect(() => {
    if (!id) return;
    return suscribirPresencia(id, nombre, setGente);
  }, [id, nombre]);

  // Fotos + estados de todos (para pintar cada avatar).
  useEffect(() => {
    let vivo = true;
    const cargar = () => leerAvatares().then(m => vivo && setAvatares(m));
    cargar();
    const cancelar = suscribirPerfiles(cargar);
    return () => { vivo = false; cancelar(); };
  }, []);

  const lista = [...gente].sort((a, b) => (a.usuario === id ? -1 : b.usuario === id ? 1 : 0));

  // Solo se puede ver a quien sigue EN LÍNEA: si se desconecta, se cierra.
  const activo = sel ? lista.find(p => p.usuario === sel) : null;
  useEffect(() => {
    if (sel && !activo) setSel(null);
  }, [sel, activo]);

  // Cerrar con Escape.
  useEffect(() => {
    if (!activo) return;
    const onKey = e => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activo]);

  const perfilSel = activo ? (avatares[activo.usuario] || {}) : {};

  return (
    <section className="en-linea" aria-label="Personas en línea">
      <h3>En línea <span>({gente.length})</span></h3>
      {lista.length === 0 ? (
        <p className="en-linea-vacio">Conectando…</p>
      ) : (
        <div className="en-linea-row">
          {lista.map(p => {
            const perfil = avatares[p.usuario] || {};
            const esYo = p.usuario === id;
            const corto = (p.nombre || p.usuario).split(/\s+/)[0];
            return (
              <button
                type="button"
                className="en-linea-item"
                key={p.usuario}
                title={"Ver en grande a " + (p.nombre || p.usuario) + (esYo ? " (tú)" : "")}
                onClick={() => setSel(p.usuario)}
              >
                <span className="en-linea-ava">
                  <Avatar nombre={p.nombre || p.usuario} url={perfil.url} estado={perfil.estado} clave={p.usuario} size={42} />
                  <span className="en-linea-pt" aria-hidden="true" />
                </span>
                <span className="en-linea-nom">{corto}{esYo ? " (tú)" : ""}</span>
              </button>
            );
          })}
        </div>
      )}

      {activo && (
        <div
          className="en-linea-modal"
          role="dialog"
          aria-modal="true"
          aria-label={"Perfil de " + (activo.nombre || activo.usuario)}
          onClick={() => setSel(null)}
        >
          <div className="en-linea-card" onClick={e => e.stopPropagation()}>
            <button type="button" className="en-linea-cerrar" onClick={() => setSel(null)} aria-label="Cerrar">✕</button>
            <div className="en-linea-foto">
              <Avatar
                nombre={activo.nombre || activo.usuario}
                url={perfilSel.url}
                estado={perfilSel.estado}
                clave={activo.usuario}
                size={220}
              />
            </div>
            <div className="en-linea-info">
              <span className="en-linea-ok"><span className="en-linea-ok-pt" aria-hidden="true" /> En línea</span>
              <h4>{activo.nombre || activo.usuario}{activo.usuario === id ? " (tú)" : ""}</h4>
              {perfilSel.estado
                ? <p className="en-linea-estado"><span className="ee-emoji" aria-hidden="true">{perfilSel.estado}</span> Estado actual</p>
                : <p className="en-linea-estado sin">Sin estado</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
