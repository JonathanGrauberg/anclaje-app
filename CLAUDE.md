# CLAUDE.md — Sentir

App (PWA) de registro emocional para pacientes de psicoterapia y su psicóloga. Ver `docs/PLAN.md`
(fases) y `docs/DECISIONES.md` (decisiones tomadas ante ambigüedades). Si tomás una decisión nueva,
anotala en DECISIONES.md.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript estricto
- Prisma 7 (cliente generado en `src/generated/prisma`, driver adapter `@prisma/adapter-pg`) + PostgreSQL
- Better Auth (email + contraseña, magic link) con roles `PATIENT` / `PROFESSIONAL` / `ADMIN`
- Tailwind CSS v4 + componentes estilo shadcn/ui en `src/components/ui` + lucide-react
- `motion` (ex Framer Motion) para la rueda y las transiciones
- React Hook Form + Zod (schemas compartidos en `src/lib/validation`)
- Recharts (gráficos), dnd-kit (armador de formularios) — a partir de las fases 3/4
- Vitest (lógica pura) + Playwright (E2E, fase 4)

## Estructura

```
prisma/
  schema.prisma        modelo de datos completo
  data/*.json          datos editables del seed (rueda, distorsiones, líneas de ayuda)
  seed.ts
src/
  app/
    (auth)/            ingresar, registrarse
    app/               lado PACIENTE (mobile-first)  → /app/...
    pro/               lado PROFESIONAL (desktop-first) → /pro/...
    api/auth/[...all]  handler de Better Auth
  components/
    ui/                primitivas (botón, card, slider, switch…)
    emotion-wheel/     la rueda de las emociones (reutilizable)
    patient/ pro/      componentes por lado
  lib/
    auth.ts            config de Better Auth (servidor)
    auth-client.ts     cliente de Better Auth
    session.ts         requireUser / requirePatient / requireProfessional
    crypto.ts          encrypt/decrypt AES-256-GCM con versionado de clave
    db.ts              cliente Prisma
    validation/        schemas Zod compartidos cliente/servidor
    actions/           Server Actions por módulo
scripts/               utilidades (DB local sin Docker, generar clave)
```

## Comandos

```bash
npm run dev          # servidor de desarrollo (http://localhost:3000)
npm run db:up        # Postgres local SIN Docker (cluster propio en .pgdata, puerto 5433)
docker compose up -d # alternativa: Postgres en Docker (mismo puerto 5433)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # carga rueda, distorsiones, líneas y usuarios demo
npm run db:reset     # borra y re-crea la DB + seed
npm run test         # Vitest
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run format       # Prettier
```

## Reglas de privacidad (NO negociables)

- Son **datos sensibles** (Ley 25.326). Ante la duda, privado.
- Todo texto libre del paciente o clínico (diario, autorregistros, notas de la rueda, notas clínicas,
  devoluciones, respuestas abiertas, temas de sesión) se guarda **cifrado** con `encrypt()` de
  `src/lib/crypto.ts`. Los campos cifrados terminan en `Enc` en el schema. Nunca guardes texto plano
  en esos campos ni lo loguees.
- Toda verificación de permisos va **en el servidor** (Server Actions / Route Handlers / Server
  Components). Ocultar en la UI no alcanza.
- Una profesional **solo** puede ver entradas con `visibility = SHARED`, `isDraft = false` (o
  `status = COMPLETE`), de pacientes con un `CareLink` `ACTIVE` con ella. Usá los helpers de
  `src/lib/access.ts`; no armes ese `where` a mano.
- El diario es privado por defecto; la rueda y el autorregistro, compartidos por defecto
  (configurable en `SharingDefaults`, override por entrada).
- Las notas clínicas (`ClinicalNote`) solo las ve su autora. Las devoluciones (`Feedback`) las ve el
  paciente.
- Toda lectura/modificación de dato clínico por parte de una profesional registra `AuditLog`.
- Validá todo input con Zod en el servidor, aunque ya se haya validado en el cliente.
- No inventes la redacción de ítems de tests validados (PHQ-9, GAD-7…): dejá TODO + placeholder.

## Idioma y tono

- Toda la UI en **español rioplatense con voseo** ("¿Qué sentiste?", "Guardá", "Probá").
- Locale `es-AR`, zona horaria `America/Argentina/Buenos_Aires` (usá `src/lib/dates.ts`).
- Lado paciente: lenguaje cercano y no clínico ("¿Cómo venís?", no "Registrar estado afectivo").
  Sin rachas, sin culpa, sin gamificación.
- Código (identificadores) en inglés; textos visibles y comentarios de dominio en español.

## Convenciones de código

- Server Actions en `src/lib/actions/<módulo>.ts` con `"use server"`; devuelven
  `{ ok: true, data } | { ok: false, error }`.
- Componentes cliente solo cuando hace falta interactividad (`"use client"` arriba).
- Mobile-first para `/app`, desktop-first responsive para `/pro`.
- Accesibilidad AA: labels, `aria-*`, foco visible, contraste, navegable por teclado.
- Commits chicos y descriptivos, en español.

## Next.js 16

@AGENTS.md
