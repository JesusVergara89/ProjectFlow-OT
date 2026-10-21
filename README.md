# ProjectFlow-OT · Tablero de Proyectos y OT

ERP ligero y adaptable para empresas medianas con flujos lineales. Da seguimiento a cada proyecto a lo largo de **42 pasos en 8 fases**, desde la solicitud del cliente hasta el cobro, con decisiones sí/no, ciclos de regreso y alertas de proyectos detenidos.

Los datos viven en **Supabase** y se sincronizan en tiempo real entre todas las pantallas abiertas. El acceso es con usuarios propios (sin registro) y cada acción queda registrada en una **bitácora** con quién la hizo y cuándo.

> Desarrollado por **Jesus Manuel Vergara**.
> Repositorio: https://github.com/JesusVergara89/ProjectFlow-OT

---

## Características

- **Flujo de 42 pasos y 8 fases**, con pasos de acción y de decisión, y tres cierres posibles: `no-viable`, `archivado` y `cerrado`.
- **Detección de proyectos detenidos**: cada fase tiene un umbral en días; si un proyecto lo supera en un mismo paso, se marca como detenido.
- **Tiempo real**: los cambios en proyectos y perfiles se reflejan al instante en todas las sesiones.
- **Bitácora**: registro de quién entró, creó, editó, avanzó, deshizo o eliminó.
- **Tipos de servicio y áreas** (Ingeniería, Planeación, Comercial): el tipo de servicio determina el área y quién puede trabajar los pasos técnicos.
- **Datos económicos por proyecto**: monto, anticipo, pagos diferidos y mes de cobro.
- **Evidencias en imagen** y **foto de perfil** por usuario, almacenadas en Supabase Storage.
- **Vistas**: tablero, lista, calendario, KPIs, analítica y proyección.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React + Vite |
| Base de datos y tiempo real | Supabase (Postgres, Realtime, Storage) |
| Backend | Netlify Functions (serverless) |
| Despliegue | Netlify |

---

## El flujo de proyectos

Definido en `src/flow.js`. Para cambiar el flujo solo se edita ese archivo.

| # | Fase | Pasos | Umbral (días) |
| --- | --- | --- | --- |
| 1 | Solicitud y viabilidad | 1–4 | 2 |
| 2 | Levantamiento y alcances | 5–10 | 5 |
| 3 | Cotización y negociación | 11–16 | 7 |
| 4 | Planeación y OT | 17–27 | 5 |
| 5 | Ejecución del servicio | 28–30 | 15 |
| 6 | Reporte y calidad | 31–38 | 5 |
| 7 | Facturación | 39 | 15 |
| 8 | Cobro | 40–42 | 30 |

**Tipos de paso**

- **Acción**: tiene un responsable y un paso siguiente.
- **Decisión**: pregunta sí/no y lleva a pasos distintos según la respuesta.
- **Cierre**: termina el proyecto como `no-viable`, `archivado` o `cerrado`.

**Ciclos de regreso**: el flujo permite volver atrás, por ejemplo cuando una cotización no se cumple, cuando no se cumplen los alcances, o cuando el reporte no pasa los estándares de calidad.

**Viáticos y plan de calidad (pasos 24–27)**: en el paso 24 se decide si se ocupan viáticos foráneos. Si **sí**, se solicitan a administración (25) y se autorizan y gestionan (26). Si **no**, se salta directo. En ambos casos el flujo pasa siempre por el plan de calidad (27) antes de ejecutar el servicio (28).

### Tipos de servicio y áreas

Definidos en `src/servicios.js`. El tipo se elige al crear el proyecto y de ahí se deriva el área.

| Área | Tipos de servicio |
| --- | --- |
| Ingeniería | Termografías, estudios de iluminación, calidad de energía, auditorías técnicas, estudios de arcflash, coordinación de protecciones, diagramas unifilares |
| Planeación | Mantenimiento a subestaciones, tierras físicas, servicios correctivos, suministros, alcances adicionales |
| Comercial | Cursos |

En el mismo archivo se configuran el equipo comercial y el personal disponible como responsable de servicio y apoyo.

---

## Seguridad

- La app es frontend puro, así que **todo lo que empieza con `VITE_` es público** (visible en el navegador). Por eso las contraseñas **no** se guardan en variables `VITE_`.
- El login y la escritura de datos se validan en el **servidor**, con Netlify Functions. Ahí las variables sin prefijo `VITE_` sí son secretas.
- Las contraseñas se guardan **cifradas** (scrypt) dentro de la variable `APP_USERS`, nunca en texto plano.
- Con la llave pública (`anon`) la base de datos **solo se puede leer**. Toda escritura pasa por las funciones, que usan la llave secreta `service_role`. Así nadie puede escribir ni borrar saltándose el login, y el rastro de la bitácora no se puede falsificar.

