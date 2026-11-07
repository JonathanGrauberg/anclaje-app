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

- **Archivar en vez de borrar:** una evaluación con respuestas no se borra (es historia clínica).
  Se archiva: sale de la lista, no se puede asignar y se cortan sus asignaciones activas (al
  paciente no le aparece más como pendiente). Las respuestas siguen en la ficha de cada paciente y
  en "Respuestas". Desarchivar no reactiva asignaciones.
- **Respuestas de todos los pacientes en un solo lugar** (`/pro/evaluaciones?vista=respuestas`):
  filtros por evaluación, paciente y "sin revisar / con ítem crítico". Solo respuestas de
  evaluaciones que asignó esa profesional a pacientes con vínculo activo. Ver la lista queda en la
  auditoría (`AssessmentResponseList`).

## Patrones, avisos y datos (fase 4)

- **Gráficos**: una serie por gráfico, color primario (las emociones llevan además el punto de
  color de la rueda, nunca solo color), tooltip y siempre "Ver como tabla". Períodos 30 días /
  3 meses / 1 año; más de un mes se agrupa por semana. Días sin registros quedan como hueco (no se
  inventan valores). Todo en hora de Buenos Aires. Textos sin juicio: "no hay valores buenos ni
  malos".
- La profesional ve una pestaña **Patrones** con los mismos gráficos **solo de lo compartido**
  (`sharedEmotionWhere`) y la evolución de puntajes de las evaluaciones **que ella asignó**.
- Para la demo, el seed agrega ~2 meses de registros de la rueda a Sofía (sin textos).
- **PWA**: manifest + íconos generados del logo. El service worker **no cachea nada con datos**:
  solo la página "Sin conexión" e íconos; las navegaciones van siempre a la red. Si no hay red se
  muestra esa página con el 911 y el 135.
- **Avisos push**: solo recordatorios para el paciente, opt-in, un dispositivo o varios. Como mucho
  uno por día, en la hora y días que elige (ventana de 2 h por si el cron se atrasa). El texto es
  genérico y amable, rota entre tres, y **nunca incluye datos del paciente** (se ve en la pantalla
  bloqueada). Sin rachas ni "hace N días que no registrás". Suscripciones vencidas (404/410) se
  borran solas.
- **Resumen por email** de la profesional (diario / semanal los lunes / nunca, por defecto nunca),
  desde las 8. Solo cuenta cosas (devoluciones pedidas, evaluaciones sin revisar, ítems críticos,
  intensidad alta, tareas vencidas) **sin nombres ni contenido**. Si no hay nada, no se manda.
- Tareas programadas por HTTP (`/api/cron/[job]`, `Authorization: Bearer CRON_SECRET`, comparación
  en tiempo constante) para no depender de la plataforma. Son idempotentes (`lastSentAt`,
  `lastDigestAt`): se marca antes de enviar para no reintentar en loop.
- Emails por SMTP genérico (nodemailer): sirve con cualquier proveedor. Sin `SMTP_URL` en dev van a
  la consola; en producción es un error.
- **Exportar mis datos** (Ley 25.326, derecho de acceso): JSON (`format: "sentir.patient-export"`)
  y PDF legible, descifrados y con nombres de emociones. Incluye todo lo que el paciente escribió o
  recibió (rueda, diario, autorregistros, temas, devoluciones, plan de calma, tareas, material,
  cuestionarios). **No incluye** las notas clínicas (son de la profesional) ni los resultados
  externos (el paciente no los ve en la app). Queda en el AuditLog.
- **Borrar cuenta**: solo pacientes, con contraseña + escribir "BORRAR". Se borra todo en cascada
  (incluidas las notas clínicas y devoluciones sobre ese paciente) y los archivos asociados. Quedan
  los registros de auditoría de accesos de la profesional (solo ids). **A revisar con asesoría
  legal**: la profesional puede tener obligación de conservar su historia clínica (Ley 26.529) por
  fuera de la app. Las cuentas profesionales se dan de baja con el equipo.
- Storage S3/R2 implementado (`STORAGE_DRIVER=s3`): bucket privado, cifrado en reposo (SSE AES256),
  los archivos se siguen sirviendo solo por `/api/files` con permisos.
