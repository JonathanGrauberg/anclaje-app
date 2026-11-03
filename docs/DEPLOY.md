# Deploy en producción

App: https://anclaje.webistudio.net (anclaje.vercel.app redirige con 308) · Repo: github.com/JonathanGrauberg/anclaje-app (rama `main`).
Cada push a `main` despliega solo. `vercel-build` aplica migraciones y seed antes de compilar.

Los valores secretos **no** van acá: están en Vercel (Sensitive) y respaldados fuera del repo.

## Variables (Vercel → Settings → Environment Variables)

| Variable | Estado | De dónde sale |
|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | ✅ | Neon (integración de Vercel, prefijo `DATABASE`, São Paulo, plan Free) |
| `BETTER_AUTH_SECRET` | ✅ | `npm run gen:key` |
| `ENCRYPTION_KEYS` (`1:<clave>`), `ENCRYPTION_KEY_VERSION` (`1`) | ✅ | `npm run gen:key`. **Respaldada fuera de Vercel: si se pierde, se pierde todo lo cifrado** |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | ✅ solo Production | `https://anclaje.webistudio.net` |
| `STORAGE_DRIVER=s3`, `S3_BUCKET=anclaje-app`, `S3_REGION=auto`, `S3_ENDPOINT` | ✅ | Cloudflare R2, bucket privado |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | ✅ | Token de R2 "anclaje-vercel", Object Read & Write, solo ese bucket |
| `SMTP_URL` (`smtps://resend:<clave>@smtp.resend.com:465`), `EMAIL_FROM` (`Anclaje <no-responder@anclaje.webistudio.net>`) | ✅ | Resend, dominio anclaje.webistudio.net verificado (DKIM + 2 CNAME en Hostinger, región São Paulo). Clave "anclaje-vercel", solo envío |
| `CRON_SECRET` | ⏳ | `npm run gen:key`. Vercel Cron lo manda solo en cada llamada (recordatorio de turnos, `vercel.json`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | ⏳ | Google Cloud (ver `.env.example`) |
| Avisos (`NEXT_PUBLIC_NOTIFICATIONS`, VAPID, `CRON_SECRET`) | apagados | Más adelante |

## Dominio

- `anclaje.webistudio.net`: CNAME `anclaje` en el DNS de Hostinger (webistudio.net) hacia Vercel.
  Si se cambia la dirección, actualizar también `BETTER_AUTH_URL` y `NEXT_PUBLIC_APP_URL` y
  redeployar: si no, el login responde "Invalid origin".

## Cuentas

- Admin: creado con `npm run crear:usuario` apuntando a la conexión directa de producción.
- Profesionales: desde /admin → Profesionales (o con Google, cuando esté configurado).
