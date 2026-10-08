import { COMERCIAL, areaDe, usuariosDeArea } from "./servicios.js";

/* Pasos "técnicos": quién los trabaja depende del ÁREA del proyecto
   (Ingeniería -> German, Planeación -> Leonardo, Comercial -> comercial).
   El resto de los pasos tiene responsables fijos (ver PERMISOS). */
export const PASOS_AREA = new Set([5, 6, 7, 8, 10, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 31]);

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
  24: ["leonardo"], // ¿Se ocupan viáticos y/o estudios?
  25: ["leonardo"], // Se coordina depósito y/o realización
  26: ["leonardo"], // Se crea plan de calidad
  27: ["leonardo"], // Se ejecuta el servicio
  28: ["admin"], // Se entrega documentación
  29: ["leonardo"], // Se realiza el cierre parcial de la OT
  30: COMERCIAL,    // ¿Se ocupa reporte para facturar?
  31: ["german"],   // Se elabora reporte técnico
  32: COMERCIAL,    // ¿Hay servicios adicionales?
  33: ["admin"],    // Se revisa reporte técnico
  34: ["admin"],    // ¿Se cumple con los estándares de calidad?
  35: ["admin"],    // Se entrega al cliente
  36: ["yuli", "lupita"], // Se realiza factura
  37: ["yuli", "lupita"], // Se programa pago de factura
  38: ["yuli", "lupita"]  // Se paga factura y cierre de OT
};

/* Usuarios que pueden trabajar el paso n en un proyecto dado.
   Para los pasos técnicos manda el área del proyecto; si el proyecto aún
   no tiene tipo/área asignada, se usa la lista fija de PERMISOS (comportamiento previo). */
export function usuariosPaso(n, proyecto) {
  if (PASOS_AREA.has(n)) {
    const area = areaDe(proyecto);
    if (area) return usuariosDeArea(area);
  }
  return PERMISOS[n] || [];
}

export function puedeConPaso(usuario, rol, n, proyecto) {
  const u = String(usuario || "").toLowerCase();
  if (rol === "admin" || u === "yuli") return true; // admin y yuli pueden con todo
  const permitidos = usuariosPaso(n, proyecto);
  if (!permitidos || !permitidos.length) return false;
  return permitidos.includes(u);
}

export function etiquetaPermiso(n, proyecto) {
  const permitidos = usuariosPaso(n, proyecto);
  return permitidos.length ? permitidos.join(", ") : "nadie configurado";
}
