/**
 * OL-122 · Correo a las instituciones del catálogo pidiendo su agenda del mes (doc 31,
 * docs/rediseno/31-agendas-por-correo.md). Calca scripts/capo/invitar.ts: mismas piezas de envío
 * (scripts/lib/correo-envio.ts), mismo remitente CORREO_REMITENTE, un correo a la vez, y cada envío
 * anotado en `agendas_invitaciones_enviadas` ANTES del siguiente para no repetir.
 *
 * Quién recibe: scripts/instituciones/agendas.json (46 filas, SIN correos: id de la ficha, slug, nombre y
 * variante). Los correos se leen al correr desde un CSV fuera del repo (variable AGENDAS_CORREOS_CSV, con
 * columnas `clave,correo,contesto`, donde clave es el lugarId o el nombre del organismo). En la base solo
 * queda un hash SHA-256 con sal (AGENDAS_SAL) del correo, nunca el correo en claro.
 *
 * Reparto (plan de envío del doc 31, decisión del founder: todo el mismo día):
 *   --comprobacion  los 3 correos de comprobación técnica (Hotmail/Outlook, Gmail, dominio propio)
 *   --resto         el resto de las instituciones con correo propio, en el orden de la lista (incluye el
 *                   correo al buzón compartido de la Secretaría de Cultura, que cuenta como uno más: tres
 *                   instituciones con el mismo correo de contacto reciben un solo correo que cita a las tres,
 *                   cada una con su ficha — decisión del founder, 2026-09-22, en vez de mandarlo tres veces
 *                   o quedar dos omitidas por buzón repetido)
 *   --organismos    un correo por organismo, con la lista de sus sedes sin correo propio (al final, doc 31 §3)
 *   --recordatorio  a los 12 días, un solo recordatorio a quien no contestó (columna `contesto` vacía)
 *
 * Modo por defecto: --ensayo. No manda nada ni escribe: imprime a quién le tocaría (correos enmascarados),
 * el asunto y el cuerpo de un ejemplo de cada variante. Mandar de verdad exige --enviar Y --confirmo,
 * un reparto explícito, RESEND_API_KEY, AGENDAS_SAL y FIRMA_TELEFONO. Entre correo y correo espera
 * 60–120 s. El envío lo ordena el founder y lo corre el gestor.
 *
 * Uso: npx tsx scripts/instituciones/invitar-agendas.ts [--ensayo|--enviar --confirmo]
 *        [--comprobacion|--resto|--organismos|--recordatorio] [--asunto=A|B]
 *
 * Variables (de /Users/apple-1/somosnosotros/.env o del entorno; nunca se imprimen): AGENDAS_CORREOS_CSV,
 * AGENDAS_SAL, FIRMA_TELEFONO, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
 * CORREO_REMITENTE.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cargarEnv, enmascarar, mandarCorreo, RUTA_ENV } from "../lib/correo-envio";

export const SITIO = "https://somosnosotros.org";
export const DIAS_RECORDATORIO = 12;
export const PAUSA_MIN_MS = 60_000;
export const PAUSA_MAX_MS = 120_000;
const RUTA_JSON = fileURLToPath(new URL("./agendas.json", import.meta.url));

// ---------- tipos ----------

export type VarianteFila = "institucion" | "organismo";
export type VarianteDestino = VarianteFila | "buzon_compartido";
export type Tipo = "comprobacion" | "tanda" | "recordatorio";
export type VarianteAsunto = "A" | "B";

/** Una fila de agendas.json: nunca trae correo. */
export type Fila = {
  lugarId: string;
  slug: string;
  nombre: string;
  variante: VarianteFila;
  /** Solo en variante organismo: a quién se le escribe por esta sede. */
  organismo?: string;
  /** Organismo sin correo de área confirmado (DIF, Ayuntamiento): no se le escribe hasta que el founder lo confirme. */
  sinCorreo?: boolean;
  /** 1, 2 o 3: orden dentro de los correos de comprobación técnica. */
  comprobacion?: number;
  /** Institución cuyo correo de contacto es el mismo que el de otra(s) fila(s) con esta misma clave: en vez de
   * mandar un correo repetido (o quedar omitida, doc 31 §"tres instituciones..."), se manda un solo correo que
   * cita a todas — decisión del founder, 2026-09-22. */
  grupoCorreo?: string;
};

