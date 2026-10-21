// Prepara una FOTO DE PERFIL en el navegador antes de subirla: la recorta a un
// cuadrado centrado y la reduce a un tamaño chico (son avatares, no capturas).
// Devuelve { base64, tipo }. Si el navegador no puede decodificar el formato
// (p. ej. HEIC de iPhone en Chrome), sube el original tal cual.
const LADO = 256;                 // px del avatar final (cuadrado)
const OBJETIVO_BYTES = 90 * 1024; // meta de ~90 KB

const pesaBytes = url => Math.round((url.length - url.indexOf(",") - 1) * 0.75);

function leerArchivo(file) {
  return new Promise((ok, mal) => {
    const fr = new FileReader();
    fr.onload = () => ok(fr.result);
    fr.onerror = () => mal(new Error("No se pudo leer el archivo."));
    fr.readAsDataURL(file);
  });
}

export async function procesarAvatar(file) {
  const dataUrl = await leerArchivo(file);

  let img;
  try {
    img = await new Promise((ok, mal) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => mal(new Error("sin-canvas"));
      im.src = dataUrl;
    });
  } catch {
    return { base64: dataUrl, tipo: file.type || "image/jpeg" };
  }

  const formato = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    return c.toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
  })();

  // Recorte cuadrado centrado.
  const lado = Math.min(img.width, img.height);
  const sx = (img.width - lado) / 2;
  const sy = (img.height - lado) / 2;

  const c = document.createElement("canvas");
  c.width = c.height = LADO;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, LADO, LADO);
  ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO, LADO);

  let salida = null;
  for (const q of [0.82, 0.7, 0.6, 0.5, 0.4]) {
    salida = c.toDataURL(formato, q);
    if (pesaBytes(salida) <= OBJETIVO_BYTES) break;
  }

  if (!salida || salida.length >= dataUrl.length) {
    return { base64: dataUrl, tipo: file.type || "image/jpeg" };
  }
  return { base64: salida, tipo: formato };
}