- **Accesibilidad**: axe (WCAG 2.1 AA) corre en E2E sobre todas las pantallas en claro y oscuro.
  Arreglos: el verde primario pasó de `#46756a` a `#426f64` (contraste 4.4 → 4.8 sobre el verde
  suave), el link del logo usa su texto visible como nombre, y la búsqueda de la rueda no apunta a
  una lista que no existe. Falta una pasada manual con lector de pantalla.
- E2E: el ingreso tiene límite de 5 intentos por minuto, así que los tests ingresan una vez por rol
  y reusan la sesión (`e2e/.auth`, fuera de git).

## Administración y despliegue

- **El admin no ve datos clínicos.** El panel `/admin` muestra solo conteos agregados, cuentas
  profesionales, líneas de ayuda, plantillas y el log de auditoría (quién, qué tipo de dato, cuándo;
  nunca contenido). De los pacientes la auditoría muestra un id corto, no el nombre. Si un admin
  también atiende, tiene perfil profesional y usa `/pro` con las mismas reglas que cualquier
  profesional (solo sus pacientes vinculados).
- **Cuentas del equipo con contraseña temporal.** El registro público solo crea pacientes. Las
  profesionales las crea un admin (o `npm run crear:usuario`, para el primer admin): se genera una
  contraseña temporal que se muestra una sola vez y se pasa por un canal seguro; se cambia en
  Ajustes. El admin puede generar una nueva (cierra las sesiones de esa profesional); no aplica a
  otros admins. No se envía por email a propósito: el email no es un canal seguro para eso.
- **Baja de profesionales: manual por ahora.** Borrar una profesional borraría en cascada sus
  vínculos, devoluciones y notas; antes hay que decidir qué pasa con sus pacientes. Queda fuera del
  panel hasta definir el proceso.
- **Plantillas del sistema:** el admin sube un JSON de Sentir y queda publicada como plantilla
  (`ownerId = null`). Las profesionales hacen una copia propia al usarla, así que borrar la
  plantilla no afecta esas copias. No se puede borrar si alguien la respondió directamente.
- **Seed:** los usuarios demo (contraseña conocida) solo se cargan si la base es local, salvo
  `SEED_DEMO=true`. En producción el seed carga solo rueda, distorsiones, líneas y plantillas.
- **Migraciones con URL directa:** con un pooler (Neon/Supabase) las migraciones van por
  `DIRECT_DATABASE_URL`; la app usa `DATABASE_URL` (con pooler).

## Turnos, historia clínica y emails

- **Turnera sencilla.** La psicóloga carga turnos (sueltos o semanales, hasta 6 meses) desde
  `/pro/agenda` o desde la ficha del paciente. El paciente los ve en el inicio y en "Mis turnos" y
  puede tocar "No puedo ir": el turno queda cancelado y en la agenda se ve "Avisó que no puede
  venir". Sin reprogramación por parte del paciente (lo arreglan entre ellos). Al desvincularse se
  cancelan los turnos futuros. El turno no guarda contenido clínico (fecha, modalidad, lugar/link).
- **Historia clínica = ficha + evolución.** La ficha (`ClinicalRecord`, una por profesional y
  paciente) tiene motivo de consulta, antecedentes, medicación, diagnóstico, plan y contacto de
  emergencia, todo cifrado. La evolución son las notas clínicas que ya existían. Solo la ve su
  autora (ni el paciente ni el admin), cada cambio y cada descarga del PDF quedan en la auditoría.
  **Pendiente legal:** la Ley 26.529 pide que la historia clínica sea inalterable; hoy las notas se
  pueden editar y borrar. Antes de usarlo como historia clínica oficial, revisar con asesoría si
  hace falta guardar versiones en vez de editar.
- **Avisos y resumen por email, apagados** (`NEXT_PUBLIC_NOTIFICATIONS`). El código queda; se
  prenden cuando se decida (y más adelante, WhatsApp). Los emails propios de la cuenta (recuperar
  contraseña, link para entrar) siguen: son necesarios y entran en el plan gratis de Resend.
- **Recuperar contraseña:** link de un solo uso que vence en 1 hora; al usarlo se cierran las otras
  sesiones. La pantalla no dice si el email tiene cuenta (para no revelar quién usa la app).