/** Una fila del CSV privado: `clave,correo,contesto` (clave = lugarId o nombre del organismo). */
export type Contacto = { clave: string; correo: string; contesto: string };

/** A quién se manda un correo: una institución (con su ficha), un buzón que comparten varias instituciones
 * (con la ficha de cada una), o un organismo (con la lista de sus sedes). */
export type Destino = {
  clave: string;
  nombre: string;
  variante: VarianteDestino;
  correo: string;
  contesto: string;
  lugarId: string | null;
  organismo: string | null;
  /** Lo que se anota en la columna `organismo` de la base; para buzón compartido incluye los slugs de las
   * fichas (la tabla solo admite un lugar_id, así que aquí no cabe más que uno). */
  organismoRegistro?: string;
  /** Variante institución: la ficha. */
  url?: string;
  /** Variante organismo: los nombres de sus sedes. */
  sedes?: string[];
  /** Variante buzón compartido: cada institución con su propia ficha. */
  sedesConEnlace?: { nombre: string; url: string }[];
  comprobacion?: number;
};

export type EnvioPrevio = { correo_hash: string; tipo: Tipo; enviado_en: string };

// ---------- puro: leer el CSV privado y casar con las filas ----------

export function leerCsv(texto: string): Contacto[] {
  const contactos: Contacto[] = [];
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  for (const [i, linea] of lineas.entries()) {
    if (i === 0 && /^clave\s*,\s*correo/i.test(linea)) continue;
    const a = linea.indexOf(",");
    const b = linea.indexOf(",", a + 1);
    const clave = linea.slice(0, a).trim();
    const correo = (b < 0 ? linea.slice(a + 1) : linea.slice(a + 1, b)).trim();
    const contesto = b < 0 ? "" : linea.slice(b + 1).trim();
    if (!clave || !correo.includes("@")) continue;
    contactos.push({ clave, correo, contesto });
  }
  return contactos;
}

export function urlFicha(slug: string): string {
  return `${SITIO}/lugares/${slug}`;
}

