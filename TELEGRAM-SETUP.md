# Alertas por Telegram

Reemplaza a CallMeBot (que "aceptaba" pero no entregaba). Telegram es gratis,
instantáneo y confirma la entrega real. La función `netlify/functions/alertas.js`
corre 1 vez al día (9:00 a.m. CDMX) y avisa cuando un proyecto se pasa de tiempo.

## Paso 1 — Crear el bot (una sola vez)

1. En Telegram, busca **@BotFather** y mándale `/newbot`.
2. Ponle nombre y usuario al bot. Al final te da un **token** como
   `123456789:AAExampleTokenAbc...`. Guárdalo para el Paso 3.

## Paso 2 — Obtener el chat_id de cada quien

Cada persona que quiera recibir avisos debe **abrir el bot y mandarle** cualquier
mensaje (por ejemplo `hola`). Si prefieres un **grupo del equipo**, agrega el bot
al grupo y manda un mensaje ahí.

Luego, para ver los chat_id, abre en el navegador (con TU token):
```
https://api.telegram.org/bot<TU_TOKEN>/getUpdates
```
Busca en la respuesta el campo `"chat":{"id": ...}`:
- Persona individual: un número positivo, p. ej. `123456789`.
- Grupo: un número negativo, p. ej. `-1001234567890`.

## Paso 3 — Variables de entorno en Netlify

En **Site settings → Environment variables** agrega (secretas, SIN `VITE_`):

`TELEGRAM_BOT_TOKEN`
```
123456789:AAExampleTokenAbc...
```


```
Puedes poner solo el grupo, solo personas, o una mezcla.

## Paso 4 — Deploy y prueba

1. Haz deploy en Netlify. La función programada se registra sola.
2. Pruébala sin esperar al horario: Netlify → **Functions → alertas** → dispararla a
   mano, o revisa **Logs** (`[telegram] ... OK`, y el `RESUMEN`).

### Si quieres re-probar avisos ya mandados
La tabla `avisos_whatsapp` evita repetir el mismo aviso en 7 días. Para forzar que
vuelvan a salir en una prueba, vacíala en el SQL Editor de Supabase:
```sql
delete from public.avisos_whatsapp;
```
(La tabla se reutiliza tal cual; no hace falta crear nada nuevo.)

## Nota
Ya NO se usa CallMeBot ni la variable `WHATSAPP_DEST`: puedes borrarla de Netlify.