## Urgencias

- Las líneas de ayuda están en `prisma/data/crisis-lines.json` (seed) y en la tabla `CrisisLine`,
  editables desde **/admin → Líneas de ayuda**. **Verificar los números antes de usar en producción.**
- Una línea puede tener un **WhatsApp** opcional (se abre con `wa.me`). Se sumó el Hospital Escuela
  de Salud Mental de Paraná (tel. y WhatsApp de hesm.gob.ar/contacto). No se le puso "24 h" porque
  la página no lo dice. El seed ya no se saltea si hay líneas: agrega solo las que falten por
  nombre (no pisa lo editado en el admin; si se borra una del seed, vuelve al correr el seed).
  Siempre tiene que quedar al menos una activa (no se puede borrar ni desactivar la última).

## Nombre: de "Sentir" a ".anclaje"

- La app se llama **Anclaje** ("Sentir" ya existía). En el logo y en el ícono de la pantalla de
  inicio se escribe **.anclaje** (con punto, en minúscula); en las frases, "Anclaje".
- Los JSON exportados ahora dicen `anclaje.assessment` / `anclaje.patient-export` y los archivos
  terminan en `.anclaje.json`. Al importar se sigue aceptando `sentir.assessment`.
- Se dejan igual, porque no los ve nadie: el usuario y la base local (`sentir`), los emails demo
  (`@demo.sentir.test`), la contraseña demo y el nombre de la carpeta del proyecto.
- **Logo:** un faro minimalista sobre el agua, en el verde de la app. La luz es un círculo
  naranja, el mismo que hace de punto en ".anclaje". La torre está partida por un hueco (la
  franja del faro), así funciona sobre cualquier fondo. Las formas están en `src/lib/brand.ts`
  y las usan el logo, los íconos PNG y el de la pestaña (`src/app/icon.tsx`).
- **Carga:** `LighthouseLoader` muestra el faro con la luz girando, en los `loading.tsx` de
  `/app`, `/pro` y `/admin`. Si la persona pidió menos movimiento, la luz queda quieta.

## Pacientes sin la app y calendario de la agenda

- **Paciente "sin la app":** la profesional puede cargar un paciente que no tiene cuenta, desde
  "Agregar paciente" o al dar un turno ("+ Paciente nuevo, sin la app"). Sirve para usar Anclaje
  como agenda e historia clínica también con pacientes ocasionales.
  - Es un `PatientProfile` con `userId` null y `managedById` = la profesional. Tiene un
    `CareLink` ACTIVE sin consentimiento (`consentVersion` y `consentAcceptedAt` en null): no hay
    nada compartido que ver, solo lo que carga ella.
  - El contacto (teléfono o mail) se guarda cifrado en `contactEnc`.
  - Su ficha muestra solo "Historia clínica". En listados y agenda lleva la marca "Sin la app".
- **Invitarlo:** desde su ficha, "Invitar a la app" genera un código con `Invitation.patientId`.
  Cuando la persona acepta con su cuenta (nueva o existente), `mergeManagedPatient` pasa a esa
  cuenta los turnos, la ficha, la evolución, las tareas, etc., y borra el perfil provisorio.
  Si ya había una ficha con esa profesional, se completan solo los campos vacíos.
  - Al aceptar, ve sus turnos en la app. Las notas clínicas siguen siendo solo de la profesional.
- **Calendario:** la agenda tiene un calendario del mes armado en el servidor (links `?dia=` y
  `?mes=`, sin JavaScript). Los días con turnos llevan un punto. Al elegir un día se listan sus
  turnos y el formulario propone ese día a las 9.
- **Dar de baja** (paciente sin la app, desde su ficha): se cancelan sus turnos futuros. Si no
  tiene historia clínica (ficha ni notas) se borra del todo. Si tiene, se archiva (`CareLink`
  REVOKED): la historia se conserva (Ley 26.529) y aparece en "Agregar paciente → Dados de baja",
  desde donde se puede reactivar.

## Marca, panel de uso e ingreso con Google (nov 2026)

