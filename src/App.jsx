import { useEffect, useMemo, useState } from "react";
import { useProyectos } from "./useProyectos.js";
import { filtrar } from "./reglas.js";
import Kpis from "./components/Kpis.jsx";
import Filtros from "./components/Filtros.jsx";
import Tablero from "./components/Tablero.jsx";
import Lista from "./components/Lista.jsx";
import Flujo from "./components/Flujo.jsx";
import Panel from "./components/Panel.jsx";
import PanelNuevo from "./components/PanelNuevo.jsx";

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

function Tablas() {
  const { items, listo, error, setError, guardar, quitar } = useProyectos(true);

  const [vista, setVista] = useState(() =>
    ["tablero", "lista", "flujo"].includes(leer("vista"))
      ? leer("vista")
      : "tablero"
  );

  const [filtros, setFiltros] = useState({
    q: "",
    resp: "",
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
            38 pasos en 7 fases.
          </p>
        </div>

        <div className="top-acciones">
          <button
            type="button"
            className="btn primary"
            onClick={() => setPanel({ tipo: "nuevo" })}
          >
            Nuevo proyecto
          </button>
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
                  .forEach(p => quitar(p.id))
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
            quitar(id);
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
            guardar(p);

            setPanel({
              tipo: "detalle",
              id: p.id
            });
          }}
        />
      )}

    </div>
  );
}

export default function App() {
  return <Tablas />;
}