import { money } from "../format.js";
import { ritmoMeta } from "../metas.js";
import { nombreMes } from "../meses.js";

// Etiqueta compacta de dinero para los ejes ($750k / $1.5M).
const corto = v => (v >= 1e6 ? "$" + (v / 1e6).toFixed(v % 1e6 ? 1 : 0) + "M" : "$" + Math.round(v / 1000) + "k");
const signo = n => (n > 0 ? "+" : "") + money(n);

export default function CurvaMeta({ items, mes, meta }) {
  const r = ritmoMeta(items || [], { mes, meta });
  const { nDias, hoy, esMesActual } = r;

  // Geometría del SVG.
  const W = 960, H = 320, pL = 64, pR = 18, pT = 16, pB = 32;
  const plotW = W - pL - pR, plotH = H - pT - pB;
  const x = d => pL + ((d - 1) / Math.max(1, nDias - 1)) * plotW;
  const y = v => pT + (1 - Math.min(1, v / r.meta)) * plotH;

  const pIdeal = r.diario.map(d => `${x(d.dia).toFixed(1)},${y(d.idealAcum).toFixed(1)}`).join(" ");
  const transc = r.diario.filter(d => d.transcurrido);
  const pReal = transc.map(d => `${x(d.dia).toFixed(1)},${y(d.realAcum).toFixed(1)}`).join(" ");
  const hoyPt = r.diario[hoy - 1];

  // Área de la brecha (lo que falta por cobrar): entre la línea ideal y la real
  // hasta hoy. Se pinta en rojo tenue cuando lo real va por debajo de lo ideal.
  const pBrecha = transc.length
    ? "M " + transc.map(d => `${x(d.dia).toFixed(1)},${y(d.idealAcum).toFixed(1)}`).join(" L ") +
      " L " + [...transc].reverse().map(d => `${x(d.dia).toFixed(1)},${y(d.realAcum).toFixed(1)}`).join(" L ") + " Z"
    : "";
  const atrasado = hoyPt && hoyPt.realAcum < hoyPt.idealAcum;

  const estado = dif => (dif >= 0 ? "ok" : "bajo");

  return (
    <div className="curva-meta">
      <div className="cm-head">
        <h3>Ritmo de cobranza vs. meta <span>· {nombreMes(r.ym)}</span></h3>
        <span className={"cm-badge " + (r.alcanza ? "ok" : "bajo")}>
          {r.alcanza ? "En ritmo para la meta" : "Debajo del ritmo"}
        </span>
      </div>

      {/* Tarjetas resumen del cierre de mes */}
      <div className="cm-cards">
        <div className="cm-card"><span className="cm-l">Meta del mes</span><span className="cm-v">{money(r.meta)}</span></div>
        <div className="cm-card"><span className="cm-l">Real a hoy (día {hoy})</span><span className="cm-v">{money(r.realHoy)}</span><span className="cm-s">{r.pct}% de la meta</span></div>
        <div className="cm-card"><span className="cm-l">Debería llevar hoy</span><span className="cm-v">{money(r.idealHoy)}</span><span className={"cm-s " + estado(r.dif)}>{signo(r.dif)} vs. ideal</span></div>
        <div className="cm-card"><span className="cm-l">Proyección fin de mes</span><span className="cm-v">{money(r.proyeccionFin)}</span><span className={"cm-s " + (r.alcanza ? "ok" : "bajo")}>{r.pctProyeccion}% al ritmo actual</span></div>
        <div className="cm-card"><span className="cm-l">Falta para la meta</span><span className="cm-v">{money(r.falta)}</span><span className="cm-s">{r.diasRestantes} días restantes</span></div>
        <div className="cm-card"><span className="cm-l">Ritmo necesario</span><span className="cm-v">{money(r.ritmoNecesarioDia)}<small>/día</small></span><span className="cm-s">{money(r.ritmoNecesarioSemana)}/día esta semana</span></div>
      </div>

      {/* Curva ideal vs real */}
      <svg className="cm-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Curva de cobranza ideal contra real">
        {/* líneas de meta semanal (750k, 1.5M, 2.25M, 3M) */}
        {[r.metaSemana, r.metaSemana * 2, r.metaSemana * 3, r.meta].map((v, i) => (
          <g key={i}>
            <line x1={pL} y1={y(v)} x2={W - pR} y2={y(v)} className="cm-grid" />
            <text x={pL - 6} y={y(v) + 3} className="cm-ytxt" textAnchor="end">{corto(v)}</text>
          </g>
        ))}
        {/* límites de semana */}
        {[7, 14, 21].map(d => (
          <line key={d} x1={x(d)} y1={pT} x2={x(d)} y2={pT + plotH} className="cm-sem" />
        ))}
        {/* eje x: etiquetas de semana */}
        {[1, 2, 3, 4].map(s => {
          const centro = [4, 11, 18, Math.min(nDias, 25)][s - 1];
          return <text key={s} x={x(centro)} y={H - 10} className="cm-xtxt" textAnchor="middle">Sem {s}</text>;
        })}
        {/* brecha: lo que falta por cobrar (rojo) o adelanto (verde) */}
        {pBrecha && <path d={pBrecha} className={"cm-brecha " + (atrasado ? "bajo" : "ok")} />}
        {/* ideal (punteada) */}
        <polyline points={pIdeal} className="cm-ideal" fill="none" />
        {/* real (sólida) */}
        {pReal && <polyline points={pReal} className="cm-real" fill="none" />}
        {/* punto de hoy */}
        {esMesActual && hoyPt && <circle cx={x(hoy)} cy={y(hoyPt.realAcum)} r="4" className="cm-pt" />}
      </svg>
      <div className="cm-leyenda">
        <span><i className="cm-li ideal" /> Ideal (meta acumulada)</span>
        <span><i className="cm-li real" /> Real (cobrado + anticipos)</span>
      </div>

      {/* Tabla por semana */}
      <h4 className="cm-sub">Por semana (acumulable)</h4>
      <table className="proy-tabla cm-tabla">
        <thead>
          <tr><th>Semana</th><th className="num">Meta acumulada</th><th className="num">Real acumulado</th><th className="num">Diferencia</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {r.semanas.map(s => (
            <tr key={s.semana} className={s.transcurrida ? "" : "cm-futuro"}>
              <td>Semana {s.semana} <small>(días {s.ini}–{s.fin})</small></td>
              <td className="num">{money(s.metaAcum)}</td>
              <td className="num">{s.transcurrida ? money(s.realAcum) : "—"}</td>
              <td className={"num " + estado(s.dif)}>{s.transcurrida ? signo(s.dif) : "—"}</td>
              <td className={estado(s.dif)}>{!s.transcurrida ? "Por venir" : s.dif >= 0 ? "En ritmo" : "Atrasado"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tabla por día (desplegable) */}
      <details className="cm-dias">
        <summary>Ver detalle día por día</summary>
        <table className="proy-tabla cm-tabla">
          <thead>
            <tr><th>Día</th><th className="num">Entró ese día</th><th className="num">Real acumulado</th><th className="num">Ideal acumulado</th><th className="num">Diferencia</th></tr>
          </thead>
          <tbody>
            {r.diario.map(d => (
              <tr key={d.dia} className={(esMesActual && d.dia === hoy ? "cm-hoy " : "") + (d.transcurrido ? "" : "cm-futuro")}>
                <td>{d.dia}{esMesActual && d.dia === hoy ? " · hoy" : ""}</td>
                <td className="num">{d.real ? money(d.real) : "—"}</td>
                <td className="num">{d.transcurrido ? money(d.realAcum) : "—"}</td>
                <td className="num">{money(d.idealAcum)}</td>
                <td className={"num " + estado(d.dif)}>{d.transcurrido ? signo(d.dif) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <p className="cm-nota">La meta de {money(r.meta)} se reparte en 4 semanas de {money(r.metaSemana)} que se acumulan. El "real" usa la fecha de cobro/anticipo registrada.</p>
    </div>
  );
}
