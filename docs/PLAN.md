# Sentir — Plan por fases

Web app (PWA) para que pacientes de psicoterapia registren emociones, escriban un diario y hagan
autorregistros de TCC, y para que su psicóloga vea lo compartido, deje devoluciones, cargue material y
cree evaluaciones con puntaje clínico. Multi-profesional desde el modelo de datos.

Leyenda: ✅ hecho · 🟡 parcial · ⬜ pendiente

---

## Fase 0 — Setup ✅

- ✅ Next.js 16 (App Router) + React 19 + TypeScript estricto
- ✅ Tailwind CSS v4 + componentes estilo shadcn/ui (Radix) + lucide-react
- ✅ ESLint + Prettier
- ✅ Prisma 7 + PostgreSQL (docker-compose o cluster local sin Docker, ambos en puerto 5433)
- ✅ Modelo de datos completo (todas las entidades del documento, aunque se usen en fases posteriores)
- ✅ Auth con Better Auth: email + contraseña, magic link (en dev se loguea en consola), rate limiting,
  roles `PATIENT` / `PROFESSIONAL` / `ADMIN`
- ✅ Helper de cifrado AES-256-GCM con versionado de clave (`src/lib/crypto.ts`) + tests Vitest
- ✅ Headers de seguridad, cookies seguras, protección de rutas por rol en el servidor
- ✅ Layout base paciente (mobile-first) y profesional (desktop-first)
- ✅ Seed: rueda de emociones (desde `prisma/data/emotions.json`), distorsiones cognitivas, líneas de
  ayuda, profesional demo, paciente demo y vínculo demo
- ✅ CLAUDE.md, PLAN.md, DECISIONES.md, README

## Fase 1 — Paciente núcleo ✅

- ✅ Dashboard cálido con botones grandes y aviso "no es un servicio de urgencias"
- ✅ **Rueda de las emociones**: SVG de 3 niveles con animación, breadcrumb, volver, búsqueda,
  selección múltiple, intensidad 1–10, zonas del cuerpo (chips), nota corta, teclado + ARIA,
  sugerencia del plan de calma si intensidad ≥ 8, compartido/privado por entrada
- ✅ **Diario íntimo**: editor con negrita/listas/títulos (markdown simple), autoguardado de borrador,
  privado por defecto, compartir con intención, dejar de compartir, vincular emociones
- ✅ **Autorregistro TCC**: asistente de 7 pasos, una pregunta por pantalla, progreso, atrás,
  borrador autoguardado (servidor), distorsiones con explicación, rueda embebida, preguntas guía,
  re-evaluación con antes/después animado, compartir con intención
- ✅ **Para la próxima sesión**: lista de temas, agregar desde cualquier entrada, marcar "hablado"
- ✅ **Botón de ayuda urgente** fijo, con líneas de crisis desde la DB
- 🟡 "Mi plan de calma", "Mis tareas", "Mis patrones": pantallas con estado vacío (se completan en
  fases 2–4). El plan de calma ya muestra líneas de ayuda y una respiración guiada básica.

## Fase 2 — Vínculo + panel profesional ⬜

- Invitación por código/link con expiración; aceptar + consentimiento informado (fecha + versión)
- Desvincularse; configuración de permisos por módulo (`SharingDefaults`) con override por entrada
- Dashboard profesional: lista de pacientes, "pide atención" (devoluciones pendientes, tareas
  vencidas, evaluaciones sin revisar), alertas de ítems críticos
- Ficha del paciente: línea de tiempo filtrable de lo compartido
- Devoluciones (+ respuestas rápidas, adjuntar recurso, "lo vemos en sesión")
- Notas clínicas privadas cifradas
- Editor del plan de calma (fichas) + fichas propias del paciente
- Tareas con fecha límite; el paciente las tilda y comenta
- Log de auditoría en cada lectura/modificación de dato clínico por parte de la profesional

## Fase 3 — Biblioteca + evaluaciones ⬜

- Biblioteca: PDFs/imágenes/links/fichas de texto; capa `storage` (local en dev, S3/R2 en prod);
  asignación y "visto"; visor PDF embebido
- Motor de puntajes puro `src/lib/scoring` con Vitest (suma/promedio/ponderada, subescalas,
  invertidos, ítems que no suman, críticos, rangos)
- Armador de evaluaciones con dnd-kit, vista previa celular/desktop, borrador/publicar/versionar,
  duplicar, bloque de escala Likert
- Asignación única o recurrente
- Respuesta del paciente: una pregunta/bloque por pantalla, guardado parcial, cierre amable,
  plan de calma + líneas si se activa un ítem crítico
- Importar: plantillas PHQ-9 y GAD-7 (estructura completa, textos de ítems como TODO), PDF,
  resultado externo, JSON propio. Aviso de licencias.

## Fase 4 — Patrones y pulido ⬜

- Gráficos (Recharts) paciente y profesional
- PWA instalable (manifest + service worker), Web Push y recordatorios sin gamificación
- Resumen por email (diario/semanal/nunca)
- Exportar datos (JSON + PDF) y borrar cuenta
- Tests E2E con Playwright de flujos críticos
- Revisión de accesibilidad AA
