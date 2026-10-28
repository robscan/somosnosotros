/**
 * OL-462 · Cargar a mano propuestas desde un JSON (lugares, artistas, eventos; un festival con sus actos) como una corrida más de la bandeja.
 * El founder mandó los carteles del festival «Cultura Mística» y pidió: «revisa este festival de varios días con sus eventos y créalo en la
 * plataforma». En vez de publicarlo a mano, se carga como lo que deja una rutina: una corrida `agendas` de la ciudad, ya terminada y sin gasto,
 * con sus propuestas en la bandeja, con la MISMA forma de `datos` que deja la rutina (`src/lib/rutinas/agendas.ts` → `proponer`,
 * `src/lib/rutinas/formaEvento.ts`, `src/lib/propuestas.ts`), así `aceptar-corrida` (OL-453) o la bandeja las aceptan sin cambiar nada:
 *   · lugar   { nombre, tipo, detalle?, direccion?, lat?, lng?, ciudad, redes, url?, leida }
 *   · artista { nombre, disciplina, detalle?, tipo, ciudad, redes, url?, leida, municipio?, obra? }
 *   · evento  { titulo, inicio, fin?, lugar, direccion?, precio?, descripcion?, clase, ciudad, url?, imagen?, leida, artistas? }
 *     - un festival con actos es un marco: `clase: festival`, `actos` (cuántos), `termina` (el fin de su último acto, `finEnPrograma`) y
 *       `programa` (su título);
 *     - un acto de un festival del mismo JSON: `marco_propuesto` (el id de la propuesta del festival), `programa` y `espera`, como los deja la
 *       rutina; de un festival ya registrado en la ciudad: `marco` { id, titulo };
 *     - `artistas` [{ nombre, id? | propuesta? }]: la ficha que ya existe (`id`) o la propuesta de este JSON que la crea; al publicarse el
 *       evento se ligan (`publicarEvento.ts`, OL-462);
 *     - `imagen`: una imagen local del JSON («./cartel.jpg») se prepara como un cartel del teléfono (`prepararCartel`), se sube como JPEG
 *       público al bucket `fotos` (`lugares/<autor>/propuesta-<uuid>.jpg`) y queda su URL: al aceptar el evento, `ponerCartel` la pone de cartel.
 *
 * La forma del archivo (`<carpeta>/propuestas.json`): ver `ArchivoPropuestas`. Las horas son de la ciudad; una `hora_fin` menor o igual que la
 * de inicio es del día siguiente (una fiesta hasta la 1:00).
 *
 * Con --simular: lee la base solo para leer, comprueba cada propuesta como la comprobaría la bandeja (`validarLugar`, `validarArtista`,
 * `prepararEvento`; un acto, como evento suelto, porque su festival aún no existe) y cada imagen (sin subirla), e imprime lo que crearía. Sin
 * --simular hace lo mismo y, si nada falla, sube las imágenes y escribe la corrida con sus propuestas. Si algo falla, no escribe nada. Si la
 * ciudad ya tiene propuestas con esa fuente, no vuelve a cargarlas (correrlo dos veces no repite nada).
 *
 * Uso: node scripts/instituciones/correr.mjs proponer <carpeta> --autor <id del admin> [--simular] [--salida <carpeta>]
 * Después: node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin> [--simular]
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DISCIPLINAS, TIPOS_ARTISTA, validarArtista } from "../../src/lib/artistas";
import { precioDeAgenda } from "../../src/lib/cargaEventos";
import { finEnPrograma } from "../../src/lib/claseEvento";
import { leerParametrosCiudad } from "../../src/lib/ciudadParametros";
import { esClase, type Clase } from "../../src/lib/eventos";
import { isoALocal, localAIso, zonaSegura } from "../../src/lib/fechas";
import { LIMITES_ARTISTA, LIMITES_EVENTO, LIMITES_LUGAR } from "../../src/lib/limites";
import { normalizarNombre, validarLugar } from "../../src/lib/lugares";
import { entradaDeArtista, entradaDeLugar, urlSegura } from "../../src/lib/propuestas";
import { almacenDeSupabase, prepararCartel } from "../../src/lib/rutinas/aceptarCartel";
import { claseDeActo, mismoPrograma, sumarDias } from "../../src/lib/rutinas/formaEvento";
import { direccionPublica } from "../../src/lib/rutinas/imagenWeb";
import { radioDeCiudadKm } from "../../src/lib/rutinas/filtros";
import { artistasPreparados, lugaresDeCiudad, prepararEvento, type CiudadDeEvento, type LugarDeCiudad } from "../../src/lib/rutinas/publicarEvento";
import { soloLectura } from "./cartelera-cdmx";
import { guardarInforme, requerida } from "./entorno";

const USO = "node scripts/instituciones/correr.mjs proponer <carpeta> --autor <id del admin> [--simular] [--salida <carpeta>]";
export const ARCHIVO = "propuestas.json";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{1,2}:\d{2}$/;

// ---------- la forma del archivo ----------
export type LugarJson = { nombre: string; tipo?: string; detalle?: string; direccion?: string; lat?: number; lng?: number; redes?: string[]; url?: string };
export type ArtistaJson = { nombre: string; disciplina?: string; detalle?: string; tipo?: string; redes?: string[]; url?: string; municipio?: string; obra?: string };
export type EventoJson = {
  titulo: string;
  /** El día y la hora de inicio, en la hora de la ciudad. */
  fecha: string;
  hora: string;
  /** La hora de fin (si es menor o igual que la de inicio, del día siguiente) y, si acaba otro día, ese día. */
  hora_fin?: string | null;
  fecha_fin?: string | null;
  /** El lugar registrado (su nombre exacto) o el sitio. */
  lugar: string;
  direccion?: string;
  precio?: string;
  descripcion?: string;
  /** puntual · taller · exposicion · festival (por omisión, puntual). */
  clase?: string;
  url?: string;
  /** Una imagen local de la carpeta («./cartel.jpg») o una dirección https. */
  imagen?: string;
  /** Es un acto de este festival: el título de un festival del mismo archivo o uno ya registrado en la ciudad. */
  festival?: string;
  /** Quién se presenta, por nombre: los artistas de este archivo o fichas que ya existen. */
  artistas?: string[];
};
export type ArchivoPropuestas = {
  /** El slug de la ciudad («san-luis-potosi»). */
  ciudad: string;
  /** Lo que dice la bandeja como fuente (hasta 120). */
  fuente: string;
  /** La página de la fuente, si la hay (https). */
  url?: string;
  lugares?: LugarJson[];
  artistas?: ArtistaJson[];
  eventos?: EventoJson[];
};

