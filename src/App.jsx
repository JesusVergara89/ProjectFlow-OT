import { useEffect, useMemo, useState } from "react";
import { useProyectos } from "./useProyectos.js";
import { filtrar } from "./reglas.js";
import { sesion as leerSesion, salir } from "./auth.js";
import { esSuperAdmin } from "./permisos.js";
import { leerMarcasSuper, guardarMarcaSuper, borrarMarcaSuper, leerCierres, asegurarCierres } from "./db.js";
import Kpis from "./components/Kpis.jsx";
import Filtros from "./components/Filtros.jsx";
import Tablero from "./components/Tablero.jsx";
import Lista from "./components/Lista.jsx";
import Flujo from "./components/Flujo.jsx";
import Proyeccion from "./components/Proyeccion.jsx";
import Analitica from "./components/Analitica.jsx";
import Calendario from "./components/Calendario.jsx";
import Panel from "./components/Panel.jsx";
import PanelNuevo from "./components/PanelNuevo.jsx";
import Login from "./components/Login.jsx";
import Bitacora from "./components/Bitacora.jsx";
import AvatarUsuario from "./components/AvatarUsuario.jsx";

const VISTAS = [
  ["tablero", "Tablero"],
  ["lista", "Lista"],
  ["flujo", "Flujo"],
  ["proyeccion", "Proyección"],
  ["graficas", "Gráficas"],
  ["calendario", "Calendario"],
];
const IDS_VISTA = VISTAS.map((v) => v[0]);

const leer = (k, def) => {
  try {
    return localStorage.getItem("tpo:" + k) || def;
  } catch {
    return def;
  }
};

const escribir = (k, v) => {
  try {
    localStorage.setItem("tpo:" + k, v);
  } catch {
    /* sin almacenamiento local */
  }
};