- **Marca:** el dorado de la luz y del punto es `#fcc107` (el mismo de webi y .budgets). El punto
  delante de "anclaje" es el punto de la tipografía, de tamaño normal, en dorado (igual que
  .budgets; antes era un círculo del alto de la "x"). Manual de marca y logos en `docs/marca`
  (se regeneran con `scripts/generar-marca.py`).
- **Panel de admin (Resumen):** solo números agregados, separados en profesionales y pacientes:
  cuentas, activos en 7 y 30 días, pacientes sin la app, uso de los últimos 30 días y altas por mes.
  De los pacientes **no** se lista nadie (ni nombre ni email): saber que alguien hace terapia es un
  dato sensible y el admin no lo necesita para controlar el uso. Las profesionales sí se listan
  una por una (email, matrícula, pacientes con y sin la app, último uso).
- **"Activo"** = abrió la app en el período. Se guarda solo `user.lastLoginAt` (al iniciar sesión)
  y `user.lastActiveAt` (como mucho una escritura por hora, en `requireUser`). No se registra qué
  pantallas mira ni cuánto tiempo.
- **Google, solo profesionales:** quien se registra con Google queda con rol `PROFESSIONAL` (hook
  `user.create.before` cuando la ruta es `/callback/…`) y antes de entrar al panel completa su
  matrícula en `/alta-profesional` (jurisdicción + número, con declaración jurada). Un paciente no
  puede sumar Google a su cuenta (hook `account.create.before`). Una profesional que ya tenía
  email y contraseña puede entrar con Google si es el mismo email.
- **Matrícula única:** `@@unique([licenseJurisdiction, licenseNumber])`, con el número normalizado
  a dígitos (así "M.P. 1.234" y "1234" son la misma). Si ya existe, no deja darse de alta y pide
  escribir al equipo.
- **Verificación:** el alta con Google queda "Sin verificar" (`verifiedAt` null) pero puede usar la
  app desde el primer momento (confianza + declaración jurada). El admin ve el aviso en el Resumen
  y la marca como verificada desde Profesionales después de chequear con el colegio. Las cuentas
  que crea el admin nacen verificadas. No hay verificación automática: los colegios no tienen una
  API pública unificada.

## Deploy en Vercel

- Vercel corre `vercel-build` en vez de `build`: aplica las migraciones pendientes
  (`prisma migrate deploy`, por la conexión directa), corre el seed (idempotente: rueda,
  distorsiones, plantillas y líneas que falten; sin usuarios demo porque la base no es localhost)
  y recién después compila. Así la base de producción nunca queda atrasada respecto del código.

## Mails de turnos, bienvenida y vinculación · landing (nov 2026)

- **Recordatorio de turno:** Vercel Cron llama a `/api/cron/turnos` una vez por día a las 10 (13 UTC)
  y manda un mail por cada turno de mañana. Al paciente con la app, a su mail de la cuenta; al que
  no la tiene, solo si la profesional cargó un mail en el contacto (se busca dentro del texto
  cifrado). Cada turno se marca con `reminderSentAt` antes de enviar: no se repite aunque el cron
  corra dos veces. La profesional lo apaga para todos (`appointmentReminders`) y cada paciente para
  sí (`appointmentEmails`). No depende de `NEXT_PUBLIC_NOTIFICATIONS`: solo de SMTP y `CRON_SECRET`.
- **Bienvenida:** al crear una profesional desde el admin o al completar el alta con Google. Nunca
  lleva la contraseña temporal (esa la pasa el admin por otro canal).
- **Vinculación:** cuando un paciente acepta la invitación, la profesional recibe un aviso **sin el
  nombre del paciente**, igual que el resumen: el mail no es un canal seguro para eso.
- Los mails fallidos de bienvenida/vinculación no frenan la acción (`sendEmailQuietly`).
- **Landing (`/`):** pública e indexable (el resto sigue `noindex`). Quien tiene sesión va directo a
  su inicio. No promete cifrado "de punta a punta" ni que "nadie puede leerlo": dice lo que es
  verdad (cifrado AES-256 en reposo, comparte el paciente, el admin no ve nada clínico, auditoría).
