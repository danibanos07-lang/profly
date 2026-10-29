import type { Locale } from "@/lib/i18n/config";

type Section = { title: string; body: string[] };
type LegalDoc = { intro: string; updated: string; sections: Section[] };

const guidelines: Record<Locale, LegalDoc> = {
  es: {
    intro:
      "Kurso existe para ayudar a estudiantes a tomar mejores decisiones académicas. Las reseñas deben ser honestas, útiles y respetuosas. Las cuentas anónimas para otros estudiantes siguen sujetas a moderación.",
    updated: "Última actualización: octubre de 2026",
    sections: [
      {
        title: "Qué sí",
        body: [
          "Describe tu experiencia real en la clase: explicaciones, exámenes, tareas, forma de calificar y organización.",
          "Sé específico y constructivo. Explica por qué algo funcionó o no.",
          "Distingue entre tu opinión y los hechos (\"para mí fue difícil\" en lugar de \"es imposible\").",
          "Reseña solo materias que hayas cursado, una vez por profesor, materia y semestre.",
        ],
      },
      {
        title: "Qué no",
        body: [
          "Acoso, insultos, ataques personales o comentarios sobre la apariencia, vida privada, salud, religión, orientación o cualquier característica protegida de una persona.",
          "Amenazas o incitación a la violencia. Se eliminan de inmediato y la cuenta puede ser suspendida.",
          "Información personal privada: teléfonos, correos, direcciones, redes sociales o datos de otros estudiantes.",
          "Acusaciones de delitos o conductas graves. Repórtalas por los canales oficiales de tu universidad, no en una reseña.",
          "Reseñas falsas, coordinadas, pagadas o escritas para inflar o hundir una calificación.",
          "Spam, publicidad, venta de tareas o exámenes.",
        ],
      },
      {
        title: "Cómo moderamos",
        body: [
          "Cualquier usuario con sesión iniciada puede reportar una reseña. Cuando varias cuentas distintas reportan la misma reseña, se oculta temporalmente hasta que moderación la revise.",
          "Un filtro automático envía a revisión las reseñas con lenguaje potencialmente ofensivo y bloquea datos de contacto.",
          "Moderación puede publicar, ocultar o eliminar reseñas y suspender cuentas. Todas las acciones quedan registradas en una bitácora auditable.",
          "Los promedios se recalculan automáticamente con las reseñas publicadas; nadie puede modificarlos manualmente.",
        ],
      },
      {
        title: "Verificación",
        body: [
          "Un \"correo universitario verificado\" significa que la cuenta confirmó un correo institucional. No comprueba que la persona haya cursado una materia específica.",
          "\"Inscripción verificada\" solo aparece cuando moderación confirmó la inscripción mediante un proceso aprobado.",
        ],
      },
      {
        title: "Para profesores",
        body: [
          "Si un dato de tu perfil es incorrecto (nombre, departamento, materias), usa el formulario de corrección. Para una reseña concreta que incumple estas normas, usa el botón Reportar.",
        ],
      },
    ],
  },
  en: {
    intro:
      "Kurso exists to help students make better academic decisions. Reviews must be honest, useful and respectful. Accounts that are anonymous to other students are still subject to moderation.",
    updated: "Last updated: October 2026",
    sections: [
      {
        title: "Do",
        body: [
          "Describe your real experience in the class: explanations, exams, homework, grading and organization.",
          "Be specific and constructive. Explain why something worked or didn't.",
          "Separate opinion from fact (\"it was hard for me\" rather than \"it's impossible\").",
          "Only review courses you took, once per professor, course and semester.",
        ],
      },
      {
        title: "Don't",
        body: [
          "Harassment, insults, personal attacks or comments about a person's appearance, private life, health, religion, orientation or any protected characteristic.",
          "Threats or incitement to violence. They are removed immediately and the account may be suspended.",
          "Private personal information: phone numbers, emails, addresses, social media or other students' data.",
          "Accusations of crimes or serious misconduct. Report those through your university's official channels, not in a review.",
          "Fake, coordinated or paid reviews, or reviews written to inflate or sink a rating.",
          "Spam, advertising, or selling homework or exams.",
        ],
      },
      {
        title: "How we moderate",
        body: [
          "Any signed-in user can report a review. When several different accounts report the same review, it is hidden until a moderator reviews it.",
          "An automatic filter queues reviews with potentially offensive language and blocks contact details.",
          "Moderators can publish, hide or remove reviews and suspend accounts. Every action is recorded in an auditable log.",
          "Averages are recalculated automatically from published reviews; nobody can edit them by hand.",
        ],
      },
      {
        title: "Verification",
        body: [
          "A \"verified university email\" means the account confirmed an institutional address. It does not prove the person took a specific course.",
          "\"Enrollment verified\" appears only when moderators confirmed enrollment through an approved process.",
        ],
      },
      {
        title: "For professors",
        body: [
          "If something on your profile is factually wrong (name, department, courses), use the correction form. To flag a specific review that breaks these rules, use its Report button.",
        ],
      },
    ],
  },
};

