import { CIUDAD_INICIAL, ciudadCanonica } from "./ciudad";
import type { Punto } from "./geo";
import { esUuid, limpiar } from "./formulario";
import { cuandoPorDia, formatearCuando, localAIso, ZONA_INICIAL, zonaSegura } from "./fechas";
import { imagenPermitida } from "./imagenes";
import { LIMITES_EVENTO } from "./limites";
import { puedeConservarReservadoSinDireccion } from "./retencionSitio";

export { LIMITES_EVENTO } from "./limites";

/** Dónde es el evento: en un lugar registrado, en otro sitio (público) o en un sitio reservado (dirección con condiciones). */
export type ModoSitio = "lugar" | "otro" | "reservado";

/** Lo que resuelve Dónde cuando no es un lugar registrado: el sitio, su pin y, si es reservado, la dirección exacta. */
export type OtroSitio = {
  reservado: boolean;
  sitioTexto: string;
  /** Direccion publica estructurada, nunca parte del alias persistido. */
  direccion?: string;
  nombreLegacy?: boolean;
  referenciaLegacy?: string;
  pinPendiente?: boolean;
  sitioPunto: Punto | null;
  direccionPrivada: string;
  privadoPunto: Punto | null;
  revelarHoras: number;
  indicaciones: string;
  /** La ciudad del pin, deducida por Mapbox al ponerlo (null hasta entonces). */
  ciudad: string | null;
  /** Al editar (OL-319): un sitio reservado cuyo evento terminó hace más de siete días ya no tiene su dirección exacta (se borró por
   *  privacidad, `retencionSitio`); se conserva así mientras no se cambie el sitio, y el servidor decide si todavía vale sin ella. */
  direccionRetirada?: boolean;
};

/** Cuánto antes del inicio se revela un sitio reservado a las personas con sesión. */
export const REVELAR_OPCIONES = [
  { horas: 3, etiqueta: "3 horas antes" },
  { horas: 6, etiqueta: "6 horas antes" },
  { horas: 24, etiqueta: "1 día antes" },
  { horas: 48, etiqueta: "2 días antes" },
] as const;

export type Evento = {
  id: string;
  /** La dirección legible (/eventos/<slug>): se pone sola al crear el evento y no cambia si cambia el título o la
   *  fecha (migración `20260922170000_eventos_slug`, OL-119). */
  slug: string;
  lugar_id: string | null;
  titulo: string;
  inicio: string;
  fin: string | null;
  descripcion: string | null;
  imagen: string | null;
  precio: string | null;
  enlace: string | null;
  creado_por: string | null;
  visible: boolean;
  sitio_texto: string | null;
  sitio_direccion: string | null;
  sitio_lat: number | null;
  sitio_lng: number | null;
  sitio_reservado: boolean;
  sitio_revelar_desde: string | null;
  /** Zona horaria (IANA) del evento: sus horas se leen y se muestran en ella (migración 0029). */
  zona: string;
  /** La ciudad del evento (migración 0029: cualquier país); la del lugar, o la del pin en "otro sitio". */
  ciudad: string;
  /** Cómo ocurre (OL-321, migración `20261006160000_eventos_clase`); opcional: una consulta vieja o una base sin la migración no lo trae, y
   *  sin él es `puntual`, como todo lo de antes. */
  clase?: Clase;
  /** El festival del que es un acto (doc 42). */
  evento_padre_id?: string | null;
  /** El acto puntual que inaugura esta exposición. */
  inaugura_id?: string | null;
  /** Un acto registrado en un programa sin publicar: oculto hasta que su autor lo publica. */
  borrador?: boolean;
};

/**
 * Cómo ocurre una actividad (doc 55 §1; modelo de OL-272: una identidad por actividad y su forma de ocurrir aparte): un evento que pasa un día a
 * una hora, una exposición que se visita varios días en un horario, un taller o curso de varias sesiones o un festival que agrupa varios eventos.
 */
export type Clase = "puntual" | "exposicion" | "taller" | "festival";

/** Las cuatro formas, en el orden de la hoja «¿Cómo ocurre?», con su nombre y su frase llana (doc 55 §2; prototipo caso 5). */
export const CLASES: readonly { clase: Clase; nombre: string; frase: string }[] = [
  { clase: "puntual", nombre: "Evento", frase: "Pasa un día a una hora." },
  { clase: "exposicion", nombre: "Exposición", frase: "Se puede visitar varios días, en un horario." },
  { clase: "taller", nombre: "Taller o curso", frase: "Varias sesiones, una inscripción." },
  { clase: "festival", nombre: "Festival", frase: "Agrupa varios eventos." },
];

