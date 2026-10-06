// ¿Quién puede COMPLETAR/avanzar cada paso? (por número de paso del flujo de 38)
// Usuarios en minúsculas. El rol "admin" puede completar cualquier paso (evita bloqueos).
// Para cambiar permisos, edita este archivo.

const COMERCIAL = ["monse", "paola", "miriam", "cristina", "edgar"];

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
  17: ["leonardo"], // Se entrega a planeación
  18: ["leonardo"], // ¿Se cumple con los alcances? (no venía en la tabla; asignado a leonardo)
  19: ["leonardo"], // Se crea la OT
  20: ["leonardo"], // ¿Existen requisiciones?
  21: ["leonardo"], // Se envía a almacén y compras
  22: ["leonardo"], // Se genera fecha de entrega
  23: ["leonardo"], // Se realiza programación
  24: ["leonardo"], // ¿Se ocupan viáticos y/o estudios?
  25: ["leonardo"], // Se coordina depósito y/o realización
  26: ["leonardo"], // Se crea plan de calidad
  27: ["leonardo"], // Se ejecuta el servicio
  28: ["leonardo"], // Se entrega documentación
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

export function puedeConPaso(usuario, rol, n) {
  if (rol === "admin") return true; // el admin puede con todo
  const u = String(usuario || "").toLowerCase();
  const permitidos = PERMISOS[n];
  if (!permitidos || !permitidos.length) return false;
  return permitidos.includes(u);
}

export function etiquetaPermiso(n) {
  const permitidos = PERMISOS[n] || [];
  return permitidos.length ? permitidos.join(", ") : "nadie configurado";
}
