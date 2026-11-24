# Deploy en producción

App: https://anclaje.webistudio.net (anclaje.vercel.app redirige con 308) · Repo: github.com/JonathanGrauberg/anclaje-app (rama `main`).
Cada push a `main` despliega solo. `vercel-build` aplica migraciones y seed antes de compilar.

Los valores secretos **no** van acá: están en Vercel (Sensitive) y respaldados fuera del repo.

## Variables (Vercel → Settings → Environment Variables)

| Variable                                                                                                                  | Estado             | De dónde sale                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`                                                                                   | ✅                 | Neon (integración de Vercel, prefijo `DATABASE`, São Paulo, plan Free)                                                                    |
| `BETTER_AUTH_SECRET`                                                                                                      | ✅                 | `npm run gen:key`                                                                                                                         |
| `ENCRYPTION_KEYS` (`1:<clave>`), `ENCRYPTION_KEY_VERSION` (`1`)                                                           | ✅                 | `npm run gen:key`. **Respaldada fuera de Vercel: si se pierde, se pierde todo lo cifrado**                                                |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`                                                                                  | ✅ solo Production | `https://anclaje.webistudio.net`                                                                                                          |
| `STORAGE_DRIVER=s3`, `S3_BUCKET=anclaje-app`, `S3_REGION=auto`, `S3_ENDPOINT`                                             | ✅                 | Cloudflare R2, bucket privado                                                                                                             |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`                                                                                | ✅                 | Token de R2 "anclaje-vercel", Object Read & Write, solo ese bucket                                                                        |
| `SMTP_URL` (`smtps://resend:<clave>@smtp.resend.com:465`), `EMAIL_FROM` (`Anclaje <no-responder@anclaje.webistudio.net>`) | ✅                 | Resend, dominio anclaje.webistudio.net verificado (DKIM + 2 CNAME en Hostinger, región São Paulo). Clave "anclaje-vercel", solo envío     |
| `CONTACT_EMAIL`                                                                                                           | ✅                 | Casilla del equipo (webibygrauberg@gmail.com): avisos de interesados y respuestas a la bienvenida                                         |
| `CRON_SECRET`                                                                                                             | ✅                 | `npm run gen:key`. Vercel Cron lo manda solo en cada llamada (recordatorio de turnos, `vercel.json`)                                      |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                                                                | ⏳                 | Google Cloud (ver `.env.example`)                                                                                                         |
| `NEXT_PUBLIC_NOTIFICATIONS=true`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`                    | ✅                 | `npm run gen:vapid` (respaldadas fuera del repo). La pública cambia con el build: redeployar si se edita                                  |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`                                                                                    | ⏳                 | Mercado Pago → Tus integraciones → la app de Anclaje. Primero las de prueba (`TEST-…`), después las productivas. Ver "Mercado Pago" abajo |

## Crons

- Vercel Cron (`vercel.json`, una vez por día): `turnos` 10 h y `resumen` 9 h (hora de Argentina).
- cron-job.org cada 10 min: `GET /api/cron/recordatorios` con `Authorization: Bearer <CRON_SECRET>`.
  Si se cambia `CRON_SECRET`, actualizarlo también ahí. Un 500 dice el motivo en los logs de Vercel.

## Dominio

- `anclaje.webistudio.net`: CNAME `anclaje` en el DNS de Hostinger (webistudio.net) hacia Vercel.
  Si se cambia la dirección, actualizar también `BETTER_AUTH_URL` y `NEXT_PUBLIC_APP_URL` y
  redeployar: si no, el login responde "Invalid origin".

## Cuentas

- Admin: creado con `npm run crear:usuario` apuntando a la conexión directa de producción.
- Profesionales: desde /admin → Profesionales (o con Google, cuando esté configurado).

## Mercado Pago (suscripciones)

1. En https://www.mercadopago.com.ar/developers/panel/app crear una aplicación ("Anclaje", producto
   Suscripciones). Ahí están las credenciales de prueba y las productivas.
2. Webhook: en la app → Webhooks → Configurar notificaciones, URL
   `https://anclaje.webistudio.net/api/mercadopago/webhook`, eventos **Planes y suscripciones**
   (subscription_preapproval y subscription_authorized_payment). Copiar la **clave secreta** a
   `MP_WEBHOOK_SECRET`.
3. `MP_ACCESS_TOKEN`: el Access Token (de prueba para probar; el productivo para cobrar de verdad).
   Cargar las dos variables en Vercel como Sensitive y redeployar.
4. Probar con un usuario comprador de prueba (Cuentas de prueba) y una tarjeta de prueba: elegir un
   plan en /plan, pagar y volver. En /admin → la profesional tiene que figurar "Plan … activo".

Sin `MP_ACCESS_TOKEN` no se cobra ni se bloquea a nadie (la pantalla del plan avisa que los pagos
no están habilitados).
