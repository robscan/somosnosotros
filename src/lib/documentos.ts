/**
 * La «Presentación» del artista y el «Informe de actividad» del lugar en PDF (OL-396, pieza 4 de 5 del historial): lo que firmó el founder el 12
 * de octubre por la noche en `docs/rediseno/prototipos/curriculo-propuestas.html` (OL-395, bitácora 426), tal como la propuesta: «T presentación
 * · F carta · E sobrio · R1 reseña y redes · R2 reciente primero · R3 próximas fechas · R4 con quién y "dijeron Voy" · I1 periodo mes (con año y
 * todo en la hoja) · I2 cifras y lista · I3 "dijeron Voy" con definición · Q solo quien gestiona · O junto a "Tu año" · X solo PDF».
 *
 * Aquí solo lo que no lee la base ni dibuja: qué dice el documento, en bloques ya resueltos (`bloquesArtista`, `bloquesLugar` del prototipo),
 * las cifras del informe con sus reglas y sus definiciones, los nombres de archivo y las direcciones. La lectura está en `cargarDocumento.ts`; el
 * reparto en páginas y el dibujo, en `carteles/plantillas/documento.tsx`. Las cuentas de lugares y artistas son las del historial de las fichas
 * (`historialFichas.ts`, OL-390), y lo marcado «se canceló» (OL-391) se lista tachado y no cuenta, como allí.
 */
import { etiquetaTipoArtista } from "./artistas";
import { etiquetaEnlace, normalizarRedes } from "./enlaces";
import { sitioEnLista } from "./eventos";
import { esDeVariosDias, horaCorta, ZONA_INICIAL, zonaSegura } from "./fechas";
import { artistasDelHistorial, cabeceraTrayectoria, listaCon, lugaresDeTrayectoria, otrosArtistas, plural, realizados, type EventoPasado, type Presencia } from "./historialFichas";
import { MARCA } from "./marca";

/** De quién es el documento: la presentación es del artista; el informe, del lugar. */
export type QueDocumento = "artista" | "lugar";
export const esQueDocumento = (v: unknown): v is QueDocumento => v === "artista" || v === "lugar";

/** El tamaño de la hoja (F firmado: carta, la de México; A4 es la otra opción del segmento). */
export type FormatoDocumento = "carta" | "a4";
export const FORMATOS_DOCUMENTO_LISTA: readonly FormatoDocumento[] = ["carta", "a4"];
export const esFormatoDocumento = (v: unknown): v is FormatoDocumento => v === "carta" || v === "a4";

/**
 * Cada página como imagen a 150 ppp (carta: 8,5 × 11 in = 1275 × 1650 px; A4: 210 × 297 mm = 1240 × 1754 px) y su caja en el PDF en puntos
 * (1/72 in: carta 612 × 792, A4 595 × 842).
 */
export const FORMATOS_DOCUMENTO: Record<FormatoDocumento, { ancho: number; alto: number; puntos: { ancho: number; alto: number } }> = {
  carta: { ancho: 1275, alto: 1650, puntos: { ancho: 612, alto: 792 } },
  a4: { ancho: 1240, alto: 1754, puntos: { ancho: 595, alto: 842 } },
};

/** El periodo del informe (I1 firmado: el mes en curso por omisión; el año y todo lo registrado se eligen en la hoja). */
export type PeriodoInforme = "mes" | "anio" | "todo";
export const PERIODOS_INFORME: readonly PeriodoInforme[] = ["mes", "anio", "todo"];
export const esPeriodoInforme = (v: unknown): v is PeriodoInforme => v === "mes" || v === "anio" || v === "todo";

/** Un renglón de evento: la fecha a la izquierda, el título y debajo, en gris, dónde, de qué festival, con quién y cuántos dijeron «Voy». */
export type FilaDocumento = { cuando: string; titulo: string; detalle: string | null; cancelado: boolean };
/** Un nombre de una lista a dos columnas, con «2 veces» si repite. */
export type NombreDocumento = { nombre: string; veces: string | null };
/** Una cifra del informe con su definición, tal cual el prototipo. */
export type CifraDocumento = { n: number; titulo: string; definicion: string };