// ---------- de la base, lo que hace falta para armar ----------
export type FichaExistente = { id: string; nombre: string };
export type FestivalRegistrado = { id: string; titulo: string };
export type Contexto = {
  corrida: string;
  ciudad: { nombre: string; zona: string };
  leida: string;
  artistas: readonly FichaExistente[];
  lugares: readonly FichaExistente[];
  festivales: readonly FestivalRegistrado[];
  /** De cada imagen local del archivo («./x.jpg»), su URL ya subida (o la que tendría, simulando). */
  imagenes: ReadonlyMap<string, string>;
};
export type FilaPropuesta = { id: string; corrida_id: string; tipo: "lugar" | "artista" | "evento"; fuente: string; datos: Record<string, unknown>; estado: "propuesta" };
export type Armado = { filas: FilaPropuesta[]; errores: string[]; notas: string[] };

const texto = (v: unknown, tope: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, tope) : "");
const redesDe = (v: unknown): string[] => (Array.isArray(v) ? v.map((r) => urlSegura(r)).filter((u): u is string => !!u).slice(0, 8) : []);
/** ¿Es una imagen de la carpeta (no una dirección)? */
export const esImagenLocal = (v: unknown): boolean => typeof v === "string" && !!v.trim() && !/^[a-z]+:\/\//i.test(v.trim());

/** El instante (ISO) de un día y una hora de la ciudad. */
function instante(fecha: string, hora: string, zona: string): string | null {
  if (!FECHA.test(fecha) || !HORA.test(hora.trim())) return null;
  return localAIso(`${fecha}T${hora.trim().padStart(5, "0")}`, zona);
}

/** El fin de un evento: su `hora_fin` ese día (o el siguiente si es menor o igual que la de inicio), o en `fecha_fin`. */
function finDe(e: EventoJson, zona: string): string | null | "mal" {
  const hf = texto(e.hora_fin, 5);
  if (!hf) return null;
  if (!HORA.test(hf)) return "mal";
  const hora = texto(e.hora, 5).padStart(5, "0");
  const dia = texto(e.fecha_fin, 10) || (hf.padStart(5, "0") > hora ? e.fecha : sumarDias(e.fecha, 1));
  return instante(dia, hf, zona) ?? "mal";
}

