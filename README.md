# Sentir

Web app (PWA) para que pacientes de psicoterapia registren emociones, escriban un diario y hagan
autorregistros de TCC, y para que su psicóloga vea lo compartido. Ver [`docs/PLAN.md`](docs/PLAN.md)
y [`docs/DECISIONES.md`](docs/DECISIONES.md).

## Requisitos

- Node.js 20.19+ (probado con 24)
- PostgreSQL: **Docker** o una instalación local de PostgreSQL (se usan sus binarios, no su servicio)

## Cómo levantarlo

```bash
npm install
cp .env.example .env        # y completá las claves (ver abajo)
```

Generá dos claves y pegalas en `.env` (`BETTER_AUTH_SECRET` y la de `ENCRYPTION_KEYS="1:<clave>"`):

```bash
npm run gen:key
```

### Base de datos (elegí una)

**Con Docker** — `DATABASE_URL="postgresql://sentir:sentir@localhost:5433/sentir"`

```bash
docker compose up -d
```

**Sin Docker** (usa los binarios de PostgreSQL instalados; crea un cluster propio en `.pgdata/`) —
`DATABASE_URL="postgresql://sentir@localhost:5433/sentir"`

```bash
npm run db:up
```

Ambas usan el puerto **5433** para no chocar con un Postgres del sistema. `npm run db:down` detiene el
cluster local.

### Migraciones, seed y servidor

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Abrí http://localhost:3000.

El seed carga los usuarios demo solo si la base es local (`localhost`). Para forzarlo o evitarlo:
`SEED_DEMO=true` / `SEED_DEMO=false`.

### Cuentas del equipo

El registro público solo crea pacientes. Las profesionales las da de alta un admin desde
**/admin → Profesionales**. El primer admin se crea por consola:

```bash
npm run crear:usuario -- --rol admin --email vos@tu-dominio --nombre "Tu Nombre"
npm run crear:usuario -- --rol profesional --email lic@tu-dominio --nombre "Lic. X" --matricula "MN 123"
```

Imprime una contraseña temporal una sola vez; se cambia en **Ajustes → Contraseña**. Con
`--con-perfil-profesional` un admin también puede atender pacientes.

### Avisos, emails y tareas programadas (opcional en dev)

- **Avisos push**: `npm run gen:vapid` y pegá las claves en `.env`. Se activan en Ajustes → Avisos.
  En iPhone hace falta instalar la app (Compartir → Agregar a inicio).
- **Emails**: sin `SMTP_URL` se imprimen en la consola del servidor (magic link y resumen).
- **Tareas programadas**: recordatorios y resumen por email. En producción, un cron externo (Vercel
  Cron, GitHub Actions…) hace `POST /api/cron/recordatorios` y `POST /api/cron/resumen` cada 5–15
  minutos con `Authorization: Bearer $CRON_SECRET`. En dev: `npm run cron` (con `npm run dev`
  corriendo).

### Tests E2E

```bash
npx playwright install chromium   # una sola vez
npm run db:seed
npm run test:e2e                  # levanta `npm run dev` si no está corriendo
```

Incluyen ingreso, privacidad (diario privado), evaluación con ítem crítico de punta a punta, crear
cuenta → exportar → borrar, y una revisión automática de accesibilidad (axe, WCAG 2.1 AA) de todas
las pantallas en modo claro y oscuro.

### Usuarios demo

Contraseña de todos: `sentir-demo-2026`

| Rol                    | Email                        |
| ---------------------- | ---------------------------- |
| Paciente (vinculada)   | `paciente@demo.sentir.test`  |
| Paciente (sin vínculo) | `paciente2@demo.sentir.test` |
| Profesional            | `psicologa@demo.sentir.test` |
| Admin                  | `admin@demo.sentir.test`     |

El admin entra a **/admin** (profesionales, líneas de ayuda, plantillas, auditoría). No ve datos
clínicos.

Para probar la invitación + consentimiento, entrá como `paciente2` y abrí
http://localhost:3000/vincular/PRUEBA26. Cada `npm run db:seed` deja ese código sin usar otra vez.

Para ver evaluaciones: como `psicologa`, en **Evaluaciones** armá una (o importá un JSON), publicala
y asignala desde la ficha de Sofía → pestaña Evaluaciones. Después entrá como `paciente` → **Mis
tareas**.

El magic link ("Prefiero que me manden un link") se imprime en la consola del servidor en desarrollo.

## Comandos

| Comando                 | Qué hace                               |
| ----------------------- | -------------------------------------- |
| `npm run dev`           | Servidor de desarrollo                 |
| `npm run build`         | Build de producción                    |
| `npm run test`          | Tests de lógica (Vitest)               |
| `npm run test:e2e`      | Tests E2E + accesibilidad (Playwright) |
| `npm run cron`          | Tareas programadas en dev              |
| `npm run crear:usuario` | Alta de admin/profesional por consola  |
| `npm run gen:vapid`     | Claves para avisos push                |
| `npm run lint`          | ESLint                                 |
| `npm run typecheck`     | Tipos de rutas + `tsc`                 |
| `npm run format`        | Prettier                               |
| `npm run db:reset`      | Borra la DB, aplica migraciones y seed |
| `npm run db:studio`     | Prisma Studio                          |

## Datos editables

- Rueda de las emociones: `prisma/data/emotions.json`
- Distorsiones cognitivas: `prisma/data/distortions.json`
- Líneas de ayuda: `prisma/data/crisis-lines.json` (**verificar los números antes de usar en producción**)
- Plantillas de evaluaciones (PHQ-9, GAD-7): `prisma/data/templates.ts`. Traen estructura y puntaje,
  **no la redacción de los ítems** (quedan como `TODO`; no se pueden publicar hasta reemplazarlos por
  el texto de la versión validada que tengas autorizada).

Después de editarlos, `npm run db:seed` (es idempotente).

## Privacidad

Los textos libres (diario, autorregistros, notas, temas de sesión) se guardan cifrados con
AES-256-GCM a nivel aplicación. **Si perdés `ENCRYPTION_KEYS`, esos datos no se pueden recuperar.**
Los archivos subidos (PDF/imagen) se guardan en `storage/` (fuera del repo) y solo se sirven por
`/api/files/...`, que verifica permisos en cada pedido.
Para rotar la clave, agregá una nueva (`1:<vieja>,2:<nueva>`) y poné `ENCRYPTION_KEY_VERSION="2"`.
