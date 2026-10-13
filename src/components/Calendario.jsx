import { useState } from "react";
import { nombreServicio } from "../servicios.js";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Personas en el servicio: responsable + apoyo (sin duplicar al responsable).
const personasDe = p =>
  (p.responsableServicio ? 1 : 0) +
  (p.apoyo || []).filter(n => n !== p.responsableServicio).length;

export default function Calendario({ items, onAbrir }) {
  const hoy = new Date();
  const [y, setY] = useState(hoy.getFullYear());
  const [m, setM] = useState(hoy.getMonth()); // 0–11

  // Proyectos con fecha de servicio, agrupados por día (clave "AAAA-MM-DD").
  const porDia = {};
  items.filter(p => p.fechaServicio).forEach(p => {
    (porDia[p.fechaServicio] = porDia[p.fechaServicio] || []).push(p);
  });

  const primero = new Date(y, m, 1);
  const offset = (primero.getDay() + 6) % 7;        // lunes primero
  const diasEnMes = new Date(y, m + 1, 0).getDate();
  const clave = d => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const esHoy = d => y === hoy.getFullYear() && m === hoy.getMonth() && d === hoy.getDate();

  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const prev = () => (m === 0 ? (setM(11), setY(y - 1)) : setM(m - 1));
  const next = () => (m === 11 ? (setM(0), setY(y + 1)) : setM(m + 1));
  const irHoy = () => { setY(hoy.getFullYear()); setM(hoy.getMonth()); };

  const totalMes = Object.keys(porDia)
    .filter(k => k.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`))
    .reduce((a, k) => a + porDia[k].length, 0);

  return (
    <div className="cal">
      <div className="cal-barra">
        <div className="fila">
          <button type="button" className="btn" onClick={prev} aria-label="Mes anterior">←</button>
          <h2 className="cal-titulo">{MESES[m]} {y}</h2>
          <button type="button" className="btn" onClick={next} aria-label="Mes siguiente">→</button>
          <button type="button" className="btn ghost" onClick={irHoy}>Hoy</button>
        </div>
        <span className="sig">{totalMes} {totalMes === 1 ? "servicio" : "servicios"} este mes</span>
      </div>

      <div className="cal-grid cal-cab">
        {DIAS.map(d => <div key={d} className="cal-dow">{d}</div>)}
      </div>
      <div className="cal-grid">
        {celdas.map((d, i) => {
          if (!d) return <div key={"x" + i} className="cal-celda vacia" />;
          const lista = porDia[clave(d)] || [];
          return (
            <div key={d} className={"cal-celda" + (esHoy(d) ? " hoy" : "")}>
              <span className="cal-dia">{d}</span>
              <div className="cal-servicios">
                {lista.map(p => {
                  const n = personasDe(p);
                  const titulo = `${p.nombre} — ${p.cliente}\nResponsable: ${p.responsableServicio || "—"}` +
                    ((p.apoyo || []).length ? `\nApoyo: ${(p.apoyo || []).filter(x => x !== p.responsableServicio).join(", ")}` : "");
                  return (
                    <button key={p.id} type="button" className="cal-ev" title={titulo} onClick={() => onAbrir(p.id)}>
                      <b>{p.nombre}</b>
                      <span className="cal-ev-cli">{p.cliente}</span>
                      {nombreServicio(p.tipo) && <span className="cal-ev-srv">{nombreServicio(p.tipo)}</span>}
                      <span className="cal-ev-sub">{p.responsableServicio || "sin responsable"} · {n} {n === 1 ? "persona" : "personas"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
