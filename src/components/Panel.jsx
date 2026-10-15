import { useEffect, useRef, useState } from "react";
import { FASES, PASOS } from "../flow.js";
import { fecha, hora, money, repartirMonto } from "../format.js";
import { paso, prioDe, PRIO, RES, dias, detenido, diasTxt, avanzar, deshacer } from "../reglas.js";
import { puedeConPaso, etiquetaPermiso, PASO_ASIGNA_REPORTE, REPORTE_ASIGNABLES } from "../permisos.js";
import { SERVICIOS, AREAS, servicioDe, nombreArea, PERSONAL_SERVICIO } from "../servicios.js";
import { sesion } from "../auth.js";
import { subirImagen } from "../db.js";
import { mesesDesdeHoy, nombreMes } from "../meses.js";

const OPCIONES_MES = mesesDesdeHoy(18); // mes en curso + 17 siguientes

/** Lee un archivo como data URL (base64). */
function leerArchivo(file) {
  return new Promise((ok, mal) => {
    const fr = new FileReader();
    fr.onload = () => ok(fr.result);
    fr.onerror = () => mal(new Error("No se pudo leer el archivo."));
    fr.readAsDataURL(file);
  });
}

// Objetivo de peso: comprime lo más posible manteniéndola legible (son capturas).
const LADO_MAX = 1280;          // ancho/alto máximo en px: suficiente para leer un screenshot
const OBJETIVO_BYTES = 160 * 1024; // meta de ~160 KB por imagen

// Peso aproximado (en bytes) de una data URL base64.
const pesaBytes = url => Math.round((url.length - url.indexOf(",") - 1) * 0.75);

/**
 * Comprime la imagen con canvas ANTES de subirla: reduce resolución, prefiere
 * WebP (comprime mucho mejor las capturas con texto) y baja la calidad hasta
 * acercarse a la meta de peso. Si el navegador no puede decodificar el formato
 * (p. ej. HEIC de iPhone en Chrome), sube el original tal cual.
 */
