/** Lo que dice la hoja de Instagram cuando no se pudo publicar (OL-458, las frases del prototipo firmado; bitácora 490). */
export type ClaveError = "cupo" | "imagen" | "permiso" | "empezo" | "texto" | "otro";

/** Las frases del prototipo firmado. */
export const FRASES: Record<Exclude<ClaveError, "texto">, string> = {
  cupo: "Hoy ya van 100 publicaciones, el máximo que Instagram deja en un día. Se puede otra vez mañana.",
  imagen: "Instagram no aceptó la imagen. Prueba con «Historia 9:16» o vuelve a intentar en un momento.",
  permiso: "Instagram ya no nos deja publicar en @smsnstrsapp: hay que volver a conectar la cuenta desde su página de Facebook. No se publicó nada.",
  empezo: "Este evento ya empezó mientras lo preparabas: ya no se publica. Aquí solo se publica lo que está por venir.",
  otro: "No se pudo publicar. Vuelve a intentar en un momento; no se publicó nada.",
};
