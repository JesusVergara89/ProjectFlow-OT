import { PASOS } from "../flow.js";
import { AREAS } from "../servicios.js";

export default function Filtros({ filtros, setFiltro, vista, responsables }) {
  if (vista === "flujo") return null;
  return (
    <div className="filtros">
      <label className="sr" htmlFor="f-q">Buscar proyecto o cliente</label>
      <input
        id="f-q"
        type="search"
        placeholder="Buscar proyecto o cliente"
        autoComplete="off"
        value={filtros.q}
        onChange={e => setFiltro({ q: e.target.value })}
      />
      <label className="sr" htmlFor="f-resp">Responsable</label>
      <select id="f-resp" value={filtros.resp} onChange={e => setFiltro({ resp: e.target.value })}>
        <option value="">Todos los responsables</option>
        {responsables.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <label className="sr" htmlFor="f-area">Área</label>
      <select id="f-area" value={filtros.area || ""} onChange={e => setFiltro({ area: e.target.value })}>
        <option value="">Todas las áreas</option>
        {Object.keys(AREAS).map(a => (
          <option key={a} value={a}>{AREAS[a].nombre}</option>
        ))}
      </select>
      <label className="sr" htmlFor="f-prio">Prioridad</label>
      <select id="f-prio" value={filtros.prio} onChange={e => setFiltro({ prio: e.target.value })}>
        <option value="">Toda prioridad</option>
        <option value="alta">Alta</option>
        <option value="media">Media</option>
        <option value="baja">Baja</option>
      </select>
      {vista === "lista" && (
        <span>
          <label className="sr" htmlFor="f-estado">Estado</label>
          <select id="f-estado" value={filtros.estado} onChange={e => setFiltro({ estado: e.target.value })}>
            <option value="activos">Activos</option>
            <option value="cerrados">Cerrados</option>
            <option value="todos">Todos</option>
          </select>
        </span>
      )}
      {filtros.paso && (
        <button type="button" className="chip" onClick={() => setFiltro({ paso: null })}>
          Paso {filtros.paso} · {PASOS[filtros.paso].txt} ✕
        </button>
      )}
    </div>
  );
}
