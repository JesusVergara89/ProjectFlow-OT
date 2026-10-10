/* Tipos de servicio (qué clase de proyecto es) y el ÁREA a la que pertenece cada uno.
   El área decide quién puede trabajar los pasos técnicos del proyecto:
     - Ingeniería  -> German
     - Planeación  -> Leonardo
     - Comercial   -> todo el equipo comercial
   Al crear el proyecto se elige el tipo; de ahí se deriva el área. */

// Equipo comercial (antes vivía en permisos.js). Cámbialo aquí si entra o sale alguien.
export const COMERCIAL = ["monse", "paola", "miriam", "cristina", "edgar", "german"];

export const AREAS = {
  ingenieria: { nombre: "Ingeniería", usuarios: ["german"] },
  planeacion: { nombre: "Planeación", usuarios: ["leonardo"] },
  comercial:  { nombre: "Comercial",  usuarios: COMERCIAL }
};

export const SERVICIOS = [
  { id: "termografias",               nombre: "Termografías",                 area: "ingenieria" },
  { id: "iluminacion",                nombre: "Estudios de iluminación",      area: "ingenieria" },
  { id: "calidad-energia",            nombre: "Calidad de energía",           area: "ingenieria" },
  { id: "auditorias-tecnicas",        nombre: "Auditorías técnicas",          area: "ingenieria" },
  { id: "arcflash",                   nombre: "Estudios de arcflash",         area: "ingenieria" },
  { id: "coordinacion-protecciones",  nombre: "Coordinación de protecciones", area: "ingenieria" },
  { id: "diagramas-unifilares",       nombre: "Diagramas unifilares",         area: "ingenieria" },
  { id: "mtto-subestaciones",         nombre: "Mantenimiento a subestaciones", area: "planeacion" },
  { id: "tierras-fisicas",            nombre: "Tierras físicas",              area: "planeacion" },
  { id: "cursos",                     nombre: "Cursos",                       area: "comercial" }
];

export const servicioDe = id => SERVICIOS.find(s => s.id === id) || null;

// Área de un proyecto: usa la columna guardada y, si no existe, la deriva del tipo.
export function areaDe(proyecto) {
  if (!proyecto) return null;
  if (proyecto.area && AREAS[proyecto.area]) return proyecto.area;
  const s = servicioDe(proyecto.tipo);
  return s ? s.area : null;
}

export const usuariosDeArea = area => (AREAS[area]?.usuarios || []);
export const nombreServicio = id => servicioDe(id)?.nombre || "";
export const nombreArea = area => (AREAS[area]?.nombre || "");