/**
 * Las propuestas del archivo, con la forma que deja la rutina; o lo que está mal (`errores`: entonces no se escribe nada). `notas`: lo que no
 * impide cargar pero conviene leer (un artista que ya tiene ficha y no se propone, un nombre sin ficha que no se ligará).
 */
export function armarPropuestas(archivo: ArchivoPropuestas, ctx: Contexto): Armado {
  const errores: string[] = [];
  const notas: string[] = [];
  const filas: FilaPropuesta[] = [];
  const fuente = texto(archivo.fuente, 120);
  if (!fuente) errores.push("Falta `fuente` (lo que dice la bandeja como fuente).");
  const urlFuente = urlSegura(archivo.url);
  const base = { corrida_id: ctx.corrida, fuente, estado: "propuesta" as const };
  const ciudad = ctx.ciudad.nombre;
  const zona = ctx.ciudad.zona;
  const mismo = (a: string, b: string) => normalizarNombre(a) === normalizarNombre(b);

  // Lugares: uno que ya está en el directorio no se propone (los eventos lo usan por su nombre).
  for (const [i, l] of (archivo.lugares ?? []).entries()) {
    const nombre = texto(l.nombre, LIMITES_LUGAR.nombre);
    if (!nombre) {
      errores.push(`lugares[${i}]: falta el nombre.`);
      continue;
    }
    if (ctx.lugares.some((x) => mismo(x.nombre, nombre))) {
      notas.push(`El lugar «${nombre}» ya está en el directorio: no se propone.`);
      continue;
    }
    const datos: Record<string, unknown> = { nombre, tipo: texto(l.tipo, 40) || "otro", ciudad, redes: redesDe(l.redes), leida: ctx.leida };
    if (texto(l.detalle, LIMITES_LUGAR.detalle)) datos.detalle = texto(l.detalle, LIMITES_LUGAR.detalle);
    if (texto(l.direccion, LIMITES_LUGAR.direccion)) datos.direccion = texto(l.direccion, LIMITES_LUGAR.direccion);
    if (typeof l.lat === "number" && typeof l.lng === "number") Object.assign(datos, { lat: l.lat, lng: l.lng });
    const url = urlSegura(l.url) ?? urlFuente;
    if (url) datos.url = url;
    filas.push({ id: randomUUID(), tipo: "lugar", ...base, datos });
  }

  // Artistas: uno que ya tiene ficha en la ciudad no se propone; los eventos se ligan a su ficha.
  const porNombre = new Map<string, { nombre: string; id?: string; propuesta?: string }>();
  for (const [i, a] of (archivo.artistas ?? []).entries()) {
    const nombre = texto(a.nombre, LIMITES_ARTISTA.nombre);
    if (!nombre) {
      errores.push(`artistas[${i}]: falta el nombre.`);
      continue;
    }
    if (porNombre.has(normalizarNombre(nombre))) {
      errores.push(`artistas[${i}]: «${nombre}» está dos veces.`);
      continue;
    }
    const ficha = ctx.artistas.find((x) => mismo(x.nombre, nombre));
    if (ficha) {
      notas.push(`«${nombre}» ya tiene ficha: no se propone; sus eventos se ligan a ella.`);
      porNombre.set(normalizarNombre(nombre), { nombre: ficha.nombre, id: ficha.id });
      continue;
    }
    const disciplina = texto(a.disciplina, 40) || "por_completar";
    if (disciplina !== "por_completar" && !DISCIPLINAS.some((d) => d.valor === disciplina)) errores.push(`artistas[${i}]: la disciplina «${disciplina}» no existe.`);
    const tipo = texto(a.tipo, 20) || "solista";
    if (!TIPOS_ARTISTA.some((t) => t.valor === tipo)) errores.push(`artistas[${i}]: el tipo «${tipo}» no existe (solista, grupo o colectivo).`);
    const detalle = texto(a.detalle, 200);
    if (detalle.length > LIMITES_ARTISTA.detalle) errores.push(`artistas[${i}]: el detalle de «${nombre}» pasa de ${LIMITES_ARTISTA.detalle} letras.`);
    const datos: Record<string, unknown> = { nombre, disciplina, tipo, ciudad, redes: redesDe(a.redes), leida: ctx.leida };
    if (detalle) datos.detalle = detalle;
    if (texto(a.municipio, 80)) datos.municipio = texto(a.municipio, 80);
    if (texto(a.obra, 300)) datos.obra = texto(a.obra, 300);
    const url = urlSegura(a.url) ?? urlFuente;
    if (url) datos.url = url;
    const id = randomUUID();
    filas.push({ id, tipo: "artista", ...base, datos });
    porNombre.set(normalizarNombre(nombre), { nombre, propuesta: id });
  }
  const artistasDe = (nombres: unknown, de: string) =>
    (Array.isArray(nombres) ? nombres : []).flatMap((n) => {
      const nombre = texto(n, LIMITES_ARTISTA.nombre);
      if (!nombre) return [];
      const conocido = porNombre.get(normalizarNombre(nombre));
      if (conocido) return [conocido];
      const ficha = ctx.artistas.find((x) => mismo(x.nombre, nombre));
      if (ficha) return [{ nombre: ficha.nombre, id: ficha.id }];
      notas.push(`«${nombre}» (en «${de}») no tiene ficha ni está en \`artistas\`: no se ligará.`);
      return [{ nombre }];
    });

  // Eventos: primero los festivales (los actos apuntan a ellos), luego lo demás en el orden del archivo.
  const eventos = archivo.eventos ?? [];
  const festivales = new Map<number, FilaPropuesta>();
  const imagenDe = (e: EventoJson, de: string): string | null => {
    if (!e.imagen) return null;
    if (esImagenLocal(e.imagen)) {
      const url = ctx.imagenes.get(e.imagen.trim());
      if (!url) errores.push(`«${de}»: no encontré la imagen ${e.imagen}.`);
      return url ?? null;
    }
    const url = direccionPublica(e.imagen.trim())?.href ?? null;
    if (!url) errores.push(`«${de}»: la imagen tiene que ser un archivo de la carpeta o una dirección https pública.`);
    return url;
  };
  const vistos = new Set<string>();
  const comun = (e: EventoJson, i: number): Record<string, unknown> | null => {
    const titulo = texto(e.titulo, LIMITES_EVENTO.titulo);
    const de = titulo || `eventos[${i}]`;
    const inicio = instante(texto(e.fecha, 10), texto(e.hora, 5), zona);
    const fin = inicio ? finDe(e, zona) : null;
    const lugar = texto(e.lugar, LIMITES_EVENTO.sitio);
    if (!titulo) errores.push(`eventos[${i}]: falta el título.`);
    if (!inicio) errores.push(`«${de}»: la fecha (AAAA-MM-DD) o la hora (HH:MM) no se entienden.`);
    if (fin === "mal" || (fin && inicio && Date.parse(fin) <= Date.parse(inicio))) errores.push(`«${de}»: la hora de fin no se entiende o es antes del inicio.`);
    if (!lugar) errores.push(`«${de}»: falta el lugar.`);
    if (e.clase && !esClase(e.clase)) errores.push(`«${de}»: la clase «${e.clase}» no existe (puntual, taller, exposicion, festival).`);
    if (texto(e.descripcion, 5000).length > LIMITES_EVENTO.descripcion) errores.push(`«${de}»: la descripción pasa de ${LIMITES_EVENTO.descripcion} letras.`);
    if (!titulo || !inicio || !lugar || fin === "mal") return null;
    const clave = `${normalizarNombre(titulo)}|${e.fecha}`;
    if (vistos.has(clave)) errores.push(`«${de}» está dos veces el mismo día.`);
    vistos.add(clave);
    const datos: Record<string, unknown> = { titulo, inicio, lugar, ciudad, leida: ctx.leida };
    if (fin) datos.fin = fin;
    if (texto(e.direccion, LIMITES_EVENTO.direccion)) datos.direccion = texto(e.direccion, LIMITES_EVENTO.direccion);
    const precio = precioDeAgenda(texto(e.precio, 120));
    if (precio) datos.precio = precio;
    if (texto(e.descripcion, LIMITES_EVENTO.descripcion)) datos.descripcion = texto(e.descripcion, LIMITES_EVENTO.descripcion);
    const url = urlSegura(e.url) ?? urlFuente;
    if (url) datos.url = url;
    const imagen = imagenDe(e, de);
    if (imagen) datos.imagen = imagen;
    const artistas = artistasDe(e.artistas, titulo);
    if (artistas.length) datos.artistas = artistas;
    return datos;
  };
  for (const [i, e] of eventos.entries()) {
    if (e.clase !== "festival") continue;
    const datos = comun(e, i);
    if (!datos) continue;
    Object.assign(datos, { clase: "festival", actos: 0, programa: datos.titulo });
    const fila: FilaPropuesta = { id: randomUUID(), tipo: "evento", ...base, datos };
    festivales.set(i, fila);
    filas.push(fila);
  }
  for (const [i, e] of eventos.entries()) {
    if (e.clase === "festival") continue;
    const datos = comun(e, i);
    if (!datos) continue;
    const clase: Clase = esClase(e.clase) ? e.clase : "puntual";
    const nombre = texto(e.festival, 120);
    if (!nombre) {
      datos.clase = clase;
      filas.push({ id: randomUUID(), tipo: "evento", ...base, datos });
      continue;
    }
    // Un acto: de un festival de este archivo (como lo deja la rutina, `hacerActo`) o de uno ya registrado en la ciudad.
    datos.clase = claseDeActo(clase);
    const propio = [...festivales.values()].find((f) => mismo(String(f.datos.titulo), nombre) || mismoPrograma(String(f.datos.titulo), nombre));
    if (propio) {
      const titulo = String(propio.datos.titulo);
      Object.assign(datos, { marco_propuesto: propio.id, programa: titulo, espera: `Se publica cuando aceptes el festival «${titulo}».` });
      propio.datos.actos = Number(propio.datos.actos) + 1;
      const hasta = finEnPrograma(String(datos.inicio), typeof datos.fin === "string" ? datos.fin : null, zona);
      if (Date.parse(String(datos.inicio)) < Date.parse(String(propio.datos.inicio))) errores.push(`«${datos.titulo}» empieza antes que su festival «${titulo}».`);
      if (!propio.datos.termina || Date.parse(hasta) > Date.parse(String(propio.datos.termina))) propio.datos.termina = hasta;
    } else {
      const registrado = ctx.festivales.find((f) => mismo(f.titulo, nombre) || mismoPrograma(f.titulo, nombre));
      if (!registrado) {
        errores.push(`«${datos.titulo}»: no encontré el festival «${nombre}» en el archivo ni en la ciudad.`);
        continue;
      }
      datos.marco = { id: registrado.id, titulo: registrado.titulo };
    }
    filas.push({ id: randomUUID(), tipo: "evento", ...base, datos });
  }
  // Un festival sin actos es un evento de un día (con su fin, si lo dice); con actos, su periodo llega al fin de su último acto o al suyo.
  for (const f of festivales.values()) {
    if (!Number(f.datos.actos)) {
      delete f.datos.actos;
      continue;
    }
    if (typeof f.datos.fin === "string" && Date.parse(f.datos.fin) > Date.parse(String(f.datos.termina))) f.datos.termina = f.datos.fin;
    delete f.datos.fin;
  }
  return { filas, errores, notas };
}

