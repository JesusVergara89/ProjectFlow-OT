# Tablero de Proyectos y OT

Dashboard en React + Vite que sigue cada proyecto por las 42 etapas del flujo: solicitud del cliente, viabilidad, levantamiento, alcances, cotización y negociación, OT, ejecución, reporte técnico y calidad, facturación y cobro. Los datos viven en Supabase y se sincronizan en tiempo real entre todas las pantallas abiertas.

**Acceso con usuarios propios** (sin registro) y **bitácora**: cada acción —entrar, crear, editar, avanzar, deshacer, eliminar— queda registrada con quién la hizo y cuándo.

## ¿Cómo funciona la seguridad?

- La app es puro frontend, así que **todo lo que empieza con `VITE_` termina siendo público** (visible en el navegador). Por eso las contraseñas **no** se guardan en variables `VITE_`.
- El login y la escritura de datos se validan en el **servidor**, con **Netlify Functions**. Ahí sí las variables (sin prefijo `VITE_`) son secretas de verdad.
- Las contraseñas se guardan **cifradas** (scrypt) dentro de la variable `APP_USERS`. Nunca en texto plano.
- Con la llave pública (`anon`) la base de datos **solo se puede leer**. Toda escritura pasa por las funciones, que usan la llave secreta `service_role`. Así nadie puede escribir ni borrar saltándose el login, y el rastro de la bitácora no se puede falsificar.

## Puesta en marcha

# un secreto para firmar las sesiones
node scripts/usuario.mjs --secreto

### 1. Variables de entorno en Netlify
En **Site settings > Environment variables** agrega (mira `.env.example` como guía):

| Variable | Qué es | ¿Secreta? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL de Supabase | pública |
| `VITE_SUPABASE_ANON_KEY` | llave anon | pública |
| `SUPABASE_URL` | la misma URL, para las funciones | secreta |
| `SUPABASE_SERVICE_ROLE` | llave service_role | **secreta** |
| `AUTH_SECRET` | el secreto del paso 2 | **secreta** |
| `APP_USERS` | el arreglo JSON de usuarios | **secreta** |
| `SESION_HORAS` | opcional, horas de sesión (12 por defecto) | — |

> Marca las secretas con el candado de Netlify ("Contains secret values"). Eso las oculta en el panel, pero lo que de verdad las protege es que **no** llevan prefijo `VITE_` y solo las leen las funciones.

### 3. Publica
Netlify detecta `netlify.toml` (build `npm run build`, carpeta `dist`, funciones en `netlify/functions`). Haz deploy y entra con el usuario y contraseña que creaste.

### Probar localmente
```bash
npm install
npm install -g netlify-cli   # una sola vez
# llena .env con los valores (incluidas las secretas)
netlify dev                  # levanta el frontend Y las funciones juntas
```
> `npm run dev` solo levanta el frontend; el login necesita `netlify dev` para que respondan las funciones `/api/*`.

## Dónde está cada cosa

| Archivo | Qué contiene |
| --- | --- |
| `netlify/functions/login.js` | Valida usuario/contraseña contra `APP_USERS` y entrega el token de sesión. |
| `netlify/functions/guardar.js` | Crea/edita proyectos y registra cada cambio en la bitácora. |
| `netlify/functions/borrar.js` | Elimina proyectos y lo registra en la bitácora. |
| `netlify/functions/bitacora.js` | Devuelve la actividad registrada. |
| `netlify/functions/_lib/util.js` | Tokens, cifrado de contraseñas y acceso a Supabase con la llave secreta. |
| `src/auth.js` | Sesión en el navegador y llamadas a las funciones. |
| `src/db.js` | Lectura y tiempo real (anon); las escrituras van a las funciones. |
| `src/components/Login.jsx` | Pantalla de usuario y contraseña. |
| `src/components/Bitacora.jsx` | Panel con el rastro de actividad. |
| `src/flow.js` | Las 8 fases y los 42 pasos. Para cambiar el flujo, solo se edita este archivo. |
| `src/reglas.js` | `avanzar`, `deshacer`, días en el paso, detenidos y filtros. |
| `scripts/usuario.mjs` | Genera el hash de contraseñas y el `AUTH_SECRET`. |
| `supabase/schema.sql` | Tablas, permisos y tiempo real. |

## Tareas habituales

- **Agregar o quitar personas**: vuelve a generar `APP_USERS` con `scripts/usuario.mjs` y actualiza la variable en Netlify. No hace falta redesplegar el código, pero sí volver a desplegar para que tome la variable nueva (o usa "Clear cache and deploy").
- **Cambiar una contraseña**: genera de nuevo esa entrada con el script y reemplázala en `APP_USERS`.
- **Cuándo se marca un proyecto como detenido**: `umbral` de cada fase en `src/flow.js`, en días.
- **Viáticos y plan de calidad (pasos 24–27)**: en el paso 24 se decide si se ocupan viáticos foráneos. Si **sí**, Leonardo los solicita a administración (25) y Adriana los autoriza/gestiona (26, "viáticos asignados"); si **no**, se salta directo. En ambos casos el flujo pasa **siempre** por "Se crea plan de calidad" (27) antes de ejecutar el servicio (28). El plan de calidad ya no es opcional.