/**
 * Lo que dice el documento, en orden y ya resuelto: la plantilla solo lo mide, lo reparte en páginas y lo dibuja.
 *  · `resena`: el párrafo de la ficha (puede no haberlo) y las redes («Instagram: instagram.com/…»);
 *  · `rotulo`: el título de una sección, en violeta y en mayúsculas («Trayectoria · 3 fechas · 2 lugares»);
 *  · `anio`: el año de un grupo de la trayectoria;
 *  · `fila`: un evento;
 *  · `columnas`: dos listas de nombres lado a lado, cada una con su rótulo (null: sin rótulo, la de la derecha de «Artistas que pasaron»);
 *  · `cifras`: el periodo del informe y sus cifras;
 *  · `nota`: una línea en gris (los talleres, «Ninguna en el periodo»).
 */
export type BloqueDocumento =
  | { tipo: "resena"; texto: string | null; redes: string[] }
  | { tipo: "rotulo"; texto: string }
  | { tipo: "anio"; texto: string }
  | { tipo: "fila"; fila: FilaDocumento }
  | { tipo: "columnas"; columnas: [{ rotulo: string | null; nombres: NombreDocumento[] }, { rotulo: string | null; nombres: NombreDocumento[] }] }
  | { tipo: "cifras"; periodo: string; cifras: CifraDocumento[] }
  | { tipo: "nota"; texto: string };

/** El documento entero: la cabecera de la primera página, la corta de las demás, los bloques y el pie. */
export type Documento = {
  que: QueDocumento;
  /** El rótulo en violeta sobre el nombre: «Presentación» o «Informe de actividad». */
  rotulo: string;
  nombre: string;
  /** Debajo del nombre, en gris: «Rock · Solista · San Luis Potosí» o la dirección del lugar. */
  meta: string | null;
  /** La foto del artista (o su portada) o la portada del lugar: la dirección del Storage propio, o null (el círculo con el SN). */
  foto: string | null;
  /** A la derecha, bajo el símbolo SN: «somosnosotros.org/artistas/leo-traeger». */
  enlace: string;
  /** La cabecera corta de la página 2 en adelante: «Presentación de Leo Traeger», «Informe de actividad · CC200». */
  tituloCorto: string;
  bloques: BloqueDocumento[];
  /** «12 oct 2026»: el día en que se elaboró, en negro dentro del pie. */
  elaborado: string;
  /** Las reglas de conteo del pie, tras «a partir de lo publicado en la app» (solo el informe). */
  reglas: string | null;
};

/** El dominio que lleva el documento (el de la app, como «Tu año»). */
export const DOMINIO_DOCUMENTO = "somosnosotros.org";

const mayuscula = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** «8 oct»: el día y el mes corto, en la zona. */
function fechaCorta(iso: string, zona: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), day: "numeric", month: "short" }).format(new Date(iso)).replace(/[.,]/g, "");
}

/** «12 oct 2026»: el día del pie. */
export function fechaElaborado(ahora: Date, zona: string = ZONA_INICIAL): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), day: "numeric", month: "short", year: "numeric" }).format(ahora).replace(/[.,]/g, "");
}

/** La fecha de un renglón: «8 oct · 7:00 pm»; si dura varios días, «6 oct – 7 oct» (una exposición, un taller). */
export function cuandoDocumento(e: Pick<EventoPasado, "inicio" | "fin" | "zona">): string {
  const zona = e.zona || ZONA_INICIAL;
  if (e.fin && esDeVariosDias(e.inicio, e.fin, zona)) return `${fechaCorta(e.inicio, zona)} – ${fechaCorta(e.fin, zona)}`;
  return `${fechaCorta(e.inicio, zona)} · ${horaCorta(e.inicio, zona)}`;
}

/** «1 dijo «Voy»», «3 dijeron «Voy»». */
export const textoDijeronVoy = (n: number) => `${n} ${n === 1 ? "dijo" : "dijeron"} «Voy»`;

