import { useCallback, useEffect, useRef, useState } from "react";
import { listar, guardar, borrar, suscribir } from "./db.js";

/** Estado de los proyectos: carga inicial, tiempo real y escritura optimista. */
export function useProyectos(activo) {
  const [items, setItems] = useState([]);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");
  const cola = useRef(new Map());

  const recargar = useCallback(async () => {
    try {
      setItems(await listar());
      setError("");
    } catch (e) {
      setError("No se pudieron leer los proyectos (" + e.message + ").");
    } finally {
      setListo(true);
    }
  }, []);

  useEffect(() => {
    if (!activo) return;
    recargar();
    return suscribir(recargar);
  }, [activo, recargar]);

  // Una escritura a la vez por proyecto, para que no se pisen entre sí.
  const encolar = useCallback(
    (id, fn) => {
      const prev = cola.current.get(id) || Promise.resolve();
      const sig = prev
        .then(fn)
        .catch(e => {
          setError("No se pudo guardar el cambio (" + e.message + ").");
          recargar();
        });
      cola.current.set(id, sig);
    },
    [recargar]
  );

  const guardarProyecto = useCallback(
    p => {
      setItems(prev => (prev.some(x => x.id === p.id) ? prev.map(x => (x.id === p.id ? p : x)) : [...prev, p]));
      encolar(p.id, () => guardar(p));
    },
    [encolar]
  );

  const quitarProyecto = useCallback(
    id => {
      setItems(prev => prev.filter(x => x.id !== id));
      encolar(id, () => borrar(id));
    },
    [encolar]
  );

  return { items, listo, error, setError, guardar: guardarProyecto, quitar: quitarProyecto };
}
