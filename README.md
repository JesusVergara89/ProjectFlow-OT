# Tablero de Proyectos y OT

Dashboard en React + Vite que sigue cada proyecto por las 38 etapas del flujo: solicitud del cliente, viabilidad, levantamiento, alcances, cotización y negociación, OT, ejecución, reporte técnico y calidad, facturación y cobro. Los datos viven en Supabase y se sincronizan en tiempo real entre todas las pantallas abiertas.

## Puesta en marcha

1. **Crea el proyecto en Supabase** (supabase.com) y abre *SQL Editor*. Pega y ejecuta `supabase/schema.sql`. Crea la tabla `proyectos`, activa la seguridad por filas y el tiempo real.
2. **Activa el acceso por correo**: *Authentication > Providers > Email* debe estar habilitado. En *Authentication > URL Configuration* agrega `https://ansycarprojectflow.netlify.app/` (y la URL final cuando publiques) como Redirect URL.
3. **Copia las claves**: en *Project Settings > API* toma la URL y la clave `anon`.
   ```bash
   # edita .env con esos dos valores
   ```
4. **Instala y arranca**:
   ```bash
   npm install
   npm run dev
   ```
   Abre https://ansycarprojectflow.netlify.app, escribe tu correo y entra con el enlace que te llega.

Para publicar: `npm run build` genera la carpeta `dist/`, que sirve en Vercel, Netlify o Cloudflare Pages. Ahí mismo configura las dos variables `VITE_SUPABASE_*`.

## Dónde está cada cosa

| Archivo | Qué contiene |
| --- | --- |
| `src/flow.js` | Las 7 fases y los 38 pasos, con sus decisiones y destinos. Para cambiar el flujo, solo se edita este archivo. |
| `src/reglas.js` | `avanzar`, `deshacer`, días en el paso, detenidos y filtros. Son funciones puras. |
| `src/db.js` | Conexión a Supabase y conversión entre la tabla y la app. |
| `src/useProyectos.js` | Carga, tiempo real y guardado de proyectos. |
| `src/components/` | Tablero, Lista, Flujo, Panel de detalle, formulario nuevo, KPIs, filtros y login. |
| `supabase/schema.sql` | Tabla, políticas de seguridad y tiempo real. |

## Ajustes habituales

- **Cuándo se marca un proyecto como detenido**: `umbral` de cada fase en `src/flow.js`, en días. Los valores actuales son un punto de partida.
- **Quién puede entrar**: las políticas del esquema dejan leer y escribir a cualquier usuario con sesión. Si solo debe entrar tu equipo, desactiva *Allow new users to sign up* en *Authentication > Sign In / Providers* e invita a cada persona desde *Authentication > Users*.
- **Paso 25 → 27**: el flujo original lleva de "Se coordina depósito y/o realización" directo a "Se ejecuta el servicio", sin pasar por "Se crea plan de calidad" (26). Si el plan de calidad debe hacerse siempre, cambia `A(25, ..., 27)` a `A(25, ..., 26)` en `src/flow.js`.
