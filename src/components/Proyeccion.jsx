import { money, plural } from "../format.js";
import { nombreServicio } from "../servicios.js";

/*
  Reporte financiero por etapa (como la hoja de proyección).
  Cada proyecto cae en UN solo grupo según el paso en que va.
  El dinero de cada proyecto es su MONTO. Se excluyen los proyectos
  descartados (no-viable / archivado).

  Rangos (según los hitos que definió el negocio):
    FACTURADO ................................ paso 39–42  (Se realiza factura)
    EJECUTADO NO FACTURADO ................... paso 30–38  (Cierre parcial de la OT)
    EN PROCESO ............................... paso 23–29  (Se realiza programación)
    AUTORIZADO NO PROGRAMADO ................. paso 17–22  (Se entrega a planeación)
    PROYECCIÓN / CON CERTIDUMBRE DE AUTORIZACIÓN . paso 1–16 (antes de autorizar)
*/
const GRUPOS = [
  { id: "facturado",   titulo: "Facturado",                               min: 39, max: 42,
    desc: "En facturación o cobro (desde «Se realiza factura»)." },
  { id: "ejecutado",   titulo: "Ejecutado no facturado",                  min: 30, max: 38,
    desc: "Servicio ejecutado, aún sin factura (desde el cierre parcial de la OT)." },
  { id: "proceso",     titulo: "En proceso",                              min: 23, max: 29,
    desc: "Programado y en ejecución (desde «Se realiza programación»)." },
  { id: "autorizado",  titulo: "Autorizado no programado",                min: 17, max: 22,
    desc: "Autorizado y entregado a planeación, aún sin programar." },
  { id: "proyeccion",  titulo: "Proyección / con certidumbre de autorización", min: 1, max: 16,
    desc: "Antes de autorizar: solicitud, levantamiento, cotización y negociación." }
];

// Devuelve siempre un grupo: así ningún proyecto queda fuera del reporte.
const grupoDe = paso => {
  const n = +paso || 1;
  if (n >= 39) return GRUPOS[0];
  return GRUPOS.find(g => n >= g.min && n <= g.max) || GRUPOS[GRUPOS.length - 1];
};

export default function Proyeccion({ items, onAbrir }) {
  // Solo proyectos vivos o ya cerrados-pagados; fuera los descartados.
  const base = items.filter(p => p.resultado !== "no-viable" && p.resultado !== "archivado");

  const porGrupo = {};
  GRUPOS.forEach(g => { porGrupo[g.id] = []; });
  base.forEach(p => {
    const g = grupoDe(p.paso || 1);
    if (g) porGrupo[g.id].push(p);
  });

  const sumaMonto = l => l.reduce((a, p) => a + (+p.monto || 0), 0);
  const granTotal = sumaMonto(base);

  return (
    <div className="proy">
      <div className="proy-resumen">
        {GRUPOS.map(g => {
          const l = porGrupo[g.id];
          return (
            <div className="kpi" key={g.id}>
              <span className="k-l">{g.titulo}</span>
              <span className="k-v">{money(sumaMonto(l))}</span>
              <span className="k-s">{l.length} {plural(l.length, "proyecto", "proyectos")}</span>
            </div>
          );
        })}
        <div className="kpi">
          <span className="k-l">Gran total</span>
          <span className="k-v">{money(granTotal)}</span>
          <span className="k-s">{base.length} {plural(base.length, "proyecto", "proyectos")}</span>
        </div>
      </div>

      {GRUPOS.map(g => {
        const l = [...porGrupo[g.id]].sort((a, b) => (+b.monto || 0) - (+a.monto || 0));
        return (
          <section className="proy-grupo" key={g.id}>
            <header className="proy-h">
              <h2>{g.titulo}</h2>
              <span className="proy-total">{money(sumaMonto(l))}</span>
              <span className="proy-cnt">{l.length} {plural(l.length, "proyecto", "proyectos")}</span>
            </header>
            <p className="sig">{g.desc}</p>
            {l.length ? (
              <table className="proy-tabla">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th className="num">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {l.map(p => (
                    <tr key={p.id} onClick={() => onAbrir(p.id)} tabIndex={0}
                        onKeyDown={e => { if (e.key === "Enter") onAbrir(p.id); }}>
                      <td>{p.nombre}{p.pagado ? <span className="tag pagado">Pagado</span> : null}</td>
                      <td>{p.cliente}</td>
                      <td>{nombreServicio(p.tipo) || "—"}</td>
                      <td className="num">{+p.monto ? money(p.monto) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="proy-sum">
                    <td colSpan={3}>Total {g.titulo.toLowerCase()}</td>
                    <td className="num">{money(sumaMonto(l))}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p className="vacio">Sin proyectos en esta etapa · total {money(0)}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