const privacy: Record<Locale, LegalDoc> = {
  es: {
    intro:
      "Este aviso explica qué datos recopila Kurso, para qué los usa y qué control tienes sobre ellos. Plantilla para revisión legal antes de un lanzamiento público.",
    updated: "Última actualización: octubre de 2026",
    sections: [
      {
        title: "Datos que recopilamos",
        body: [
          "Cuenta: correo electrónico, contraseña (cifrada por nuestro proveedor de autenticación) y, opcionalmente, un nombre visible solo para ti y moderación.",
          "Contenido: tus reseñas, votos, reportes, sugerencias y elementos guardados.",
          "Opcional: tu perfil académico (universidad, campus, carrera, semestre), las materias que marcas como cursadas y la calificación final que decidas reportar.",
          "Datos técnicos mínimos para seguridad y prevención de abuso (por ejemplo, registros de frecuencia de acciones).",
        ],
      },
      {
        title: "Qué es público",
        body: [
          "El texto y las calificaciones de tus reseñas publicadas, el semestre, la modalidad y si tu cuenta tiene un correo universitario verificado.",
          "Nunca mostramos tu nombre, correo ni identificador de cuenta a otros estudiantes, ni los incluimos en respuestas de la API pública.",
          "Tu calificación reportada nunca se muestra junto a tu reseña. Solo se publica como parte de un promedio de al menos 5 calificaciones. Tu perfil académico y tus materias cursadas son privados.",
        ],
      },
      {
        title: "Quién puede ver tu identidad",
        body: [
          "Solo el equipo de moderación, y únicamente para atender reportes, prevenir abuso o cumplir obligaciones legales. Su acceso está restringido a nivel de base de datos.",
        ],
      },
      {
        title: "Tus derechos",
        body: [
          "Puedes editar o eliminar tus reseñas en cualquier momento.",
          "Puedes eliminar tu cuenta desde Configuración; se borran tu cuenta, reseñas, votos y guardados.",
          "Para solicitudes de acceso, rectificación, cancelación u oposición (derechos ARCO), contacta al responsable indicado en el despliegue.",
        ],
      },
      {
        title: "Proveedores",
        body: [
          "Usamos Supabase para base de datos y autenticación y Netlify para alojamiento. No vendemos tus datos ni mostramos publicidad basada en ellos.",
        ],
      },
    ],
  },
  en: {
    intro:
      "This notice explains what data Kurso collects, why, and what control you have over it. It is a template to be reviewed by counsel before a public launch.",
    updated: "Last updated: October 2026",
    sections: [
      {
        title: "Data we collect",
        body: [
          "Account: email, password (hashed by our authentication provider) and, optionally, a display name visible only to you and moderators.",
          "Content: your reviews, votes, reports, suggestions and saved items.",
          "Optional: your academic profile (university, campus, major, semester), the courses you mark as taken and any final grade you choose to report.",
          "Minimal technical data for security and abuse prevention (for example, action-frequency logs).",
        ],
      },
      {
        title: "What is public",
        body: [
          "The text and ratings of your published reviews, the semester, the format, and whether your account has a verified university email.",
          "We never show your name, email or account identifier to other students, nor include them in public API responses.",
          "A reported grade is never shown with your review. It is only published as part of an average of at least 5 grades. Your academic profile and course history are private.",
        ],
      },
      {
        title: "Who can see your identity",
        body: [
          "Only moderators, and only to handle reports, prevent abuse or meet legal obligations. Their access is restricted at the database level.",
        ],
      },
      {
        title: "Your rights",
        body: [
          "You can edit or delete your reviews at any time.",
          "You can delete your account from Settings; your account, reviews, votes and saved items are erased.",
          "For access, rectification, deletion or objection requests (ARCO rights in Mexico), contact the data controller named for the deployment.",
        ],
      },
      {
        title: "Processors",
        body: [
          "We use Supabase for database and authentication and Netlify for hosting. We don't sell your data or show ads based on it.",
        ],
      },
    ],
  },
};

export function getLegalDoc(kind: "guidelines" | "privacy", locale: Locale) {
  return (kind === "guidelines" ? guidelines : privacy)[locale];
}
