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

### Usuarios demo

Contraseña de todos: `sentir-demo-2026`

| Rol                    | Email                        |
| ---------------------- | ---------------------------- |
| Paciente (vinculada)   | `paciente@demo.sentir.test`  |
| Paciente (sin vínculo) | `paciente2@demo.sentir.test` |
| Profesional            | `psicologa@demo.sentir.test` |
| Admin                  | `admin@demo.sentir.test`     |

Para probar la invitación + consentimiento, entrá como `paciente2` y abrí
http://localhost:3000/vincular/PRUEBA26. Cada `npm run db:seed` deja ese código sin usar otra vez.

El magic link ("Prefiero que me manden un link") se imprime en la consola del servidor en desarrollo.

## Comandos

| Comando             | Qué hace                               |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                 |
| `npm run build`     | Build de producción                    |
| `npm run test`      | Tests de lógica (Vitest)               |
| `npm run lint`      | ESLint                                 |
| `npm run typecheck` | Tipos de rutas + `tsc`                 |
| `npm run format`    | Prettier                               |
| `npm run db:reset`  | Borra la DB, aplica migraciones y seed |
| `npm run db:studio` | Prisma Studio                          |

## Datos editables

- Rueda de las emociones: `prisma/data/emotions.json`
- Distorsiones cognitivas: `prisma/data/distortions.json`
- Líneas de ayuda: `prisma/data/crisis-lines.json` (**verificar los números antes de usar en producción**)

Después de editarlos, `npm run db:seed` (es idempotente).

## Privacidad

Los textos libres (diario, autorregistros, notas, temas de sesión) se guardan cifrados con
AES-256-GCM a nivel aplicación. **Si perdés `ENCRYPTION_KEYS`, esos datos no se pueden recuperar.**
Para rotar la clave, agregá una nueva (`1:<vieja>,2:<nueva>`) y poné `ENCRYPTION_KEY_VERSION="2"`.