async function procesarImagen(file) {
  const dataUrl = await leerArchivo(file);

  let img;
  try {
    img = await new Promise((ok, mal) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => mal(new Error("sin-canvas"));
      im.src = dataUrl;
    });
  } catch {
    return { base64: dataUrl, tipo: file.type || "image/jpeg" }; // formato no decodificable
  }

  // ¿El navegador sabe exportar WebP? Si no, cae a JPEG.
  const prueba = document.createElement("canvas");
  prueba.width = prueba.height = 1;
  const formato = prueba.toDataURL("image/webp").startsWith("data:image/webp")
    ? "image/webp"
    : "image/jpeg";

  const render = (lado, q) => {
    let w = img.width, h = img.height;
    if (w > lado || h > lado) {
      const r = Math.min(lado / w, lado / h);
      w = Math.round(w * r);
      h = Math.round(h * r);
    }
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";            // fondo blanco por si la captura es PNG con transparencia
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return c.toDataURL(formato, q);
  };

  // Baja primero la calidad; si aún no alcanza la meta, baja también el tamaño.
  let salida = null;
  for (const lado of [LADO_MAX, 1024, 800]) {
    for (const q of [0.6, 0.5, 0.4, 0.3]) {
      salida = render(lado, q);
      if (pesaBytes(salida) <= OBJETIVO_BYTES) break;
    }
    if (salida && pesaBytes(salida) <= OBJETIVO_BYTES) break;
  }

  // Nunca subas algo más pesado que el original.
  if (!salida || salida.length >= dataUrl.length) {
    return { base64: dataUrl, tipo: file.type || "image/jpeg" };
  }
  return { base64: salida, tipo: formato };
}

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
  const [img, setImg] = useState(null);        // { url, path } de la evidencia subida
  const [subiendo, setSubiendo] = useState(false);
  const [errImg, setErrImg] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [respRep, setRespRep] = useState(p.responsableReporte || "");
  const pa = paso(p);
  const fi = FASES.indexOf(pa.fase);
  const cerrado = p.estado === "cerrado";
  const hasta = cerrado && p.resultado === "cerrado" ? FASES.length : fi;
  const historial = p.historial || [];

  const mover = (fn, accion) => { setNota(""); setBorrar(false); setImg(null); setErrImg(""); setSubiendo(false); setEnviado(false); onGuardar(fn(p), accion); };

  const onImagen = async e => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    const esImagen = /^image\//.test(file.type) || /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|avif|svg)$/i.test(file.name);
    if (!esImagen) { setErrImg("Elige un archivo de imagen."); return; }
    setErrImg("");
    setSubiendo(true);
    try {
      const { base64, tipo } = await procesarImagen(file);
      const r = await subirImagen({ proyectoId: p.id, tipo, base64 });
      setImg({ url: r.url, path: r.path });
    } catch (err) {
      setErrImg(err?.message || "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  };
  const yo = sesion() || {};
  const puedo = puedeConPaso(yo.usuario, yo.rol, pa.n, p);
  // Solo el admin y quien creó el proyecto pueden editar sus datos o eliminarlo.
  const usuarioLower = String(yo.usuario || "").toLowerCase();
  // Leonardo tiene poder total (como admin).
  const esPoderTotal = yo.rol === "admin" || usuarioLower === "leonardo";
  const puedoEditar = esPoderTotal || (p.creadoPor && p.creadoPor.toLowerCase() === usuarioLower);
  const puedoEliminar = puedoEditar;
  // Yuli, Leonardo y el admin pueden marcar "pagado por adelantado".
  const puedeMarcarPagado = esPoderTotal || usuarioLower === "yuli";
  const esPaso10 = !cerrado && pa.n === 10;
  // ¿Hubo requisición? (última decisión del paso 8). Si fue "No", el paso 10 no pide adjunto.
  const reqRequisicion = (() => {
    const h = p.historial || [];
    for (let i = h.length - 1; i >= 0; i--) if (h[i].p === 8) return h[i].d !== "no";
    return true; // por defecto (ruta con requisición)
  })();
  const esPaso10Adjunto = esPaso10 && reqRequisicion; // solo con requisición pide imagen + check
  const paso10Valido = !!img && enviado && !subiendo;
  const notaPaso10 = "Se envió por correo la evidencia de alcances a comercial.";
  const esPasoAsigna = !cerrado && pa.n === PASO_ASIGNA_REPORTE;
  const asignaValido = !!respRep;
  const esPaso23 = !cerrado && pa.n === 23;
  const paso23Valido = !!p.fechaServicio && !!p.responsableServicio;
  // OT (orden de trabajo): formato AA-### según el año en curso (2026 = 26-###).
  const anioYY = String(new Date().getFullYear()).slice(2);
  const otRegex = new RegExp(`^${anioYY}-\\d{1,4}$`);
  const esPaso19 = !cerrado && pa.n === 19;
  const otValida = otRegex.test((p.ot || "").trim());
  // Solo Leonardo y el admin pueden poner/cambiar las fechas y datos del servicio.
  const puedeProgramar = esPoderTotal;
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
            Paso {pa.n} de 42 · lleva {diasTxt(dias(p))}{detenido(p) ? " · detenido" : ""}
          </span>
          <div className="pb-t">{pa.txt}</div>
        </div>
        {(pa.n === 33 || pa.n === 35) && p.responsableReporte && (
          <p className="sig">Responsable de reporte: <b>{p.responsableReporte}</b>.</p>
        )}
        {esPaso10Adjunto ? (
          <div className="campos">
            <div className="campo full">
              <label htmlFor="d-img">Imagen del correo con los alcances</label>
              <input id="d-img" type="file" accept="image/*" disabled={!puedo || subiendo} onChange={onImagen} />
              {subiendo && <p className="sig">Subiendo imagen…</p>}
              {errImg && <p className="sig" style={{ color: "var(--crit)" }}>{errImg}</p>}
              {img && (
                <a className="evid" href={img.url} target="_blank" rel="noreferrer">
                  <img src={img.url} alt="Evidencia del correo" />
                </a>
              )}
            </div>
            <label className="chk full">
              <input type="checkbox" checked={enviado} onChange={e => setEnviado(e.target.checked)} />
              <span>Confirmo que se enviaron por correo los alcances a comercial.</span>
            </label>
          </div>
        ) : esPaso19 ? (
          <div className="campos">
            <div className="campo full">
              <label htmlFor="d-ot-paso">Número de OT (orden de trabajo)</label>
              <input
                id="d-ot-paso"
                type="text"
                maxLength={10}
                placeholder={`${anioYY}-xxx`}
                value={p.ot || ""}
                disabled={!puedo}
                onChange={e => onGuardar({ ...p, ot: e.target.value.trim() })}
              />
            </div>
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
            {esPaso10Adjunto && !paso10Valido && (
              <p className="sig" style={{ color: "var(--warn)" }}>
                Sube la imagen del correo y confirma el envío para poder avanzar.
              </p>
            )}
            {esPasoAsigna && !asignaValido && (
              <p className="sig" style={{ color: "var(--warn)" }}>
                Elige al responsable de hacer el reporte para poder avanzar.
              </p>
            )}
            {esPaso23 && !paso23Valido && (
              <p className="sig" style={{ color: "var(--warn)" }}>
                Programa la fecha del servicio y el responsable (abajo, en «Programación del servicio») para poder avanzar.
              </p>
            )}
            {esPaso19 && !otValida && (
              <p className="sig" style={{ color: "var(--warn)" }}>
                Escribe la OT con el formato {anioYY}-xxx (p. ej. {anioYY}-001) para poder crear la OT y avanzar.
              </p>
            )}
            <div className="fila">
              <button
                type="button"
                id="d-completar"
                className="btn primary"
                disabled={!puedo || (esPaso10Adjunto && !paso10Valido) || (esPasoAsigna && !asignaValido) || (esPaso23 && !paso23Valido) || (esPaso19 && !otValida)}
                onClick={() =>
                  esPaso10Adjunto
                    ? mover(q => avanzar(q, null, notaPaso10, { img: img.url }), "avanzar")
                    : esPasoAsigna
                      ? mover(q => avanzar({ ...q, responsableReporte: respRep }, null, `Responsable de reporte asignado: ${respRep}.`), "avanzar")
                      : esPaso23
                        ? mover(q => avanzar(q, null, `Servicio programado para ${p.fechaServicio} · responsable ${p.responsableServicio}.`), "avanzar")
                        : esPaso19
                          ? mover(q => avanzar(q, null, `OT creada: ${p.ot}.`), "avanzar")
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
          <p className="eyebrow">{p.archivado ? "Archivado · " : ""}{p.ejemplo ? "Ejemplo · " : ""}{p.cliente}{p.ot ? " · " + p.ot : ""}</p>
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
            <Campo id="d-ot" etiqueta={`OT (${anioYY}-xxx)`} valor={p.ot || ""} disabled={!puedoEditar} onGuardar={cambiar("ot", v => v.trim())} />
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
            {puedeMarcarPagado && (
              <label className="chk full">
                <input
                  type="checkbox"
                  checked={!!p.pagado}
                  onChange={e => onGuardar({ ...p, pagado: e.target.checked })}
                />
                <span>Pagado por adelantado (el cliente ya pagó el monto completo; cuenta como cobrado).</span>
              </label>
            )}
            {!p.diferido && (
              <div className="campo full">
                <label htmlFor="d-mes">Tentativo de facturar/cobrar en el mes</label>
                <select
                  id="d-mes"
                  value={p.cobroMes || ""}
                  disabled={!puedoEditar}
                  onChange={e => onGuardar({ ...p, cobroMes: +e.target.value || null })}
                >
                  <option value="">Sin proyectar</option>
                  {(p.cobroMes && !OPCIONES_MES.includes(p.cobroMes) ? [p.cobroMes, ...OPCIONES_MES] : OPCIONES_MES)
                    .map(ym => <option key={ym} value={ym}>{nombreMes(ym)}</option>)}
                </select>
              </div>
            )}
            <label className="chk full">
              <input
                type="checkbox"
                checked={!!p.diferido}
                disabled={!puedoEditar}
                onChange={e => {
                  const on = e.target.checked;
                  if (on) {
                    const n = Math.max(2, p.pagosNum || (p.pagosMeses || []).length || 2);
                    const meses = [...(p.pagosMeses || [])].slice(0, n);
                    while (meses.length < n) meses.push(null);
                    onGuardar({ ...p, diferido: true, pagosNum: n, pagosMeses: meses, cobroMes: null });
                  } else {
                    onGuardar({ ...p, diferido: false });
                  }
                }}
              />
              <span>Pagos diferidos (dividir el cobro en varios pagos, cada uno en un mes distinto).</span>
            </label>
            {p.diferido && (() => {
              const n = Math.max(1, p.pagosNum || (p.pagosMeses || []).length || 1);
              const partes = repartirMonto(+p.monto || 0, n);
              const setNum = v => {
                const k = Math.max(1, Math.min(24, Math.floor(+v || 0)));
                const meses = [...(p.pagosMeses || [])].slice(0, k);
                while (meses.length < k) meses.push(null);
                onGuardar({ ...p, pagosNum: k, pagosMeses: meses });
                return k;
              };
              const setMes = (i, ym) => {
                const meses = [...(p.pagosMeses || [])];
                while (meses.length < n) meses.push(null);
                meses[i] = +ym || null;
                onGuardar({ ...p, pagosMeses: meses });
              };
              return (
                <div className="campo full">
                  <Campo
                    id="d-pagos-num"
                    etiqueta="Número de pagos (en cuántos se divide el monto)"
                    tipo="number"
                    min="1"
                    max="24"
                    step="1"
                    inputMode="numeric"
                    disabled={!puedoEditar}
                    valor={n}
                    onGuardar={setNum}
                  />
                  <p className="sig">
                    {money(+p.monto || 0)} ÷ {n} = {money(partes[0])} por pago
                    {partes[n - 1] !== partes[0] ? ` (el último: ${money(partes[n - 1])})` : ""}.
                  </p>
                  {Array.from({ length: n }).map((_, i) => {
                    const val = (p.pagosMeses || [])[i] || "";
                    const opciones = val && !OPCIONES_MES.includes(+val) ? [+val, ...OPCIONES_MES] : OPCIONES_MES;
                    return (
                      <div className="campo" key={i} style={{ marginTop: 6 }}>
                        <label htmlFor={`d-pago-${i}`}>Pago {i + 1} · {money(partes[i])} · mes</label>
                        <select
                          id={`d-pago-${i}`}
                          value={val}
                          disabled={!puedoEditar}
                          onChange={e => setMes(i, e.target.value)}
                        >
                          <option value="">Sin proyectar</option>
                          {opciones.map(ym => <option key={ym} value={ym}>{nombreMes(ym)}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          {p.pagado ? (
            <p className="sig">Pagado por adelantado: {money(+p.monto || 0)} ya cuenta como cobrado · saldo por cobrar <b>{money(0)}</b>.</p>
          ) : (+p.anticipo > 0) && (
            <p className="sig">
              Anticipo {money(+p.anticipo || 0)} · saldo por cobrar <b>{money(Math.max(0, (+p.monto || 0) - (+p.anticipo || 0)))}</b>.
            </p>
          )}
        </div>

        <div className="d-sec">
          <h3>Programación del servicio</h3>
          <p className="sig">Se configura al llegar al paso 23 («Se realiza programación»). Define la fecha y quién va.</p>
          <div className="campos">
            <div className="campo">
              <label htmlFor="d-fecha-serv">Fecha del servicio (inicio)</label>
              <input
                id="d-fecha-serv"
                type="date"
                value={p.fechaServicio || ""}
                disabled={!puedeProgramar}
                onChange={e => {
                  const ini = e.target.value;
                  // Si el fin queda antes del inicio, lo igualamos.
                  const fin = p.fechaServicioFin && p.fechaServicioFin < ini ? ini : p.fechaServicioFin;
                  onGuardar({ ...p, fechaServicio: ini, fechaServicioFin: fin });
                }}
              />
              {p.fechaServicio && puedeProgramar && (
                <button type="button" className="btn ghost danger-t" style={{ marginTop: 4, alignSelf: "flex-start" }}
                  onClick={() => onGuardar({ ...p, fechaServicio: "", fechaServicioFin: "" })}>
                  Quitar fecha
                </button>
              )}
            </div>
            <div className="campo">
              <label htmlFor="d-fecha-serv-fin">Hasta (si dura varios días)</label>
              <input
                id="d-fecha-serv-fin"
                type="date"
                value={p.fechaServicioFin || ""}
                min={p.fechaServicio || undefined}
                disabled={!puedeProgramar || !p.fechaServicio}
                onChange={e => onGuardar({ ...p, fechaServicioFin: e.target.value })}
              />
              {p.fechaServicioFin && puedeProgramar && (
                <button type="button" className="btn ghost danger-t" style={{ marginTop: 4, alignSelf: "flex-start" }}
                  onClick={() => onGuardar({ ...p, fechaServicioFin: "" })}>
                  Quitar fin
                </button>
              )}
            </div>
            <div className="campo full">
              <label htmlFor="d-resp-serv">Responsable del servicio</label>
              <select
                id="d-resp-serv"
                value={p.responsableServicio || ""}
                disabled={!puedeProgramar}
                onChange={e => {
                  const r = e.target.value;
                  // El responsable no debe estar también como apoyo.
                  const apoyo = (p.apoyo || []).filter(n => n !== r);
                  onGuardar({ ...p, responsableServicio: r, apoyo });
                }}
              >
                <option value="">Selecciona responsable del servicio…</option>
                {PERSONAL_SERVICIO.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="campo full">
              <label>Personal de apoyo</label>
              <div className="apoyo-lista">
                {PERSONAL_SERVICIO.map(n => {
                  const esResp = p.responsableServicio === n;
                  const sel = (p.apoyo || []).includes(n);
                  return (
                    <label key={n} className={"chk" + (esResp ? " apoyo-dim" : "")}>
                      <input
                        type="checkbox"
                        checked={sel}
                        disabled={esResp || !puedeProgramar}
                        onChange={e => {
                          const base = new Set(p.apoyo || []);
                          if (e.target.checked) base.add(n); else base.delete(n);
                          onGuardar({ ...p, apoyo: [...base] });
                        }}
                      />
                      <span>{n}{esResp ? " (responsable)" : ""}</span>
                    </label>
                  );
                })}
              </div>
              {(p.responsableServicio || (p.apoyo || []).length > 0) && (
                <p className="sig">
                  {1 * (p.responsableServicio ? 1 : 0) + (p.apoyo || []).filter(n => n !== p.responsableServicio).length} personas en el servicio.
                </p>
              )}
            </div>
          </div>
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
                  {e.img && (
                    <a className="evid" href={e.img} target="_blank" rel="noreferrer">
                      <img src={e.img} alt="Evidencia del correo" />
                    </a>
                  )}
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
            {p.archivado ? (
              <button type="button" className="btn" onClick={() => onGuardar({ ...p, archivado: false })}>Reactivar proyecto</button>
            ) : (
              <button type="button" className="btn ghost" onClick={() => onGuardar({ ...p, archivado: true })}>Archivar proyecto</button>
            )}
            <button type="button" className="btn ghost danger-t" onClick={() => setBorrar(true)}>Eliminar proyecto</button>
          </div>
        ))}
      </div>
    </Lateral>
  );
}
