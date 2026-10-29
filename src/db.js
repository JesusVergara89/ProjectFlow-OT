import { createClient } from "@supabase/supabase-js";
import { api, esDemo } from "./auth.js";
import { PROYECTOS_DEMO, PERFILES_DEMO, CIERRES_DEMO, MARCAS_DEMO, ANALISIS_DEMO } from "./demo.js";

const clona = x => (typeof structuredClone === "function" ? structuredClone(x) : JSON.parse(JSON.stringify(x)));

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
  facturado: Boolean(r.facturado),
  facturadoMes: Number(r.facturado_mes) || null,
  pagadoMes: Number(r.pagado_mes) || null,
  anticipoMes: Number(r.anticipo_mes) || null,
  reporteEnviado: Boolean(r.reporte_enviado),
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
  if (esDemo()) return clona(PROYECTOS_DEMO);
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .order("creado", { ascending: true });
  if (error) throw error;
  return data.map(aApp);
}

// Escritura por el servidor. Devuelve el historial ya sellado con el autor.
export async function guardar(p, accion = "editar") {
  if (esDemo()) return p.historial || []; // demo: no persiste, solo vive en memoria
  const r = await api("guardar", { proyecto: p, accion });
  return r.historial;
}

export async function borrar(id, nombre) {
  if (esDemo()) return;
  await api("borrar", { id, nombre });
}

// Sube una imagen (evidencia) al Storage por el servidor y devuelve { url, path }.
export async function subirImagen({ proyectoId, tipo, base64 }) {
  if (esDemo()) return { url: base64 || "", path: "demo" }; // muestra la imagen local, no sube nada
  return api("subir", { proyectoId, tipo, base64 });
}

// --- Foto de perfil por usuario ---
// Lee el avatar de un usuario (lectura pública con la llave anon).
export async function leerAvatar(usuario) {
  if (esDemo()) return PERFILES_DEMO[String(usuario || "").toLowerCase()] || null;
  if (!configurado || !usuario) return null;
  const { data, error } = await supabase
    .from("perfiles_usuario")
    .select("avatar_url")
    .eq("usuario", String(usuario).toLowerCase())
    .maybeSingle();
  if (error) return null;
  return data?.avatar_url || null;
}

// Lee TODAS las fotos y devuelve un mapa { usuario(minúsculas): avatar_url }.
export async function leerAvatares() {
  if (esDemo()) return { ...PERFILES_DEMO };
  if (!configurado) return {};
  const { data, error } = await supabase
    .from("perfiles_usuario")
    .select("usuario, avatar_url");
  if (error || !Array.isArray(data)) return {};
  const mapa = {};
  for (const r of data) if (r.avatar_url) mapa[String(r.usuario).toLowerCase()] = r.avatar_url;
  return mapa;
}

// Guarda (sube + persiste) la foto del usuario de la sesión. Devuelve { url }.
export async function guardarAvatar({ base64, tipo }) {
  if (esDemo()) return { url: base64 || "" }; // demo: muestra tu foto local, no la sube
  return api("perfil", { base64, tipo });
}

// Avisa cuando cambie cualquier perfil (p. ej. otro usuario cambia su foto).
// Nombre de canal ÚNICO por suscripción: varios componentes (encabezado,
// bitácora) escuchan a la vez y Supabase no permite reusar el mismo canal.
export function suscribirPerfiles(alCambiar) {
  if (esDemo()) return () => {};
  if (!configurado) return () => {};
  const nombre = "perfiles-cambios-" + Math.random().toString(36).slice(2);
  const canal = supabase
    .channel(nombre)
    .on("postgres_changes", { event: "*", schema: "public", table: "perfiles_usuario" }, alCambiar)
    .subscribe();
  return () => supabase.removeChannel(canal);
}

// --- Marcas privadas de "proyecto atrasado" (solo súper admin) ---
// Devuelve un mapa { proyecto_id: { atrasado, mensaje } }.
export async function leerMarcasSuper() {
  if (esDemo()) return { ...MARCAS_DEMO };
  const r = await api("marcas", { accion: "listar" });
  return r.marcas || {};
}
export async function guardarMarcaSuper(proyectoId, mensaje) {
  if (esDemo()) return { ok: true };
  return api("marcas", { accion: "guardar", proyectoId, mensaje });
}
export async function borrarMarcaSuper(proyectoId) {
  if (esDemo()) return { ok: true };
  return api("marcas", { accion: "borrar", proyectoId });
}

// --- Cierres mensuales (foto de meses pasados) ---
// Lee las fotos ya congeladas (lectura pública con la llave anon).
export async function leerCierres() {
  if (esDemo()) return clona(CIERRES_DEMO);
  if (!configurado) return [];
  const { data, error } = await supabase
    .from("cierres_mensuales")
    .select("*")
    .order("mes", { ascending: false });
  if (error || !Array.isArray(data)) return [];
  return data;
}

// Pide al servidor congelar cualquier mes ya terminado que aún no tenga foto.
// Devuelve las fotos (idempotente: no recalcula las que ya existen).
export async function asegurarCierres() {
  if (esDemo()) return clona(CIERRES_DEMO);
  try {
    const r = await api("cierres", {});
    return r.cierres || [];
  } catch {
    return [];
  }
}

// --- Análisis con IA (manda las métricas, regresa el texto) ---
export async function analizarIA(metricas) {
  if (esDemo()) {
    await new Promise(r => setTimeout(r, 600)); // simula el tiempo de la IA
    return { ok: true, analisis: ANALISIS_DEMO, modelo: "demo" };
  }
  return api("analisis", { metricas });
}

export function suscribir(alCambiar) {
  if (esDemo()) return () => {};
  const canal = supabase
    .channel("proyectos-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "proyectos" }, alCambiar)
    .subscribe();
  return () => supabase.removeChannel(canal);
}
