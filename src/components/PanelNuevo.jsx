import { useState } from "react";
import { Lateral } from "./Panel.jsx";
import { SERVICIOS, AREAS, servicioDe } from "../servicios.js";
import { money, repartirMonto } from "../format.js";
import { sesion } from "../auth.js";
import { mesesDesdeHoy, nombreMes } from "../meses.js";

const OPCIONES_MES = mesesDesdeHoy(18); // mes en curso + 17 siguientes

export default function PanelNuevo({ clientes, responsables, onCrear, onCerrar }) {
  const [f, setF] = useState({ nombre: "", cliente: "", tipo: "", responsable: "", prioridad: "media", monto: "", anticipo: "", pagado: false, cobroMes: "", diferido: false, pagosNum: 2, pagosMeses: [] });
  const [error, setError] = useState("");
  const set = k => e => setF(prev => ({ ...prev, [k]: e.target.value }));
  const srv = servicioDe(f.tipo);
  const yo = sesion() || {};
  // Solo Yuli (y el admin) pueden marcar "pagado por adelantado".
  const puedeMarcarPagado = yo.rol === "admin" || String(yo.usuario || "").toLowerCase() === "yuli";

  function enviar(e) {
    e.preventDefault();
    if (!f.nombre.trim()) { setError("Escribe el nombre del proyecto."); return; }
    if (!f.cliente.trim()) { setError("Escribe el nombre del cliente."); return; }
    if (!f.tipo) { setError("Elige el tipo de servicio del proyecto."); return; }
    const ahora = new Date().toISOString();
    onCrear({
      id: crypto.randomUUID(),
      nombre: f.nombre.trim(),
      cliente: f.cliente.trim(),
      tipo: f.tipo,
      area: srv ? srv.area : "",
      responsable: f.responsable.trim(),
      prioridad: f.prioridad,
      monto: Math.max(0, +f.monto || 0),
      anticipo: Math.max(0, +f.anticipo || 0),
      pagado: !!f.pagado,
      cobroMes: f.diferido ? null : (+f.cobroMes || null),
      diferido: !!f.diferido,
      pagosNum: f.diferido ? Math.max(1, +f.pagosNum || 0) : 0,
      pagosMeses: f.diferido
        ? Array.from({ length: Math.max(1, +f.pagosNum || 0) }).map((_, i) => +(f.pagosMeses || [])[i] || null)
        : [],
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
          <div className="campo full">
            <label htmlFor="n-tipo">Tipo de servicio</label>
            <select id="n-tipo" value={f.tipo} onChange={set("tipo")}>
              <option value="">Elige un servicio…</option>
              {Object.keys(AREAS).map(a => (
                <optgroup key={a} label={AREAS[a].nombre}>
                  {SERVICIOS.filter(s => s.area === a).map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {srv && <p className="sig">Área: {AREAS[srv.area].nombre} · lo trabaja {AREAS[srv.area].usuarios.join(", ")}.</p>}
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
          <div className="campo">
            <label htmlFor="n-anticipo">Anticipo (MXN)</label>
            <input id="n-anticipo" type="number" min="0" step="1000" inputMode="numeric" placeholder="0" value={f.anticipo} onChange={set("anticipo")} />
            {(+f.anticipo > 0) && (
              <p className="sig">Saldo por cobrar: {money(Math.max(0, (+f.monto || 0) - (+f.anticipo || 0)))}</p>
            )}
          </div>
          {!f.diferido && (
            <div className="campo full">
              <label htmlFor="n-mes">Tentativo de facturar/cobrar en el mes</label>
              <select id="n-mes" value={f.cobroMes} onChange={set("cobroMes")}>
                <option value="">Sin proyectar</option>
                {OPCIONES_MES.map(ym => <option key={ym} value={ym}>{nombreMes(ym)}</option>)}
              </select>
            </div>
          )}
          <label className="chk full">
            <input
              type="checkbox"
              checked={f.diferido}
              onChange={e => setF(prev => ({ ...prev, diferido: e.target.checked, cobroMes: e.target.checked ? "" : prev.cobroMes }))}
            />
            <span>Pagos diferidos (dividir el cobro en varios pagos, cada uno en un mes distinto).</span>
          </label>
          {f.diferido && (() => {
            const n = Math.max(1, Math.min(24, Math.floor(+f.pagosNum || 1)));
            const partes = repartirMonto(+f.monto || 0, n);
            const setMes = (i, ym) => setF(prev => {
              const meses = [...(prev.pagosMeses || [])];
              while (meses.length < n) meses.push(null);
              meses[i] = +ym || null;
              return { ...prev, pagosMeses: meses };
            });
            return (
              <div className="campo full">
                <label htmlFor="n-pagos-num">Número de pagos (en cuántos se divide el monto)</label>
                <input
                  id="n-pagos-num"
                  type="number"
                  min="1"
                  max="24"
                  step="1"
                  inputMode="numeric"
                  value={f.pagosNum}
                  onChange={e => setF(prev => ({ ...prev, pagosNum: e.target.value }))}
                />
                <p className="sig">
                  {money(+f.monto || 0)} ÷ {n} = {money(partes[0])} por pago
                  {partes[n - 1] !== partes[0] ? ` (el último: ${money(partes[n - 1])})` : ""}.
                </p>
                {Array.from({ length: n }).map((_, i) => (
                  <div className="campo" key={i} style={{ marginTop: 6 }}>
                    <label htmlFor={`n-pago-${i}`}>Pago {i + 1} · {money(partes[i])} · mes</label>
                    <select id={`n-pago-${i}`} value={(f.pagosMeses || [])[i] || ""} onChange={e => setMes(i, e.target.value)}>
                      <option value="">Sin proyectar</option>
                      {OPCIONES_MES.map(ym => <option key={ym} value={ym}>{nombreMes(ym)}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            );
          })()}
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