/**
 * El renglón de un evento (`filaEvento` del prototipo). En la presentación: dónde, «parte de {festival}», «con A y B» (los otros artistas) y, si
 * ya pasó, «N dijeron «Voy»». En el informe: «parte de {festival}», los artistas del evento y cuántos dijeron «Voy». Lo cancelado no dice cuántos
 * dijeron «Voy»: no ocurrió.
 */
export function filaDocumento(e: EventoPasado, como: { que: "artista"; artistaId: string; pasado: boolean } | { que: "lugar" }): FilaDocumento {
  const partes: string[] = [];
  if (como.que === "artista") {
    const sitio = sitioEnLista(e);
    if (sitio) partes.push(sitio);
  }
  if (e.festival) partes.push(`parte de ${e.festival}`);
  if (como.que === "artista") {
    const otros = otrosArtistas(e, como.artistaId);
    if (otros.length) partes.push(`con ${listaCon(otros)}`);
  } else if (e.artistas.length) {
    partes.push(e.artistas.map((a) => a.nombre).join(", "));
  }
  const pasado = como.que === "lugar" || como.pasado;
  if (pasado && !e.cancelado && e.van > 0) partes.push(textoDijeronVoy(e.van));
  return { cuando: cuandoDocumento(e), titulo: e.titulo, detalle: partes.length ? partes.join(" · ") : null, cancelado: e.cancelado };
}

/** Una lista de presencias como nombres con «2 veces» si repiten. */
const nombres = (lista: readonly Presencia[]): NombreDocumento[] => lista.map((p) => ({ nombre: p.nombre, veces: p.veces > 1 ? `${p.veces} veces` : null }));

/** Las redes como se escriben en el papel: «Instagram: instagram.com/leotraeger_» (sin https, sin www, sin la consulta ni la barra final). */
export function redesDocumento(redes: unknown): string[] {
  return normalizarRedes(redes).map((r) => `${etiquetaEnlace(r)}: ${r.url.replace(/^https?:\/\/(www\.)?/i, "").split(/[?#]/)[0].replace(/\/$/, "")}`);
}

/** El año (YYYY) de un evento en su zona: el grupo de la trayectoria. */
function anioDe(e: Pick<EventoPasado, "inicio" | "zona">): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zonaSegura(e.zona || ZONA_INICIAL), year: "numeric" }).format(new Date(e.inicio));
}

/** Lo que entra para la presentación: la ficha, su trayectoria (OL-390) y sus próximas fechas. */
export type EntradaPresentacion = {
  artista: { id: string; slug?: string | null; nombre: string; detalle?: string | null; tipo?: string | null; ciudad?: string | null; descripcion?: string | null; redes?: unknown; foto?: string | null; portada?: string | null };
  pasados: readonly EventoPasado[];
  /** Se llenó la lectura de lo pasado (`TOPE_HISTORIAL`): la cuenta dice «200+ fechas». */
  lleno?: boolean;
  proximos: readonly EventoPasado[];
  ahora: Date;
};

/**
 * Los bloques de la presentación (`bloquesArtista` del prototipo, con R1 · R2 reciente · R3 · R4): la reseña tal cual la ficha con sus redes
 * (sin ninguna de las dos, no hay sección); «Trayectoria · 3 fechas · 1 cancelado · 2 lugares» por año, de lo más reciente a lo más viejo, con lo
 * cancelado tachado; «Lugares» y «Ha tocado con» a dos columnas; «Próximas fechas» al final, en orden.
 */
