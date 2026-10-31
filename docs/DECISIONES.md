# Decisiones

Registro de decisiones tomadas ante ambigüedades del documento original. La más simple que sirva,
salvo que se indique lo contrario.

## Proyecto

- **Carpeta**: el proyecto vive en la raíz de `Sentir-app/` (la carpeta en la que se abrió la sesión)
  en vez de crear una subcarpeta `sentir/`. El nombre del paquete es `sentir`.
- **Versiones**: Next.js 16.4, Prisma 7.10 (la 8 está en RC; se elige la última estable), Tailwind 4,
  Zod 4, React 19.
- **Framer Motion → `motion`**: Framer Motion se renombró a `motion` (mismo equipo y API,
  `import { motion } from "motion/react"`).
- **shadcn/ui**: los componentes se escriben a mano en `src/components/ui` siguiendo el patrón de
  shadcn (Radix + Tailwind + `cva`), así se pueden ajustar al estilo cálido de la app. Se puede seguir
  usando `npx shadcn add` para sumar componentes (hay `components.json`).

## Base de datos

- **Postgres local**: hay `docker-compose.yml` (puerto 5433). Como en esta máquina no hay Docker, hay
  además `npm run db:up`, que crea un cluster propio con los binarios de PostgreSQL instalados en
  `.pgdata/` (puerto 5433, auth `trust` solo en localhost). Así no se toca el Postgres del sistema
  (puerto 5432) ni hace falta su contraseña.
- **ShareState**: en vez de una tabla aparte, cada entrada compartible (`JournalEntry`,
  `EmotionEntry`, `CbtRecord`) tiene los mismos tres campos: `visibility`, `intention`, `sharedAt`.
  Es más simple de consultar y de filtrar por privacidad. Los enums `Visibility` y `ShareIntention`
  son los mismos para todas.
- **IDs de la rueda**: los nodos de `EmotionNode` usan slugs estables (`miedo`, `miedo.ansioso`,
  `miedo.ansioso.preocupado`) para que el seed sea idempotente y los registros no se rompan si se
  re-ejecuta. El texto visible está en `label`.
- **Renombrar nodos a futuro**: `EmotionNodeOverride (professionalId, nodeId, label)` permite que una
  profesional renombre un nodo para sus pacientes sin tocar el nodo base. Todavía no tiene UI.
- **Emociones del diario**: el diario vincula nodos de la rueda sin intensidad
  (`JournalEntryEmotion`). Si se quiere intensidad, se registra con la rueda.
- **Emociones del autorregistro**: `CbtRecordEmotion` guarda `intensityBefore` (paso 3) e
  `intensityAfter` (paso 6) por emoción, más zonas del cuerpo.
- **Temas de sesión**: se cifran (`textEnc`) porque son texto libre del paciente.

## Cifrado

- AES-256-GCM con IV aleatorio de 12 bytes. Formato del texto cifrado:
  `v<versión>:<iv b64>:<tag b64>:<datos b64>`.
- Claves en `ENCRYPTION_KEYS` como `versión:clave_base64` separadas por coma
  (ej.: `1:abc...,2:def...`) y la clave activa en `ENCRYPTION_KEY_VERSION`. Se descifra con la
  versión indicada en el propio texto, así rotar es agregar una clave nueva y cambiar la activa.
  Generar una clave: `npm run gen:key`.
- Los títulos de las entradas del diario también se cifran.

## Auth

- **Better Auth** en vez de Auth.js: NextAuth v5 sigue en beta y su proveedor de credenciales
  desaconseja email + contraseña. Better Auth trae email/contraseña, magic link, rate limiting y
  campos extra (rol) listos, con adaptador de Prisma.
- **Registro público = paciente**. Las cuentas profesionales y de admin se crean por seed (o, a
  futuro, desde el panel de admin). El rol no se puede elegir desde el formulario
  (`input: false`).
- **Magic link**: en desarrollo el link se imprime en la consola del servidor. Falta configurar un
  proveedor de email para producción (fase 4, junto con el resumen por email).
- **Rate limiting**: el de Better Auth, en memoria, con reglas más estrictas para ingreso,
  registro y magic link. Para varias instancias en producción conviene pasarlo a la DB o Redis.

## Diario

- **Editor**: textarea con barra de formato que escribe markdown simple (`**negrita**`, `- listas`,
  `1. listas`, `## títulos`) y vista previa. El render es propio y escapa HTML (sin
  `dangerouslySetInnerHTML` de input crudo), sin sumar un editor pesado.
- **Autoguardado**: la entrada se crea como borrador (`isDraft = true`) en el primer autoguardado
  (cada ~1,5 s después de dejar de escribir). Los borradores nunca son visibles para la profesional.

## Rueda

- La configuración por defecto de visibilidad sale de `SharingDefaults` del paciente (rueda:
  compartido). Se puede cambiar por entrada antes de guardar.
- Al registrar emociones de la rueda se puede elegir intención, igual que en el resto.
- Zonas del cuerpo: chips (no silueta) en esta fase. Se guardan como slugs.

## Vinculación (fase 2, propuesta)

- Al desvincularse, la profesional pierde acceso a **todas** las entradas del paciente (pasadas y
  futuras). Lo que ella haya escrito en sus notas clínicas propias se conserva, porque es su
  registro profesional.

## Urgencias

- Las líneas de ayuda están en `prisma/data/crisis-lines.json` (seed) y en la tabla `CrisisLine`,
  editables desde admin (UI de admin pendiente). **Verificar los números antes de usar en producción.**
