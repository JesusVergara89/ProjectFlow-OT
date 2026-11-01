# ProjectFlow-OT · Tablero de Proyectos y OT

ERP ligero y adaptable para empresas medianas con flujos lineales. Da seguimiento a cada proyecto a lo largo de **42 pasos en 8 fases**, desde la solicitud del cliente hasta el cobro, con decisiones sí/no, ciclos de regreso, alertas de proyectos detenidos, control financiero por fase, cierres mensuales congelados y un **análisis con IA** para apoyar decisiones.

Los datos viven en **Supabase** y se sincronizan en tiempo real entre todas las pantallas abiertas. El acceso es con usuarios propios (sin registro) y cada acción queda registrada en una **bitácora** con quién la hizo y cuándo.

> Desarrollado por **Jesus Manuel Vergara**.
> Repositorio: https://github.com/JesusVergara89/ProjectFlow-OT

---

## Características

### Flujo y operación
- **Flujo de 42 pasos y 8 fases**, con pasos de acción y de decisión, y tres cierres posibles: `no-viable`, `archivado` y `cerrado`.
- **Detección de proyectos detenidos / atrasos**: cada fase tiene un umbral en días; además hay reglas de alerta por etapa que indican **quién** es el responsable del atraso y **cuántos días** lleva por encima del límite.
- **Tiempo real**: los cambios en proyectos y perfiles se reflejan al instante en todas las sesiones.
- **Bitácora**: registro de quién entró, creó, editó, avanzó, deshizo o eliminó, con la **foto de perfil** de cada persona.
- **Tipos de servicio y áreas** (Ingeniería, Planeación, Comercial): el tipo de servicio determina el área y quién puede trabajar los pasos técnicos.
- **Cursos**: al crearse, entran directo al **paso 17** (planeación), porque solo se capturan cuando ya son seguros.
- **Servicios adicionales (paso 34)**: al responder «Sí», se puede registrar **N proyectos nuevos** (uno tras otro) con esos alcances, y el proyecto original avanza al paso 35.

### Finanzas
- **Dinero clasificado por fase** (automático): **Por facturar** (pasos 23–38), **Facturado** (39–40) y **Cobrado** (41–42). Con **overrides manuales** para *pagado por adelantado* y *facturado por adelantado*.
- **Datos económicos por proyecto**: monto, anticipo, **pagos diferidos** (dividir el cobro en varios meses) y mes tentativo de cobro.
- **Meta mensual de cobranza** ($3,000,000 por defecto). El avance cuenta **pagos completos + anticipos**.
- **Cierres mensuales congelados**: al cambiar de mes, el mes anterior queda como una **foto estática** (no se recalcula aunque los proyectos sigan avanzando). Los contadores del mes en curso se reinician solos el día 1.
- **Marca «reporte enviado»** para distinguir lo cobrado que aún no tiene reporte.

### Análisis con IA
- Panel **«Análisis IA»** (solo admin): mide el desempeño por **atrasos y responsables** (no por promedios, que diluyen los retrasos), e incluye **dinero, pipeline, cobranza proyectada por mes, cierres anteriores y avance vs. meta**.
- Usa **Google Gemini** (tiene cuota gratis). Botón para **imprimir / guardar en PDF** el informe.

### Súper admin
- El usuario **súper admin** (por su `usuario` de login, no por el rol) puede marcar un proyecto como **atrasado** con un mensaje privado que aparece como **burbuja** en la tarjeta y se envía por **Telegram**. Solo lo ve él, ni los otros admins.

### Modo demo
- El usuario **`prueba`** (o el botón «Ver demo») entra en un modo con **datos ficticios en el navegador**: muestra todas las capacidades sin tocar la base real (no usa token ni Supabase). Los cambios viven solo en la sesión y se borran al recargar.

### Vistas
Tablero, lista, calendario, flujo, KPIs, analítica, proyección y análisis IA.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React + Vite |
| Base de datos y tiempo real | Supabase (Postgres, Realtime, Storage) |
| Backend | Netlify Functions (serverless) |
| IA | Google Gemini (API Generative Language) |
| Avisos | Telegram Bot API |
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