export function bloquesArtista(e: EntradaPresentacion): BloqueDocumento[] {
  const a = e.artista;
  const b: BloqueDocumento[] = [];
  const descripcion = a.descripcion?.trim() || null;
  const redes = redesDocumento(a.redes);
  if (descripcion || redes.length) {
    b.push({ tipo: "rotulo", texto: "Reseña" });
    b.push({ tipo: "resena", texto: descripcion, redes });
  }
  const pasados = [...e.pasados].sort((x, y) => Date.parse(y.inicio) - Date.parse(x.inicio) || x.id.localeCompare(y.id));
  const ocurridos = realizados(pasados);
  const lugares = lugaresDeTrayectoria(pasados);
  // Con quién compartió fecha: los otros artistas de lo que sí ocurrió, nunca él mismo (como «Con quien más» de «Tu año»).
  const compas = artistasDelHistorial(ocurridos.map((x) => ({ ...x, artistas: x.artistas.filter((o) => o.id !== a.id) })));
  if (pasados.length) {
    b.push({ tipo: "rotulo", texto: `Trayectoria · ${cabeceraTrayectoria(ocurridos.length, lugares.length, e.lleno ?? false, pasados.length - ocurridos.length)}` });
    let anio: string | null = null;
    for (const x of pasados) {
      const suyo = anioDe(x);
      if (suyo !== anio) {
        b.push({ tipo: "anio", texto: suyo });
        anio = suyo;
      }
      b.push({ tipo: "fila", fila: filaDocumento(x, { que: "artista", artistaId: a.id, pasado: true }) });
    }
  }
  if (lugares.length || compas.length) {
    b.push({ tipo: "columnas", columnas: [{ rotulo: lugares.length ? "Lugares" : null, nombres: nombres(lugares) }, { rotulo: compas.length ? "Ha tocado con" : null, nombres: nombres(compas) }] });
  }
  if (e.proximos.length) {
    b.push({ tipo: "rotulo", texto: "Próximas fechas" });
    for (const x of [...e.proximos].sort((p, q) => Date.parse(p.inicio) - Date.parse(q.inicio) || p.id.localeCompare(q.id))) {
      b.push({ tipo: "fila", fila: filaDocumento(x, { que: "artista", artistaId: a.id, pasado: false }) });
    }
  }
  return b;
}

/** La presentación entera (T firmado: «Presentación»). */
export function presentacionArtista(e: EntradaPresentacion): Documento {
  const a = e.artista;
  const meta = [a.detalle ? mayuscula(a.detalle) : null, a.tipo ? etiquetaTipoArtista(a.tipo) : null, a.ciudad || null].filter(Boolean).join(" · ") || null;
  const zona = e.pasados[0]?.zona || ZONA_INICIAL;
  return {
    que: "artista",
    rotulo: "Presentación",
    nombre: a.nombre,
    meta,
    foto: a.foto || a.portada || null,
    enlace: `${DOMINIO_DOCUMENTO}/artistas/${a.slug || a.id}`,
    tituloCorto: `Presentación de ${a.nombre}`,
    bloques: bloquesArtista(e),
    elaborado: fechaElaborado(e.ahora, zona),
    reglas: null,
  };
}

// ===== El informe del lugar.

/** La clave del mes (YYYY-MM) y el año de un instante en la zona. */
function partes(iso: string | Date, zona: string): { mes: string; anio: string } {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: zonaSegura(zona), year: "numeric", month: "2-digit" }).formatToParts(typeof iso === "string" ? new Date(iso) : iso).map((x) => [x.type, x.value]));
  return { mes: `${p.year}-${p.month}`, anio: String(p.year) };
}

/** ¿Empezó en el periodo? Por su día de inicio, en la zona del lugar. */
export function enPeriodo(inicio: string, periodo: PeriodoInforme, ahora: Date, zona: string = ZONA_INICIAL): boolean {
  if (periodo === "todo") return true;
  const e = partes(inicio, zona);
  const hoy = partes(ahora, zona);
  return periodo === "mes" ? e.mes === hoy.mes : e.anio === hoy.anio;
}

/** El nombre del periodo: «Octubre de 2026», «2026» o «todo lo registrado». */
export function nombrePeriodo(periodo: PeriodoInforme, ahora: Date, zona: string = ZONA_INICIAL): string {
  if (periodo === "todo") return "todo lo registrado";
  if (periodo === "anio") return partes(ahora, zona).anio;
  return mayuscula(new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), month: "long", year: "numeric" }).format(ahora));
}

/** Las tres opciones del segmento de la hoja: «Octubre», «2026», «Todo». */
export function etiquetasPeriodo(ahora: Date, zona: string = ZONA_INICIAL): Record<PeriodoInforme, string> {
  return { mes: mayuscula(new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), month: "long" }).format(ahora)), anio: partes(ahora, zona).anio, todo: "Todo" };
}