/** El nombre de una clase («Exposición»); una que no se reconoce es un evento. */
export const nombreDeClase = (clase: Clase | null | undefined): string => (CLASES.find((c) => c.clase === clase) ?? CLASES[0]).nombre;

/** ¿Es una de las cuatro? Lo que llega de un formulario, de la base o del lector de carteles. */
export const esClase = (v: unknown): v is Clase => typeof v === "string" && CLASES.some((c) => c.clase === v);

/**
 * Las palabras del título que proponen la clase (doc 55 §2), sin acentos ni mayúsculas y como palabras enteras. «Muestra de cine» va antes que
 * «muestra»: es un festival, no una exposición. Si hay varias, gana la primera que aparece en el título («Taller en el Festival X» es un taller).
 */
const PALABRAS_DE_CLASE: readonly { patron: RegExp; clase: Exclude<Clase, "puntual"> }[] = [
  { patron: /\bmuestras? de cine\b/, clase: "festival" },
  { patron: /\b(festival|festivales|encuentro|encuentros|jornadas?)\b/, clase: "festival" },
  { patron: /\b(exposicion|exposiciones|expo|muestra|muestras)\b/, clase: "exposicion" },
  { patron: /\b(taller|talleres|curso|cursos|laboratorio|laboratorios|diplomado|diplomados)\b/, clase: "taller" },
];

/**
 * La clase que proponen las palabras del título, o null si ninguna lo dice (entonces es un evento). No decide: «Revisa» la enseña con su
 * «Cambiar» y la persona la confirma (nada se publica sin leerse).
 */
export function claseSugerida(titulo: string): Exclude<Clase, "puntual"> | null {
  const texto = titulo.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  // «Inauguración de la exposición …», «Inauguración del Festival …»: es la apertura, un evento de un día a una hora; la exposición se sugiere
  // al publicar (OL-323, H1/H2; prototipo aceptado `eventos-superficies.html`, caso h1) y el festival se relaciona aparte.
  if (/\b(inauguracion|inauguraciones|inaugura|inauguran|inauguramos)\b/.test(texto)) return null;
  let mejor: { en: number; clase: Exclude<Clase, "puntual"> } | null = null;
  for (const { patron, clase } of PALABRAS_DE_CLASE) {
    const m = patron.exec(texto);
    // «Master Class · 9° Festival de Cine UASLP», «Concierto de clausura del Festival Umbral 2026»: el título nombra un acto del festival, no el
    // festival (OL-323: ese acto se relaciona con su festival en «Publicado», H4/H5). Antes del festival solo puede ir su edición («9°», «XXIII»,
    // «Noveno», «Gran»).
    if (m && clase === "festival" && /\p{L}/u.test(texto.slice(0, m.index).replace(/(^|\s)(\d{1,2}\s*[º°ªoa]?\.?|[ivxl]{1,7}|primer|segundo|tercer|cuarto|quinto|sexto|septimo|octavo|noveno|decimo|gran|el|la|los|las)\s*$/, ""))) continue;
    if (m && (!mejor || m.index < mejor.en)) mejor = { en: m.index, clase };
  }
  return mejor?.clase ?? null;
}

/** Lo que la agenda necesita: el evento con el nombre de su lugar o su sitio. */
/**
 * «Cooperación solidaria»: el costo sin cifra (OL-140). Se guarda en `precio` (texto libre, hasta 60 caracteres) con
 * este texto exacto, sin migración: los eventos existentes no cambian y la ficha ya muestra `precio` tal cual.
 */
export const COOPERACION_SOLIDARIA = "Cooperación solidaria";
export const esCooperacion = (precio: string | null | undefined): boolean => precio === COOPERACION_SOLIDARIA;

/** Cuánto cuesta un evento, en tres clases que lo cubren todo: cada evento cae en una y solo una. */
export type ClaseDeCosto = "gratis" | "cooperacion" | "costo";
/**
 * La clase de un evento según su `precio` (texto libre): sin precio (o «Gratis» escrito a mano) es gratis; un texto que empieza por
 * «Cooperación» (el del formulario, OL-140, o uno escrito a mano) es cooperación; cualquier otra cosa («$150», «$120 a $250», «taquilla») es con costo.
 */
export function claseDeCosto(precio: string | null | undefined): ClaseDeCosto {
  const texto = (precio ?? "").trim();
  if (texto === "" || /^(gratis|gratuito|entrada libre|libre|sin costo)$/i.test(texto)) return "gratis";
  return /^cooperaci[oó]n/i.test(texto) ? "cooperacion" : "costo";
}

