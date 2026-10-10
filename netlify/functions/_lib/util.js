// Utilidades compartidas por las Netlify Functions.
// No es una función en sí (vive en _lib/, carpeta que Netlify ignora).
import { createHmac, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";

// --- Variables de entorno (SECRETAS: sin prefijo VITE_, solo viven en el servidor) ---
export const SECRET = process.env.AUTH_SECRET || "";
export const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
export const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE || "";
const TTL = Number(process.env.SESION_HORAS || 12) * 3600; // vida de la sesión, en segundos

// --- Respuestas JSON ---
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

// --- base64url ---
const b64url = buf =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = s => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

// --- Token de sesión (JWT HS256 hecho a mano, sin dependencias) ---
export function firmarToken(payload) {
  if (!SECRET) throw new Error("Falta AUTH_SECRET");
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + TTL };
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const data = head + "." + b64url(JSON.stringify(body));
  const firma = b64url(createHmac("sha256", SECRET).update(data).digest());
  return data + "." + firma;
}

export function verificarToken(token) {
  if (!token || !SECRET) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const data = partes[0] + "." + partes[1];
  const esperada = b64url(createHmac("sha256", SECRET).update(data).digest());
  const a = Buffer.from(partes[2]);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let body;
  try {
    body = JSON.parse(fromB64url(partes[1]).toString("utf8"));
  } catch {
    return null;
  }
  if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}

// Lee el token del encabezado Authorization: Bearer <token>
export function usuarioDe(req) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? verificarToken(m[1]) : null;
}

// --- Contraseñas: formato "scrypt$<saltHex>$<hashHex>" ---
export function hashContrasena(contrasena) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(contrasena), salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verificarContrasena(contrasena, guardado) {
  try {
    const [alg, saltHex, hashHex] = String(guardado).split("$");
    if (alg !== "scrypt") return false;
    const salt = Buffer.from(saltHex, "hex");
    const esperado = Buffer.from(hashHex, "hex");
    const calc = scryptSync(String(contrasena), salt, esperado.length);
    return esperado.length === calc.length && timingSafeEqual(esperado, calc);
  } catch {
    return false;
  }
}

// --- Usuarios definidos en la variable APP_USERS (JSON) ---
// Formato: [{ "usuario":"ana", "nombre":"Ana López", "rol":"admin", "hash":"scrypt$...$..." }]
export function listaUsuarios() {
  try {
    const arr = JSON.parse(process.env.APP_USERS || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// --- Acceso a Supabase con la llave service_role (salta RLS, solo en servidor) ---
async function sb(path, opts = {}) {
  if (!SB_URL || !SB_SERVICE) throw new Error("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE");
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_SERVICE,
      authorization: `Bearer ${SB_SERVICE}`,
      "content-type": "application/json",
      ...(opts.headers || {})
    }
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${texto}`);
  return texto ? JSON.parse(texto) : null;
}

export const sbLeerProyecto = async id =>
  (await sb(`proyectos?id=eq.${encodeURIComponent(id)}&select=*`))?.[0] || null;

export const sbUpsertProyecto = fila =>
  sb("proyectos", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(fila)
  });

export const sbBorrarProyecto = id =>
  sb(`proyectos?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { prefer: "return=minimal" }
  });

export const sbInsertarBitacora = fila =>
  sb("bitacora", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(fila)
  });

export const sbLeerBitacora = (limite = 300) =>
  sb(`bitacora?select=*&order=creado.desc&limit=${limite}`);

// --- Todos los proyectos (para el barrido de alertas) ---
export const sbLeerProyectos = async () =>
  (await sb("proyectos?select=*&order=creado.asc")) || [];

// --- Avisos de WhatsApp ya enviados (anti-spam) ---
export const sbLeerAvisos = async () =>
  (await sb("avisos_whatsapp?select=*")) || [];

export const sbInsertarAviso = (proyecto_id, tipo) =>
  sb("avisos_whatsapp", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ proyecto_id, tipo, enviado_en: new Date().toISOString() })
  });

export const sbBorrarAviso = (proyecto_id, tipo) =>
  sb(
    `avisos_whatsapp?proyecto_id=eq.${encodeURIComponent(proyecto_id)}&tipo=eq.${encodeURIComponent(tipo)}`,
    { method: "DELETE", headers: { prefer: "return=minimal" } }
  );