function Tablas({ usuario, onSalir }) {
  const { items, listo, error, setError, guardar, quitar } = useProyectos(true);

  // Súper admin: marcas privadas de "proyecto atrasado" (solo las ve él).
  const soySuper = esSuperAdmin(usuario?.usuario);
  const [marcas, setMarcas] = useState({});
  useEffect(() => {
    if (!soySuper) return;
    let vivo = true;
    leerMarcasSuper().then(m => vivo && setMarcas(m || {})).catch(() => {});
    return () => { vivo = false; };
  }, [soySuper]);

  // Cierres mensuales (foto de meses anteriores). Al entrar, congela los meses
  // ya terminados que falten y trae todas las fotos.
  const [cierres, setCierres] = useState([]);
  useEffect(() => {
    let vivo = true;
    leerCierres().then(c => vivo && setCierres(c || [])).catch(() => {});
    asegurarCierres().then(c => { if (vivo && c && c.length) setCierres(c); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const marcarAtrasado = async (id, mensaje) => {
    setMarcas(m => ({ ...m, [id]: { atrasado: true, mensaje } })); // optimista
    try { await guardarMarcaSuper(id, mensaje); }
    catch (e) { setError(e.message || "No se pudo guardar la marca."); }
  };
  const quitarAtrasado = async (id) => {
    setMarcas(m => { const n = { ...m }; delete n[id]; return n; });
    try { await borrarMarcaSuper(id); }
    catch (e) { setError(e.message || "No se pudo quitar la marca."); }
  };
  const [verBitacora, setVerBitacora] = useState(false);

  const [vista, setVista] = useState(() =>
    IDS_VISTA.includes(leer("vista")) ? leer("vista") : "tablero",
  );

  const FILTROS_INICIALES = {
    q: "",
    resp: "",
    area: "",
    tipo: "",
    cliente: "",
    prio: "",
    pagado: "",
    facturado: "",
    reporte: "",
    estado: "activos",
    paso: null,
    detenidos: false,
  };
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);

  // Restablece todos los filtros (conserva el estado de la vista Lista).
  const limpiarFiltros = () =>
    setFiltros((f) => ({ ...FILTROS_INICIALES, estado: f.estado }));

  const [orden, setOrden] = useState({
    k: "dias",
    dir: -1,
  });

  const [panel, setPanel] = useState(null);

  const setFiltro = (cambio) =>
    setFiltros((f) => ({
      ...f,
      ...cambio,
    }));

  const cerrarPanel = useMemo(() => () => setPanel(null), []);

  useEffect(() => {
    escribir("vista", vista);
  }, [vista]);

  const responsables = useMemo(
    () =>
      [...new Set(items.map((p) => p.responsable).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "es"),
      ),
    [items],
  );

  const clientes = useMemo(
    () =>
      [...new Set(items.map((p) => p.cliente).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [items],
  );

  const visibles = useMemo(() => {
    const base = items.filter((p) => {
      if (vista === "lista") {
        if (filtros.estado === "archivados") return p.archivado;
        if (p.archivado) return false;
        if (filtros.estado === "todos") return true;
        return filtros.estado === "activos"
          ? p.estado === "activo"
          : p.estado === "cerrado";
      }
      // Tablero y demás vistas: solo activos y no archivados.
      return p.estado === "activo" && !p.archivado;
    });

    return filtrar(base, filtros);
  }, [items, filtros, vista]);

  const alOrdenar = (k) =>
    setOrden((o) =>
      o.k === k
        ? { k, dir: -o.dir }
        : {
            k,
            dir: k === "nombre" || k === "paso" ? 1 : -1,
          },
    );

  const verPaso = (n) => {
    setFiltros((f) => ({
      ...f,
      paso: n,
      estado: "activos",
    }));

    setVista("lista");
    window.scrollTo(0, 0);
  };

  const proyectoAbierto =
    panel?.tipo === "detalle" ? items.find((p) => p.id === panel.id) : null;

  const hayEjemplos = items.some((p) => p.ejemplo);

  return (
    <div className="wrap">
      <header className="top">
        <div className="top-titulo">
          <h1>Tablero de Proyectos y OT</h1>

          <p className="sub">
            De la solicitud del cliente al pago de la factura: 42 pasos en 8
            fases.
          </p>
        </div>

        <div className="top-acciones">
          <div className="usuario-bitacora">
            <AvatarUsuario usuario={usuario} />

            <button
              type="button"
              className="btn"
              onClick={() => setVerBitacora(true)}
            >
              Bitácora
            </button>
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={() => setPanel({ tipo: "nuevo" })}
          >
            Nuevo proyecto
          </button>
          <span
            className="usuario-chip"
            title={"Rol: " + (usuario?.rol || "usuario")}
          >
            {usuario?.nombre || usuario?.usuario}
          </span>
          <button type="button" className="btn ghost" onClick={onSalir}>
            Salir
          </button>
        </div>
      </header>

      <div id="avisos">
        {error && (
          <div className="aviso crit">
            <span>{error}</span>

            <button type="button" className="btn" onClick={() => setError("")}>
              Entendido
            </button>
          </div>
        )}

        {hayEjemplos && (
          <div className="aviso">
            <span>
              Estos proyectos son de ejemplo para que veas cómo se mueve el
              flujo.
            </span>

            <button
              type="button"
              className="btn"
              onClick={() =>
                items
                  .filter((p) => p.ejemplo)
                  .forEach((p) => quitar(p.id, p.nombre))
              }
            >
              Quitar ejemplos
            </button>
          </div>
        )}
      </div>

      <Kpis
        items={items}
        cierres={cierres}
        soloDetenidos={filtros.detenidos}
        onToggleDetenidos={() =>
          setFiltro({
            detenidos: !filtros.detenidos,
          })
        }
      />

      <div className="controles">
        <nav className="tabs" aria-label="Vista">
          {VISTAS.map(([id, texto]) => (
            <button
              key={id}
              type="button"
              className="tab"
              aria-current={vista === id}
              onClick={() => setVista(id)}
            >
              {texto}
            </button>
          ))}
        </nav>

        <Filtros
          filtros={filtros}
          setFiltro={setFiltro}
          limpiar={limpiarFiltros}
          vista={vista}
          responsables={responsables}
          clientes={clientes}
        />
      </div>

      <main id="vista">
        {!listo ? (
          <p className="vacio-g">Cargando proyectos…</p>
        ) : !items.length &&
          vista !== "flujo" &&
          vista !== "proyeccion" &&
          vista !== "graficas" &&
          vista !== "calendario" ? (
          <div className="vacio-g">
            <h2>Aún no hay proyectos</h2>

            <p>
              Registra la primera solicitud de un cliente. Cada proyecto empieza
              en el paso 1 y avanza por las 7 fases según las decisiones que
              tomes en cada paso.
            </p>

            <button
              type="button"
              className="btn primary"
              onClick={() => setPanel({ tipo: "nuevo" })}
            >
              Nuevo proyecto
            </button>
          </div>
        ) : vista === "tablero" ? (
          <Tablero
            items={visibles}
            marcas={soySuper ? marcas : null}
            onAbrir={(id) =>
              setPanel({
                tipo: "detalle",
                id,
              })
            }
          />
        ) : vista === "lista" ? (
          <Lista
            items={visibles}
            orden={orden}
            onOrden={alOrdenar}
            onAbrir={(id) =>
              setPanel({
                tipo: "detalle",
                id,
              })
            }
          />
        ) : vista === "flujo" ? (
          <Flujo items={items} onVerPaso={verPaso} />
        ) : vista === "proyeccion" ? (
          <Proyeccion
            items={items}
            onAbrir={(id) => setPanel({ tipo: "detalle", id })}
          />
        ) : vista === "graficas" ? (
          <Analitica
            items={items}
            onAbrir={(id) => setPanel({ tipo: "detalle", id })}
          />
        ) : (
          <Calendario
            items={items}
            onAbrir={(id) => setPanel({ tipo: "detalle", id })}
          />
        )}
      </main>

      {proyectoAbierto && (
        <Panel
          key={proyectoAbierto.id}
          p={proyectoAbierto}
          onGuardar={guardar}
          onEliminar={(id) => {
            setPanel(null);
            quitar(id, proyectoAbierto.nombre);
          }}
          onCerrar={cerrarPanel}
          soySuper={soySuper}
          marca={marcas[proyectoAbierto.id]}
          onMarcar={marcarAtrasado}
          onQuitarMarca={quitarAtrasado}
        />
      )}

      {panel?.tipo === "nuevo" && (
        <PanelNuevo
          clientes={clientes}
          responsables={responsables}
          onCerrar={cerrarPanel}
          onCrear={(p) => {
            guardar(p, "crear");

            setPanel({
              tipo: "detalle",
              id: p.id,
            });
          }}
        />
      )}

      {verBitacora && <Bitacora onCerrar={() => setVerBitacora(false)} />}
    </div>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(() => leerSesion());

  useEffect(() => {
    const alExpirar = () => setUsuario(null);
    window.addEventListener("tpo:sesion-expirada", alExpirar);
    return () => window.removeEventListener("tpo:sesion-expirada", alExpirar);
  }, []);

  if (!usuario) return <Login onEntrar={setUsuario} />;

  return (
    <Tablas
      usuario={usuario}
      onSalir={() => {
        salir();
        setUsuario(null);
      }}
    />
  );
}
