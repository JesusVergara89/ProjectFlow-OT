import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && key);
export const supabase = configurado ? createClient(url, key) : null;

/* La app usa camelCase; la tabla usa snake_case. */
const aApp = r => ({
  id: r.id,
  nombre: r.nombre,
  cliente: r.cliente,
  responsable: r.responsable || "",
  prioridad: r.prioridad,
  monto: Number(r.monto) || 0,
  estado: r.estado,
  resultado: r.resultado || undefined,
  paso: r.paso,
  creado: r.creado,
  pasoDesde: r.paso_desde,
  cerradoEn: r.cerrado_en || undefined,
  historial: r.historial || [],
  ejemplo: Boolean(r.ejemplo)
});

const aDb = p => ({
  id: p.id,
  nombre: p.nombre,
  cliente: p.cliente,
  responsable: p.responsable || "",
  prioridad: p.prioridad,
  monto: p.monto || 0,
  estado: p.estado,
  resultado: p.resultado ?? null,
  paso: p.paso,
  creado: p.creado,
  paso_desde: p.pasoDesde,
  cerrado_en: p.cerradoEn ?? null,
  historial: p.historial || [],
  ejemplo: Boolean(p.ejemplo)
});

export async function listar() {
  const { data, error } = await supabase.from("proyectos").select("*").order("creado", { ascending: true });
  if (error) throw error;
  return data.map(aApp);
}

export async function guardar(p) {
  const { error } = await supabase.from("proyectos").upsert(aDb(p));
  if (error) throw error;
}

export async function borrar(id) {
  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) throw error;
}

/** Avisa cuando cualquier persona cambia un proyecto. Devuelve la función para cancelar la suscripción. */
export function suscribir(alCambiar) {
  const canal = supabase
    .channel("proyectos-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "proyectos" }, alCambiar)
    .subscribe();
  return () => supabase.removeChannel(canal);
}