export type EventoResumen = Pick<Evento, "id" | "titulo" | "inicio" | "fin" | "imagen" | "precio" | "lugar_id" | "sitio_texto" | "sitio_reservado" | "zona"> & {
  /** Opcional porque no todas las consultas lo piden todavía (bitácora 154); `hrefEvento` cae al UUID cuando falta. */
  slug?: string | null;
  sitio_direccion?: string | null;
  lugar: { nombre: string; portada: string | null } | null;
};

/**
 * La dirección de la ficha: el slug si ya lo trae (todas las filas desde la migración `20260922170000_eventos_slug`),
 * y el UUID solo como respaldo (una fila leída sin ese campo, o una consulta que aún no lo pide). Las rutas
 * `/eventos/[id]` y `.../editar` resuelven por slug o UUID y redirigen de forma permanente (mismo criterio que
 * `hrefArtista`/`hrefLugar`).
 */
export function hrefEvento(e: { id: string; slug?: string | null }): string {
  return `/eventos/${e.slug || e.id}`;
}

/** Dirección exacta de un sitio reservado (solo llega cuando la política de la base lo permite). */
export type SitioPrivado = { direccion: string; lat: number | null; lng: number | null; indicaciones: string | null; revelar_desde: string };

export type DatosEvento = {
  lugar_id: string | null;
  titulo: string;
  inicio: string;
  fin: string | null;
  descripcion: string;
  imagen: string | null;
  precio: string | null;
  enlace: string | null;
  sitio_texto: string | null;
  sitio_direccion: string | null;
  sitio_lat: number | null;
  sitio_lng: number | null;
  sitio_reservado: boolean;
  sitio_revelar_desde: string | null;
  /** Solo si es reservado: lo que va a la tabla privada. */
  privado: { direccion: string; lat: number | null; lng: number | null; indicaciones: string | null; revelar_desde: string } | null;
  /** En otro sitio: la ciudad del pin, deducida por Mapbox (null si no se supo; el servidor pone la del lugar o la inicial). */
  ciudad: string | null;
  /** La zona en la que se leyeron las horas: la del lugar o la del punto del sitio (la decide el servidor antes de validar). */
  zona: string;
};
export type ErroresEvento = Partial<
  Record<"lugar_id" | "sitio_texto" | "sitio_direccion" | "direccion_privada" | "titulo" | "inicio" | "fin" | "sesiones" | "horario" | "descripcion" | "imagen" | "precio" | "enlace", string>
>;

/**
 * La ciudad de un evento que no es en un lugar registrado (OL-299): la del pin que mandó el formulario. Sin ella, un punto
 * nuevo no se publica (null: el servidor dice que no pudo saber en qué ciudad está); con el mismo punto que ya tenía el
 * evento que se edita, conserva su ciudad. Un sitio sin punto (escrito sin coordenadas) no tiene de dónde deducirla: sigue
 * en la inicial, como siempre.
 */
export function ciudadDelSitio(
  datos: Pick<DatosEvento, "ciudad" | "sitio_lat" | "sitio_lng" | "privado">,
  actual?: { ciudad: string; sitio_lat: number | null; sitio_lng: number | null } | null,
): string | null {
  if (datos.ciudad) return datos.ciudad;
  const { lat, lng } = datos.privado ?? { lat: datos.sitio_lat, lng: datos.sitio_lng };
  if (lat === null || lng === null) return CIUDAD_INICIAL.nombre;
  return actual?.ciudad && actual.sitio_lat === lat && actual.sitio_lng === lng ? actual.ciudad : null;
}

/**
 * ¿El enlace de boletos/más información está bien formado? (S-04, docs/rediseno/46). No pasa por
 * `reconocerEnlace` (ese es para redes y "Otro enlace" de artistas/lugares; aquí no hay dominios reconocidos
 * que mostrar con icono, solo un enlace suelto). Exige protocolo `https:` y un hostname con al menos un punto,
 * sin espacios — antes solo se anteponía "https://" sin comprobar que el resultado fuera una URL de verdad
 * (aceptaba espacios, por ejemplo).
 */
