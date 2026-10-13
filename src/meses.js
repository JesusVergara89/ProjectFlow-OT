/* Meses de cobro para la proyección.
   El mes se guarda como número AAAAMM (p. ej. octubre 2026 = 202610),
   así es un solo número, ordenable y sin ambigüedad entre años. */

const NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Mes en curso como AAAAMM.
export function mesActual() {
  const d = new Date();
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

// "Octubre 2026" (o "Sin fecha" si no hay mes).
export function nombreMes(ym) {
  const n = +ym || 0;
  if (!n) return "Sin fecha";
  const y = Math.floor(n / 100), m = n % 100;
  if (m < 1 || m > 12) return "Sin fecha";
  return `${NOMBRES[m - 1]} ${y}`;
}

// "Oct 26" para encabezados angostos.
export function nombreMesCorto(ym) {
  const n = +ym || 0;
  const y = Math.floor(n / 100), m = n % 100;
  if (m < 1 || m > 12) return "—";
  return `${NOMBRES[m - 1].slice(0, 3)} ${String(y).slice(2)}`;
}

// Lista de n meses a partir del mes en curso: [202610, 202611, ...].
export function mesesDesdeHoy(n = 12) {
  const base = mesActual();
  let y = Math.floor(base / 100), m = base % 100;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(y * 100 + m);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}