- **Interesados (`Lead`):** el formulario de la landing guarda nombre, mail, WhatsApp, provincia y
  mensaje, con consentimiento explícito, campo trampa contra bots y límite por IP. Avisa por mail a
  los admins y se gestiona en /admin/interesados. Por ahora el alta de profesionales sigue siendo
  manual (admin) hasta que estén Google y los planes.
- **Favicon:** `src/app/icon.svg` sin fondo, verde en modo claro y blanco en modo oscuro (media query
  dentro del SVG). El ícono de iPhone y los de la PWA siguen con fondo crema, que es lo que piden.
- **WhatsApp:** sin la API de Meta (cobra cada mensaje que inicia la app) ni bots no oficiales
  (contra las reglas, riesgo de bloqueo del número). La app arma un link `wa.me` con el texto escrito
  y la profesional lo manda desde su número: recordar turno, avisar cancelación, mandar invitación.
  El texto no lleva nada clínico. Si el paciente sin la app tiene celular en su contacto, abre su
  chat; si no (o si usa la app, que no guarda teléfono), WhatsApp deja elegir el chat.
- **Datos personales en Ajustes:** paciente (nombre) y profesional (nombre visible y matrícula) los
  corrigen ellos mismos. Si la profesional cambia la matrícula, vuelve a "sin verificar" (completar la provincia que el admin no cargó, con el mismo número, no cuenta como cambio). El email no
  se cambia desde la app (es el usuario de ingreso): por ahora lo hace el equipo a pedido.
- **Avisos de seguridad:** al cambiar datos personales o la contraseña (desde Ajustes o con
  "olvidé mi contraseña") llega siempre un mail y un aviso al celular, sin opción de apagarlos:
  "si no fuiste vos…" lleva a cambiar la contraseña (o a recuperarla, si lo que cambió fue la
  contraseña). Cambiar o recuperar la contraseña cierra las sesiones abiertas en otros lados.
- **Celular:** se carga en Datos personales con el país aparte y la cantidad de números controlada
  (Argentina: 10, área sin 0 + número sin 15; si se cuelan el 0 o el 15, se sacan solos). Se guarda
  cifrado (`User.phoneEnc`) y ya listo para wa.me (549… en Argentina). El del paciente lo ve su
  profesional en la ficha y lo usan los botones de WhatsApp; el de la profesional no lo ven los
  pacientes. Opcional para todos.
- **Honorarios:** cada profesional tiene su lista de precios (arranca una sola vez con valores de
  referencia de noviembre de 2026, que edita, borra o amplía; editables directo en la grilla, se
  guardan solos). En la ficha de cada paciente puede poner un precio especial por servicio (vacío
  = el de la lista). "Registrar cobro" (en Honorarios y en la ficha) propone el último servicio que
  se le cobró a ese paciente y su precio; el monto se puede cambiar. Montos en pesos enteros. Es
  solo de la profesional: el paciente no ve nada. No hay texto libre en los cobros (el concepto es
  el nombre del servicio o "Otro"), así no se cuelan detalles clínicos sin cifrar. Si el paciente
  borra su cuenta, el cobro queda sin paciente (es el registro contable de ella); un paciente sin
  la app con cobros se archiva en vez de borrarse. Por ahora no hay "pendiente de cobro" (haría
  falta marcar asistencia en los turnos).
- **Landing con fotos (nov 2026):** hero a pantalla completa con el consultorio verde, el faro 3D y
  la forma redondeada oscura (recursos del diseño, en `public/landing/` como WebP); tarjetas
  "Para vos" / "Para tus pacientes" con su living; sección de seguridad con el sillón. Las fotos
  son decorativas (`alt=""`). Los originales están en la carpeta de trabajo "Utilidades landing".
- **Lanzamiento gratis (nov 2026):** la landing muestra "Gratis hasta el 30 de noviembre · quedan N
  días" en el hero y un contador en #probar. La fecha vive en `FREE_UNTIL` de `src/lib/launch.ts`
  (inclusive, hora de Buenos Aires); pasada la fecha, el contador desaparece solo. El link para
  difundir es `/#probar`, que lleva directo al formulario.