/** El resumen que queda en la corrida (lo lee la bandeja y Corridas). */
export function resumenDeCarga(filas: readonly FilaPropuesta[], archivo: string, imagenes: number): Record<string, unknown> {
  const eventos = filas.filter((f) => f.tipo === "evento");
  return {
    fuente: "carga manual",
    archivo,
    lugares: filas.filter((f) => f.tipo === "lugar").length,
    artistas: filas.filter((f) => f.tipo === "artista").length,
    eventos: eventos.length,
    festivales: eventos.filter((f) => f.datos.clase === "festival").length,
    actos: eventos.filter((f) => f.datos.marco_propuesto || f.datos.marco).length,
    imagenes,
    propuestos: filas.length,
  };
}

// ---------- comprobar como la bandeja ----------
export type Comprobacion = { id: string; tipo: FilaPropuesta["tipo"]; nombre: string; ok: boolean; motivo: string | null; artistas?: number };

/**
 * Cada propuesta, comprobada como la comprobaría la bandeja al aceptarla, sin escribir nada: un lugar y un artista con su validación del alta;
 * un evento con `prepararEvento` (un acto, sin su festival, como evento suelto: el festival aún no existe). `artistas`: las fichas que ya
 * existen y se ligarían (las propuestas de este archivo se ligan al aceptarse).
 */