function enlaceBienFormado(v: string): boolean {
  if (/\s/.test(v)) return false;
  try {
    const url = new URL(v);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function numeroONull(v: FormDataEntryValue | null | undefined): number | null {
  const t = limpiar(v);
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Extrae número de un texto, reconociendo separadores de miles y descartando decimales.
 * "$1,500" → "1500", "1.500" → "1500", "150.00" → "150", "$1,500.50" → "1500".
 * Regla: 1-3 dígitos + (coma/punto/espacio + 3 dígitos)+ = miles; 1-2 dígitos al final tras sep = decimales.
 * Tope 6 dígitos. Vacío si no hay número. */
export function extraerNumero(texto: string | null | undefined): string {
  if (!texto) return "";
  // Buscar número con posibles separadores de miles y decimales
  // Priorizar patrón con separadores, luego números simples
  const match = texto.match(/\d+(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?|\d+/);
  if (!match) return "";

  let numero = match[0];

  // Quitar separadores de miles: coma/punto/espacio seguido de exactamente 3 dígitos
  numero = numero.replace(/[.,\s](\d{3})/g, '$1');

  // Quitar decimales: punto o coma seguido de 1-2 dígitos al final
  numero = numero.replace(/[.,]\d{1,2}$/, '');

  // Limitar a 6 dígitos máximo
  if (numero.length > 6) return "";
  return numero;
}

/** Lo que importa a quien ya dijo "Voy": cuándo y dónde. Al editar, si cambia alguno se avisa. */
export type CambioEvento = "cuando" | "donde" | "ambos" | null;
type Comparable = { inicio: string; fin: string | null; lugar_id: string | null; sitio_texto: string | null; sitio_direccion?: string | null };
export function queCambio(antes: Comparable, despues: Comparable): CambioEvento {
  const ms = (v: string | null) => (v ? new Date(v).getTime() : null);
  const cuando = ms(antes.inicio) !== ms(despues.inicio) || ms(antes.fin) !== ms(despues.fin);
  const donde = (antes.lugar_id ?? null) !== (despues.lugar_id ?? null) || (antes.sitio_texto ?? null) !== (despues.sitio_texto ?? null) || (antes.sitio_direccion ?? null) !== (despues.sitio_direccion ?? null);
  return cuando && donde ? "ambos" : cuando ? "cuando" : donde ? "donde" : null;
}

/** Nombre público del sitio para la agenda y la ficha. */
export function nombreSitio(e: Pick<EventoResumen, "lugar" | "sitio_texto" | "sitio_direccion" | "sitio_reservado">): string {
  if (e.lugar?.nombre) return e.lugar.nombre;
  if (e.sitio_reservado) return e.sitio_texto ? `${e.sitio_texto} · sitio reservado` : "Sitio reservado";
  const texto = [e.sitio_texto, e.sitio_direccion].filter(Boolean).join(" · ");
  if (texto) return texto;
  return "Sitio por confirmar";
}

/**
 * El sitio para una lista (H-09, doc 50): el mismo nombre sin la dirección postal, que `nombreSitio` suma cuando el evento es
 * «en otro sitio» y que en la lista partía el renglón en tres líneas. La dirección vive en la ficha del evento. Un evento
 * sin nombre de sitio pero con dirección la conserva: es lo único que dice dónde es.
 */
export function sitioEnLista(e: Pick<EventoResumen, "lugar" | "sitio_texto" | "sitio_direccion" | "sitio_reservado">): string {
  return nombreSitio({ ...e, sitio_direccion: e.sitio_texto ? null : e.sitio_direccion });
}

/** JSON-LD no convierte un alias legacy en direccion ni publica la direccion reservada. */
export function direccionPublicaSitio(e: Pick<Evento, "sitio_direccion" | "sitio_reservado" | "ciudad">): { direccion: string; ciudad: string } | null {
  return !e.sitio_reservado && e.sitio_direccion ? { direccion: e.sitio_direccion, ciudad: e.ciudad } : null;
}

type PuntoComoLlegar = {
  lugar: { lat: number; lng: number } | null;
  sitioReservado: boolean;
  sitioLat: number | null;
  sitioLng: number | null;
  privado: Pick<SitioPrivado, "lat" | "lng"> | null;
};

/** El punto de ruta: solo uno público, o uno reservado que la ficha ya autorizó revelar (nunca uno privado sin revelar). */
export function puntoComoLlegar({ lugar, sitioReservado, sitioLat, sitioLng, privado }: PuntoComoLlegar): { lat: number; lng: number } | null {
  return sitioReservado
    ? privado?.lat != null && privado.lng != null ? { lat: privado.lat, lng: privado.lng } : null
    : lugar ?? (sitioLat != null && sitioLng != null ? { lat: sitioLat, lng: sitioLng } : null);
}

/** Enlace de ruta solo a un punto público o a uno reservado que la ficha ya autorizó revelar. */
export function enlaceComoLlegar(args: PuntoComoLlegar): string | null {
  const punto = puntoComoLlegar(args);
  return punto ? `https://www.google.com/maps/dir/?api=1&destination=${punto.lat},${punto.lng}` : null;
}

export type DatosJsonLdEvento = {
  id: string;
  slug?: string | null;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string | null;
  imagen: string | null;
  /** precio === null, para no inventar un número a partir de un texto libre ("$150", "taquilla"...). */
  gratis: boolean;
  sitioNombre: string;
  /**
   * La dirección pública del sitio: la del lugar (visible y no privado) o sitio_direccion de "otro sitio" cuando no es
   * reservado. Sin ella no hay JSON-LD que mandar — Google exige `location.address` para mostrar el evento en el
   * buscador (revisión de gestión de cambios, OL-059), y un sitio reservado o un lugar que un anónimo no ve no
   * tiene ninguna dirección que sea correcto publicar.
   */
  direccionPublica: string;
  /** La ciudad de esa misma dirección pública (la del lugar, o la del evento en "otro sitio") — sin ella, el
   *  `streetAddress` repetía el nombre del sitio y no había ninguna localidad que decir (gestión de cambios). */
  ciudadPublica: string;
  /** Solo si es público (el lugar o el pin de "otro sitio"); un sitio reservado nunca manda su coordenada real aquí. */
  sitioLat: number | null;
  sitioLng: number | null;
};

/**
 * JSON-LD tipo Event para la ficha (OL-059, bitácora 088): para que Google pueda mostrar fecha y lugar en el
 * buscador. Solo campos públicos — nunca quién va, nunca la dirección de un sitio reservado (por eso recibe ya
 * resueltos el nombre del sitio, su dirección pública y su coordenada, no el registro privado). Sin precio si no
 * se pudo escribir como número: mejor omitirlo que inventarlo a partir de un texto libre.
 */
export function jsonLdEvento(e: DatosJsonLdEvento): Record<string, unknown> {
  const location: Record<string, unknown> = { "@type": "Place", name: e.sitioNombre, address: { "@type": "PostalAddress", streetAddress: e.direccionPublica, addressLocality: e.ciudadPublica } };
  if (e.sitioLat != null && e.sitioLng != null) location.geo = { "@type": "GeoCoordinates", latitude: e.sitioLat, longitude: e.sitioLng };
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.titulo,
    startDate: e.inicio,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location,
    url: `https://somosnosotros.org${hrefEvento(e)}`,
  };
  if (e.fin) data.endDate = e.fin;
  if (e.descripcion) data.description = e.descripcion;
  if (e.imagen) data.image = [e.imagen];
  if (e.gratis) data.isAccessibleForFree = true;
  return data;
}

/** `esAdmin` viene siempre del rol real de la sesión (la acción de servidor lo comprueba); `imagenActual` es la
 *  que ya estaba guardada, para no romper una edición que reenvía sin tocarla la imagen de una ficha importada
 *  de otro dominio (S-01, docs/rediseno/46). */
export type OpcionesValidarEvento = { esAdmin?: boolean; imagenActual?: string | null; eventoActual?: Partial<Evento> | null };

/** Lee el formulario del evento. Las horas del selector se leen en `zona`, la del sitio del evento. */
export function validarEvento(
  entrada: Record<string, FormDataEntryValue | null | undefined>,
  zona: string = ZONA_INICIAL,
  opciones: OpcionesValidarEvento = {},
): { datos: DatosEvento; errores: ErroresEvento } {
  const modo = (limpiar(entrada.modo_sitio) || "lugar") as ModoSitio;
  const zonaSitio = zonaSegura(zona);
  const inicio = localAIso(limpiar(entrada.inicio), zonaSitio);
  const finTexto = limpiar(entrada.fin);
  const fin = finTexto ? localAIso(finTexto, zonaSitio) : null;
  const cooperacion = limpiar(entrada.cooperacion) === "si";
  const gratis = !cooperacion && limpiar(entrada.gratis) !== "no";
  const enlaceTexto = limpiar(entrada.enlace);
  const revelarHoras = Number(limpiar(entrada.revelar_horas)) || 24;
  const revelarDesde = inicio ? new Date(new Date(inicio).getTime() - revelarHoras * 3600000).toISOString() : null;
  const lugarId = limpiar(entrada.lugar_id);
  const sitioTexto = limpiar(entrada.sitio_texto);
  const sitioDireccion = limpiar(entrada.sitio_direccion);
  const direccionPrivada = limpiar(entrada.direccion_privada);
  const esReservado = modo === "reservado";

  // El precio viene como número del formulario (ej. "150"), pero también puede venir con "$" del cartel o de datos viejos.
  // Se extrae el número, se valida, y se guarda con "$" para que la ficha muestre "$150".
  const precioRaw = gratis || cooperacion ? "" : extraerNumero(limpiar(entrada.precio));
  const precioValido = precioRaw && /^\d{1,6}$/.test(precioRaw);

  const datos: DatosEvento = {
    lugar_id: modo === "lugar" ? lugarId || null : null,
    titulo: limpiar(entrada.titulo),
    inicio: inicio ?? "",
    fin,
    descripcion: limpiar(entrada.descripcion),
    imagen: limpiar(entrada.imagen) || null,
    precio: cooperacion ? COOPERACION_SOLIDARIA : gratis ? null : (precioValido ? "$" + precioRaw : precioRaw || null),
    enlace: enlaceTexto ? (/^https?:\/\//i.test(enlaceTexto) ? enlaceTexto : `https://${enlaceTexto}`) : null,
    sitio_texto: modo === "lugar" ? null : sitioTexto || null,
    sitio_direccion: modo === "otro" ? sitioDireccion || null : null,
    sitio_lat: modo === "otro" ? numeroONull(entrada.sitio_lat) : null,
    sitio_lng: modo === "otro" ? numeroONull(entrada.sitio_lng) : null,
    sitio_reservado: esReservado,
    sitio_revelar_desde: esReservado ? revelarDesde : null,
    ciudad: modo === "lugar" ? null : ciudadCanonica(limpiar(entrada.ciudad)).slice(0, 80) || null,
    zona: zonaSitio,
    privado: esReservado
      ? {
          direccion: direccionPrivada,
          lat: numeroONull(entrada.privado_lat),
          lng: numeroONull(entrada.privado_lng),
          indicaciones: limpiar(entrada.indicaciones) || null,
          revelar_desde: revelarDesde ?? "",
        }
      : null,
  };

  const conservarSinDireccion = puedeConservarReservadoSinDireccion(opciones.eventoActual, datos);
  // La dirección caducada no vuelve a la base, aunque una pestaña antigua aún la
  // tenga en memoria. SQL comprueba por su cuenta la revisión y ambos plazos.
  if (conservarSinDireccion) datos.privado = null;
  const errores: ErroresEvento = {};
  if (modo === "lugar" && !esUuid(lugarId)) errores.lugar_id = "Elige el lugar donde es.";
  if (modo !== "lugar" && !sitioTexto) errores.sitio_texto = esReservado ? "Di cómo se anuncia el sitio (ej. \"Casa en Tequis\")." : "Di dónde es (ej. \"Plaza de Armas\").";
  if (sitioTexto.length > LIMITES_EVENTO.sitio) errores.sitio_texto = `Máximo ${LIMITES_EVENTO.sitio} caracteres.`;
  if (modo === "otro" && sitioDireccion.length > LIMITES_EVENTO.direccion) errores.sitio_direccion = `Máximo ${LIMITES_EVENTO.direccion} caracteres.`;
  const puntoValido = (lat: number | null, lng: number | null) => lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  if (modo === "otro" && (sitioDireccion || limpiar(entrada.sitio_lat) || limpiar(entrada.sitio_lng)) && !puntoValido(datos.sitio_lat, datos.sitio_lng)) {
    errores.sitio_direccion = "Confirma la ubicación eligiendo una dirección o poniendo el pin.";
  }
  // Sin punto privado, la RPC compara con lo persistido: solo admite legacy intacto.
  if (datos.privado && (limpiar(entrada.privado_lat) || limpiar(entrada.privado_lng)) && !puntoValido(datos.privado.lat, datos.privado.lng)) {
    errores.direccion_privada = "Confirma la ubicación eligiendo una dirección o poniendo el pin.";
  }
  if (modo !== "lugar" && limpiar(entrada.sitio_pin_pendiente) === "si") {
    errores[esReservado ? "direccion_privada" : "sitio_direccion"] = "Confirma la ubicación eligiendo una dirección o poniendo el pin.";
  }
  if (esReservado && !direccionPrivada && !conservarSinDireccion) errores.direccion_privada = "Pon la dirección exacta: solo se revela cuando toca.";
  if (direccionPrivada.length > LIMITES_EVENTO.direccion) errores.direccion_privada = `Máximo ${LIMITES_EVENTO.direccion} caracteres.`;
  if (!datos.titulo) errores.titulo = "Ponle título al evento.";
  else if (datos.titulo.length > LIMITES_EVENTO.titulo) errores.titulo = `Máximo ${LIMITES_EVENTO.titulo} caracteres.`;
  if (!inicio) errores.inicio = "Falta la fecha y hora. Sin fecha no se publica.";
  if (finTexto && !fin) errores.fin = "La hora de fin no se entiende.";
  if (inicio && fin && new Date(fin) <= new Date(inicio)) errores.fin = "El fin tiene que ser después del inicio.";
  if (datos.descripcion.length > LIMITES_EVENTO.descripcion) errores.descripcion = `Máximo ${LIMITES_EVENTO.descripcion} caracteres.`;
  if (datos.imagen && !imagenPermitida(datos.imagen, { esAdmin: !!opciones.esAdmin, actual: opciones.imagenActual })) errores.imagen = "La imagen no se subió bien. Intenta de nuevo.";
  if (!gratis && !cooperacion && !precioRaw) errores.precio = "Pon el precio, o marca que es gratis.";
  if (precioRaw && !precioValido) errores.precio = "El precio debe ser solo números (máximo 6 dígitos, ej. 150).";
  if (datos.enlace) {
    if (datos.enlace.length > 500) errores.enlace = "Demasiado largo.";
    // S-04 (docs/rediseno/46): un enlace bien formado, no solo "https:// antepuesto". Sin protocolo https, sin
    // un hostname con al menos un punto o con espacios, no se guarda.
    else if (!enlaceBienFormado(datos.enlace)) errores.enlace = "Ese enlace no se ve bien. Revisa que empiece con https://";
  }
  return { datos, errores };
}

/** Texto para compartir: título, cuándo, dónde y el enlace. */
export function textoCompartir(titulo: string, cuando: string, lugar: string | null, url: string): string {
  return [`${titulo}`, `${cuando}${lugar ? ` · ${lugar}` : ""}`, url].join("\n");
}

/**
 * Lo que se comparte de un evento, igual en la ficha y en el final del alta por pasos: la dirección pública con el dominio de siempre y el
 * texto sin el enlace al final (la hoja de compartir lo manda aparte en `url`). `sitio` es el nombre del sitio, como lo dice `nombreSitio`.
 * Con horario por día (`conSesiones`, OL-311) el cuándo es «Del 9 al 11 de oct · horarios por día»: no hay un solo horario que decir. Una
 * exposición, un taller o un festival (OL-321) traen su propia línea (`cuandoClase`: «Hasta el dom 30 de nov», «3 sesiones · …», el programa).
 */
export function compartirEvento(e: Pick<EventoResumen, "titulo" | "inicio" | "fin" | "zona"> & { id: string; slug?: string | null }, sitio: string | null, conSesiones = false, cuandoClase?: string | null): { url: string; texto: string } {
  const url = `https://somosnosotros.org${hrefEvento(e)}`;
  const cuando = cuandoClase ? cuandoClase : conSesiones && e.fin ? cuandoPorDia(e.inicio, e.fin, e.zona) : formatearCuando(e.inicio, e.fin, new Date(), e.zona);
  return { url, texto: textoCompartir(e.titulo, cuando, sitio, url).replace(`\n${url}`, "") };
}

/** Lo que se lee de un cartel (viene del modelo de visión). Todo puede faltar. */
export type LecturaCartel = {
  titulo: string | null;
  fecha: string | null; // YYYY-MM-DD
  hora: string | null; // HH:MM
  hora_fin: string | null;
  lugar: string | null;
  direccion: string | null;
  gratis: boolean | null;
  precio: string | null;
  descripcion: string | null;
  enlace: string | null;
  /** Nombres de quienes se presentan, tal como aparecen en el cartel. */
  artistas: string[] | null;
  /** Cómo ocurre, si el cartel lo dice (OL-321): «Exposición», «Taller», «Festival»… Opcionales: un lector viejo no los trae. */
  clase?: Clase | null;
  /** Una exposición: del primer al último día de visita (YYYY-MM-DD). */
  visita?: { desde: string | null; hasta: string | null } | null;
  /** Un taller o curso: los días de sus sesiones (YYYY-MM-DD). */
  sesiones?: string[] | null;
  /** Un festival: cada evento de su programa, con su fecha, su hora y su sede. */
  actos?: { titulo: string | null; fecha: string | null; hora: string | null; lugar: string | null }[] | null;
  /** El festival del que forma parte, con su edición, si el cartel lo dice (OL-323: lo usa la sugerencia del segundo acto). */
  festival?: string | null;
};

/** Un acto del programa leído del cartel, ya limpio: título, día (YYYY-MM-DD), hora ("HH:MM" o "" si no la dice) y sede ("" si no la dice). */
export type ActoLeido = { titulo: string; fecha: string; hora: string; lugar: string; /** El lugar del directorio que se llama como su sede (lo cruza el servidor). */ lugarId?: string | null };

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ES_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Cuántos actos se toman de un cartel: más no caben en un cartel legible, y el programa se publica de una vez. */
export const TOPE_ACTOS = 12;

/**
 * La forma de ocurrir que trae el cartel, limpia y tolerante (cualquier parte puede faltar o venir mal): la clase si es una de las cuatro; la
 * visita solo con su primer día (y el último, si es posterior); las sesiones como días válidos, sin repetir y en orden (hasta 31); los actos
 * con título y día válidos, en orden de día y hora (hasta `TOPE_ACTOS`).
 */
export function formaDelCartel(l: Pick<LecturaCartel, "clase" | "visita" | "sesiones" | "actos">): { clase: Clase | null; visita: { desde: string; hasta: string | null } | null; sesiones: string[]; actos: ActoLeido[] } {
  const desde = l.visita?.desde && ES_FECHA.test(l.visita.desde) ? l.visita.desde : null;
  const hasta = desde && l.visita?.hasta && ES_FECHA.test(l.visita.hasta) && l.visita.hasta >= desde ? l.visita.hasta : null;
  const sesiones = [...new Set((l.sesiones ?? []).filter((d): d is string => typeof d === "string" && ES_FECHA.test(d)))].sort().slice(0, 31);
  const actos = (l.actos ?? [])
    .map((a) => ({ titulo: (a?.titulo ?? "").trim().slice(0, LIMITES_EVENTO.titulo), fecha: a?.fecha && ES_FECHA.test(a.fecha) ? a.fecha : "", hora: a?.hora && ES_HORA.test(a.hora) ? a.hora : "", lugar: (a?.lugar ?? "").trim().slice(0, LIMITES_EVENTO.sitio) }))
    .filter((a) => a.titulo && a.fecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
    .slice(0, TOPE_ACTOS);
  return { clase: esClase(l.clase) ? l.clase : null, visita: desde ? { desde, hasta } : null, sesiones, actos };
}

/** "@usuario" → Instagram; enlace o dominio → tal cual; teléfono u otra cosa → nada (ya va en la descripción). */
export function enlaceDesdeCartel(v: string | null): string {
  const t = (v ?? "").trim();
  if (!t) return "";
  if (/^@[\w.]+$/.test(t)) return `https://instagram.com/${t.slice(1)}`;
  if (/^https?:\/\//i.test(t) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return t;
  return "";
}

/** Convierte la lectura del cartel en valores del formulario. Lo que falta se deja vacío para que la persona lo complete. */
export function cartelAFormulario(l: LecturaCartel): { titulo: string; inicio: string; fin: string; gratis: boolean; precio: string; descripcion: string; enlace: string; lugar: string; direccion: string; artistas: string[]; forma?: ReturnType<typeof formaDelCartel>; festival?: string } {
  const fechaOk = l.fecha && /^\d{4}-\d{2}-\d{2}$/.test(l.fecha) ? l.fecha : "";
  const horaOk = l.hora && /^\d{2}:\d{2}$/.test(l.hora) ? l.hora : "";
  const horaFinOk = l.hora_fin && /^\d{2}:\d{2}$/.test(l.hora_fin) ? l.hora_fin : "";
  return {
    titulo: (l.titulo ?? "").trim().slice(0, LIMITES_EVENTO.titulo),
    inicio: fechaOk && horaOk ? `${fechaOk}T${horaOk}` : fechaOk ? `${fechaOk}T19:00` : "",
    fin: fechaOk && horaFinOk ? `${fechaOk}T${horaFinOk}` : "",
    gratis: l.gratis !== false && !l.precio,
    precio: extraerNumero(l.precio),
    descripcion: (l.descripcion ?? "").trim().slice(0, LIMITES_EVENTO.descripcion),
    enlace: enlaceDesdeCartel(l.enlace),
    lugar: (l.lugar ?? "").trim(),
    direccion: (l.direccion ?? "").trim(),
    artistas: (l.artistas ?? []).map((a) => a.trim().replace(/\s+/g, " ").slice(0, 80)).filter(Boolean).slice(0, 6),
    forma: formaDelCartel(l),
    festival: (l.festival ?? "").trim().slice(0, 160),
  };
}
