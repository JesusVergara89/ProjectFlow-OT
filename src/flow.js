/* Flujo de proyectos: 41 pasos en 8 fases. "umbral" = días en un paso antes de marcarlo como detenido. */
export const FASES = [
  { id: "solicitud",   nombre: "Solicitud y viabilidad",     rango: [1, 4],   umbral: 2 },
  { id: "alcance",     nombre: "Levantamiento y alcances",   rango: [5, 7],   umbral: 5 },
  { id: "cotizacion",  nombre: "Cotización y negociación",   rango: [8, 16],  umbral: 7 },
  { id: "planeacion",  nombre: "Planeación y OT",            rango: [17, 26], umbral: 5 },
  { id: "ejecucion",   nombre: "Ejecución del servicio",     rango: [27, 29], umbral: 15 },
  { id: "reporte",     nombre: "Reporte y calidad",          rango: [30, 37], umbral: 5 },
  { id: "facturacion", nombre: "Facturación",                rango: [38, 38], umbral: 15 },
  { id: "cobro",       nombre: "Cobro",                      rango: [39, 41], umbral: 30 }
];

const A = (n, txt, next, fin) => ({ n, tipo: "accion", txt, next, fin });
const D = (n, txt, si, no) => ({ n, tipo: "decision", txt, si, no });
export const LISTA = [
  A(1,  "Solicitud del cliente - COMERCIAL", 2),
  D(2,  "¿Se puede realizar? - COMERCIAL", 4, 3),
  A(3,  "Se informa al cliente - COMERCIAL", null, "no-viable"),
  D(4,  "¿Se cuenta con historial? - COMERCIAL", 7, 5),
  A(5,  "Se programa levantamiento - Leonardo, German", 6),
  A(6,  "Se realiza levantamiento - Leonardo, German", 7),
  A(7,  "Se realizan alcances - Leonardo, German", 8),
  D(8,  "¿Se requiere requisición? - Leonardo, German", 9, 10),
  A(9,  "Se cotizan materiales y/o servicios - Huber", 10),
  A(10, "Se entregan a comercial - Leonardo, German", 11),
  A(11, "Se realiza cotización - COMERCIAL", 12),
  A(12, "Se entrega y se negocia - COMERCIAL", 13),
  D(13, "¿Se autoriza? - COMERCIAL", 15, 14),
  A(14, "Se avisa al cliente y/o se archiva - COMERCIAL", null, "archivado"),
  D(15, "¿Se cumple con lo cotizado? - COMERCIAL", 17, 16),
  A(16, "Se regresa y/o se negocia - COMERCIAL", 13),
  A(17, "Se entrega a planeación - COMERCIAL", 18),
  D(18, "¿Se cumple con los alcances? - Leonardo", 19, 16),
  A(19, "Se crea la OT - Leonardo", 20),
  D(20, "¿Existen requisiciones? - Leonardo", 21, 23),
  A(21, "Se envía a almacén y compras - Leonardo", 22),
  A(22, "Se genera fecha de entrega - Leonardo", 23),
  A(23, "Se realiza programación - Leonardo", 24),
  D(24, "¿Se ocupan viáticos y/o estudios? - Leonardo", 25, 26),
  A(25, "Se coordina depósito y/o realización - Leonardo", 27),
  A(26, "Se crea plan de calidad - Leonardo", 27),
  A(27, "Se ejecuta el servicio - Leonardo", 28),
  A(28, "Se entrega documentación - Calidad", 29),
  A(29, "Se realiza el cierre parcial de la OT - Leonardo", 30),
  D(30, "¿Se ocupa reporte para facturar? - COMERCIAL", 31, 38),
  A(31, "Se asigna responsable de reporte - German", 32),
  A(32, "Se elabora reporte técnico - Responsable de reporte", 33),
  D(33, "¿Hay servicios adicionales? - COMERCIAL", 7, 34),
  A(34, "Se entrega reporte a calidad - Responsable de reporte", 35),
  A(35, "Se revisa reporte técnico - Calidad", 36),
  D(36, "¿Se cumple con los estándares de calidad? - Calidad", 37, 32),
  A(37, "Se entrega al cliente - Calidad", 38),
  A(38, "Se realiza factura - Yuli, Lupita", 39),
  A(39, "Se programa pago de factura - Yuli, Lupita", 40),
  A(40, "Se paga la factura - Yuli, Lupita", 41),
  A(41, "Se suma el proyecto al total cobrado y cierre de OT - Yuli, Lupita", null, "cerrado")
];
export const PASOS = {};
LISTA.forEach(p => { p.fase = FASES.find(f => p.n >= f.rango[0] && p.n <= f.rango[1]); PASOS[p.n] = p; });
