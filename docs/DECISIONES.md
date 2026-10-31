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
- **Cache Components desactivado**: Next 16 lo trae activado por defecto, pero obliga a envolver en
  `<Suspense>` toda lectura de cookies/sesión. Como toda la app es privada y por usuario, no aporta y
  complica; se desactivó (`next.config.ts`). Se puede adoptar más adelante ruta por ruta.
- **Modo oscuro**: sigue la preferencia del sistema (`prefers-color-scheme`). Todavía no hay selector
  manual.
- **Proxy (ex middleware)**: solo hace un chequeo optimista de la cookie de sesión. La verificación
  real de sesión y rol está en cada layout (`requirePatient` / `requireProfessional`) y en cada Server
  Action (`patientForAction`).
- **Horas en formato 24 h** ("18:05"), más natural en Argentina que "6:05 p. m.".
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
- Zonas del cuerpo: chips (no silueta) en esta fase. Se guardan como slugs **por registro** (no por
  emoción): pedirlas por cada emoción hacía el registro más lento que 15 segundos.
- **Interacción**: tocar una familia o una secundaria abre el anillo siguiente; tocar una terciaria la
  elige. Para quedarse en un nivel intermedio ("es Miedo, no sé más fino") se toca el centro de la
  rueda o el botón "Es esto: …". Tocar de nuevo la familia abierta la cierra.
- **Layout**: el segundo anillo se abre centrado en la familia (45–50° por sector) y el tercero
  centrado en la secundaria, como pétalos. Sin nada abierto, la rueda se ve más grande y "se aleja"
  al abrir un anillo.
- **Accesibilidad**: cada sector es un botón (Tab + Enter/Espacio, Escape vuelve un nivel), con
  `aria-pressed`/`aria-expanded`, región `aria-live` y la búsqueda por texto como alternativa.
- La intensidad arranca en 5 para que el registro sea rápido.

## Autorregistro TCC

- El borrador vive en el servidor (cifrado) desde el primer paso: "Empezar" crea un `CbtRecord` en
  `DRAFT` y se autoguarda en cada cambio y cada cambio de paso (`currentStep`), así se puede retomar
  desde otro dispositivo.
- Para terminarlo se piden como mínimo situación y pensamiento; el resto es opcional.
- Un autorregistro terminado queda de solo lectura (se puede cambiar quién lo ve o borrarlo).
- Una profesional solo ve autorregistros `COMPLETE` y compartidos; `sharedAt` se fija al terminar.
- La creencia antes/después arranca "sin marcar" (no se inventa un 50 %).

## Compartir sin vínculo

- Si el paciente todavía no tiene profesional vinculada, igual puede marcar entradas como
  "compartidas": se le avisa que la verá cuando se vincule. Al aceptar el consentimiento (fase 2)
  conviene mostrar cuántas entradas compartidas hay y permitir revisarlas.

## Vinculación (fase 2)

- Al desvincularse, la profesional pierde acceso a **todas** las entradas del paciente (pasadas y
  futuras). Lo que ella haya escrito en sus notas clínicas propias se conserva, porque es su
  registro profesional (puede editar notas viejas, no crear nuevas sin vínculo activo).
- Las devoluciones que el paciente ya recibió siguen visibles para él después de desvincularse.
- Códigos de invitación: 8 caracteres sin ambiguos (sin 0/O, 1/I/L), de un solo uso, 7 días.
  Se reclaman con un `updateMany` condicional dentro de una transacción para que no se usen dos
  veces. Probar códigos está limitado a 10 intentos cada 10 minutos por paciente (límite en memoria:
  en producción con varias instancias conviene Redis).
- El link `/vincular/CODIGO` es público: muestra quién invita y el consentimiento. Para aceptar hay
  que entrar o crear cuenta; ingresar/registrarse aceptan `?next=` (solo rutas internas, sin `//`).
- Re-vincularse con la misma profesional reactiva el `CareLink` existente y guarda la nueva versión y
  fecha de consentimiento.
- **El texto del consentimiento es un borrador** (`src/lib/consent.ts`, versión `2026-10-v1`): lo
  tiene que revisar la profesional y asesoría legal. Si cambia, se sube la versión.

## Panel profesional (fase 2)

- "Pide atención" = entradas compartidas con intención "Me gustaría una devolución" que todavía no
  tienen devolución de esta profesional + tareas vencidas + intensidades ≥ 8 en registros compartidos
  de los últimos 7 días. Lo que tiene alerta de intensidad va primero.
