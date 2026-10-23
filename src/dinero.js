/* Lógica de dinero compartida entre el front (Kpis) y el servidor (cierres).
   Regla acordada: el dinero de un proyecto "se cierra" (cuenta como cobranza)
   SOLO cuando está marcado Cobrado o Pagado; si no, solo cuenta su anticipo.
   Cada aporte pertenece al MES en que se marcó (sello guardado en el proyecto). */

// Devuelve el aporte de dinero de un proyecto: { tipo, monto, mes } o null.
//   tipo: 'cobrado' | 'pagado' | 'anticipo'
//   mes : AAAAMM en que se registró (0 si no tiene sello)
// Prioridad para no contar doble: cobrado > pagado > anticipo.
export function aporteDinero(p) {
  if (!p || p.archivado) return null;
  if (p.cobrado) return { tipo: "cobrado", monto: +p.monto || 0, mes: +p.cobradoMes || 0 };
  if (p.pagado)  return { tipo: "pagado",  monto: +p.monto || 0, mes: +p.pagadoMes || 0 };
  const ant = +p.anticipo || 0;
  if (ant > 0)   return { tipo: "anticipo", monto: ant, mes: +p.anticipoMes || 0 };
  return null;
}

// Totales de dinero de una lista de proyectos para UN mes dado (AAAAMM).
export function totalesDelMes(lista, mes) {
  const t = { cobrado: 0, pagado: 0, anticipos: 0, total: 0, cobradoNum: 0, pagadoNum: 0, anticipoNum: 0 };
  for (const p of lista) {
    const a = aporteDinero(p);
    if (!a || a.mes !== mes) continue;
    t.total += a.monto;
    if (a.tipo === "cobrado") { t.cobrado += a.monto; t.cobradoNum++; }
    else if (a.tipo === "pagado") { t.pagado += a.monto; t.pagadoNum++; }
    else { t.anticipos += a.monto; t.anticipoNum++; }
  }
  return t;
}

// Meses (AAAAMM) con dinero registrado, de mayor a menor.
export function mesesConDinero(lista) {
  const set = new Set();
  for (const p of lista) {
    const a = aporteDinero(p);
    if (a && a.mes) set.add(a.mes);
  }
  return [...set].sort((x, y) => y - x);
}
