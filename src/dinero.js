/* Lógica de dinero compartida entre el front (Kpis) y el servidor (cierres).
   Dos indicadores DISTINTOS, cada uno por mes:
     COBRADO   = dinero que YA ENTRÓ  = Pagado (monto completo) + anticipos.
     FACTURADO = dinero FACTURADO pero AÚN SIN PAGAR (el cliente aceptó la
                 factura pero no ha pagado). Es dinero pendiente, por eso va
                 aparte y NO se mezcla con Cobrado.
   Cada aporte pertenece al MES en que se registró (sello en el proyecto). */

// Aporte de COBRANZA (dinero que entró): { tipo:'pagado'|'anticipo', monto, mes } o null.
export function aporteDinero(p) {
  if (!p || p.archivado) return null;
  if (p.pagado) return { tipo: "pagado", monto: +p.monto || 0, mes: +p.pagadoMes || 0 };
  const ant = +p.anticipo || 0;
  if (ant > 0)  return { tipo: "anticipo", monto: ant, mes: +p.anticipoMes || 0 };
  return null;
}

// Aporte FACTURADO pendiente (facturado y todavía sin pagar): { monto, mes } o null.
export function aporteFacturado(p) {
  if (!p || p.archivado) return null;
  if (p.facturado && !p.pagado) return { monto: +p.monto || 0, mes: +p.facturadoMes || 0 };
  return null;
}

// Totales de dinero de una lista para UN mes dado (AAAAMM).
export function totalesDelMes(lista, mes) {
  const t = { pagado: 0, anticipos: 0, total: 0, facturado: 0, pagadoNum: 0, anticipoNum: 0, facturadoNum: 0 };
  for (const p of lista) {
    const a = aporteDinero(p);
    if (a && a.mes === mes) {
      t.total += a.monto;
      if (a.tipo === "pagado") { t.pagado += a.monto; t.pagadoNum++; }
      else { t.anticipos += a.monto; t.anticipoNum++; }
    }
    const f = aporteFacturado(p);
    if (f && f.mes === mes) { t.facturado += f.monto; t.facturadoNum++; }
  }
  return t;
}

// Meses (AAAAMM) con dinero (cobrado o facturado) registrado, de mayor a menor.
export function mesesConDinero(lista) {
  const set = new Set();
  for (const p of lista) {
    const a = aporteDinero(p);
    if (a && a.mes) set.add(a.mes);
    const f = aporteFacturado(p);
    if (f && f.mes) set.add(f.mes);
  }
  return [...set].sort((x, y) => y - x);
}