/** Las definiciones de cada cifra, tal cual el prototipo firmado (I3: «dijeron "Voy"» nunca es asistencia). */
export const DEFINICIONES = {
  actividades: "Eventos, talleres y expos del periodo, por su día de inicio; un festival no se suma además de sus actividades.",
  realizadas: "Las registradas que nadie marcó «se canceló».",
  artistas: "Fichas distintas ligadas a esas actividades.",
  voy: "Personas que marcaron «Voy» en la app. No es asistencia medida.",
} as const;

/** Las reglas de conteo que repite el pie del informe. */
export const REGLAS_INFORME = "un festival no se suma además de sus actividades; una expo cuenta una vez";

/** Las cuentas del informe de un periodo. */
export type CuentasInforme = {
  /** Lo registrado del periodo, por su inicio y del más viejo al más reciente, sin el festival marco que tiene actos en el periodo. */
  actividades: EventoPasado[];
  realizadas: number;
  artistas: Presencia[];
  /** La suma de «Voy» de lo realizado. */
  voy: number;
  /** Los talleres realizados (cada uno cuenta una vez, aunque tenga varias sesiones). */
  talleres: number;
};

/**
 * Las cuentas (`bloquesLugar` del prototipo): las actividades del periodo por su día de inicio; un festival marco no se suma si en el periodo
 * están sus actos (se cuentan ellos); una exposición es un evento y cuenta una vez, por su inicio; un taller con sesiones es un evento y cuenta
 * una vez. Realizadas: las que no se marcaron «se canceló». Artistas: las fichas distintas de lo realizado. «Dijeron Voy»: la suma de lo
 * realizado (nunca asistencia).
 */
export function cuentasInforme(eventos: readonly EventoPasado[], periodo: PeriodoInforme, ahora: Date, zona: string = ZONA_INICIAL): CuentasInforme {
  const delPeriodo = eventos.filter((e) => enPeriodo(e.inicio, periodo, ahora, zona)).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || a.id.localeCompare(b.id));
  const conActos = new Set(delPeriodo.map((e) => e.festivalId).filter((x): x is string => !!x));
  const actividades = delPeriodo.filter((e) => !(e.clase === "festival" && conActos.has(e.id)));
  const hechas = realizados(actividades);
  return {
    actividades,
    realizadas: hechas.length,
    artistas: artistasDelHistorial(hechas),
    voy: hechas.reduce((n, e) => n + (e.van || 0), 0),
    talleres: hechas.filter((e) => e.clase === "taller").length,
  };
}

/** Lo que entra para el informe: la ficha, su historial (OL-390), el periodo y la hora. */
export type EntradaInforme = {
  lugar: { id: string; slug?: string | null; nombre: string; direccion?: string | null; portada?: string | null; zona?: string | null };
  pasados: readonly EventoPasado[];
  periodo: PeriodoInforme;
  ahora: Date;
};

/** La zona del informe: la del lugar si la guarda, si no la de San Luis. */
export const zonaInforme = (l: { zona?: string | null }) => l.zona || ZONA_INICIAL;

/**
 * Los bloques del informe (`bloquesLugar` del prototipo, con I2 lista e I3): «Periodo: Octubre de 2026» con las cuatro cifras y su definición;
 * la nota de los talleres; «Actividades del periodo», del más viejo al más reciente (lo cancelado tachado); «Artistas que pasaron» a dos columnas.
 */
