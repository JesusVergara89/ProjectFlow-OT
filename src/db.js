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
  anticipo: Number(r.anticipo) || 0,
  pagado: Boolean(r.pagado),
  cobroMes: Number(r.cobro_mes) || null,
  diferido: Boolean(r.diferido),
  pagosNum: Number(r.pagos_num) || 0,
  pagosMeses: Array.isArray(r.pagos_meses) ? r.pagos_meses.map(m => Number(m) || null) : [],
  ot: r.ot || "",
  archivado: Boolean(r.archivado),
  fechaServicio: r.fecha_servicio || "",
  fechaServicioFin: r.fecha_servicio_fin || "",
  responsableServicio: r.responsable_servicio || "",
  apoyo: Array.isArray(r.apoyo) ? r.apoyo : [],
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

// Sube una imagen (evidencia) al Storage por el servidor y devuelve { url, path }.
export async function subirImagen({ proyectoId, tipo, base64 }) {
  return api("subir", { proyectoId, tipo, base64 });
}

// --- Foto de perfil por usuario ---
// Lee el avatar de un usuario (lectura pública con la llave anon).
export async function leerAvatar(usuario) {
  if (!configurado || !usuario) return null;
  const { data, error } = await supabase
    .from("perfiles_usuario")
    .select("avatar_url")
    .eq("usuario", String(usuario).toLowerCase())
    .maybeSingle();
  if (error) return null;
  return data?.avatar_url || null;
}

// Guarda (sube + persiste) la foto del usuario de la sesión. Devuelve { url }.
export async function guardarAvatar({ base64, tipo }) {
  return api("perfil", { base64, tipo });
}

// Avisa cuando cambie cualquier perfil (p. ej. otro usuario cambia su foto).
export function suscribirPerfiles(alCambiar) {
  if (!configurado) return () => {};
  const canal = supabase
    .channel("perfiles-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "perfiles_usuario" }, alCambiar)
    .subscribe();
  return () => supabase.removeChannel(canal);
}

export function suscribir(alCambiar) {
  const canal = supabase
    .channel("proyectos-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "proyectos" }, alCambiar)
    .subscribe();
  return () => supabase.removeChannel(canal);
}
