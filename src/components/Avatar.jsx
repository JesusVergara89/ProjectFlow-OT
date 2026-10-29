// Avatar presentacional (sin lógica de red): muestra la foto o las iniciales.
// Se usa en la bitácora y dentro de AvatarUsuario.

export function inicialesDe(txt) {
  const partes = String(txt || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const a = partes[0][0] || "";
  const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (a + b).toUpperCase();
}

// Color estable derivado de una clave (para el fondo de las iniciales).
export function tonoDe(clave) {
  let h = 0;
  for (const c of String(clave || "")) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

// size opcional: si se pasa, fija el tamaño en línea; si no, lo decide el CSS
// (así el avatar del encabezado respeta las reglas de .avatar-usuario).
export default function Avatar({ nombre, url, clave, size, className = "" }) {
  const dim = size ? { width: size, height: size } : null;
  if (url) {
    return (
      <img
        className={"avatar-img " + className}
        style={dim || undefined}
        src={url}
        alt={nombre || "Foto de perfil"}
      />
    );
  }
  const estilo = { background: `hsl(${tonoDe(clave || nombre)} 48% 42%)` };
  if (dim) { estilo.width = size; estilo.height = size; estilo.fontSize = Math.round(size * 0.38); }
  return (
    <span
      className={"avatar-iniciales " + className}
      style={estilo}
      aria-label={nombre || "Sin foto"}
    >
      {inicialesDe(nombre)}
    </span>
  );
}
