import {
  json, firmarToken, verificarContrasena, listaUsuarios, sbInsertarBitacora
} from "./_lib/util.js";

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let cuerpo;
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Petición inválida" }, 400);
  }

  const usuario = String(cuerpo.usuario || "").trim().toLowerCase();
  const contrasena = String(cuerpo.contrasena || "");
  if (!usuario || !contrasena) return json({ error: "Faltan usuario o contraseña" }, 400);

  const u = listaUsuarios().find(x => String(x.usuario || "").toLowerCase() === usuario);
  // Se verifica siempre (aunque el usuario no exista) para no revelar cuáles existen.
  const ok = u ? verificarContrasena(contrasena, u.hash) : verificarContrasena(contrasena, "scrypt$00$00");

  if (!u || !ok) return json({ error: "Usuario o contraseña incorrectos" }, 401);

  const sesion = { usuario: u.usuario, nombre: u.nombre || u.usuario, rol: u.rol || "usuario" };
  const token = firmarToken(sesion);

  // Deja rastro del acceso (si la bitácora falla, el login igual procede).
  try {
    await sbInsertarBitacora({
      usuario: sesion.usuario,
      nombre: sesion.nombre,
      accion: "ingreso",
      proyecto_id: null,
      proyecto_nombre: null,
      detalle: { ua: req.headers.get("user-agent") || null },
      creado: new Date().toISOString()
    });
  } catch (e) {
    console.error("bitacora ingreso:", e.message);
  }

  return json({ token, ...sesion });
}