**Ciclos de regreso**: el flujo permite volver atrás, por ejemplo cuando una cotización no se cumple o cuando el reporte no pasa los estándares de calidad.

**Clasificación financiera por fase** (en `src/dinero.js`, independiente de los umbrales de tiempo): **Por facturar** 23–38 · **Facturado** 39–40 · **Cobrado** 41–42 (o proyecto cerrado). Un *pagado por adelantado* fuerza «Cobrado» aunque el proyecto no haya llegado al paso 41.

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

- La app es frontend puro, así que **todo lo que empieza con `VITE_` es público** (visible en el navegador). Por eso las contraseñas y las llaves de IA/Telegram **no** se guardan en variables `VITE_`.
- El login y la escritura de datos se validan en el **servidor**, con Netlify Functions. Ahí las variables sin prefijo `VITE_` sí son secretas.
- Las contraseñas se guardan **cifradas** (scrypt) dentro de la variable `APP_USERS`, nunca en texto plano.
- Con la llave pública (`anon`) la base de datos **solo se puede leer**. Toda escritura pasa por las funciones, que usan la llave secreta `service_role`. Así nadie puede escribir ni borrar saltándose el login, y el rastro de la bitácora no se puede falsificar.
- Las **marcas privadas del súper admin** viven en una tabla sin lectura pública: solo el servidor las lee/escribe, validando el `usuario` del token.
- El **modo demo** no emite token real y bloquea toda llamada al servidor: es imposible que escriba en la base real.

---

## Puesta en marcha

### 1. Supabase

Crea un proyecto y ejecuta en el editor SQL:

1. `supabase/schema.sql` — tablas base, permisos y tiempo real.
2. Las migraciones (seguras de correr, idempotentes):
   - `supabase/migracion-foto-y-reporte.sql` — foto de perfil + marca «reporte enviado».
   - `supabase/migracion-dinero-mensual.sql` — columnas de dinero por fase + tabla de cierres mensuales.
   - `supabase/migracion-super-admin.sql` — tabla privada de marcas del súper admin.

> Si creas el proyecto desde cero con `schema.sql`, ya incluye las columnas y tablas de las migraciones.

Crea también el bucket de Storage **`evidencias`** (público) para las imágenes de evidencia y las fotos de perfil.

### 2. Genera un secreto para firmar las sesiones

```bash
node scripts/usuario.mjs --secreto
```

Guarda el valor como `AUTH_SECRET`.

### 3. Crea los usuarios

Usa `scripts/usuario.mjs` para generar el hash de la contraseña de cada persona y arma con ellos el arreglo JSON que va en `APP_USERS`. El **súper admin** se define por su `usuario` de login en `src/permisos.js` (`SUPER_ADMIN`).

### 4. Variables de entorno en Netlify

En **Site settings > Environment variables** agrega:

| Variable | Qué es | ¿Secreta? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL de Supabase | pública |
| `VITE_SUPABASE_ANON_KEY` | llave anon | pública |
| `SUPABASE_URL` | la misma URL, para las funciones | secreta |
| `SUPABASE_SERVICE_ROLE` | llave service_role | **secreta** |
| `AUTH_SECRET` | el secreto del paso 2 | **secreta** |
| `APP_USERS` | arreglo JSON de usuarios | **secreta** |
| `SESION_HORAS` | opcional, horas de sesión (12 por defecto) | — |
| `GEMINI_API_KEY` | llave de Google AI Studio para el Análisis IA | **secreta** |
| `GEMINI_MODEL` | opcional, fuerza un modelo; si no, se autodetecta | — |
| `TELEGRAM_BOT_TOKEN` | token del bot para alertas y marcas | **secreta** |
| `TELEGRAM_DEST` | JSON con los `chat_id` destino de los avisos | **secreta** |
| `SUPER_ADMIN` | opcional, sobrescribe el usuario súper admin | — |

> Marca las secretas con el candado de Netlify. Lo que de verdad las protege es que **no** llevan prefijo `VITE_` y solo las leen las funciones.