---

## Puesta en marcha

### 1. Supabase

Crea un proyecto y ejecuta `supabase/schema.sql` en el editor SQL. Crea las tablas, los permisos y el tiempo real.

### 2. Genera un secreto para firmar las sesiones

```bash
node scripts/usuario.mjs --secreto
```

Guarda el valor como `AUTH_SECRET`.

### 3. Crea los usuarios

Usa `scripts/usuario.mjs` para generar el hash de la contraseña de cada persona y arma con ellos el arreglo JSON que va en `APP_USERS`.

### 4. Variables de entorno en Netlify

En **Site settings > Environment variables** agrega (usa `.env.example` como guía):

| Variable | Qué es | ¿Secreta? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL de Supabase | pública |
| `VITE_SUPABASE_ANON_KEY` | llave anon | pública |
| `SUPABASE_URL` | la misma URL, para las funciones | secreta |
| `SUPABASE_SERVICE_ROLE` | llave service_role | **secreta** |
| `AUTH_SECRET` | el secreto del paso 2 | **secreta** |
| `APP_USERS` | arreglo JSON de usuarios | **secreta** |
| `SESION_HORAS` | opcional, horas de sesión (12 por defecto) | — |

> Marca las secretas con el candado de Netlify ("Contains secret values"). Lo que de verdad las protege es que **no** llevan prefijo `VITE_` y solo las leen las funciones.

### 5. Publica

Netlify detecta `netlify.toml` (build `npm run build`, carpeta `dist`, funciones en `netlify/functions`). Haz deploy y entra con el usuario y contraseña que creaste.

### Probar localmente

```bash
npm install
npm install -g netlify-cli   # una sola vez
# llena .env con los valores (incluidas las secretas)
netlify dev                  # levanta el frontend Y las funciones juntas
```

> `npm run dev` solo levanta el frontend. El login necesita `netlify dev` para que respondan las funciones `/api/*`.

---

## Estructura del proyecto

```
ProjectFlow-OT/
├── netlify/functions/     Funciones serverless
│   ├── _lib/              Utilidades compartidas
│   ├── alertas.js
│   ├── bitacora.js
│   ├── borrar.js
│   ├── guardar.js
│   ├── login.js
│   ├── perfil.js
│   └── subir.js
├── scripts/               Scripts de utilería (usuarios y secreto)
├── supabase/              Esquema de la base de datos
├── src/
│   ├── components/        Interfaz (ver abajo)
│   ├── App.jsx, main.jsx
│   ├── auth.js            Sesión en el navegador y llamadas a las funciones
│   ├── db.js              Lectura y tiempo real (anon)
│   ├── flow.js            Fases y pasos del flujo
│   ├── servicios.js       Tipos de servicio, áreas y personal
│   ├── permisos.js        Permisos por usuario
│   ├── reglas.js          Avanzar, deshacer, días en el paso, detenidos y filtros
│   ├── useProyectos.js    Hook de datos de proyectos
│   ├── format.js, meses.js, imagen.js
│   └── index.css
├── netlify.toml
└── index.html
```

### Funciones de Netlify

| Archivo | Qué hace |
| --- | --- |
| `login.js` | Valida usuario y contraseña contra `APP_USERS` y entrega el token de sesión. |
| `guardar.js` | Crea y edita proyectos y registra cada cambio en la bitácora. |
| `borrar.js` | Elimina proyectos y lo registra en la bitácora. |
| `bitacora.js` | Devuelve la actividad registrada. |
| `subir.js` | Sube imágenes de evidencia al Storage. |
| `perfil.js` | Guarda la foto de perfil del usuario. |
| `_lib/util.js` | Tokens, cifrado de contraseñas y acceso a Supabase con la llave secreta. |

### Componentes

`Login`, `Tablero`, `Lista`, `Calendario`, `Kpis`, `Analitica`, `Proyeccion`, `Flujo`, `Panel`, `PanelNuevo`, `Filtros`, `Bitacora` y `AvatarUsuario`.

---

## Tareas habituales

- **Agregar o quitar personas**: vuelve a generar `APP_USERS` con `scripts/usuario.mjs` y actualiza la variable en Netlify. Hay que volver a desplegar para que tome el valor nuevo (o usar "Clear cache and deploy").
- **Cambiar una contraseña**: genera de nuevo esa entrada con el script y reemplázala en `APP_USERS`.
- **Cambiar cuándo un proyecto se marca como detenido**: edita el `umbral` de la fase en `src/flow.js`.
- **Cambiar el flujo**: edita `src/flow.js`.
- **Agregar un tipo de servicio o cambiar el equipo**: edita `src/servicios.js`.

---

## Autor

**Jesus Manuel Vergara** · [github.com/JesusVergara89](https://github.com/JesusVergara89)