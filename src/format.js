export const money = n =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(+n || 0);

export const norm = s =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const pad = n => String(n).padStart(2, "0");

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