La `GEMINI_API_KEY` se saca gratis en **aistudio.google.com/apikey**. La configuración de Telegram está explicada en `TELEGRAM-SETUP.md`.

### 5. Publica

Netlify detecta `netlify.toml` (build `npm run build`, carpeta `dist`, funciones en `netlify/functions`). Haz deploy y entra con el usuario y contraseña que creaste. Para probar sin tocar nada, entra con el usuario **`prueba`**.

### Probar localmente

```bash
npm install
npm install -g netlify-cli   # una sola vez
# llena .env con los valores (incluidas las secretas)
netlify dev                  # levanta el frontend Y las funciones juntas
```

> `npm run dev` solo levanta el frontend. El login y el análisis necesitan `netlify dev` para que respondan las funciones `/api/*`.

---

## Estructura del proyecto

```
ProjectFlow-OT/
├── netlify/functions/     Funciones serverless
│   ├── _lib/              Utilidades compartidas
│   ├── alertas.js         Avisos por Telegram (programada)
│   ├── analisis.js        Análisis con IA (Gemini)
│   ├── bitacora.js
│   ├── borrar.js
│   ├── cierres.js         Congela la foto de dinero de meses pasados
│   ├── guardar.js
│   ├── login.js
│   ├── marcas.js          Marcas privadas del súper admin + Telegram
│   ├── perfil.js
│   └── subir.js
├── scripts/               Scripts de utilería (usuarios y secreto)
├── supabase/              Esquema + migraciones de la base de datos
├── src/
│   ├── components/        Interfaz (ver abajo)
│   ├── App.jsx, main.jsx
│   ├── auth.js            Sesión en el navegador, modo demo y llamadas a las funciones
│   ├── db.js              Lectura, tiempo real (anon) y datos del modo demo
│   ├── dinero.js          Clasificación de dinero por fase y totales por mes
│   ├── demo.js            Datos ficticios del modo de prueba
│   ├── flow.js            Fases y pasos del flujo
│   ├── servicios.js       Tipos de servicio, áreas y personal
│   ├── permisos.js        Permisos por usuario y súper admin
│   ├── reglas.js          Avanzar, deshacer, días en el paso, detenidos, alertas y filtros
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
| `cierres.js` | Congela la foto de dinero de cada mes ya terminado (idempotente). |
| `marcas.js` | Marcas privadas de «proyecto atrasado» del súper admin + aviso por Telegram. |
| `analisis.js` | Arma las métricas y pide el análisis a Google Gemini. |
| `alertas.js` | Función programada que avisa por Telegram los proyectos detenidos. |
| `_lib/util.js` | Tokens, cifrado de contraseñas, Telegram y acceso a Supabase con la llave secreta. |

### Componentes

`Login`, `Tablero`, `Lista`, `Calendario`, `Kpis`, `Analitica`, `Proyeccion`, `Flujo`, `Panel`, `PanelNuevo`, `Filtros`, `Bitacora`, `Analisis`, `Avatar` y `AvatarUsuario`.

---

## Tareas habituales

- **Agregar o quitar personas**: vuelve a generar `APP_USERS` con `scripts/usuario.mjs` y actualiza la variable en Netlify. Hay que volver a desplegar para que tome el valor nuevo (o usar "Clear cache and deploy").
- **Cambiar una contraseña**: genera de nuevo esa entrada con el script y reemplázala en `APP_USERS`.
- **Cambiar cuándo un proyecto se marca como detenido**: edita el `umbral` de la fase en `src/flow.js`.
- **Cambiar el flujo**: edita `src/flow.js`.
- **Agregar un tipo de servicio o cambiar el equipo**: edita `src/servicios.js`.
- **Cambiar la meta mensual de cobranza**: edita `META_MENSUAL` en `src/components/Analisis.jsx`.
- **Cambiar el súper admin**: edita `SUPER_ADMIN` en `src/permisos.js` (o la variable `SUPER_ADMIN` en Netlify).
- **Corregir la foto de un mes**: haz un `insert … on conflict (mes) do update` sobre la tabla `cierres_mensuales`.

---

## Autor

**Jesus Manuel Vergara** · [github.com/JesusVergara89](https://github.com/JesusVergara89)