/** "A, B y C" para nombrar las sedes en el correo al organismo. */
export function listaCorta(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/** "Secretaría de Cultura (buzón compartido)": el nombre que llevan en el asunto y en la base los grupos de
 * instituciones que comparten un mismo buzón (decisión del founder, 2026-09-22). Un solo lugar en el código
 * para no repetir el texto entre armarDestinos y las pruebas. */
export function nombreBuzonCompartido(area: string): string {
  return `${area} (buzón compartido)`;
}

/** Casa las filas con los correos: una institución → un destino con su ficha; varias instituciones con la misma
 * `grupoCorreo` (mismo buzón real) → un solo destino de tipo "buzón compartido" que cita a cada una con su
 * ficha; las sedes de un mismo organismo → un solo destino con la lista de sedes. Devuelve aparte lo que se
 * queda sin correo (y por qué). */
export function armarDestinos(filas: Fila[], contactos: Contacto[]): { destinos: Destino[]; sinCorreo: { nombre: string; motivo: string }[] } {
  const porClave = new Map(contactos.map((c) => [c.clave, c]));
  const destinos: Destino[] = [];
  const sinCorreo: { nombre: string; motivo: string }[] = [];
  const organismos = new Map<string, Destino>();
  const grupos = new Map<string, { fila: Fila; correo: string; contesto: string; comprobacion?: number }[]>();
  for (const f of filas) {
    if (f.variante === "institucion") {
      const c = porClave.get(f.lugarId);
      if (!c) {
        sinCorreo.push({ nombre: f.nombre, motivo: "sin correo en el CSV" });
        continue;
      }
      if (f.grupoCorreo) {
        const lista = grupos.get(f.grupoCorreo) ?? [];
        lista.push({ fila: f, correo: c.correo, contesto: c.contesto, comprobacion: f.comprobacion });
        grupos.set(f.grupoCorreo, lista);
        continue;
      }
      destinos.push({ clave: f.lugarId, nombre: f.nombre, variante: "institucion", correo: c.correo, contesto: c.contesto, lugarId: f.lugarId, organismo: null, url: urlFicha(f.slug), comprobacion: f.comprobacion });
      continue;
    }
    if (!f.organismo) {
      sinCorreo.push({ nombre: f.nombre, motivo: "variante organismo sin organismo" });
      continue;
    }
    if (f.sinCorreo) {
      sinCorreo.push({ nombre: f.nombre, motivo: `${f.organismo}: sin correo de área confirmado` });
      continue;
    }
    const c = porClave.get(f.organismo);
    if (!c) {
      sinCorreo.push({ nombre: f.nombre, motivo: `${f.organismo}: sin correo en el CSV` });
      continue;
    }
    let d = organismos.get(f.organismo);
    if (!d) {
      d = { clave: f.organismo, nombre: f.organismo, variante: "organismo", correo: c.correo, contesto: c.contesto, lugarId: null, organismo: f.organismo, organismoRegistro: f.organismo, sedes: [] };
      organismos.set(f.organismo, d);
      destinos.push(d);
    }
    d.sedes!.push(f.nombre);
  }
  for (const [clave, miembros] of grupos) {
    const correos = new Set(miembros.map((m) => m.correo));
    if (correos.size > 1) {
      // Se suponía el mismo buzón para todas; si el CSV ya no coincide, no se adivina: cada una por su lado.
      for (const m of miembros) {
        destinos.push({ clave: m.fila.lugarId, nombre: m.fila.nombre, variante: "institucion", correo: m.correo, contesto: m.contesto, lugarId: m.fila.lugarId, organismo: null, url: urlFicha(m.fila.slug), comprobacion: m.comprobacion });
      }
      sinCorreo.push({ nombre: miembros.map((m) => m.fila.nombre).join(", "), motivo: `grupoCorreo "${clave}": los correos del CSV ya no coinciden; se mandó un correo a cada una por separado, sin agrupar` });
      continue;
    }
    const area = "Secretaría de Cultura";
    const nombreGrupo = nombreBuzonCompartido(area);
    destinos.push({
      clave,
      nombre: nombreGrupo,
      variante: "buzon_compartido",
      correo: miembros[0].correo,
      contesto: miembros[0].contesto,
      lugarId: null,
      organismo: nombreGrupo,
      organismoRegistro: `${nombreGrupo}: ${miembros.map((m) => m.fila.slug).join(", ")}`,
      sedesConEnlace: miembros.map((m) => ({ nombre: m.fila.nombre, url: urlFicha(m.fila.slug) })),
      comprobacion: miembros.find((m) => m.comprobacion)?.comprobacion,
    });
  }
  return { destinos, sinCorreo };
}

// ---------- puro: el reparto ----------

export type Reparto = { comprobacion: Destino[]; resto: Destino[]; organismos: Destino[] };

/** Comprobación técnica (en su orden 1, 2, 3), luego el resto de instituciones en el orden de la lista —el
 * buzón compartido cuenta como uno más ahí, decisión del founder— y los organismos aparte (van al final,
 * cuando el founder ya vio cómo respondió el resto; doc 31 §3). */
export function repartir(destinos: Destino[]): Reparto {
  const comprobacion = destinos.filter((d) => (d.variante === "institucion" || d.variante === "buzon_compartido") && d.comprobacion).sort((a, b) => a.comprobacion! - b.comprobacion!);
  const resto = destinos.filter((d) => (d.variante === "institucion" || d.variante === "buzon_compartido") && !d.comprobacion);
  const organismos = destinos.filter((d) => d.variante === "organismo");
  return { comprobacion, resto, organismos };
}

/** SHA-256 con sal del correo normalizado (minúsculas, sin espacios): lo único que se guarda en la base. */
export function hashCorreo(correo: string, sal: string): string {
  if (!sal) throw new Error("Falta AGENDAS_SAL: no se puede calcular el hash del correo.");
  return createHash("sha256").update(`${sal}\n${correo.trim().toLowerCase()}`).digest("hex");
}

/** Quita de la tanda a quien ya recibió un correo de este tipo (según la base) y, dentro de la misma tanda, a
 * quien comparte buzón con alguien anterior (tres instituciones del catálogo usan el mismo correo de contacto).
 * Devuelve también a quién se omitió y por qué. */
export function quitarYaEnviados(destinos: Destino[], tipo: Tipo, previos: EnvioPrevio[], sal: string): { pendientes: Destino[]; omitidos: { destino: Destino; motivo: string }[] } {
  const hechos = new Set(previos.filter((p) => p.tipo === tipo).map((p) => p.correo_hash));
  const enTanda = new Map<string, string>();
  const pendientes: Destino[] = [];
  const omitidos: { destino: Destino; motivo: string }[] = [];
  for (const d of destinos) {
    const h = hashCorreo(d.correo, sal);
    if (hechos.has(h)) {
      omitidos.push({ destino: d, motivo: `ya recibió un correo de tipo "${tipo}"` });
      continue;
    }
    const otro = enTanda.get(h);
    if (otro) {
      omitidos.push({ destino: d, motivo: `mismo buzón que ${otro} en esta tanda` });
      continue;
    }
    enTanda.set(h, d.nombre);
    pendientes.push(d);
  }
  return { pendientes, omitidos };
}

/** A quién le toca el recordatorio: no contestó (columna `contesto` vacía), recibió el primer correo hace al
 * menos `dias` días (comprobación o tanda) y no ha recibido recordatorio. */
export function paraRecordatorio(destinos: Destino[], previos: EnvioPrevio[], sal: string, ahora: Date, dias: number = DIAS_RECORDATORIO): Destino[] {
  const corte = ahora.getTime() - dias * 24 * 60 * 60 * 1000;
  const primero = new Map<string, number>();
  const recordados = new Set<string>();
  for (const p of previos) {
    if (p.tipo === "recordatorio") {
      recordados.add(p.correo_hash);
      continue;
    }
    const t = new Date(p.enviado_en).getTime();
    const previo = primero.get(p.correo_hash);
    if (previo === undefined || t < previo) primero.set(p.correo_hash, t);
  }
  const vistos = new Set<string>();
  return destinos.filter((d) => {
    if (d.contesto) return false;
    const h = hashCorreo(d.correo, sal);
    if (recordados.has(h) || vistos.has(h)) return false;
    const t = primero.get(h);
    if (t === undefined || t > corte) return false;
    vistos.add(h);
    return true;
  });
}

// ---------- puro: armar el correo (texto firmado por el founder, doc 31) ----------

export type Firma = { telefono: string };

function firmaTexto(f: Firma): string {
  return `Gracias,\nOscar Muñiz Blanco\nCoordinación de agenda · Somos Nosotros\nsomosnosotros.org · ${f.telefono}`;
}

function firmaHtml(f: Firma): string {
  return `<p>Gracias,<br>Oscar Muñiz Blanco<br>Coordinación de agenda · Somos Nosotros<br><a href="${SITIO}">somosnosotros.org</a> · ${escapar(f.telefono)}</p>`;
}

function escapar(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const INTRO = "Somos Nosotros es un directorio sin fines de lucro de centros culturales y agenda de eventos de San Luis Potosí, para que la gente local se conozca.";
const SALIDA = 'Si prefieren que no les volvamos a escribir, contesten con "no me escriban más"';

export function asuntoDe(d: Destino, variante: VarianteAsunto = "A", recordatorio = false): string {
  if (recordatorio) {
    if (d.variante === "buzon_compartido") return `Recordatorio: agendas de ${listaCorta((d.sedesConEnlace ?? []).map((s) => s.nombre))} en Somos Nosotros`;
    return d.variante === "organismo" ? `Recordatorio: agendas de ${d.nombre} en Somos Nosotros` : `Recordatorio: la agenda de ${d.nombre} en Somos Nosotros`;
  }
  if (d.variante === "organismo") return `Somos Nosotros — agendas de ${d.nombre} en San Luis Potosí`;
  if (d.variante === "buzon_compartido") return `Somos Nosotros — agendas de ${listaCorta((d.sedesConEnlace ?? []).map((s) => s.nombre))} en San Luis Potosí`;
  return variante === "A" ? `${d.nombre}, súmate a la agenda de Somos Nosotros` : "¿Nos mandas tu agenda de este mes?";
}

function cuerpoInstitucion(d: Destino, f: Firma): { texto: string; html: string } {
  const url = d.url ?? "";
  const texto = `Hola,

${INTRO} ${d.nombre} ya tiene su ficha en la plataforma, tomada de la investigación de instituciones culturales que hicimos en septiembre: ${url}

Nos ayudaría muchísimo que nos manden su agenda o cartelera de este mes — no hace falta que la preparen: con los mismos carteles, el PDF o el enlace que ya tengan nos basta. Nosotros nos encargamos de subir los eventos a la plataforma.

Pueden contestar este correo con lo que tengan, cuando puedan.

${SALIDA} y no les mandamos nada más.

${firmaTexto(f)}`;
  const html = [
    "<p>Hola,</p>",
    `<p>${INTRO} ${escapar(d.nombre)} ya tiene su ficha en la plataforma, tomada de la investigación de instituciones culturales que hicimos en septiembre: <a href="${url}">${url}</a></p>`,
    "<p>Nos ayudaría muchísimo que nos manden su <strong>agenda o cartelera de este mes</strong> — no hace falta que la preparen: con los mismos carteles, el PDF o el enlace que ya tengan nos basta. Nosotros nos encargamos de subir los eventos a la plataforma.</p>",
    "<p>Pueden contestar este correo con lo que tengan, cuando puedan.</p>",
    `<p>${SALIDA.replace('"no me escriban más"', "“no me escriban más”")} y no les mandamos nada más.</p>`,
    firmaHtml(f),
  ].join("\n");
  return { texto, html };
}

function cuerpoOrganismo(d: Destino, f: Firma): { texto: string; html: string } {
  const sedes = listaCorta(d.sedes ?? []);
  const texto = `Hola,

${INTRO} Ya tenemos fichas de ${sedes} en la plataforma, tomadas de la investigación de instituciones culturales que hicimos en septiembre.

Nos ayudaría muchísimo que nos ayuden a conseguir su agenda o cartelera de este mes — con los carteles, el PDF o el enlace que ya tengan nos basta. Si tienen un correo de contacto directo de cada sede, también nos sirve muchísimo para escribirles a ellas directamente el próximo mes.

¿Nos pueden reenviar esto a quien corresponda, o darnos el contacto de cada sede?

${SALIDA}.

${firmaTexto(f)}`;
  const html = [
    "<p>Hola,</p>",
    `<p>${INTRO} Ya tenemos fichas de ${escapar(sedes)} en la plataforma, tomadas de la investigación de instituciones culturales que hicimos en septiembre.</p>`,
    "<p>Nos ayudaría muchísimo que nos ayuden a conseguir su <strong>agenda o cartelera de este mes</strong> — con los carteles, el PDF o el enlace que ya tengan nos basta. Si tienen un correo de contacto directo de cada sede, también nos sirve muchísimo para escribirles a ellas directamente el próximo mes.</p>",
    "<p>¿Nos pueden reenviar esto a quien corresponda, o darnos el contacto de cada sede?</p>",
    `<p>${SALIDA.replace('"no me escriban más"', "“no me escriban más”")}.</p>`,
    firmaHtml(f),
  ].join("\n");
  return { texto, html };
}

/** Buzón compartido: mismo llamado que la variante institución (un solo correo, sin pedir reenvío ni contacto
 * de nadie —esa promesa es solo de la variante organismo—), pero listando cada institución con su propia
 * ficha, para las que de verdad comparten el mismo correo de contacto (decisión del founder, 2026-09-22). */
function cuerpoBuzonCompartido(d: Destino, f: Firma): { texto: string; html: string } {
  const sedes = d.sedesConEnlace ?? [];
  const nombres = listaCorta(sedes.map((s) => s.nombre));
  const enlaces = sedes.map((s) => `- ${s.nombre}: ${s.url}`).join("\n");
  const texto = `Hola,

${INTRO} ${nombres} ya tienen su ficha en la plataforma, tomada de la investigación de instituciones culturales que hicimos en septiembre:

${enlaces}

Nos ayudaría muchísimo que nos manden la agenda o cartelera de este mes de cada una — no hace falta que la preparen: con los mismos carteles, el PDF o el enlace que ya tengan nos basta. Nosotros nos encargamos de subir los eventos a la plataforma.

Pueden contestar este correo con lo que tengan, cuando puedan.

${SALIDA} y no les mandamos nada más.

${firmaTexto(f)}`;
  const html = [
    "<p>Hola,</p>",
    `<p>${INTRO} ${escapar(nombres)} ya tienen su ficha en la plataforma, tomada de la investigación de instituciones culturales que hicimos en septiembre:</p>`,
    `<ul>${sedes.map((s) => `<li>${escapar(s.nombre)}: <a href="${s.url}">${s.url}</a></li>`).join("")}</ul>`,
    "<p>Nos ayudaría muchísimo que nos manden la <strong>agenda o cartelera de este mes</strong> de cada una — no hace falta que la preparen: con los mismos carteles, el PDF o el enlace que ya tengan nos basta. Nosotros nos encargamos de subir los eventos a la plataforma.</p>",
    "<p>Pueden contestar este correo con lo que tengan, cuando puedan.</p>",
    `<p>${SALIDA.replace('"no me escriban más"', "“no me escriban más”")} y no les mandamos nada más.</p>`,
    firmaHtml(f),
  ].join("\n");
  return { texto, html };
}

function cuerpoRecordatorio(d: Destino, f: Firma): { texto: string; html: string } {
  const que =
    d.variante === "organismo" ? `las agendas de ${listaCorta(d.sedes ?? [])} y sumarlas`
    : d.variante === "buzon_compartido" ? `las agendas de ${listaCorta((d.sedesConEnlace ?? []).map((s) => s.nombre))} y sumarlas`
    : `la agenda de ${d.nombre} y sumarla`;
  const texto = `Hola de nuevo,

Les escribimos hace unos días para pedirles ${que} a Somos Nosotros. Si ya nos la mandaron por otro medio, ignoren este correo. Si no, nos sirve lo que tengan a la mano — cartel, PDF o un enlace.

${SALIDA}.

${firmaTexto(f)}`;
  const html = [
    "<p>Hola de nuevo,</p>",
    `<p>Les escribimos hace unos días para pedirles ${escapar(que)} a Somos Nosotros. Si ya nos la mandaron por otro medio, ignoren este correo. Si no, nos sirve lo que tengan a la mano — cartel, PDF o un enlace.</p>`,
    `<p>${SALIDA.replace('"no me escriban más"', "“no me escriban más”")}.</p>`,
    firmaHtml(f),
  ].join("\n");
  return { texto, html };
}

export function armarCorreo(d: Destino, firma: Firma, opciones: { asunto?: VarianteAsunto; recordatorio?: boolean } = {}): { asunto: string; texto: string; html: string; url?: string } {
  const recordatorio = opciones.recordatorio === true;
  const asunto = asuntoDe(d, opciones.asunto ?? "A", recordatorio);
  const cuerpo =
    recordatorio ? cuerpoRecordatorio(d, firma)
    : d.variante === "organismo" ? cuerpoOrganismo(d, firma)
    : d.variante === "buzon_compartido" ? cuerpoBuzonCompartido(d, firma)
    : cuerpoInstitucion(d, firma);
  return { asunto, ...cuerpo, url: d.url };
}

// ---------- puro: argumentos ----------

export type Modo = "comprobacion" | "resto" | "organismos" | "recordatorio";
export type Argumentos = { enviar: boolean; confirmo: boolean; modo: Modo | null; asunto: VarianteAsunto };

export function leerArgumentos(argv: string[]): Argumentos {
  const modos = (["comprobacion", "resto", "organismos", "recordatorio"] as Modo[]).filter((m) => argv.includes(`--${m}`));
  if (modos.length > 1) throw new Error(`Elige un solo reparto: --${modos.join(" o --")}.`);
  const asuntoArg = argv.find((a) => a.startsWith("--asunto="))?.slice("--asunto=".length) ?? "A";
  if (asuntoArg !== "A" && asuntoArg !== "B") throw new Error("--asunto solo acepta A o B.");
  const enviar = argv.includes("--enviar");
  if (enviar && argv.includes("--ensayo")) throw new Error("--ensayo y --enviar no van juntos.");
  return { enviar, confirmo: argv.includes("--confirmo"), modo: modos[0] ?? null, asunto: asuntoArg };
}

/** El tipo que se anota en la base para cada reparto. */
export function tipoDe(modo: Modo): Tipo {
  return modo === "comprobacion" ? "comprobacion" : modo === "recordatorio" ? "recordatorio" : "tanda";
}

// ---------- impuro: archivos, Supabase, Resend ----------

export function leerFilas(ruta: string = RUTA_JSON): Fila[] {
  return JSON.parse(readFileSync(ruta, "utf8")) as Fila[];
}

/** Envíos ya hechos. Si la migración aún no está aplicada, se trata como "ningún envío" (mismo criterio que el
 * guion del CAPO), para que el ensayo funcione antes de aplicarla. */
export async function enviosPrevios(db: SupabaseClient): Promise<EnvioPrevio[]> {
  const { data, error } = await db.from("agendas_invitaciones_enviadas").select("correo_hash, tipo, enviado_en");
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|could not find the table/i.test(error.message)) return [];
    throw error;
  }
  return (data ?? []) as EnvioPrevio[];
}