export function bloquesLugar(e: EntradaInforme): BloqueDocumento[] {
  const zona = zonaInforme(e.lugar);
  const c = cuentasInforme(e.pasados, e.periodo, e.ahora, zona);
  const b: BloqueDocumento[] = [
    {
      tipo: "cifras",
      periodo: `Periodo: ${nombrePeriodo(e.periodo, e.ahora, zona)}`,
      cifras: [
        { n: c.actividades.length, titulo: "Actividades registradas", definicion: DEFINICIONES.actividades },
        { n: c.realizadas, titulo: "Realizadas", definicion: DEFINICIONES.realizadas },
        { n: c.artistas.length, titulo: "Artistas participantes", definicion: DEFINICIONES.artistas },
        { n: c.voy, titulo: "Dijeron «Voy»", definicion: DEFINICIONES.voy },
      ],
    },
  ];
  if (c.talleres) b.push({ tipo: "nota", texto: `${plural(c.talleres, "taller", "talleres")} con sesiones; cada taller cuenta una vez.` });
  b.push({ tipo: "rotulo", texto: "Actividades del periodo" });
  if (!c.actividades.length) b.push({ tipo: "nota", texto: "Ninguna en el periodo." });
  for (const x of c.actividades) b.push({ tipo: "fila", fila: filaDocumento(x, { que: "lugar" }) });
  if (c.artistas.length) {
    const lista = nombres(c.artistas);
    const mitad = Math.ceil(lista.length / 2);
    b.push({ tipo: "columnas", columnas: [{ rotulo: "Artistas que pasaron", nombres: lista.slice(0, mitad) }, { rotulo: null, nombres: lista.slice(mitad) }] });
  }
  return b;
}

/** El informe entero. */
export function informeLugar(e: EntradaInforme): Documento {
  const l = e.lugar;
  return {
    que: "lugar",
    rotulo: "Informe de actividad",
    nombre: l.nombre,
    meta: l.direccion?.trim() || null,
    foto: l.portada || null,
    enlace: `${DOMINIO_DOCUMENTO}/lugares/${l.slug || l.id}`,
    tituloCorto: `Informe de actividad · ${l.nombre}`,
    bloques: bloquesLugar(e),
    elaborado: fechaElaborado(e.ahora, zonaInforme(l)),
    reglas: REGLAS_INFORME,
  };
}

// ===== Direcciones, archivos y textos de la hoja.

/** La clave del periodo en el nombre del archivo: «2026-10», «2026» o «todo». */
export function clavePeriodo(periodo: PeriodoInforme, ahora: Date, zona: string = ZONA_INICIAL): string {
  if (periodo === "todo") return "todo";
  const p = partes(ahora, zona);
  return periodo === "mes" ? p.mes : p.anio;
}

const limpio = (slug: string) => slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** «presentacion-leo-traeger.pdf» · «informe-cc200-2026-10.pdf». */
export function nombreDocumento(que: QueDocumento, slug: string, clave?: string): string {
  const base = limpio(slug);
  return que === "artista" ? `presentacion${base ? `-${base}` : ""}.pdf` : `informe${base ? `-${base}` : ""}${clave ? `-${clave}` : ""}.pdf`;
}

/** La dirección del PDF (`/api/documento`); `v` cambia con lo que dice el documento (la caché del teléfono no da el de ayer). */
export function hrefDocumento(p: { que: QueDocumento; id: string; formato: FormatoDocumento; periodo?: PeriodoInforme; v?: string }): string {
  const q = new URLSearchParams({ que: p.que, id: p.id });
  if (p.que === "lugar") q.set("periodo", p.periodo ?? "mes");
  q.set("formato", p.formato);
  if (p.v) q.set("v", p.v);
  return `/api/documento?${q.toString()}`;
}

/** Una versión corta del documento (FNV-1a, como `versionTuAnio`). */
export function versionDocumento(d: Documento): string {
  let h = 0x811c9dc5;
  for (const letra of JSON.stringify(d)) h = Math.imul(h ^ letra.charCodeAt(0), 0x01000193) >>> 0;
  return h.toString(36);
}

/** La línea de ayuda de la hoja, con cuántas páginas salen. */
export function ayudaDocumento(que: QueDocumento, nombre: string, paginas: number): string {
  const cuantas = plural(paginas, "página", "páginas");
  return que === "artista" ? `Tus fechas en ${MARCA}, tu reseña y tus redes, listas para enviar: ${cuantas}.` : `Lo que pasó en ${nombre} en el periodo, con las definiciones de cada cifra: ${cuantas}.`;
}
