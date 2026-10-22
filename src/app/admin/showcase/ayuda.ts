import type { DiccionarioAyuda } from "@/components/ui/useAyuda";
import { LIMITE_LOTE, MAXIMO_RUBRICA, SENALES, UMBRAL_CONSEJO } from "@/lib/showcase";

/**
 * Lo que dice el panel de ayuda (ⓘ, `ui/Ayuda`) en la ficha de showcase (OL-426): cada control lleva su clave en `data-ayuda` y aquí vive lo que
 * explica. Abierto sin señalar nada enseña la rúbrica en tres líneas (lo firmado en OL-425). El manual (`/admin/showcase/manual`) lo cuenta entero
 * con la misma fuente.
 */
export const RUTA_MANUAL_SHOWCASE = "/admin/showcase/manual";

const niveles = (clave: (typeof SENALES)[number]["clave"]) =>
  SENALES.find((s) => s.clave === clave)!
    .niveles.map((n, i) => `${i}: ${n.charAt(0).toLowerCase()}${n.slice(1)}`)
    .join(". ");

export const AYUDA_SHOWCASE: DiccionarioAyuda = {
  rubrica: {
    titulo: "Rúbrica",
    texto: `Cuatro señales de 0 a 2: circulación, obra, actividad y vínculo con la app. Pasa al consejo con ${UMBRAL_CONSEJO} de ${MAXIMO_RUBRICA}. La base propone cada puntaje (contorno discontinuo) y lo que fijas a mano manda (relleno).`,
    detalle: "Sin propuesta ni puntaje fijado, la señal dice «sin datos»: no es un 0 y no suma. En la hoja de cada señal tocas un número para fijarlo y «Volver al propuesto» lo deja otra vez en manos de la base.",
    manual: "rubrica",
  },
  circulacion: {
    titulo: "Circulación",
    texto: `${niveles("circulacion")}.`,
    detalle: "La base lo propone con sus eventos del año: foros distintos, festivales y fechas fuera de su ciudad. Sin eventos en la base, sin datos.",
    manual: "circulacion",
  },
  obra: {
    titulo: "Obra y reconocimiento",
    texto: `${niveles("obra")}.`,
    detalle: "La base no lo sabe: se propone con las evidencias aceptadas con su enlace (1 con obra de los últimos 24 meses; 2 con beca, premio, residencia o selección oficial). Sin ellas, sin datos.",
    manual: "obra",
  },
  actividad: {
    titulo: "Actividad",
    texto: `${niveles("actividad")}.`,
    detalle: "La base lo propone con la última lectura de sus redes: 2 si publicó en los últimos 7 días (o publica cada semana), 1 hasta 45 días, 0 después. Sin lecturas, sin datos.",
    manual: "actividad",
  },
  vinculo: { titulo: "Vínculo con la app", texto: `${niveles("vinculo")}.`, detalle: "La base lo propone con la ficha: si alguien la reclamó y si tiene novedades o portada propia.", manual: "vinculo" },
  estado: {
    titulo: "Estado",
    texto: "Candidato, revisado, invitado, confirmado o descartado. Cada cambio queda con quién y cuándo, y nada sale de Administración.",
    detalle: "Sin cambio de estado, todo artista visible del catálogo es candidato. Descartado no borra nada: se puede volver.",
    manual: "estado",
  },
  evidencias: {
    titulo: "Evidencias",
    texto: "Lo que sostiene un puntaje, siempre con su enlace. Lo que trae la rutina llega propuesto: solo cuenta lo que aceptas, y lo aceptado (salvo redes) se publica en su perfil, su presentación en PDF y su «Tu año».",
    detalle: "Una evidencia que añades a mano ya cuenta y se publica (la leíste tú). Rechazarla o deshacerla la retira de su perfil. Sin una dirección http o https no hay evidencia.",
    manual: "evidencias",
  },
  investigar: {
    titulo: "Investigar",
    texto: "La rutina busca en la web premios, becas, prensa, festivales y obra publicada de este artista: cuatro búsquedas con su nombre, su ciudad y su disciplina. Cuesta entre 0,20 y 0,60 USD, con un tope que tú eliges (1,00 por omisión).",
    detalle: "Solo propone lo que dice una página que abrió y leyó, con su enlace, y descarta los homónimos dudosos. No lee redes. Todo llega a «Por revisar» y nada cuenta ni sale de Administración hasta que lo aceptas.",
    manual: "investigar",
  },
  investigarLote: {
    titulo: "Investigar a varios",
    texto: `El renglón «Investigar» de la lista manda la misma rutina a varios a la vez: por omisión, los candidatos marcados (candidatos o revisados) sin investigar en 30 días; o los que se ven en la lista con el filtro de ahora. Hasta ${LIMITE_LOTE} por orden, con un tope por artista (1,00 USD por omisión) y el total antes de confirmar.`,
    detalle: "Nunca entran los descartados ni quien ya tiene una investigación en curso. El motor las corre una tras otra; el renglón dice cómo va («Investigando a 26 · 5 terminados · 1,95 USD») y la lista se vuelve a leer sola cada 20 segundos mientras corre. Cada tarjeta dice cómo va su investigación y cuántas evidencias deja por revisar.",
    manual: "investigarLote",
  },
  base: { titulo: "En la base", texto: "Sus eventos del año en la app: cuántos, en qué foros y en qué festivales. Sale solo, sin investigar.", manual: "base" },
  redes: {
    titulo: "Redes",
    texto: "Las cifras de sus redes con la fecha de la lectura. Se escriben a mano o se importan en CSV: el servidor no puede leer Instagram.",
    detalle: "El CSV lleva artista_slug, red, seguidores, publicaciones, ultima_publicacion y leido_en. Las filas que no se entienden se dicen con su línea.",
    manual: "redes",
  },
  notas: {
    titulo: "Notas del consejo",
    texto: "Privadas: solo las ve la administración y nunca salen de aquí. Se guardan al salir del campo.",
    detalle: "La primera línea va en la tarjeta del candidato y en el CSV para el consejo. Se pueden borrar con la ✕.",
    manual: "notas",
  },
};

/** Las secciones del manual, en el orden de la ficha. */
export const SECCIONES_MANUAL = [
  { id: "bloque-rubrica", titulo: "La rúbrica", entradas: ["rubrica", "circulacion", "obra", "actividad", "vinculo"] },
  { id: "bloque-estado", titulo: "Estado y evidencias", entradas: ["estado", "evidencias", "investigar", "investigarLote"] },
  { id: "bloque-base", titulo: "La base y las redes", entradas: ["base", "redes"] },
  { id: "bloque-notas", titulo: "Notas", entradas: ["notas"] },
] as const;

/** Las tres reglas de gobierno (investigación del 20 de octubre, §4.3), firmadas con el prototipo de OL-425. */
export const REGLAS_GOBIERNO = [
  "Solo administración: el showcase no se ve ni se cambia desde ninguna otra cuenta.",
  "Las notas del consejo y los puntajes son privados: nunca salen de Administración (el CSV para el consejo se descarga desde aquí).",
  "Lo que aceptas (premios, becas, obra, presentaciones y prensa) se publica en su perfil como «Reconocimientos y obra»; lo propuesto, lo rechazado, los puntajes y las notas nunca salen de aquí.",
] as const;
