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
              <div className="en-linea-item" key={p.usuario} title={(p.nombre || p.usuario) + (esYo ? " (tú)" : "")}>
                <span className="en-linea-ava">
                  <Avatar nombre={p.nombre || p.usuario} url={perfil.url} estado={perfil.estado} clave={p.usuario} size={42} />
                  <span className="en-linea-pt" aria-hidden="true" />
                </span>
                <span className="en-linea-nom">{corto}{esYo ? " (tú)" : ""}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
