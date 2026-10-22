import { PASOS } from "../flow.js";
import { AREAS, SERVICIOS } from "../servicios.js";

// ¿Hay algún filtro activo (además de la búsqueda de texto y el estado)?
function hayFiltros(f) {
  return Boolean(
    f.resp || f.area || f.tipo || f.cliente || f.prio || f.pagado || f.reporte || f.paso || f.detenidos
  );
}

export default function Filtros({ filtros, setFiltro, limpiar, vista, responsables, clientes = [] }) {
  if (vista === "flujo") return null;
  return (
    <div className="filtros">
      <label className="sr" htmlFor="f-q">Buscar proyecto, cliente, responsable u OT</label>
      <input
        id="f-q"
        type="search"
        placeholder="Buscar proyecto, cliente, OT…"
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
      <label className="sr" htmlFor="f-cliente">Cliente</label>
      <select id="f-cliente" value={filtros.cliente || ""} onChange={e => setFiltro({ cliente: e.target.value })}>
        <option value="">Todos los clientes</option>
        {clientes.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <label className="sr" htmlFor="f-tipo">Tipo de servicio</label>
      <select id="f-tipo" value={filtros.tipo || ""} onChange={e => setFiltro({ tipo: e.target.value })}>
        <option value="">Todos los servicios</option>
        {SERVICIOS.map(s => (
          <option key={s.id} value={s.id}>{s.nombre}</option>
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
      <label className="sr" htmlFor="f-pagado">Pago</label>
      <select id="f-pagado" value={filtros.pagado || ""} onChange={e => setFiltro({ pagado: e.target.value })}>
        <option value="">Pagado o no</option>
        <option value="si">Pagado</option>
        <option value="no">No pagado</option>
      </select>
      <label className="sr" htmlFor="f-reporte">Reporte</label>
      <select id="f-reporte" value={filtros.reporte || ""} onChange={e => setFiltro({ reporte: e.target.value })}>
        <option value="">Reporte: todos</option>
        <option value="si">Reporte enviado</option>
        <option value="no">Sin reporte</option>
      </select>
      <label className="chk-inline" title="Solo proyectos que pasan del tiempo de su fase">
        <input
          type="checkbox"
          checked={!!filtros.detenidos}
          onChange={e => setFiltro({ detenidos: e.target.checked })}
        />
        <span>Solo detenidos</span>
      </label>
      {vista === "lista" && (
        <span>
          <label className="sr" htmlFor="f-estado">Estado</label>
          <select id="f-estado" value={filtros.estado} onChange={e => setFiltro({ estado: e.target.value })}>
            <option value="activos">Activos</option>
            <option value="cerrados">Cerrados</option>
            <option value="todos">Todos (sin archivar)</option>
            <option value="archivados">Archivados</option>
          </select>
        </span>
      )}
      {filtros.paso && (
        <button type="button" className="chip" onClick={() => setFiltro({ paso: null })}>
          Paso {filtros.paso} · {PASOS[filtros.paso].txt} ✕
        </button>
      )}
      {hayFiltros(filtros) && (
        <button type="button" className="chip chip-limpiar" onClick={limpiar}>
          Limpiar filtros ✕
        </button>
      )}
    </div>
  );
}