export async function comprobar(db: SupabaseClient, filas: readonly FilaPropuesta[], ciudad: CiudadDeEvento, lugares: readonly LugarDeCiudad[], autor: string, ahora: Date): Promise<Comprobacion[]> {
  const salida: Comprobacion[] = [];
  for (const f of filas) {
    const nombre = String(f.datos.titulo ?? f.datos.nombre ?? "");
    if (f.tipo === "lugar") {
      const primero = Object.values(validarLugar(entradaDeLugar(f, ciudad.nombre), { esAdmin: true }).errores)[0];
      salida.push({ id: f.id, tipo: f.tipo, nombre, ok: !primero, motivo: primero ?? null });
    } else if (f.tipo === "artista") {
      const primero = Object.values(validarArtista(entradaDeArtista(f, ciudad.nombre), { esAdmin: true }).errores)[0];
      salida.push({ id: f.id, tipo: f.tipo, nombre, ok: !primero, motivo: primero ?? null });
    } else {
      const { marco_propuesto: _m, espera: _e, ...suelto } = f.datos;
      void _m;
      void _e;
      const p = await prepararEvento({ db, mapbox: null, ahora }, f.datos.marco_propuesto ? suelto : f.datos, ciudad, lugares, autor);
      salida.push({ id: f.id, tipo: f.tipo, nombre, ok: p.ok, motivo: p.ok ? (p.nota ?? null) : p.error, artistas: p.ok ? artistasPreparados(p.fila) : 0 });
    }
  }
  return salida;
}