- Un paciente puede tener varias profesionales: cada una ve solo sus propias devoluciones, notas y
  tareas. El plan de calma es uno por paciente y lo editan todas las profesionales vinculadas.
- Las fichas del plan tienen autor: la profesional edita y borra las suyas, el paciente las suyas.
  La profesional puede reordenar todas (el orden es el que ve el paciente).
- La profesional puede marcar temas de "para la próxima sesión" como hablados (queda auditado).
- Auditoría: se registra `view` al abrir la ficha (con la pestaña) y cada entrada compartida, y
  `create`/`update`/`delete` de devoluciones, notas, fichas del plan, tareas, invitaciones y temas.
  Del lado del paciente se audita aceptar el consentimiento y desvincularse.
- Leer una devolución (en "Devoluciones" o debajo de la entrada) la marca como leída; la profesional
  ve "leída hoy, 18:58" o "todavía no la leyó".
- Respuestas rápidas: no se cifran (son plantillas de la profesional, sin datos del paciente).

## Biblioteca y evaluaciones (fase 3)

- **Formato de evaluación único** (`AssessmentDoc`, `src/lib/validation/assessment.ts`): lo usan el
  armador, el guardado, la exportación/importación JSON (`format: "sentir.assessment"`) y las
  plantillas. Las `key` del documento son los ids de preguntas, opciones y subescalas en la DB; al
  duplicar, versionar o importar se regeneran.
- Guardar un borrador reemplaza sus preguntas (borra y re-crea): mientras es borrador no tiene
  respuestas atadas. **Una versión publicada no se modifica nunca**: para cambiarla se crea la versión
  N+1 (copia en borrador); al publicarla, la anterior queda archivada. Las asignaciones nuevas usan la
  última publicada; las respuestas quedan atadas a la versión que respondieron.
- Las secciones se modelan como preguntas tipo "Título / texto informativo" (INFO); el modelo
  `AssessmentSection` queda sin usar.
- **Bloque Likert** = preguntas Likert consecutivas con el mismo `blockKey` y opciones compartidas
  (editar las opciones de una cambia todo el bloque). El paciente ve el bloque en una sola pantalla.
- Puntaje: el valor invertido es `mín + máx − valor`; el ítem crítico se evalúa sobre el valor
  **sin invertir** (lo que eligió el paciente); los rangos son inclusivos. El paciente ve su puntaje
  solo si la evaluación lo habilita (por defecto no).
- Ítem crítico: al enviar, el paciente ve su plan de calma y las líneas de ayuda con un texto
  tranquilo; la profesional ve "Ítem crítico en una evaluación" primero en "Pide atención".
- Las respuestas las ve **solo la profesional que asignó** la evaluación (se audita cada vista).
- Asignación única o recurrente (cada 7/14/30 días): al completar una recurrente se programa la
  próxima; la profesional puede cancelarla. Si se desvinculan, deja de aparecerle al paciente.
- **Plantillas PHQ-9 y GAD-7 sin redacción de ítems**: traen estructura, opciones 0–3, rangos e
  ítem crítico (PHQ-9 ítem 9 ≥ 1) con textos `TODO`. Publicar está bloqueado mientras haya `TODO`
  en preguntas, opciones o instrucciones. Se muestra aviso de licencias/autorización.
- "Importar PDF" se interpretó como **resultado externo**: test tomado fuera de la app con
  instrumento, fecha, puntaje, interpretación, notas (cifradas) y PDF/imagen escaneado opcional. El
  paciente no lo ve.
- Archivos: capa `src/lib/storage` con driver local (`storage/`, fuera del repo) y S3/R2 pendiente
  (fase 4). Máx. 10 MB; el tipo se detecta por los primeros bytes (PDF, PNG, JPG, WEBP), no por la
  extensión. Se sirven solo por `/api/files/...` con permiso verificado en cada pedido,
  `Cache-Control: no-store`, CSP `default-src 'none'` y `X-Frame-Options: SAMEORIGIN` (para el visor
  embebido).
- En el celular el PDF se abre con un botón (los navegadores móviles no muestran PDFs embebidos); en
  pantallas grandes se ve embebido.
- Los recursos de la biblioteca (títulos, fichas de texto) **no se cifran**: son material de la
  profesional, sin datos del paciente. Abrirlo marca la asignación como vista.

## Urgencias

- Las líneas de ayuda están en `prisma/data/crisis-lines.json` (seed) y en la tabla `CrisisLine`,
  editables desde admin (UI de admin pendiente). **Verificar los números antes de usar en producción.**
