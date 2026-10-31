// Consentimiento informado para vincularse con una profesional.
// BORRADOR: el texto lo tiene que revisar la profesional (y asesoría legal) antes de producción.
// Si cambia el contenido, subí la versión: cada vínculo guarda la versión y la fecha que aceptó.
export const CONSENT_VERSION = "2026-10-v1";

export const CONSENT_SECTIONS: { title: string; body: string }[] = [
  {
    title: "Qué va a ver tu psicóloga",
    body: "Solo lo que marques como compartido: registros de la rueda, entradas del diario y autorregistros terminados. También los temas que anotes para la próxima sesión y cómo te va con las tareas que te proponga.",
  },
  {
    title: "Qué no va a ver nunca",
    body: "Lo que dejes privado ni tus borradores. Tu diario es privado salvo que elijas compartir una entrada puntual. Podés cambiar quién ve cada cosa cuando quieras.",
  },
  {
    title: "Lo que ella escribe",
    body: "Las devoluciones que te deje las vas a ver vos. Sus notas clínicas son privadas de ella, como en cualquier tratamiento.",
  },
  {
    title: "Cuándo lo mira",
    body: "Revisa lo que compartís según lo que acuerden, no en tiempo real. Esta app no es un servicio de urgencias: si estás en riesgo, usá el botón de ayuda urgente o llamá a las líneas de crisis.",
  },
  {
    title: "Tus datos",
    body: "Lo que escribís se guarda cifrado. Cada vez que tu psicóloga abre algo tuyo, queda registrado. Podés desvincularte cuando quieras: desde ese momento deja de ver todo lo tuyo.",
  },
];
