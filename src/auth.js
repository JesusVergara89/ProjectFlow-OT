// Sesión del lado del navegador. El token lo emite la función /api/login
// y se envía en cada escritura para que el servidor sepa quién actúa.
const K_TOKEN = "tpo:token";
const K_USER = "tpo:user";

const leer = k => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const escribir = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento */
  }
};

export function sesion() {
  const token = leer(K_TOKEN);
  if (!token) return null;
  // ¿Expiró? (lectura informativa del payload; la validación real es en el servidor)
  try {
    const body = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) {
      salir();
      return null;
    }
  } catch {
    /* ignora */
  }
  try {
    return { token, ...JSON.parse(leer(K_USER) || "{}") };
  } catch {
    return { token };
  }
}

export async function entrar(usuario, contrasena) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ usuario, contrasena })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "No se pudo iniciar sesión");
  escribir(K_TOKEN, data.token);
  escribir(K_USER, JSON.stringify({ usuario: data.usuario, nombre: data.nombre, rol: data.rol }));
  return data;
}

export function salir() {
  escribir(K_TOKEN, null);
  escribir(K_USER, null);
}

// Llama una función protegida con el token de la sesión.
export async function api(ruta, cuerpo) {
  const s = sesion();
  const res = await fetch("/api/" + ruta, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(s?.token ? { authorization: "Bearer " + s.token } : {})
    },
    body: JSON.stringify(cuerpo || {})
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    salir();
    window.dispatchEvent(new Event("tpo:sesion-expirada"));
  }
  if (!res.ok) throw new Error(data.error || "Error en el servidor");
  return data;
}

export async function apiGet(ruta) {
  const s = sesion();
  const res = await fetch("/api/" + ruta, {
    headers: { ...(s?.token ? { authorization: "Bearer " + s.token } : {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    salir();
    window.dispatchEvent(new Event("tpo:sesion-expirada"));
  }
  if (!res.ok) throw new Error(data.error || "Error en el servidor");
  return data;
}