/** El informe: qué se crearía (o se creó), por tipo; cada evento con su cuándo; lo que falló y las notas. */
export function lineasDeInforme(o: { simular: boolean; carpeta: string; ciudad: string; zona: string; corrida: string | null; filas: readonly FilaPropuesta[]; comprobadas: readonly Comprobacion[]; errores: readonly string[]; notas: readonly string[] }): string[] {
  const cuenta = (t: string) => o.filas.filter((f) => f.tipo === t).length;
  const hora = (iso: unknown) => (typeof iso === "string" ? isoALocal(iso, o.zona).replace("T", " ").slice(0, 16) : "—");
  const comp = new Map(o.comprobadas.map((c) => [c.id, c]));
  const estado = (id: string) => {
    const c = comp.get(id);
    return !c ? "" : c.ok ? ` · ok${c.motivo ? ` (${c.motivo})` : ""}${c.artistas ? ` · ${c.artistas} ficha${c.artistas === 1 ? "" : "s"} de artista ya existentes` : ""}` : ` · NO: ${c.motivo}`;
  };
  const lineas = [
    `# Cargar propuestas · ${o.simular ? "simulación (no se escribió nada)" : o.corrida ? "hecho" : "no se escribió nada"} · ${new Date().toISOString().slice(0, 16)}`,
    "",
    `- Carpeta: ${o.carpeta} · ciudad ${o.ciudad} · horas en ${o.zona}${o.corrida ? ` · corrida ${o.corrida}` : ""}`,
    `- Propuestas: ${o.filas.length} (lugar ${cuenta("lugar")} · artista ${cuenta("artista")} · evento ${cuenta("evento")})`,
  ];
  if (o.errores.length) lineas.push("", "## Errores (no se escribe nada hasta corregirlos)", "", ...o.errores.map((e) => `- ${e}`));
  const malas = o.comprobadas.filter((c) => !c.ok);
  if (malas.length) lineas.push("", "## No pasan la comprobación de la bandeja", "", ...malas.map((c) => `- ${c.tipo} · ${c.nombre}: ${c.motivo}`));
  for (const tipo of ["lugar", "artista"] as const)
    if (cuenta(tipo)) lineas.push("", `## ${tipo === "lugar" ? "Lugares" : "Artistas"}`, "", ...o.filas.filter((f) => f.tipo === tipo).map((f) => `- ${f.datos.nombre}${f.datos.disciplina ? ` · ${f.datos.disciplina}` : ""}${f.datos.detalle ? ` · ${f.datos.detalle}` : ""}${estado(f.id)}`));
  if (cuenta("evento")) {
    lineas.push("", "## Eventos", "");
    for (const f of o.filas.filter((x) => x.tipo === "evento")) {
      const d = f.datos;
      const que = d.clase === "festival" ? `FESTIVAL (${d.actos ?? 0} actos, hasta ${hora(d.termina)})` : d.marco_propuesto || d.marco ? `  acto de «${d.programa ?? (d.marco as { titulo?: string })?.titulo}» · ${d.clase}` : String(d.clase);
      const quienes = Array.isArray(d.artistas) ? (d.artistas as { nombre: string; id?: string; propuesta?: string }[]).map((a) => `${a.nombre}${a.id ? " (ficha)" : a.propuesta ? " (propuesta)" : " (sin ficha)"}`).join(", ") : "";
      lineas.push(`- ${que} · ${hora(d.inicio)}${d.fin ? `–${hora(d.fin).slice(11)}` : ""} · ${d.titulo} · ${d.lugar} · ${d.precio ?? "sin precio"}${d.imagen ? " · con cartel" : ""}${quienes ? ` · con ${quienes}` : ""}${estado(f.id)}`);
    }
  }
  if (o.notas.length) lineas.push("", "## Notas", "", ...o.notas.map((n) => `- ${n}`));
  return lineas;
}