function pausaAleatoria(): number {
  return PAUSA_MIN_MS + Math.floor(Math.random() * (PAUSA_MAX_MS - PAUSA_MIN_MS + 1));
}

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function imprimirEjemplo(titulo: string, d: Destino, firma: Firma, asunto: VarianteAsunto, recordatorio = false): void {
  const c = armarCorreo(d, firma, { asunto, recordatorio });
  console.log(`--- ${titulo}: ${d.nombre} · ${enmascarar(d.correo)} ---`);
  console.log(`Asunto: ${c.asunto}`);
  console.log(c.texto);
  console.log("");
}

async function main() {
  cargarEnv();
  const args = leerArgumentos(process.argv.slice(2));
  if (!args.enviar) {
    // Ensayo: por si acaso, la llave de Resend no queda ni en memoria de este proceso.
    delete process.env.RESEND_API_KEY;
  }

  const rutaCsv = process.env.AGENDAS_CORREOS_CSV;
  if (!rutaCsv) {
    console.error(`Falta AGENDAS_CORREOS_CSV (la ruta del CSV privado con los correos; se buscó en ${RUTA_ENV} y en el entorno).`);
    process.exit(1);
  }
  const filas = leerFilas();
  const contactos = leerCsv(readFileSync(rutaCsv, "utf8"));
  const { destinos, sinCorreo } = armarDestinos(filas, contactos);
  const reparto = repartir(destinos);
  const telefono = process.env.FIRMA_TELEFONO ?? "";
  const firma: Firma = { telefono: telefono || "{teléfono}" };
  const sal = process.env.AGENDAS_SAL ?? "";

  const urlDb = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llaveDb = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = urlDb && llaveDb ? createClient(urlDb, llaveDb, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  const previos = db ? await enviosPrevios(db) : [];

  if (!args.enviar) {
    console.log("Ensayo: no se manda nada ni se escribe en la base.");
    if (!db) console.log("Sin llaves de Supabase: no se comprueban envíos previos (todo cuenta como pendiente).");
    if (!telefono) console.log("Sin FIRMA_TELEFONO: la firma sale con el marcador {teléfono}.");
    if (!sal) console.log("Sin AGENDAS_SAL: no se calculan hashes (no se detectan buzones repetidos).");
    console.log("");
    console.log(`${filas.length} filas en agendas.json · ${contactos.length} contactos en el CSV · ${destinos.length} destinos con correo · ${sinCorreo.length} sin correo`);
    for (const s of sinCorreo) console.log(`  (sin correo) ${s.nombre} — ${s.motivo}`);
    console.log("");
    const modos: Modo[] = args.modo ? [args.modo] : ["comprobacion", "resto", "organismos", "recordatorio"];
    for (const modo of modos) {
      const base = modo === "recordatorio" ? (sal ? paraRecordatorio(destinos, previos, sal, new Date()) : destinos.filter((d) => !d.contesto)) : reparto[modo];
      const { pendientes, omitidos } = sal ? quitarYaEnviados(base, tipoDe(modo), previos, sal) : { pendientes: base, omitidos: [] };
      const nota = modo === "recordatorio" && !sal ? " (sin sal ni base: quienes no han contestado, sin mirar fechas)" : "";
      console.log(`--${modo}: ${pendientes.length} correos${nota}`);
      for (const d of pendientes) {
        const sedes = d.variante === "organismo" ? listaCorta(d.sedes ?? []) : d.variante === "buzon_compartido" ? listaCorta((d.sedesConEnlace ?? []).map((s) => s.nombre)) : null;
        console.log(`- ${d.nombre} · ${enmascarar(d.correo)}${sedes ? ` · sedes: ${sedes}` : ""}`);
      }
      for (const o of omitidos) console.log(`  (omitido) ${o.destino.nombre} · ${enmascarar(o.destino.correo)} — ${o.motivo}`);
      console.log("");
    }
    const soloInst = reparto.comprobacion.find((d) => d.variante === "institucion") ?? reparto.resto.find((d) => d.variante === "institucion");
    const buzon = [...reparto.comprobacion, ...reparto.resto].find((d) => d.variante === "buzon_compartido");
    const inst = soloInst ?? reparto.comprobacion[0] ?? reparto.resto[0];
    if (soloInst) imprimirEjemplo("Ejemplo variante institución", soloInst, firma, args.asunto);
    if (buzon) imprimirEjemplo("Ejemplo variante buzón compartido", buzon, firma, args.asunto);
    if (reparto.organismos[0]) imprimirEjemplo("Ejemplo variante organismo", reparto.organismos[0], firma, args.asunto);
    if (inst) imprimirEjemplo("Ejemplo recordatorio", inst, firma, args.asunto, true);
    return;
  }

  // ----- envío de verdad: todos los candados -----
  if (!args.confirmo) {
    console.error("Para mandar de verdad hace falta --enviar --confirmo (y el reparto). Sin --confirmo no se manda nada.");
    process.exit(1);
  }
  if (!args.modo) {
    console.error("Con --enviar hay que decir el reparto: --comprobacion, --resto, --organismos o --recordatorio.");
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY) {
    console.error("Falta RESEND_API_KEY: no se puede mandar de verdad.");
    process.exit(1);
  }
  if (!telefono) {
    console.error("Falta FIRMA_TELEFONO: la firma no puede salir con un marcador.");
    process.exit(1);
  }
  if (!sal) {
    console.error("Falta AGENDAS_SAL: sin sal no se anota el envío y no se manda.");
    process.exit(1);
  }
  if (!db) {
    console.error(`Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (se buscaron en ${RUTA_ENV} y en el entorno).`);
    process.exit(1);
  }
  const tipo = tipoDe(args.modo);
  const base = args.modo === "recordatorio" ? paraRecordatorio(destinos, previos, sal, new Date()) : reparto[args.modo];
  const { pendientes, omitidos } = quitarYaEnviados(base, tipo, previos, sal);
  for (const o of omitidos) console.log(`(omitido) ${o.destino.nombre} · ${enmascarar(o.destino.correo)} — ${o.motivo}`);
  if (pendientes.length === 0) {
    console.log(`Nada pendiente para --${args.modo}.`);
    return;
  }
  console.log(`Mandando ${pendientes.length} correos (--${args.modo}, tipo "${tipo}"), uno por uno con pausa de 60–120 s.`);

  let mandados = 0;
  let fallidos = 0;
  for (const [i, d] of pendientes.entries()) {
    if (i > 0) await esperar(pausaAleatoria());
    const c = armarCorreo(d, firma, { asunto: args.asunto, recordatorio: args.modo === "recordatorio" });
    const r = await mandarCorreo({ para: d.correo, asunto: c.asunto, texto: c.texto, html: c.html });
    if (!r.ok) {
      fallidos++;
      console.error(`Falló ${d.nombre} (${enmascarar(d.correo)}): ${r.error} — sigue con el siguiente.`);
      continue;
    }
    // Se anota ANTES de pasar al siguiente: si el guion se corta, lo ya mandado no se repite.
    const { error } = await db.from("agendas_invitaciones_enviadas").insert({ lugar_id: d.lugarId, organismo: d.organismoRegistro ?? d.organismo, correo_hash: hashCorreo(d.correo, sal), tipo, resend_id: r.id });
    if (error) {
      console.error(`Mandado a ${d.nombre} pero NO se pudo anotar (${error.message}). Se detiene aquí para no repetir envíos.`);
      process.exit(1);
    }
    mandados++;
    console.log(`Mandado a ${d.nombre} (${enmascarar(d.correo)}).`);
  }
  console.log("");
  console.log(`Mandados ${mandados} · fallidos ${fallidos} · omitidos ${omitidos.length}.`);
}

const esPrincipal = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
if (esPrincipal) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