- **Imagen al compartir (nov 2026):** `src/app/opengraph-image.jpg` (1200×630, ~80 KB para que
  WhatsApp la muestre) con el consultorio, el faro 3D, el logo blanco y el lema. Es estática, sin
  fecha, así no queda vieja cuando termine el período gratis. `metadataBase` sale de
  `NEXT_PUBLIC_APP_URL`. Si se cambia la imagen, WhatsApp puede tardar en refrescar su caché.
- **Diseño "nuevo" en prueba (nov 2026):** el lado paciente tiene un segundo diseño (fondo más
  claro, bloques de color grandes en dorado/salvia/verde, bordes más redondos, dibujos 2D del
  sillón, el cuaderno, el faro y la planta en `src/components/illustrations`, y barra de abajo con
  la rueda en el medio). Se prende por navegador con `/diseno?v=nuevo` y se apaga con
  `/diseno?v=clasico` (cookie `anclaje-diseno`); nadie más lo ve. Los colores son variables
  `--block-*` en `globals.css`, con su versión oscura. Por ahora cambia el inicio y la barra; las
  demás pantallas toman el fondo y los bordes nuevos. Si queda, se pasa a ser el diseño por defecto.
- **Rueda con colores más vivos (nov 2026):** los seis colores de familia pasan de pastel a tonos
  más saturados del mismo matiz, y los niveles 2 y 3 se aclaran menos (25 % y 45 % en vez de 35 % y
  60 %). Se mantiene el texto oscuro con contraste AA. El seed (que corre en cada deploy) actualiza
  los colores en la base.
- **Diseño "nuevo", segunda vuelta:** sin el "+" grande (no todas las terapias usan la rueda): la
  barra es una pastilla chica flotante y solo la sección actual muestra su nombre. Las pantallas
  internas usan `PageHeader` con `tone` (sage/sun/forest/night) que en el diseño nuevo se dibuja
  como encabezado de color; las `Card` pierden el borde y ganan sombra. Todo con la variante de
  Tailwind `nuevo:`, así el diseño actual y el lado profesional no cambian.
- **El diseño nuevo pasa a ser el predeterminado (nov 2026):** todas las pacientes ven el diseño
  nuevo. Quien prefiera el anterior puede volver con `/diseno?v=clasico` (guarda la cookie
  `anclaje-diseno=clasico` en ese navegador) y regresar con `/diseno?v=nuevo` (la borra). El
  diseño clásico queda en el código por ahora; si nadie lo usa, se puede borrar más adelante.
- **No decimos si un email tiene cuenta (nov 2026):** al ingresar, el error es "El email o la
  contraseña no coinciden"; al pedir link o recuperar la contraseña, el mensaje es el mismo exista
  o no la cuenta, con la sugerencia de revisar cómo está escrito. Decir "este mail no existe"
  dejaría averiguar quién se atiende con una psicóloga en Anclaje (dato sensible). Para que no
  lleguen links inútiles, el link de ingreso solo se manda si el email tiene cuenta (la
  recuperación de contraseña ya lo hacía), y un link vencido vuelve a /ingresar con un aviso.
- **Diseño nuevo también en el panel profesional (nov 2026):** misma cookie y misma variante
  `nuevo:` que el lado paciente. Barra lateral verde noche con la sección actual en dorado, inicio
  con un bloque dorado (saludo, próximo turno, cuántos pacientes piden atención y el sillón) y
  encabezados de color en cada sección. La ficha del paciente tiene su cabecera en salvia suave.
  Las tarjetas con alerta (intensidad alta, ítem crítico) conservan el borde rojo.
- **Landing: "Lo que ve tu paciente" (nov 2026):** casi todas las profesionales preguntan qué ve
  el paciente. Sección con tres capturas reales de la app (inicio, rueda, próxima sesión) con la
  paciente de ejemplo, en marco de celular; en mobile se deslizan de costado. Las capturas se
  sacan con Playwright + Edge contra el local (390×844 a 2x, webp) y viven en `public/landing/`.
  Si cambia el diseño, hay que volver a sacarlas.
- **Modo claro por defecto, oscuro a elección (nov 2026):** antes el modo seguía al sistema. Ahora
  todos ven el claro (queda mejor con la marca) y hay un botón sol/luna en el encabezado del
  paciente y en la barra del panel. La elección se guarda en el navegador (`localStorage`,
  `anclaje-modo`) y un script en `<head>` la aplica antes de pintar. La variante `dark:` de
  Tailwind y los tokens oscuros dependen de `data-mode="dark"` en `<html>`.
