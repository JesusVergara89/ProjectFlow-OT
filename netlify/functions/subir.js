import { randomUUID } from "node:crypto";
import { json, usuarioDe, SB_URL, SB_SERVICE } from "./_lib/util.js";

// Sube una imagen (evidencia) a Supabase Storage con la llave service_role
// y devuelve su enlace público. La base de datos solo guarda ese enlace.
const BUCKET = "evidencias";
const MAX = 6 * 1024 * 1024; // 6 MB (igual que el límite del bucket)

// Extensión según el tipo MIME (solo para que el archivo tenga un nombre bonito).
const EXT = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
  "image/webp": "webp", "image/gif": "gif", "image/heic": "heic",
  "image/heif": "heif", "image/bmp": "bmp", "image/tiff": "tiff",
  "image/avif": "avif", "image/svg+xml": "svg"
};

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const sesion = usuarioDe(req);
  if (!sesion) return json({ error: "Sesión no válida o expirada" }, 401);
  if (!SB_URL || !SB_SERVICE) return json({ error: "Falta configuración de Supabase" }, 500);

  let cuerpo;
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Petición inválida" }, 400);
  }

  const { proyectoId, base64 } = cuerpo || {};
  const mime = String(cuerpo?.tipo || "").toLowerCase();

  if (!base64 || typeof base64 !== "string") return json({ error: "Falta la imagen" }, 400);
  if (!mime.startsWith("image/")) return json({ error: "Solo se permiten imágenes" }, 400);

  // Admite "data:image/...;base64,AAAA" o solo "AAAA".
  const coma = base64.indexOf(",");
  const puro = base64.startsWith("data:") && coma >= 0 ? base64.slice(coma + 1) : base64;

  let bytes;
  try {
    bytes = Buffer.from(puro, "base64");
  } catch {
    return json({ error: "Imagen inválida" }, 400);
  }
  if (!bytes.length) return json({ error: "Imagen vacía" }, 400);
  if (bytes.length > MAX) return json({ error: "La imagen pesa más de 6 MB. Compártela más pequeña." }, 413);

  const ext = EXT[mime] || "bin";
  const carpeta = proyectoId ? encodeURIComponent(String(proyectoId)) : "varios";
  const path = `${carpeta}/${randomUUID()}.${ext}`;

  const res = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: SB_SERVICE,
      authorization: `Bearer ${SB_SERVICE}`,
      "content-type": mime,
      "cache-control": "31536000",
      "x-upsert": "false"
    },
    body: bytes
  });

  if (!res.ok) {
    const t = await res.text();
    return json({ error: `No se pudo subir (${res.status}): ${t}` }, 502);
  }

  const url = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  return json({ ok: true, path, url });
}
