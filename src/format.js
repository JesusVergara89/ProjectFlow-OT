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
