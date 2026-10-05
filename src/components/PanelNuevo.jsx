import { useState } from "react";
import { Lateral } from "./Panel.jsx";

export default function PanelNuevo({ clientes, responsables, onCrear, onCerrar }) {
  const [f, setF] = useState({ nombre: "", cliente: "", responsable: "", prioridad: "media", monto: "" });
  const [error, setError] = useState("");
  const set = k => e => setF(prev => ({ ...prev, [k]: e.target.value }));

  function enviar(e) {
    e.preventDefault();
    if (!f.nombre.trim()) { setError("Escribe el nombre del proyecto."); return; }
    if (!f.cliente.trim()) { setError("Escribe el nombre del cliente."); return; }
    const ahora = new Date().toISOString();
    onCrear({
      id: crypto.randomUUID(),
      nombre: f.nombre.trim(),
      cliente: f.cliente.trim(),
      responsable: f.responsable.trim(),
      prioridad: f.prioridad,
      monto: Math.max(0, +f.monto || 0),
      estado: "activo",
      paso: 1,
      creado: ahora,
      pasoDesde: ahora,
      historial: []
    });
  }

  return (
    <Lateral onCerrar={onCerrar}>
      <div className="d-head">
        <div>
          <p className="eyebrow">Paso 1 · Solicitud del cliente</p>
          <h2 id="d-titulo">Nuevo proyecto</h2>
        </div>
        <button type="button" className="btn icon" aria-label="Cerrar" onClick={onCerrar}>✕</button>
      </div>
      <form className="d-body" onSubmit={enviar} noValidate>
        <div className="campos">
          <div className="campo full">
            <label htmlFor="n-nombre">Proyecto</label>
            <input id="n-nombre" data-foco type="text" placeholder="Ej. Reparación de nave B" autoComplete="off" value={f.nombre} onChange={set("nombre")} />
          </div>
          <div className="campo">
            <label htmlFor="n-cliente">Cliente</label>
            <input id="n-cliente" type="text" list="dl-cli" autoComplete="off" value={f.cliente} onChange={set("cliente")} />
          </div>
          <div className="campo">
            <label htmlFor="n-resp">Responsable</label>
            <input id="n-resp" type="text" list="dl-resp" autoComplete="off" value={f.responsable} onChange={set("responsable")} />
          </div>
          <div className="campo">
            <label htmlFor="n-prio">Prioridad</label>
            <select id="n-prio" value={f.prioridad} onChange={set("prioridad")}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="n-monto">Monto estimado (MXN)</label>
            <input id="n-monto" type="number" min="0" step="1000" inputMode="numeric" placeholder="0" value={f.monto} onChange={set("monto")} />
          </div>
        </div>
        <datalist id="dl-cli">{clientes.map(c => <option key={c} value={c} />)}</datalist>
        <datalist id="dl-resp">{responsables.map(r => <option key={r} value={r} />)}</datalist>
        <p className="error" role="alert">{error}</p>
        <div className="fila">
          <button type="submit" className="btn primary">Crear proyecto</button>
          <button type="button" className="btn" onClick={onCerrar}>Cancelar</button>
        </div>
      </form>
    </Lateral>
  );
}
