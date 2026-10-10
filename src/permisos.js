import { COMERCIAL, areaDe, usuariosDeArea } from "./servicios.js";

/* Pasos "técnicos" de campo/OT: quién los trabaja depende del ÁREA del proyecto
   (Ingeniería -> German, Planeación -> Leonardo, Comercial -> comercial). */
export const PASOS_AREA = new Set([5, 6, 7, 8, 10, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28, 30]);

/* Equipo que maneja los pasos de reporte (asignar, elaborar, entregar a calidad):
   German y los muchachos de ingeniería. El admin siempre puede (ver puedeConPaso). */
export const REPORTE_EQUIPO = [
  "german", "mikeas", "emilia", "nestor", "isaac", "ailin", "guillermo", "roberto", "alan", "juan", "johan"
];

/* A quién puede German asignar como responsable de hacer el reporte. */
export const REPORTE_ASIGNABLES = [
  "mikeas", "emilia", "nestor", "isaac", "ailin", "guillermo", "roberto", "alan", "juan", "johan"
];

// Pasos de reporte (numeración del flujo de 42 pasos).
export const PASO_ASIGNA_REPORTE = 32;  // Se asigna responsable de reporte
export const PASO_ELABORA_REPORTE = 33; // Se elabora reporte técnico (lo hace el responsable asignado)
export const PASO_ENTREGA_CALIDAD = 35; // Se entrega reporte a calidad

export const PERMISOS = {
  1: COMERCIAL,
  2: COMERCIAL,
  3: COMERCIAL,
  4: COMERCIAL,
  5: ["leonardo", "german"],
  6: ["leonardo", "german"],
  7: ["leonardo", "german"],
  8: ["leonardo", "german"],
  9: ["huber"],
  10: ["leonardo", "german"],
  11: COMERCIAL,
  12: COMERCIAL,
  13: COMERCIAL,
  14: COMERCIAL,
  15: COMERCIAL,
  16: COMERCIAL,
  17: COMERCIAL, // Se entrega a planeación
  18: ["leonardo"], // ¿Se cumple con los alcances?
  19: ["leonardo"], // Se crea la OT
  20: ["leonardo"], // ¿Existen requisiciones?
  21: ["leonardo"], // Se envía a almacén y compras
  22: ["leonardo"], // Se genera fecha de entrega
  23: ["leonardo"], // Se realiza programación
  24: ["leonardo"], // ¿Se ocupan viáticos foráneos?
  25: ["leonardo"], // Se solicitan viáticos a administración
  26: ["adriana"],  // Se autorizan y gestionan los viáticos (administración)
  27: ["leonardo"], // Se crea plan de calidad
  28: ["leonardo"], // Se ejecuta el servicio
  29: ["admin"],    // Se entrega documentación
  30: ["leonardo"], // Se realiza el cierre parcial de la OT
  31: COMERCIAL,    // ¿Se ocupa reporte para facturar?
  32: ["german"], // Se asigna responsable de reporte
  33: REPORTE_EQUIPO, // Se elabora reporte técnico (se restringe al responsable asignado, ver usuariosPaso)
  34: COMERCIAL,      // ¿Hay servicios adicionales?
  35: REPORTE_EQUIPO, // Se entrega reporte a calidad
  36: ["admin"],      // Se revisa reporte técnico
  37: ["admin"],      // ¿Se cumple con los estándares de calidad?
  38: ["admin"],      // Se entrega al cliente
  39: ["yuli", "lupita"], // Se realiza factura
  40: ["yuli", "lupita"], // Se programa pago de factura
  41: ["yuli", "lupita"], // Se paga la factura
  42: ["yuli", "lupita"]  // Se suma el proyecto al total cobrado y cierre de OT
};

/* Usuarios que pueden trabajar el paso n en un proyecto dado.
   - Pasos de reporte: equipo de ingeniería; el de elaborar se limita al responsable asignado.
   - Pasos técnicos de campo/OT: según el área del proyecto.
   - El resto: lista fija de PERMISOS. */
export function usuariosPaso(n, proyecto) {
  if (n === PASO_ASIGNA_REPORTE || n === PASO_ENTREGA_CALIDAD) return REPORTE_EQUIPO;
  if (n === PASO_ELABORA_REPORTE) {
    const r = String(proyecto?.responsableReporte || "").toLowerCase();
    return r ? [r] : REPORTE_EQUIPO;
  }
  if (PASOS_AREA.has(n)) {
    const area = areaDe(proyecto);
    if (area) return usuariosDeArea(area);
  }
  return PERMISOS[n] || [];
}

/* German está en el equipo COMERCIAL para poder crear proyectos, pero como comercial
   solo debe mover los proyectos que él mismo creó. Sus pasos de ingeniería (según el
   área del proyecto) y de reporte siguen siendo globales: ahí NO entra como comercial. */
function germanEntraComoComercial(n, proyecto) {
  // Pasos de reporte: German actúa por su rol de ingeniería, no como comercial.
  if (n === PASO_ASIGNA_REPORTE || n === PASO_ELABORA_REPORTE || n === PASO_ENTREGA_CALIDAD) return false;
  // Paso técnico de un proyecto de su propia área (Ingeniería): rol de ingeniería.
  if (PASOS_AREA.has(n) && areaDe(proyecto) === "ingenieria") return false;
  // En cualquier otro paso donde esté permitido, es por ser del equipo COMERCIAL.
  return true;
}

export function puedeConPaso(usuario, rol, n, proyecto) {
  const u = String(usuario || "").toLowerCase();
  if (rol === "admin" || u === "yuli") return true; // admin y yuli pueden con todo
  const permitidos = usuariosPaso(n, proyecto);
  if (!permitidos || !permitidos.length) return false;
  if (!permitidos.includes(u)) return false;
  // German solo mueve como comercial los proyectos que él creó.
  if (u === "german" && germanEntraComoComercial(n, proyecto)) {
    const creador = String(proyecto?.creadoPor ?? proyecto?.creado_por ?? "").toLowerCase();
    return creador === "german";
  }
  return true;
}

export function etiquetaPermiso(n, proyecto) {
  const permitidos = usuariosPaso(n, proyecto);
  return permitidos.length ? permitidos.join(", ") : "nadie configurado";
}
