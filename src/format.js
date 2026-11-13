export const money = n =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(+n || 0);

export const norm = s =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const pad = n => String(n).padStart(2, "0");

// Reparte un monto en n partes enteras que SIEMPRE suman el total.
// Las primeras se redondean hacia abajo y la última recibe el residuo,
// así 500000/4 = [125000,125000,125000,125000] y 500000/3 = [166666,166666,166668].
export function repartirMonto(total, n) {
  const t = Math.round(+total || 0);
  const k = Math.max(1, Math.floor(+n || 0));
  const base = Math.floor(t / k);
  const partes = Array(k).fill(base);
  partes[k - 1] = t - base * (k - 1);
  return partes;
}

// Reparte un monto en pesos ENTEROS según una lista de porcentajes (desiguales).
// Los porcentajes se normalizan a su propia suma (no es obligatorio que den 100),
// cada parte se redondea hacia abajo y la ÚLTIMA absorbe el residuo, así siempre
// suman exacto el total. Si no hay porcentajes válidos, cae a partes iguales.
// Ej.: 25500 con [30,40,30] = [7650, 10200, 7650].
export function repartirPorc(total, porcentajes) {
  const t = Math.round(+total || 0);
  const ps = (Array.isArray(porcentajes) ? porcentajes : []).map(x => Math.max(0, +x || 0));
  const k = ps.length;
  if (!k) return [];
  const suma = ps.reduce((a, b) => a + b, 0);
  if (suma <= 0) return repartirMonto(t, k); // sin porcentajes -> iguales
  const partes = ps.map(p => Math.floor((t * p) / suma));
  const dado = partes.reduce((a, b) => a + b, 0);
  partes[k - 1] += t - dado; // el último cuadra el total
  return partes;
}

// Partes de un cobro diferido alineadas a los meses SELECCIONADOS (en orden),
// respetando el modo del proyecto: "porcentaje" usa p.pagosPorc; cualquier otro
// (por defecto "iguales") divide en partes iguales. Devuelve [{ mes, monto }].
export function partesDiferido(p, total) {
  const pares = (Array.isArray(p?.pagosMeses) ? p.pagosMeses : [])
    .map((mes, i) => ({ mes: +mes || null, i }))
    .filter(x => x.mes);
  if (!pares.length) return [];
  let partes;
  if (p?.pagosModo === "porcentaje") {
    partes = repartirPorc(total, pares.map(x => (p.pagosPorc || [])[x.i]));
  } else {
    partes = repartirMonto(total, pares.length);
  }
  return pares.map((x, j) => ({ mes: x.mes, monto: partes[j] }));
}

export const plural = (n, a, b) => (n === 1 ? a : b);

export function fecha(iso) {
  const t = new Date(iso);
  if (isNaN(t)) return "—";
  const o = { day: "numeric", month: "short" };
  if (t.getFullYear() !== new Date().getFullYear()) o.year = "numeric";
  return t.toLocaleDateString("es-MX", o).replace(/\./g, "");
}

export function hora(iso) {
  const t = new Date(iso);
  return isNaN(t) ? "" : t.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}
