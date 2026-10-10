# Alertas por WhatsApp (CallMeBot) + arreglo de "Cobrado"

## Qué cambió

**1. Cobrado ahora incluye los anticipos** (`src/components/Kpis.jsx`)
El KPI "Cobrado" ya suma: monto completo de proyectos cerrados **+** los anticipos de
los proyectos que aún no cierran (ese dinero ya está en la empresa). Los anticipos
siguen apareciendo también en su propio KPI "Anticipos". No se cuenta doble: en un
proyecto cerrado el anticipo ya va dentro de su monto completo.

**2. Alertas por WhatsApp** (archivos nuevos)
Una función programada revisa los proyectos 1 vez al día y manda WhatsApp a las personas
que configures cuando se dispara cualquiera de las 5 alertas que ya calculaba `reglas.js`:

| Alerta   | Condición                                             |
|----------|-------------------------------------------------------|
| rojo     | +5 días desde la solicitud sin autorizar ni declinar  |
| rosa     | Huber +2 días en el paso 9 sin entregar cotización    |
| ambar    | +6 días en planeación sin programar el servicio       |
| morado   | +21 días hábiles sin entregar el reporte              |
| naranja  | +1 día hábil sin entregar la documentación al cliente |

No repite el mismo aviso cada día: avisa una vez por proyecto+alerta y vuelve a quedar
disponible cuando el proyecto avanza y la alerta desaparece.

## Paso 1 — Cada persona activa CallMeBot (gratis, una sola vez)

Para cada uno de los (hasta 4) números que recibirán avisos:
1. Abre la página oficial para ver el **número de CallMeBot vigente** (cambia cada tanto):
   https://www.callmebot.com/blog/free-api-whatsapp-messages/
2. Agenda ese número y, desde WhatsApp de ESE teléfono, mándale el mensaje exacto:
   **`I allow callmebot to send me messages`**
3. CallMeBot responde con su **apikey** (un número). Guárdalo para el Paso 3.

## Paso 2 — Base de datos (Supabase)

En el **SQL Editor** de Supabase corre una vez `supabase/migracion-avisos-whatsapp.sql`
(crea la tabla `avisos_whatsapp` para el anti-spam).

## Paso 3 — Variable de entorno en Netlify

En **Site settings > Environment variables** agrega (secreta, SIN prefijo `VITE_`):

`WHATSAPP_DEST`
```json
[
  {"nombre":"Jesus","phone":"+5214441234567","apikey":"123456"},
  {"nombre":"Leonardo","phone":"+5214447654321","apikey":"234567"},
  {"nombre":"German","phone":"+5214449998888","apikey":"345678"},
  {"nombre":"Monse","phone":"+5214441112222","apikey":"456789"}
]
```
- `phone`: formato internacional. México móvil: `+52 1` + 10 dígitos.
- `apikey`: el que te dio CallMeBot a ESE número.

## Paso 4 — Deploy

Haz deploy en Netlify. La función programada queda registrada sola (corre a las **9:00 a.m.
hora de CDMX**). Para cambiar la hora, edita la última línea de
`netlify/functions/alertas-whatsapp.js` (el `schedule` está en UTC).

## Probar sin esperar al horario

- En el panel de Netlify > **Functions > alertas-whatsapp** puedes dispararla a mano, o
- en **Logs** ves lo que envió (`enviados`, `en_alerta`).

## IMPORTANTE — Seguridad
El `.env` del zip traía secretos reales. Rota en Supabase/Netlify la llave
`service_role` y el `AUTH_SECRET`, y nunca subas el `.env` a un repo público.

## Límites de CallMeBot
Es gratis y perfecto para avisar a tu propio equipo (números que autorizan). No sirve para
clientes externos y tiene límites de volumen / puede tardar unos segundos. Si algún día
quieres avisar a clientes, ahí sí conviene la WhatsApp Cloud API oficial (de pago).
