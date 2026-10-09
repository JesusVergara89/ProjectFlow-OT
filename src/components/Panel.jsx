import { useEffect, useRef, useState } from "react";
import { FASES, PASOS } from "../flow.js";
import { fecha, hora, money } from "../format.js";
import { paso, prioDe, PRIO, RES, dias, detenido, diasTxt, avanzar, deshacer } from "../reglas.js";
import { puedeConPaso, etiquetaPermiso, PASO_ASIGNA_REPORTE, REPORTE_ASIGNABLES } from "../permisos.js";
import { SERVICIOS, AREAS, servicioDe, nombreArea } from "../servicios.js";
import { sesion } from "../auth.js";

/** Campo de texto que guarda al salir del campo (no en cada tecla). */
function Campo({ id, etiqueta, valor, onGuardar, tipo = "text", completo, ...resto }) {
  const [v, setV] = useState(valor);
  useEffect(() => setV(valor), [valor]);
  return (
    <div className={"campo" + (completo ? " full" : "")}>
      <label htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        type={tipo}
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => {
          const normalizado = onGuardar(v);
          if (normalizado !== undefined) setV(normalizado);
        }}
        {...resto}
      />
    </div>
  );
}

/** Contenedor lateral con foco al abrir, foco de regreso al cerrar y cierre con la tecla Esc. */
export function Lateral({ onCerrar, children }) {
  const ref = useRef(null);
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;
  useEffect(() => {
    const opener = document.activeElement;
    const foco = ref.current?.querySelector("[data-foco]");
    if (foco) foco.focus();
    const alTeclear = e => { if (e.key === "Escape") cerrarRef.current(); };
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);
  return (
    <>
      <div className="scrim" onClick={onCerrar} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="d-titulo" ref={ref}>
        {children}
      </aside>
    </>
  );
}

export default function Panel({ p, onGuardar, onEliminar, onCerrar }) {
  const [nota, setNota] = useState("");
  const [borrar, setBorrar] = useState(false);
  const [alc, setAlc] = useState("");
  const [req, setReq] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [respRep, setRespRep] = useState(p.responsableReporte || "");
  const pa = paso(p);
  const fi = FASES.indexOf(pa.fase);
  const cerrado = p.estado === "cerrado";
  const hasta = cerrado && p.resultado === "cerrado" ? FASES.length : fi;
  const historial = p.historial || [];

  const mover = (fn, accion) => { setNota(""); setBorrar(false); setAlc(""); setReq(""); setEnviado(false); onGuardar(fn(p), accion); };
  const yo = sesion() || {};
  const puedo = puedeConPaso(yo.usuario, yo.rol, pa.n, p);
  // Solo el admin y quien creó el proyecto pueden editar sus datos o eliminarlo.
  const puedoEditar =
    yo.rol === "admin" ||
    (p.creadoPor && p.creadoPor.toLowerCase() === String(yo.usuario || "").toLowerCase());
  const puedoEliminar = puedoEditar;
  const esPaso10 = !cerrado && pa.n === 10;
  const paso10Valido = alc.trim() && req.trim() && enviado;
  const notaPaso10 = `Se enviaron por correo los alcances N.° ${alc.trim()} y las requisiciones N.° ${req.trim()}.`;
  const esPasoAsigna = !cerrado && pa.n === PASO_ASIGNA_REPORTE;
  const asignaValido = !!respRep;
  const cambiar = (clave, normalizar) => v => {
    const nv = normalizar(v);
    if (nv !== p[clave]) onGuardar({ ...p, [clave]: nv });
    return typeof nv === "string" ? nv : undefined;
  };

  let caja;
  if (cerrado) {
    caja = (
      <div className="paso-box">
        <span className="pb-n">Proyecto cerrado</span>
        <div className="pb-t">{RES[p.resultado] || "Cerrado"}</div>
        <p className="sig">Cerrado el {fecha(p.cerradoEn)}.</p>
        <div className="fila"><button type="button" className="btn" disabled={!puedo} onClick={() => mover(deshacer, "deshacer")}>Deshacer cierre</button></div>
      </div>
    );
  } else {
    caja = (
      <div className="paso-box">
        <div>
          <span className="pb-n">
            Paso {pa.n} de 41 · lleva {diasTxt(dias(p))}{detenido(p) ? " · detenido" : ""}
          </span>
          <div className="pb-t">{pa.txt}</div>
        </div>
        {(pa.n === 32 || pa.n === 34) && p.responsableReporte && (
          <p className="sig">Responsable de reporte: <b>{p.responsableReporte}</b>.</p>
        )}
        {esPaso10 ? (
          <div className="campos">
            <div className="campo full">
              <label htmlFor="d-alc">Número(s) de alcances</label>
              <input id="d-alc" type="text" maxLength={120} placeholder="Ej. 1024, 1025" value={alc} onChange={e => setAlc(e.target.value)} />
            </div>
            <div className="campo full">
              <label htmlFor="d-req">Número(s) de requisiciones</label>
              <input id="d-req" type="text" maxLength={120} placeholder="Ej. R-501, R-502" value={req} onChange={e => setReq(e.target.value)} />
            </div>
            <label className="chk full">
              <input type="checkbox" checked={enviado} onChange={e => setEnviado(e.target.checked)} />
              <span>Confirmo que se enviaron por correo los alcances y requisiciones a comercial.</span>
            </label>
          </div>
        ) : esPasoAsigna ? (
          <div className="campos">
            <div className="campo full">
              <label htmlFor="d-resprep">Responsable de hacer el reporte</label>
              <select id="d-resprep" value={respRep} disabled={!puedo} onChange={e => setRespRep(e.target.value)}>
                <option value="">Elige a la persona…</option>
                {REPORTE_ASIGNABLES.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="campo">
            <label htmlFor="d-nota">Nota para el historial (opcional)</label>
            <input id="d-nota" type="text" maxLength={160} value={nota} onChange={e => setNota(e.target.value)} />
          </div>
        )}
        {!puedo && (
          <p className="sig" style={{ color: "var(--crit)" }}>
            Solo pueden completar este paso: {etiquetaPermiso(pa.n, p)}.
          </p>
        )}
        {pa.tipo === "decision" ? (
          <div className="opciones">
            {["si", "no"].map(v => {
              const a = v === "si" ? pa.si : pa.no;
              const atras = a < pa.n;
              return (
                <button
                  key={v}
                  type="button"
                  id={"d-" + v}
                  className={"dbtn" + (atras ? " back" : "")}
                  disabled={!puedo}
                  onClick={() => mover(q => avanzar(q, v, nota.trim()), "avanzar")}
                >
                  <b>{v === "si" ? "Sí" : "No"}</b>
                  <span>{atras ? "↩ Regresa al paso " : "→ Paso "}{a}: {PASOS[a].txt}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <p className="sig">
              {pa.fin
                ? `Al completarlo, el proyecto se cierra como «${RES[pa.fin]}».`
                : `Siguiente: paso ${pa.next} · ${PASOS[pa.next].txt}`}
            </p>
            {esPaso10 && !paso10Valido && (
              <p className="sig" style={{ color: "var(--warn)" }}>
                Captura los números de alcances y requisiciones y confirma el envío por correo para poder avanzar.
              </p>
            )}
            {esPasoAsigna && !asignaValido && (
              <p className="sig" style={{ color: "var(--warn)" }}>
                Elige al responsable de hacer el reporte para poder avanzar.
              </p>
            )}
            <div className="fila">
              <button
                type="button"
                id="d-completar"
                className="btn primary"
                disabled={!puedo || (esPaso10 && !paso10Valido) || (esPasoAsigna && !asignaValido)}
                onClick={() =>
                  esPaso10
                    ? mover(q => avanzar(q, null, notaPaso10), "avanzar")
                    : esPasoAsigna
                      ? mover(q => avanzar({ ...q, responsableReporte: respRep }, null, `Responsable de reporte asignado: ${respRep}.`), "avanzar")
                      : mover(q => avanzar(q, null, nota.trim()), "avanzar")
                }
              >
                {pa.fin ? "Completar y cerrar" : "Completar paso"}
              </button>
            </div>
          </>
        )}
        {historial.length > 0 && (
          <div className="fila"><button type="button" className="btn ghost" disabled={!puedo} onClick={() => mover(deshacer, "deshacer")}>Deshacer último avance</button></div>
        )}
      </div>
    );
  }

  return (
    <Lateral onCerrar={onCerrar}>
      <div className="d-head">
        <div>
          <p className="eyebrow">{p.ejemplo ? "Ejemplo · " : ""}{p.cliente}</p>
          <h2 id="d-titulo">{p.nombre}</h2>
        </div>
        <button type="button" className="btn icon" data-foco aria-label="Cerrar detalle" onClick={onCerrar}>✕</button>
      </div>
      <div className="d-body">
        <div>
          <ol className="trk" aria-hidden="true">
            {FASES.map((f, i) => (
              <li key={f.id} title={f.nombre} className={i < hasta ? "hecho" : i === fi && !cerrado ? "actual" : ""} />
            ))}
          </ol>
          <p className="trk-t">Fase {fi + 1} de 7 · {pa.fase.nombre}</p>
        </div>

        {caja}

        <div className="d-sec">
          <h3>Datos del proyecto</h3>
          {!puedoEditar && (
            <p className="sig" style={{ color: "var(--warn)" }}>
              Solo {p.creadoPor || "quien lo creó"} y el administrador pueden editar estos datos.
            </p>
          )}
          <div className="campos">
            <Campo id="d-nombre" etiqueta="Proyecto" valor={p.nombre} completo disabled={!puedoEditar} onGuardar={cambiar("nombre", v => v.trim() || p.nombre)} />
            <Campo id="d-cliente" etiqueta="Cliente" valor={p.cliente} disabled={!puedoEditar} onGuardar={cambiar("cliente", v => v.trim() || p.cliente)} />
            <div className="campo full">
              <label htmlFor="d-tipo">Tipo de servicio</label>
              <select
                id="d-tipo"
                value={p.tipo || ""}
                disabled={!puedoEditar}
                onChange={e => {
                  const s = servicioDe(e.target.value);
                  onGuardar({ ...p, tipo: e.target.value, area: s ? s.area : "" });
                }}
              >
                <option value="">Sin asignar</option>
                {Object.keys(AREAS).map(a => (
                  <optgroup key={a} label={AREAS[a].nombre}>
                    {SERVICIOS.filter(s => s.area === a).map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {p.area && <p className="sig">Área: {nombreArea(p.area)} · lo trabaja {AREAS[p.area].usuarios.join(", ")}.</p>}
            </div>
            <Campo id="d-resp" etiqueta="Responsable" valor={p.responsable || ""} disabled={!puedoEditar} onGuardar={cambiar("responsable", v => v.trim())} />
            <div className="campo">
              <label htmlFor="d-prio">Prioridad</label>
              <select id="d-prio" value={prioDe(p)} disabled={!puedoEditar} onChange={e => onGuardar({ ...p, prioridad: e.target.value })}>
                {Object.keys(PRIO).map(k => <option key={k} value={k}>{PRIO[k]}</option>)}
              </select>
            </div>
            <Campo
              id="d-monto"
              etiqueta="Monto estimado (MXN)"
              tipo="number"
              min="0"
              step="1000"
              inputMode="numeric"
              disabled={!puedoEditar}
              valor={+p.monto || 0}
              onGuardar={v => { const n = Math.max(0, +v || 0); if (n !== p.monto) onGuardar({ ...p, monto: n }); return n; }}
            />
            <Campo
              id="d-anticipo"
              etiqueta="Anticipo (MXN)"
              tipo="number"
              min="0"
              step="1000"
              inputMode="numeric"
              disabled={!puedoEditar}
              valor={+p.anticipo || 0}
              onGuardar={v => { const n = Math.max(0, +v || 0); if (n !== p.anticipo) onGuardar({ ...p, anticipo: n }); return n; }}
            />
          </div>
          {(+p.anticipo > 0) && (
            <p className="sig">
              Anticipo {money(+p.anticipo || 0)} · saldo por cobrar <b>{money(Math.max(0, (+p.monto || 0) - (+p.anticipo || 0)))}</b>.
            </p>
          )}
        </div>

        <div className="d-sec">
          <h3>Historial</h3>
          <ol className="hist">
            {[...historial].reverse().map((e, i) => (
              <li key={i}>
                <span className="h-f">{fecha(e.f)}<br />{hora(e.f)}</span>
                <div>
                  <span className="h-t">
                    <b>{e.p}</b> {PASOS[e.p]?.txt}
                    {e.d && <> <span className={"v v-" + e.d}>{e.d === "si" ? "Sí" : "No"}</span></>}
                  </span>
                  {(e.nombre || e.u) && <p className="h-n">por {e.nombre || e.u}</p>}
                  {e.n && <p className="h-n">{e.n}</p>}
                </div>
              </li>
            ))}
            <li>
              <span className="h-f">{fecha(p.creado)}<br />{hora(p.creado)}</span>
              <div><span className="h-t">Proyecto registrado</span></div>
            </li>
          </ol>
        </div>

        {puedoEliminar && (borrar ? (
          <div className="borrar">
            <p>¿Eliminar «{p.nombre}»? No se puede deshacer.</p>
            <div className="fila">
              <button type="button" className="btn danger" onClick={() => onEliminar(p.id)}>Sí, eliminar</button>
              <button type="button" className="btn" onClick={() => setBorrar(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="fila">
            <button type="button" className="btn ghost danger-t" onClick={() => setBorrar(true)}>Eliminar proyecto</button>
          </div>
        ))}
      </div>
    </Lateral>
  );
}
