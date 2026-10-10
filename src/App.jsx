import { useEffect, useMemo, useState } from "react";
import { useProyectos } from "./useProyectos.js";
import { filtrar } from "./reglas.js";
import { sesion as leerSesion, salir } from "./auth.js";
import Kpis from "./components/Kpis.jsx";
import Filtros from "./components/Filtros.jsx";
import Tablero from "./components/Tablero.jsx";
import Lista from "./components/Lista.jsx";
import Flujo from "./components/Flujo.jsx";
import Panel from "./components/Panel.jsx";
import PanelNuevo from "./components/PanelNuevo.jsx";
import Login from "./components/Login.jsx";
import Bitacora from "./components/Bitacora.jsx";

const VISTAS = [
  ["tablero", "Tablero"],
  ["lista", "Lista"],
  ["flujo", "Flujo"]
];

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
  const [verBitacora, setVerBitacora] = useState(false);

  const [vista, setVista] = useState(() =>
    ["tablero", "lista", "flujo"].includes(leer("vista"))
      ? leer("vista")
      : "tablero"
  );

  const [filtros, setFiltros] = useState({
    q: "",
    resp: "",
    area: "",
    prio: "",
    estado: "activos",
    paso: null,
    detenidos: false
  });

  const [orden, setOrden] = useState({
    k: "dias",
    dir: -1
  });

  const [panel, setPanel] = useState(null);

  const setFiltro = cambio =>
    setFiltros(f => ({
      ...f,
      ...cambio
    }));

  const cerrarPanel = useMemo(() => () => setPanel(null), []);

  useEffect(() => {
    escribir("vista", vista);
  }, [vista]);

  const responsables = useMemo(
    () =>
      [...new Set(
        items
          .map(p => p.responsable)
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, "es")),
    [items]
  );

  const clientes = useMemo(
    () =>
      [...new Set(
        items
          .map(p => p.cliente)
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, "es")),
    [items]
  );

  const visibles = useMemo(() => {
    const base = items.filter(p =>
      vista === "lista"
        ? filtros.estado === "todos" ||
          (filtros.estado === "activos"
            ? p.estado === "activo"
            : p.estado === "cerrado")
        : p.estado === "activo"
    );

    return filtrar(base, filtros);
  }, [items, filtros, vista]);

  const alOrdenar = k =>
    setOrden(o =>
      o.k === k
        ? { k, dir: -o.dir }
        : {
            k,
            dir: k === "nombre" || k === "paso" ? 1 : -1
          }
    );

  const verPaso = n => {
    setFiltros(f => ({
      ...f,
      paso: n,
      estado: "activos"
    }));

    setVista("lista");
    window.scrollTo(0, 0);
  };

  const proyectoAbierto =
    panel?.tipo === "detalle"
      ? items.find(p => p.id === panel.id)
      : null;

  const hayEjemplos = items.some(p => p.ejemplo);

  return (
    <div className="wrap">

      <header className="top">
        <div>
          <h1>Tablero de Proyectos y OT</h1>

          <p className="sub">
            De la solicitud del cliente al pago de la factura:
            42 pasos en 8 fases.
          </p>
        </div>

        <div className="top-acciones">
          <button
            type="button"
            className="btn"
            onClick={() => setVerBitacora(true)}
          >
            Bitácora
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => setPanel({ tipo: "nuevo" })}
          >
            Nuevo proyecto
          </button>
          <span className="usuario-chip" title={"Rol: " + (usuario?.rol || "usuario")}>
            {usuario?.nombre || usuario?.usuario}
          </span>
          <button type="button" className="btn ghost" onClick={onSalir}>Salir</button>
        </div>
      </header>

      <div id="avisos">

        {error && (
          <div className="aviso crit">
            <span>{error}</span>

            <button
              type="button"
              className="btn"
              onClick={() => setError("")}
            >
              Entendido
            </button>
          </div>
        )}

        {hayEjemplos && (
          <div className="aviso">

            <span>
              Estos proyectos son de ejemplo para que veas cómo se mueve el flujo.
            </span>

            <button
              type="button"
              className="btn"
              onClick={() =>
                items
                  .filter(p => p.ejemplo)
                  .forEach(p => quitar(p.id, p.nombre))
              }
            >
              Quitar ejemplos
            </button>

          </div>
        )}

      </div>

      <Kpis
        items={items}
        soloDetenidos={filtros.detenidos}
        onToggleDetenidos={() =>
          setFiltro({
            detenidos: !filtros.detenidos
          })
        }
      />

      <div className="controles">

        <nav
          className="tabs"
          aria-label="Vista"
        >
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
          vista={vista}
          responsables={responsables}
        />

      </div>

      <main id="vista">

        {!listo ? (
          <p className="vacio-g">
            Cargando proyectos…
          </p>
        ) : !items.length && vista !== "flujo" ? (

          <div className="vacio-g">

            <h2>Aún no hay proyectos</h2>

            <p>
              Registra la primera solicitud de un cliente.
              Cada proyecto empieza en el paso 1 y avanza por
              las 7 fases según las decisiones que tomes en cada paso.
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
            onAbrir={id =>
              setPanel({
                tipo: "detalle",
                id
              })
            }
          />

        ) : vista === "lista" ? (

          <Lista
            items={visibles}
            orden={orden}
            onOrden={alOrdenar}
            onAbrir={id =>
              setPanel({
                tipo: "detalle",
                id
              })
            }
          />

        ) : (

          <Flujo
            items={items}
            onVerPaso={verPaso}
          />

        )}

      </main>

      {proyectoAbierto && (
        <Panel
          key={proyectoAbierto.id}
          p={proyectoAbierto}
          onGuardar={guardar}
          onEliminar={id => {
            setPanel(null);
            quitar(id, proyectoAbierto.nombre);
          }}
          onCerrar={cerrarPanel}
        />
      )}

      {panel?.tipo === "nuevo" && (
        <PanelNuevo
          clientes={clientes}
          responsables={responsables}
          onCerrar={cerrarPanel}
          onCrear={p => {
            guardar(p, "crear");

            setPanel({
              tipo: "detalle",
              id: p.id
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