/* Lógica de dinero — AHORA DETERMINADA POR LA FASE (el paso) del proyecto.
   Reglas acordadas:
     Paso 23–38  -> POR FACTURAR (servicio en proceso/ejecución, aún sin factura)
     Paso 39–40  -> FACTURADO   (ya se hizo/entró la factura, pero sin pagar)
     Paso 41–42  -> COBRADO     (se pagó la factura: el dinero entró)
     Cerrado     -> COBRADO
   Los anticipos son dinero parcial que ya entró (aparte, por su mes).
   "Cobrado del mes" se cuenta en el mes en que el proyecto LLEGÓ al paso 41
   (se saca del historial), y las fotos de meses anteriores lo conservan. */

// Mes AAAAMM desde una fecha ISO (0 si inválida).
export function mesDeISO(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return 0;
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

// Clasificación de dinero por fase. Devuelve 'porfacturar' | 'facturado' | 'cobrado' | null.
// Los flags MANUALES (pagado / facturado por adelantado) adelantan el estado aunque
// el proyecto aún no haya llegado a la fase correspondiente.
export function faseDinero(p) {
  if (!p || p.archivado) return null;
  if (p.resultado === "no-viable" || p.resultado === "archivado") return null;
  const n = +p.paso || 1;
  if (p.pagado || p.resultado === "cerrado" || n >= 41) return "cobrado"; // prepago o llegó al 41
  if (p.facturado || n >= 39) return "facturado";                          // pre-facturado o llegó al 39
  if (n >= 23) return "porfacturar";
  return null; // etapas tempranas (1–22) sin override
}

export const ETIQUETA_FASE = { porfacturar: "Por facturar", facturado: "Facturado", cobrado: "Cobrado" };

// Anticipo que REALMENTE entró: solo cuenta si está marcado como pagado.
// Un anticipo acordado pero aún no pagado no reduce el saldo ni suma como ingreso.
export const anticipoCobrado = p => (p && p.anticipoPagado ? (+p.anticipo || 0) : 0);

// Saldo pendiente de cobro (monto menos el anticipo YA pagado); 0 si ya está cobrado.
export function saldoDe(p) {
  if (faseDinero(p) === "cobrado") return 0;
  return Math.max(0, (+p.monto || 0) - anticipoCobrado(p));
}

// Mes (AAAAMM) en que entró el dinero. 0 si no aplica.
export function mesCobrado(p) {
  if (faseDinero(p) !== "cobrado") return 0;
  if (p.pagado && +p.pagadoMes) return +p.pagadoMes; // prepago: el mes en que se marcó
  const h = p.historial || [];
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].p === 40 && h[i].f) return mesDeISO(h[i].f); // completó el 40 -> entró al 41
  }
  return mesDeISO(p.cerradoEn || p.pasoDesde || p.creado);
}

// Monto que entró al cobrar (el saldo; el anticipo ya pagado se contó en su mes).
export function montoCobrado(p) {
  if (faseDinero(p) !== "cobrado") return 0;
  return Math.max(0, (+p.monto || 0) - anticipoCobrado(p));
}

// Totales de un mes dado.
//   anticipos          -> TODO anticipo registrado ese mes (pagado o no). Es lo
//                         que se ve en el KPI "Anticipos": el anticipo siempre existe.
//   anticiposCobrados  -> solo los anticipos marcados como pagados (dinero real).
//   total              -> DINERO QUE ENTRÓ = saldo cobrado + anticipos YA pagados.
export function totalesDelMes(lista, mes) {
  const t = { cobrado: 0, anticipos: 0, anticiposCobrados: 0, total: 0, cobradoNum: 0, anticipoNum: 0, anticipoCobradoNum: 0 };
  for (const p of lista) {
    if (!p || p.archivado) continue;
    if (faseDinero(p) === "cobrado" && mesCobrado(p) === mes) {
      const m = montoCobrado(p);
      if (m > 0) { t.cobrado += m; t.cobradoNum++; }
    } else if (faseDinero(p) !== "cobrado" && (+p.anticipo || 0) > 0 && (+p.anticipoMes || 0) === mes) {
      // El anticipo SIEMPRE cuenta como anticipo (exista pago o no).
      t.anticipos += (+p.anticipo || 0); t.anticipoNum++;
      // Solo si está pagado suma al dinero que realmente entró.
      if (anticipoCobrado(p) > 0) { t.anticiposCobrados += anticipoCobrado(p); t.anticipoCobradoNum++; }
    }
  }
  t.total = t.cobrado + t.anticiposCobrados;
  return t;
}

// Totales EN VIVO por fase (no mensuales): saldos por facturar y facturado.
export function totalesVivos(lista) {
  const t = { porFacturar: 0, facturado: 0, porFacturarNum: 0, facturadoNum: 0 };
  for (const p of lista) {
    const f = faseDinero(p);
    if (f === "porfacturar") { t.porFacturar += saldoDe(p); t.porFacturarNum++; }
    else if (f === "facturado") { t.facturado += saldoDe(p); t.facturadoNum++; }
  }
  return t;
}

// Meses (AAAAMM) con dinero (cobrado o anticipo), de mayor a menor.
export function mesesConDinero(lista) {
  const set = new Set();
  for (const p of lista) {
    const mc = mesCobrado(p);
    if (mc) set.add(mc);
    if (faseDinero(p) !== "cobrado" && (+p.anticipo || 0) > 0 && (+p.anticipoMes || 0)) {
      set.add(+p.anticipoMes);
    }
  }
  return [...set].sort((a, b) => b - a);
}
