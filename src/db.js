import { createClient } from "@supabase/supabase-js";
import { api } from "./auth.js";

// La llave anon está PENSADA para ser pública: solo permite LEER (ver schema.sql).
// Toda escritura pasa por las Netlify Functions, que usan la llave secreta service_role.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && key);
export const supabase = configurado ? createClient(url, key) : null;

const aApp = r => ({
  id: r.id,
  nombre: r.nombre,
  cliente: r.cliente,
  tipo: r.tipo || "",
  area: r.area || "",
  responsable: r.responsable || "",
  responsableReporte: r.responsable_reporte || "",
  prioridad: r.prioridad,
  monto: Number(r.monto) || 0,
  estado: r.estado,
  resultado: r.resultado || undefined,
  paso: r.paso,
  creado: r.creado,
  pasoDesde: r.paso_desde,
  cerradoEn: r.cerrado_en || undefined,
  historial: r.historial || [],
  ejemplo: Boolean(r.ejemplo),
  creadoPor: r.creado_por || ""
});

export async function listar() {
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .order("creado", { ascending: true });
  if (error) throw error;
  return data.map(aApp);
}

// Escritura por el servidor. Devuelve el historial ya sellado con el autor.
export async function guardar(p, accion = "editar") {
  const r = await api("guardar", { proyecto: p, accion });
  return r.historial;
}

export async function borrar(id, nombre) {
  await api("borrar", { id, nombre });
}

export function suscribir(alCambiar) {
  const canal = supabase
    .channel("proyectos-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "proyectos" }, alCambiar)
    .subscribe();
  return () => supabase.removeChannel(canal);
}
