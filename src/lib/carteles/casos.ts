import type { EventoCartel } from "./datos";

/**
 * El banco de pruebas de las plantillas (doc 52 §3.3: «una plantilla no entra al catálogo hasta pasar unos 12 casos reales»): los extremos
 * medidos en producción el 2026-10-05 con datos inventados —título de 107 caracteres, sin foto, 8 artistas, lugar de 59 caracteres, precio
 * largo, sin precio— más los tres tramos del título, un subtítulo partido por dos puntos y un horario por día. Lo usan las pruebas de dibujo
 * y quien quiera ver una plantilla nueva con todos los casos.
 */

const base: EventoCartel = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "noche-de-son-huasteco",
  titulo: "Noche de son huasteco",
  inicio: "2026-10-17T01:00:00.000Z",
  fin: "2026-10-17T03:00:00.000Z",
  zona: "America/Mexico_City",
  precio: null,
  clase: "puntual",
  conSesiones: false,
  sitio: "Casa de Cultura del Barrio de San Miguelito",
  tipoLugar: "casa_de_cultura",
  lugarId: "aaaa0001-0000-4000-8000-000000000001",
  artistas: [{ nombre: "Trío Los Potosinos", disciplina: "musica", detalle: "Son huasteco" }],
};

const ocho = ["Paulina Lucciotto", "Marilú Juárez", "Arantxa Zoé Hernández", "Jesús Orlando Acosta", "Sayuri Álvarez", "Flora Moreno", "Samantha Méndez", "Colectivo Barro Vivo", "Tomás Ibarra", "Lucía Fierro"].map((nombre) => ({ nombre, disciplina: "artes_visuales", detalle: "Cerámica" }));

export const CASOS: Record<string, EventoCartel> = {
  corto: base,
  medio: { ...base, slug: "delirium-pollum-clown-y-pantomima-con-pimpolina", titulo: "Delirium Pollum, clown y pantomima con Pimpolina", precio: "$150", sitio: "Teatro de la Paz", tipoLugar: "foro", artistas: [{ nombre: "Pimpolina", disciplina: "teatro", detalle: "Clown" }] },
  largo: { ...base, slug: "concierto-de-la-orquesta-sinfonica-por-los-435-anos-de-la-ciudad", titulo: "Concierto de la Orquesta Sinfónica de San Luis Potosí por los 435 años de la ciudad", precio: "$120 a $250", sitio: "Templo de San Francisco", tipoLugar: null, artistas: [{ nombre: "Orquesta Sinfónica de San Luis Potosí", disciplina: "musica", detalle: "Música académica y clásica" }] },
  maximo: { ...base, slug: "inauguracion-de-la-exposicion-colectiva-de-ceramica-contemporanea-lxs-colocaos", titulo: "Inauguración de la exposición colectiva de cerámica contemporánea LXS COLOCAOS y la última fogueada del año en el MUNI", sitio: "MUNI Museo Universitario de la Universidad Autónoma de SLP", tipoLugar: "museo", artistas: ocho },
  subtitulo: { ...base, slug: "sangre-de-coyote", titulo: "Sangre de Coyote: Semilla que florece el barrio (documental)", sitio: "Centro Cultural Universitario Bicentenario", tipoLugar: "foro", precio: "Cooperación solidaria", artistas: [{ nombre: "C. Muñoz", disciplina: "cine", detalle: "Documental" }] },
  sinNada: { ...base, slug: "oca", titulo: "OCA", sitio: null, tipoLugar: null, artistas: [] },
  precioLargo: { ...base, slug: "taller-de-grabado-en-linoleo", titulo: "Taller de grabado en linóleo", precio: "$300 por las tres sesiones, materiales incluidos", conSesiones: true, fin: "2026-10-21T01:00:00.000Z", sitio: "ACHE Galería", tipoLugar: "galeria", artistas: [{ nombre: "Aaron Cadena", disciplina: "artes_visuales", detalle: "Grabado" }] },
  // OL-336: varios días con el fin a las 00:00 del día siguiente al último (así guarda la base «Ciclo Fellini»): el último día es el 14, no el 15.
  variosDias: { ...base, slug: "cine-de-barrio-ciclo-fellini", titulo: "Cine de barrio: ciclo Fellini", inicio: "2026-10-09T16:00:00.000Z", fin: "2026-10-15T06:00:00.000Z", sitio: "Casa de Cultura del Barrio de San Miguelito", tipoLugar: "casa_de_cultura", artistas: [{ nombre: "Cineclub del Barrio", disciplina: "cine", detalle: "Cineclub" }] },
  // OL-336: un festival dice solo el mes, sin hora.
  festival: { ...base, slug: "festival-de-cine-de-invierno", titulo: "Festival de Cine de Invierno", clase: "festival", inicio: "2026-10-10T01:00:00.000Z", fin: "2026-10-13T06:00:00.000Z", sitio: "Centro Cultural Universitario Bicentenario", tipoLugar: "foro", artistas: [{ nombre: "Leonora Films", disciplina: "cine", detalle: "Cine" }] },
  palabraLarga: { ...base, slug: "otorrinolaringologo", titulo: "Electroacústica: Otorrinolaringólogo Desinstitucionalizadamente", sitio: "Aether", tipoLugar: "galeria", artistas: [{ nombre: "0Backside0", disciplina: "musica", detalle: "Rock, metal y alternativo" }] },
};

/** El «hoy» fijo de las pruebas: los textos con año dependen de él. */
export const AHORA_CASOS = new Date("2026-10-07T18:00:00.000Z");
