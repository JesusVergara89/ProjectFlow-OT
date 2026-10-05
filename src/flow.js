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
  A(1,  "Solicitud del cliente", 2),
  D(2,  "¿Se puede realizar?", 4, 3),
  A(3,  "Se informa al cliente", null, "no-viable"),
  D(4,  "¿Se cuenta con historial?", 7, 5),
  A(5,  "Se programa levantamiento", 6),
  A(6,  "Se realiza levantamiento", 7),
  A(7,  "Se realizan alcances", 8),
  D(8,  "¿Se requiere requisición?", 9, 10),
  A(9,  "Se cotizan materiales y/o servicios", 10),
  A(10, "Se entregan a comercial", 11),
  A(11, "Se realiza cotización", 12),
  A(12, "Se entrega y se negocia", 13),
  D(13, "¿Se autoriza?", 15, 14),
  A(14, "Se avisa al cliente y/o se archiva", null, "archivado"),
  D(15, "¿Se cumple con lo cotizado?", 17, 16),
  A(16, "Se regresa y/o se negocia", 13),
  A(17, "Se entrega a planeación", 18),
  D(18, "¿Se cumple con los alcances?", 19, 16),
  A(19, "Se crea la OT", 20),
  D(20, "¿Existen requisiciones?", 21, 23),
  A(21, "Se envía a almacén y compras", 22),
  A(22, "Se genera fecha de entrega", 23),
  A(23, "Se realiza programación", 24),
  D(24, "¿Se ocupan viáticos y/o estudios?", 25, 26),
  A(25, "Se coordina depósito y/o realización", 27),
  A(26, "Se crea plan de calidad", 27),
  A(27, "Se ejecuta el servicio", 28),
  A(28, "Se entrega documentación", 29),
  A(29, "Se realiza el cierre parcial de la OT", 30),
  D(30, "¿Se ocupa reporte para facturar?", 31, 36),
  A(31, "Se elabora reporte técnico", 32),
  D(32, "¿Hay servicios adicionales?", 7, 33),
  A(33, "Se revisa reporte técnico", 34),
  D(34, "¿Se cumple con los estándares de calidad?", 35, 31),
  A(35, "Se entrega al cliente", 36),
  A(36, "Se realiza factura", 37),
  A(37, "Se programa pago de factura", 38),
  A(38, "Se paga factura y cierre de OT", null, "cerrado")
];
export const PASOS = {};
LISTA.forEach(p => { p.fase = FASES.find(f => p.n >= f.rango[0] && p.n <= f.rango[1]); PASOS[p.n] = p; });