- **Barra del paciente con muesca (nov 2026):** barra verde noche flotante; la sección activa sube
  en un círculo dorado y la barra tiene un recorte (máscara radial) que lo sigue con un resorte
  (`motion`, respeta "reducir movimiento"). Debajo del círculo va el nombre de la sección.
- **Landing: seis pantallas del paciente + "Y vos, desde tu panel" (nov 2026):** se suman
  autorregistro, plan de calma y tareas/evaluaciones, y un bloque que explica qué controla cada
  uno (qué se comparte, tareas, plan de calma, evaluaciones con puntaje automático, devoluciones)
  con la captura del resultado de una evaluación. Sobre los tests decimos "puntaje automático
  incluido" y aclaramos con asterisco que el PHQ-9 y el GAD-7 vienen con puntuación y rangos, pero
  el texto de los ítems lo pone la profesional (no podemos publicarlo). No se promete que sea
  parte de un plan pago o gratis hasta definir los planes.
- **Paciente de ejemplo "Sofía (DEMO)" y "Ver como paciente" (nov 2026):** casi todas las
  profesionales preguntan qué ve el paciente. Cada profesional tiene, la primera vez que entra al
  panel, una paciente demo con dos semanas de registros (rueda, autorregistro, diario privado y
  compartido, temas, tareas, plan de calma y una devolución). Se crea una sola vez
  (`ProfessionalProfile.demoCreatedAt`): si la borra, no vuelve. La usuaria demo no tiene
  contraseña y su mail es `demo-<id>@demo.anclaje.invalid` (dominio reservado): `sendEmail` nunca
  le escribe. "Ver la app como paciente" (`/demo/ver`) no cambia de sesión: pone una cookie con el
  id de la demo y `requirePatient` / `patientForContentAction` la aceptan solo si la paciente es
  `isDemo` y tiene vínculo activo con quien la pide (se verifica en cada request). Las acciones de
  cuenta, vínculos y notificaciones siguen usando `patientForAction`, que rechaza la demo. En la
  demo no se muestran los Ajustes ni "Salir". Las demos no cuentan en las métricas del admin, y no
  tienen que contar para el límite de pacientes cuando haya planes.
- **Landing: botón de Ayuda (nov 2026):** bloque que explica el botón de Ayuda con la captura del
  panel abierto. Se nombran las líneas nacionales (911, SAME 107, Asistencia al Suicida 135 en
  CABA/GBA y 0800-345-1435 en todo el país); el Hospital Escuela de Paraná figura como ejemplo de
  línea local, siempre con su zona aclarada, así nadie de otra provincia cree que es la suya.
- **Precios en la landing (nov 2026):** "Gratis hasta el X" se leía raro sin precio. Ahora el hero
  dice "Obtené la app gratis hasta el 30 de noviembre" y abajo "Desde diciembre, $20.000 por mes",
  y hay una sección de planes: 1 mes ($20.000/mes), 6 meses ($18.000/mes, −10 %, $108.000) y 1 año
  ($15.000/mes, −25 %, $180.000). Mientras dura el período gratis los precios van tachados con
  "Gratis hasta el 30 de noviembre"; después se muestran normales. Los tres planes incluyen todo
  (sin límite de pacientes anunciado). Los precios viven en `PLANS` de `src/lib/launch.ts`.
  Todavía no hay cobro: no se pide tarjeta.
- **Quien se suma hasta el 30 de noviembre, gratis para siempre (nov 2026):** corrige la entrada
  anterior: no es "gratis hasta el 30 y después pagás". Las primeras profesionales (casi seguro
  conocidas) son las testers y el arranque del boca a boca: no pagan nunca. Quien se sume desde el
  1 de diciembre paga según los planes. Si se anotan demasiadas de golpe, la idea es poner un tope
  de cupos (por cantidad), no cambiar la fecha. Al cobrar, el criterio para "gratis para siempre"
  es la fecha de alta de la cuenta, o la del pedido en el formulario (`Lead.createdAt`) si la
  cuenta se creó después a partir de ese pedido.
