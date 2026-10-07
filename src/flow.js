/* Flujo de proyectos: 38 pasos en 7 fases. "umbral" = días en un paso antes de marcarlo como detenido. */
export const FASES = [
  { id: "solicitud",  nombre: "Solicitud y viabilidad",     rango: [1, 4],   umbral: 2 },
  { id: "alcance",    nombre: "Levantamiento y alcances",   rango: [5, 7],   umbral: 5 },
  { id: "cotizacion", nombre: "Cotización y negociación",   rango: [8, 16],  umbral: 7 },
  { id: "planeacion", nombre: "Planeación y OT",            rango: [17, 26], umbral: 5 },
  { id: "ejecucion",  nombre: "Ejecución del servicio",     rango: [27, 29], umbral: 15 },
  { id: "reporte",    nombre: "Reporte y calidad",          rango: [30, 35], umbral: 5 },
  { id: "cobro",      nombre: "Facturación y cobro",        rango: [36, 38], umbral: 30 }
];
const A = (n, txt, next, fin) => ({ n, tipo: "accion", txt, next, fin });
const D = (n, txt, si, no) => ({ n, tipo: "decision", txt, si, no });
export const LISTA = [
  A(1,  "Solicitud del cliente - COMERCIAL", 2),
  D(2,  "¿Se puede realizar? - COMERCIAL", 4, 3),
  A(3,  "Se informa al cliente - COMERCIAL", null, "no-viable"),
  D(4,  "¿Se cuenta con historial? - COMERCIAL", 7, 5),
  A(5,  "Se programa levantamiento - leonardo, german", 6),
  A(6,  "Se realiza levantamiento - leonardo, german", 7),
  A(7,  "Se realizan alcances - leonardo, german", 8),
  D(8,  "¿Se requiere requisición? - leonardo, german", 9, 10),
  A(9,  "Se cotizan materiales y/o servicios - huber", 10),
  A(10, "Se entregan a comercial - leonardo, german", 11),
  A(11, "Se realiza cotización - COMERCIAL", 12),
  A(12, "Se entrega y se negocia - COMERCIAL", 13),
  D(13, "¿Se autoriza? - COMERCIAL", 15, 14),
  A(14, "Se avisa al cliente y/o se archiva - COMERCIAL", null, "archivado"),
  D(15, "¿Se cumple con lo cotizado? - COMERCIAL", 17, 16),
  A(16, "Se regresa y/o se negocia - COMERCIAL", 13),
  A(17, "Se entrega a planeación - COMERCIAL", 18),
  D(18, "¿Se cumple con los alcances? - leonardo", 19, 16),
  A(19, "Se crea la OT - leonardo", 20),
  D(20, "¿Existen requisiciones? - leonardo", 21, 23),
  A(21, "Se envía a almacén y compras - leonardo", 22),
  A(22, "Se genera fecha de entrega - leonardo", 23),
  A(23, "Se realiza programación - leonardo", 24),
  D(24, "¿Se ocupan viáticos y/o estudios? - leonardo", 25, 26),
  A(25, "Se coordina depósito y/o realización - leonardo", 27),
  A(26, "Se crea plan de calidad - leonardo", 27),
  A(27, "Se ejecuta el servicio - leonardo", 28),
  A(28, "Se entrega documentación - Calidad", 29),
  A(29, "Se realiza el cierre parcial de la OT - leonardo", 30),
  D(30, "¿Se ocupa reporte para facturar? - COMERCIAL", 31, 36),
  A(31, "Se elabora reporte técnico - german", 32),
  D(32, "¿Hay servicios adicionales? - COMERCIAL", 7, 33),
  A(33, "Se revisa reporte técnico - Calidad", 34),
  D(34, "¿Se cumple con los estándares de calidad? - Calidad", 35, 31),
  A(35, "Se entrega al cliente - Calidad", 36),
  A(36, "Se realiza factura - yuli, lupita", 37),
  A(37, "Se programa pago de factura - yuli, lupita", 38),
  A(38, "Se paga factura y cierre de OT - yuli, lupita", null, "cerrado")
];
export const PASOS = {};
LISTA.forEach(p => { p.fase = FASES.find(f => p.n >= f.rango[0] && p.n <= f.rango[1]); PASOS[p.n] = p; });