// ---------- el guion ----------
/** Todas las filas de una consulta, de mil en mil (PostgREST no da más de mil de una vez). */
async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const salida: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await consulta(desde, desde + 999);
    if (r.error) throw new Error("No se pudo leer la base");
    const filas = (r.data ?? []) as T[];
    salida.push(...filas);
    if (filas.length < 1000) return salida;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const opcion = (nombre: string): string | undefined => {
    const k = args.indexOf(`--${nombre}`);
    return k >= 0 ? args[k + 1] : undefined;
  };
  const carpeta = resolve(requerida(args[0] && !args[0].startsWith("--") ? args[0] : undefined, "la carpeta", USO));
  const autor = requerida(opcion("autor"), "--autor", USO);
  if (!UUID.test(autor)) requerida(undefined, "--autor con el id (uuid) de una cuenta de administración", USO);
  const simular = args.includes("--simular");
  const salida = opcion("salida") ?? "scripts/instituciones/salida";
  const ruta = join(carpeta, ARCHIVO);
  if (!existsSync(ruta)) requerida(undefined, `${ruta}`, USO);
  const archivo = JSON.parse(readFileSync(ruta, "utf8")) as ArchivoPropuestas;
  const url = requerida(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL en .env", USO);
  const llave = requerida(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY en .env", USO);
  const real = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });
  // Simulando, nada se escribe aunque algo lo intente.
  const db = simular ? soloLectura(real, (e) => console.error(`(simulación: no se escribió ${e.op} en ${e.tabla})`)) : real;
  const ahora = new Date();

  const perfil = await real.from("perfiles").select("rol").eq("id", autor).maybeSingle();
  if ((perfil.data as { rol?: string } | null)?.rol !== "admin") throw new Error("--autor tiene que ser una cuenta de administración");
  const c = await real.from("ciudades").select("slug, nombre, lat, lng, zoom, zona, alias, parametros").eq("slug", texto(archivo.ciudad, 80)).maybeSingle();
  if (c.error || !c.data) throw new Error(`No hay una ciudad «${archivo.ciudad}»`);
  const f = c.data as Record<string, unknown>;
  const parametros = leerParametrosCiudad(f.parametros);
  const ciudad: CiudadDeEvento = {
    slug: String(f.slug),
    nombre: String(f.nombre),
    alias: Array.isArray(f.alias) ? f.alias.filter((a): a is string => typeof a === "string") : [],
    lat: typeof f.lat === "number" ? f.lat : null,
    lng: typeof f.lng === "number" ? f.lng : null,
    zona: zonaSegura(typeof f.zona === "string" ? f.zona : null),
    radioKm: parametros.radio_km ?? radioDeCiudadKm(typeof f.zoom === "number" ? f.zoom : 13),
    parametros,
  };
  const nombres = [ciudad.nombre, ...ciudad.alias];

  // ¿Ya se cargó? Las propuestas de la ciudad con esta fuente.
  const corridas = await todas<{ id: string }>((a, b) => real.from("rutinas_corridas").select("id").eq("ciudad", ciudad.slug).range(a, b));
  const fuente = texto(archivo.fuente, 120);
  const ya = corridas.length ? await real.from("propuestas").select("corrida_id").eq("fuente", fuente).in("corrida_id", corridas.map((x) => x.id)).limit(1) : { data: [], error: null };
  if (ya.error) throw new Error("No se pudieron leer las propuestas de la ciudad");
  const previa = (ya.data as { corrida_id: string }[] | null)?.[0]?.corrida_id;
  if (previa) {
    console.error(`Ya hay propuestas de «${fuente}» en ${ciudad.nombre} (corrida ${previa}): no se vuelven a cargar. Acéptalas con aceptar-corrida ${previa}.`);
    process.exit(1);
  }

  const artistas = await todas<FichaExistente>((a, b) => real.from("artistas").select("id, nombre").in("ciudad", nombres).eq("visible", true).range(a, b));
  const lugares = await lugaresDeCiudad(real, ciudad);
  if (!lugares) throw new Error("No se pudieron leer los lugares de la ciudad");
  const fest = await real.from("eventos").select("id, titulo").eq("clase", "festival").in("ciudad", nombres).gte("termina", ahora.toISOString()).limit(200);
  if (fest.error) throw new Error("No se pudieron leer los festivales de la ciudad");

  // Las imágenes de la carpeta: cada una se prepara como un cartel del teléfono (y, de verdad, se sube una vez).
  const locales = [...new Set((archivo.eventos ?? []).map((e) => e.imagen).filter((i): i is string => esImagenLocal(i)).map((i) => i.trim()))];
  const preparadas = new Map<string, Buffer>();
  const erroresImagen: string[] = [];
  for (const nombre of locales) {
    const archivoImagen = resolve(carpeta, nombre);
    if (!archivoImagen.startsWith(carpeta) || !existsSync(archivoImagen)) {
      erroresImagen.push(`No encontré la imagen ${nombre} en la carpeta.`);
      continue;
    }
    const listo = await prepararCartel(readFileSync(archivoImagen));
    if (!listo) erroresImagen.push(`La imagen ${nombre} no se pudo preparar como cartel.`);
    else preparadas.set(nombre, listo);
  }
  const imagenes = new Map([...preparadas.keys()].map((n) => [n, `https://pendiente.invalid/${encodeURIComponent(n)}`]));

  const corridaId = randomUUID();
  const armado = armarPropuestas(archivo, { corrida: corridaId, ciudad: { nombre: ciudad.nombre, zona: ciudad.zona }, leida: ahora.toISOString(), artistas, lugares, festivales: (fest.data ?? []) as FestivalRegistrado[], imagenes });
  armado.errores.unshift(...erroresImagen);
  const comprobadas = armado.errores.length ? [] : await comprobar(db, armado.filas, ciudad, lugares, autor, ahora);
  const falla = armado.errores.length > 0 || comprobadas.some((x) => !x.ok);

  let escrita: string | null = null;
  if (!simular && !falla) {
    // Las imágenes: JPEG público en la carpeta del admin; su URL sustituye a la local.
    const almacen = almacenDeSupabase(real);
    const subidas = new Map<string, string>();
    for (const [nombre, bytes] of preparadas) {
      const destino = `lugares/${autor}/propuesta-${randomUUID()}.jpg`;
      const publica = await almacen.subir(destino, bytes, "image/jpeg");
      if (!publica) throw new Error(`No se pudo subir ${nombre}: no se escribió nada (las que ya subieron quedan en ${`lugares/${autor}/`}).`);
      subidas.set(publica, destino);
      for (const fila of armado.filas) if (fila.datos.imagen === imagenes.get(nombre)) fila.datos.imagen = publica;
    }
    const fin = new Date().toISOString();
    const r = await real
      .from("rutinas_corridas")
      .insert({ id: corridaId, tipo: "agendas", ciudad: ciudad.slug, tope_usd: 0.01, gasto_usd: 0, creado_por: autor, parametros: { carga: "manual", fuente }, estado: "terminada", inicio: ahora.toISOString(), fin, resumen: resumenDeCarga(armado.filas, basename(carpeta), preparadas.size) })
      .select("id")
      .single();
    if (r.error) throw new Error(`No se pudo crear la corrida: ${r.error.message}`);
    const p = await real.from("propuestas").insert(armado.filas);
    if (p.error) {
      await real.from("rutinas_corridas").delete().eq("id", corridaId);
      for (const destino of subidas.values()) await almacen.borrar?.(destino);
      throw new Error(`No se pudieron guardar las propuestas (no quedó nada): ${p.error.message}`);
    }
    escrita = corridaId;
  }

  const lineas = lineasDeInforme({ simular, carpeta, ciudad: ciudad.nombre, zona: ciudad.zona, corrida: escrita, filas: armado.filas, comprobadas, errores: armado.errores, notas: armado.notas });
  if (escrita) lineas.push("", "## Siguiente paso", "", "```", `node scripts/instituciones/correr.mjs aceptar-corrida ${escrita} --autor ${autor} --simular`, `node scripts/instituciones/correr.mjs aceptar-corrida ${escrita} --autor ${autor}`, "```");
  else if (!simular && falla) lineas.push("", "No se escribió nada: corrige lo de arriba y vuelve a correr.");
  console.log(lineas.join("\n"));
  const entraron = escrita ? armado.filas.map((x) => ({ id: x.id, nombre: String(x.datos.titulo ?? x.datos.nombre ?? "") })) : [];
  console.log(`\nInforme: ${guardarInforme(salida, "proponer", lineas, entraron, simular || !escrita)}`);
  if (falla) process.exit(1);
}

if (/^proponer\.(m?js|ts)$/.test(basename(process.argv[1] ?? ""))) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
