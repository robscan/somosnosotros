import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParaHoja } from "@/app/admin/instagram/datos";
import type { PedidoFacebook, ResultadoFacebook } from "../facebook/api";
import { enlaceConOrigen, enlaceFichaConOrigen, textoDeFacebook, textoDeFacebookFicha } from "../facebook/texto";
import { textoDeFicha, textoDeSemana, type FichaParaPublicar, type SemanaParaPublicar } from "../instagram/ficha";
import type { Pedido, PedidoCarrusel, Resultado } from "../instagram/api";
import { etiquetasPorImagen, imagenesPedidas, type ImagenCarrusel } from "../instagram/carrusel";
import { sePuedePublicar } from "../instagram/elegir";
import { FRASES, FRASES_FACEBOOK } from "../instagram/frases";
import { armarTexto, etiquetasDeLaFoto, revisarTexto } from "../instagram/texto";
import type { AvisoPush } from "../push";
import { cerrarCasilla, devolverACola, guardarAvance, marcarAvisado, reclamarTrabajo, terminar, type AvanceTrabajo, type Trabajo } from "./cola";
import { avisoDeTrabajo, MAX_REINTENTOS, trasFallo, type ClaveFallo, type EspejoFacebook, type ResultadoTrabajo } from "./reglas";

/**
 * El trabajador de la cola de redes (OL-465, bitácora 497). Cada llamada a `/api/redes/correr` (el latido de Supabase cada minuto mientras
 * haya trabajos listos, o el primer empujón que da «Publicar» con `after()`) reclama UN trabajo y lo hace por pasos, guardando el avance para no
 * repetir nada si se retoma:
 *   1. las imágenes: el cartel encajado (o el diseño de Crear cartel) y, en un carrusel, el cartel de cada acto; JPEG públicos en Storage;
 *   2. Instagram: una imagen, una historia o el carrusel; se anota en `instagram_publicaciones` a nombre de quien lo pidió;
 *   3. Facebook, si se pidió: la misma imagen (o las mismas fotos) en la página; se anota en `facebook_publicaciones`.
 * Lo pasajero (Instagram procesando la imagen o sin responder, un 5xx, la red: «imagen» y «otro») se reintenta hasta 3 veces con espera creciente
 * (1, 3 y 7 minutos); el cupo, el permiso, un evento que ya empezó o un texto que no cabe, no. Si Instagram ya salió y falla Facebook, Instagram
 * no se repite: solo se reintenta Facebook, y si no se logra, el trabajo queda publicado con «Facebook: …». Al terminar, el aviso al teléfono de
 * quien lo pidió. Un paso que no cabe en lo que le queda a la función se deja para la siguiente llamada.
 *
 * OL-479 (bitácora 511): la semana de Instagram programa sus días en esta misma cola (`siguiente_en` es su hora: el latido no los toma antes).
 * Un trabajo de un artista o de un lugar dibuja su tarjeta (`enFicha`: la plantilla «destacado» de Crear cartel), invita al artista como coautor
 * (si Instagram no lo acepta, sale sin él y se dice) y se anota a nombre de la ficha; «Esta semana» (`enSemana`) es un carrusel con su portada y
 * los carteles del fin. Los dos se espejan en Facebook como un evento, con el enlace a la ficha. Al terminar, su día queda publicado o «no se
 * pudo» (`cerrarCasilla`) y el aviso abre ese día.
 */

/** Lo que tarda como mucho cada paso (para no empezar uno que no cabe en lo que le queda a la función). */
export const PLAZOS_MS = { imagenes: 60_000, instagram: 150_000, facebook: 60_000 } as const;

export type Herramientas = {
  /** Todo lo de un evento para publicarlo (la carga de la hoja, `cargarParaHoja`). */
  cargar: (db: SupabaseClient, eventoId: string, ahora: Date) => Promise<ParaHoja | null>;
  /** Las imágenes en JPEG: la portada (con recorte o diseño) y, en un carrusel, el cartel de cada acto (los que no se pudieron bajar, fuera). */
  dibujar: (db: SupabaseClient, h: ParaHoja, o: { formato: "4x5" | "9x16"; recorte: boolean; diseno: number; perfilId: string | null; items: ImagenCarrusel[] }) => Promise<{ item: ImagenCarrusel | null; bytes: Buffer }[]>;
  /** Sube un JPEG público a Storage y devuelve su dirección; null si no se pudo. */
  subir: (db: SupabaseClient, carpeta: string, bytes: Buffer) => Promise<string | null>;
  cupo: () => Promise<{ usadas: number; tope: number } | null>;
  publicar: (p: Pedido) => Promise<Resultado>;
  publicarCarrusel: (p: PedidoCarrusel) => Promise<Resultado>;
  publicarEnPagina: (p: PedidoFacebook) => Promise<ResultadoFacebook>;
  /** OL-479: una ficha (artista o lugar) para su día, su tarjeta en JPEG, y «Esta semana» con sus imágenes (la portada y los carteles). */
  cargarFicha: (db: SupabaseClient, tipo: "artista" | "lugar", id: string, ahora: Date) => Promise<FichaParaPublicar | null>;
  dibujarFicha: (f: FichaParaPublicar, formato: "4x5" | "9x16", ahora: Date) => Promise<Buffer>;
  /**
   * OL-488: ¿la ficha tiene el material que la tarjeta puede dibujar (la foto y la portada del artista, la portada del lugar, en el Storage de la
   * app)? Sin él no se publica con la imagen de relleno. Sin esta herramienta, se da por bueno (la semana ya solo elige fichas con material).
   */
  conMaterial?: (f: FichaParaPublicar) => boolean;
  cargarSemana: (db: SupabaseClient, eventos: readonly string[], ahora: Date) => Promise<SemanaParaPublicar | null>;
  imagenesSemana: (s: SemanaParaPublicar, ahora: Date) => Promise<{ bytes: Buffer; etiquetas: string[] }[]>;
  /** El aviso al teléfono de quien lo pidió. Nunca lanza. */
  avisar: (db: SupabaseClient, usuarioId: string | null, aviso: AvisoPush) => Promise<void>;
};

export type Dependencias = {
  db: SupabaseClient;
  ahora: () => Date;
  /** Hasta cuándo (epoch ms) puede trabajar esta llamada. */
  hasta: number;
  h: Herramientas;
};

/** La forma que espera `atenderCorrer` (la misma ruta del motor de rutinas): `corrida` null para la serie de pasos de esta llamada. */
export type ResultadoTrabajoPaso = { corrida: string | null; tipo: string | null; estado: "nada" | "corriendo" | "terminada" | "fallida" | "cancelada"; usd: number };

/** OL-488: lo que dice un día de artista o de lugar que no salió por falta de material. */
export const FRASE_SIN_MATERIAL = "Le falta su foto o su portada en la app: no se publicó con la imagen de relleno. Súbela o pídesela en «Falta material».";

const NADA: ResultadoTrabajoPaso = { corrida: null, tipo: null, estado: "nada", usd: 0 };

/** Reclama un trabajo y avanza todo lo que quepa. */
export async function correrUnTrabajo(dep: Dependencias): Promise<ResultadoTrabajoPaso> {
  const t = await reclamarTrabajo(dep.db, dep.ahora());
  if (!t) return NADA;
  // Uno que se cayó a medias una y otra vez (la función se acabó sin soltarlo): ya no se insiste.
  if (t.fallos > MAX_REINTENTOS) {
    const estado = await cerrar(dep, t, null, "fallido", { mensaje: FRASES.otro }, "otro");
    return { corrida: t.id, tipo: `redes-${t.red}`, estado, usd: 0 };
  }
  let salida: "corriendo" | "terminada" | "fallida" | "sin_tiempo";
  try {
    salida = t.red === "facebook" ? await soloFacebook(dep, t) : t.artista_id || t.lugar_id ? await enFicha(dep, t) : t.pedido.tipo === "semana" ? await enSemana(dep, t) : await enInstagram(dep, t);
  } catch {
    // Un tropiezo que no se esperaba (la base, un archivo raro): cuenta como un fallo pasajero.
    salida = await fallo(dep, t, "otro");
  }
  // Sin tiempo para el siguiente paso: esta llamada ya no toma otro (lo retoma el latido).
  if (salida === "sin_tiempo") return NADA;
  return { corrida: t.id, tipo: `redes-${t.red}`, estado: salida, usd: 0 };
}

const cabe = (dep: Dependencias, paso: keyof typeof PLAZOS_MS) => dep.ahora().getTime() + PLAZOS_MS[paso] <= dep.hasta;

async function sinTiempo(dep: Dependencias, t: Trabajo): Promise<"sin_tiempo"> {
  await devolverACola(dep.db, t, { ahora: dep.ahora(), esperaMs: 0 });
  return "sin_tiempo";
}

/** Un fallo: pasajero y con reintentos por delante, vuelve a la cola con su espera; si no, `alFinal` decide cómo termina. */
async function fallo(dep: Dependencias, t: Trabajo, clave: ClaveFallo, alFinal?: () => Promise<"terminada" | "fallida">): Promise<"corriendo" | "terminada" | "fallida"> {
  const sigue = trasFallo(clave, t.fallos + 1);
  if (sigue.reintentar) {
    await devolverACola(dep.db, t, { ahora: dep.ahora(), esperaMs: sigue.esperaMs, error: clave, fallo: true });
    return "corriendo";
  }
  if (alFinal) return alFinal();
  return cerrar(dep, t, null, "fallido", { mensaje: FRASES[clave === "texto" ? "otro" : clave] }, clave);
}

/** Termina el trabajo, cierra su día de la semana (si lo programó la semana) y avisa (una vez). `titulo`: el nombre, si ya se sabe. */
async function cerrar(dep: Dependencias, t: Trabajo, h: ParaHoja | null, estado: "publicado" | "fallido", resultado: ResultadoTrabajo, error: ClaveFallo | null = null, titulo?: string): Promise<"terminada" | "fallida"> {
  const ahora = dep.ahora();
  const escrito = await terminar(dep.db, t, { ahora, estado, resultado, error });
  if (escrito) await cerrarCasilla(dep.db, t, estado, ahora);
  if (escrito && (await marcarAvisado(dep.db, t.id, ahora))) {
    const nombre = h?.titulo ?? titulo ?? (await tituloDe(dep.db, t));
    await dep.h.avisar(dep.db, t.pedido_por, avisoDeTrabajo({ id: t.id, evento_id: t.evento_id, titulo: nombre, red: t.red, estado, error, resultado, casilla: t.pedido.casilla ?? null }));
  }
  return estado === "publicado" ? "terminada" : "fallida";
}

async function tituloDe(db: SupabaseClient, t: Trabajo): Promise<string> {
  if (t.artista_id) return (await db.from("artistas").select("nombre").eq("id", t.artista_id).maybeSingle<{ nombre: string }>()).data?.nombre ?? "el artista";
  if (t.lugar_id) return (await db.from("lugares").select("nombre").eq("id", t.lugar_id).maybeSingle<{ nombre: string }>()).data?.nombre ?? "el lugar";
  if (t.pedido.tipo === "semana") return "Esta semana";
  const { data } = await db.from("eventos").select("titulo").eq("id", t.evento_id ?? "").maybeSingle<{ titulo: string }>();
  return data?.titulo ?? "el evento";
}

/** De qué es lo que se anota: el evento, el artista o el lugar del trabajo (OL-479: exactamente uno). */
const deQue = (t: Trabajo) => (t.artista_id ? { artista_id: t.artista_id } : t.lugar_id ? { lugar_id: t.lugar_id } : { evento_id: t.evento_id });

/** Anota un intento fallido en Instagram (como antes de la cola: la lista y la base guardan cada error). */
async function anotarErrorInstagram(dep: Dependencias, t: Trabajo, error: Exclude<ClaveFallo, "texto">, imagenes: number, formato: "4x5" | "9x16" = t.formato) {
  await dep.db.from("instagram_publicaciones").insert({ ...deQue(t), formato: imagenes > 1 ? "carrusel" : formato, imagenes, estado: "error", error, publicado_por: t.pedido_por });
}

/** Una publicación de Instagram (con su espejo en Facebook, si se pidió). */
async function enInstagram(dep: Dependencias, t: Trabajo): Promise<"corriendo" | "terminada" | "fallida" | "sin_tiempo"> {
  const ahora = dep.ahora();
  const h = await dep.h.cargar(dep.db, t.evento_id!, ahora);
  if (!h) return cerrar(dep, t, null, "fallido", { mensaje: "No encontramos ese evento." }, "otro");
  const p = t.pedido;
  const quitadas = Array.isArray(p.quitadas) ? p.quitadas.filter((x): x is string => typeof x === "string").slice(0, 60) : [];
  const avance: AvanceTrabajo = { ...t.avance };

  // OL-479: el evento del día de la semana que ya se publicó por otro lado (la lista de hoy) desde que se programó, no sale dos veces.
  if (!avance.instagram && t.pedido.casilla && t.creado_en) {
    const { data: ya } = await dep.db.from("instagram_publicaciones").select("permalink, formato, imagenes").eq("evento_id", t.evento_id!).eq("estado", "publicada").gte("creado_en", t.creado_en).limit(1).maybeSingle<{ permalink: string | null; formato: "4x5" | "9x16" | "carrusel"; imagenes: number | null }>();
    if (ya) return cerrar(dep, t, h, "publicado", { instagram: { permalink: ya.permalink, imagenes: ya.imagenes ?? 1, sinEtiquetas: false, formato: ya.formato }, facebook: null, mensaje: "Ya estaba en Instagram: no se publicó otra vez." });
  }
  if (!avance.instagram) {
    // Antes de publicar: que siga por venir y que el texto quepa (lo mismo que comprobaba la acción).
    if (!sePuedePublicar(h.datos, ahora)) {
      await anotarErrorInstagram(dep, t, "empezo", 1);
      return cerrar(dep, t, h, "fallido", { mensaje: FRASES.empezo }, "empezo");
    }
    const texto = textoDe(t, h, ahora, quitadas);
    if (texto) {
      const r = revisarTexto(texto);
      if (r.problema) return cerrar(dep, t, h, "fallido", { mensaje: r.problema }, "texto");
    }

    // 1 · Las imágenes.
    if (!avance.imagenes?.length) {
      if (!cabe(dep, "imagenes")) return sinTiempo(dep, t);
      const pedidas = t.formato === "4x5" ? imagenesPedidas(h.carrusel, p.imagenes) : [];
      let dibujadas: { item: ImagenCarrusel | null; bytes: Buffer }[];
      try {
        dibujadas = await dep.h.dibujar(dep.db, h, { formato: t.formato, recorte: !!p.recorte, diseno: Number(p.diseno) || 0, perfilId: t.pedido_por, items: pedidas });
      } catch {
        dibujadas = [];
      }
      if (!dibujadas.length) return fallo(dep, t, "imagen", async () => (await anotarErrorInstagram(dep, t, "imagen", 1), cerrar(dep, t, h, "fallido", { mensaje: FRASES.imagen }, "imagen")));
      const subidas: string[] = [];
      for (const d of dibujadas) {
        const url = await dep.h.subir(dep.db, t.pedido_por ?? "redes", d.bytes);
        if (!url) return fallo(dep, t, "otro", async () => (await anotarErrorInstagram(dep, t, "otro", dibujadas.length), cerrar(dep, t, h, "fallido", { mensaje: FRASES.otro }, "otro")));
        subidas.push(url);
      }
      avance.imagenes = subidas;
      avance.claves = dibujadas.length > 1 ? dibujadas.map((d) => d.item?.clave ?? "") : [];
      await guardarAvance(dep.db, t, avance, dep.ahora());
    }

    // 2 · Instagram.
    if (!cabe(dep, "instagram")) return sinTiempo(dep, t);
    const imagenes = avance.imagenes!;
    const usado = await dep.h.cupo();
    if (usado && usado.usadas >= usado.tope) {
      await anotarErrorInstagram(dep, t, "cupo", imagenes.length);
      return cerrar(dep, t, h, "fallido", { mensaje: FRASES.cupo }, "cupo");
    }
    const etiquetas = etiquetasDeLaFoto(h.evento, quitadas);
    const carrusel = imagenes.length > 1;
    const ubicacion = h.ubicacion?.id ?? null;
    let r: Resultado;
    if (carrusel) {
      const items = (avance.claves ?? []).map((c) => h.carrusel.find((i) => i.clave === c)).filter((i): i is ImagenCarrusel => !!i);
      const porImagen = items.length === imagenes.length ? etiquetasPorImagen(items, { lugar: h.evento.lugar?.usuario ?? null, permitidas: etiquetas }) : imagenes.map((_, i) => (i === 0 ? etiquetas : []));
      r = await dep.h.publicarCarrusel({ imagenes: porImagen.map((us, i) => ({ imagen: imagenes[i], etiquetas: us })), texto, ubicacion });
    } else {
      r = await dep.h.publicar({ imagen: imagenes[0], texto, etiquetas, ubicacion, historia: t.formato === "9x16" });
    }
    if (!r.ok) {
      const clave = r.error;
      return fallo(dep, t, clave, async () => (await anotarErrorInstagram(dep, t, clave, imagenes.length), cerrar(dep, t, h, "fallido", { mensaje: FRASES[clave] }, clave)));
    }
    const formato = carrusel ? "carrusel" : t.formato;
    const anotada = await dep.db
      .from("instagram_publicaciones")
      .insert({
        evento_id: t.evento_id,
        formato,
        imagenes: imagenes.length,
        estado: "publicada",
        media_id: r.mediaId,
        permalink: r.permalink,
        imagen: imagenes[0],
        ...(carrusel ? { carrusel: imagenes } : {}),
        etiquetas: r.sinEtiquetas ? [] : etiquetas,
        ubicacion: r.sinEtiquetas || t.formato === "9x16" ? null : ubicacion,
        publicado_por: t.pedido_por,
      })
      .select("id")
      .maybeSingle<{ id: string }>();
    avance.instagram = {
      fila: anotada.data?.id ?? null,
      mediaId: r.mediaId,
      permalink: r.permalink,
      sinEtiquetas: r.sinEtiquetas && (etiquetas.length > 0 || !!h.ubicacion),
      formato,
      texto,
      etiquetas,
    };
    await guardarAvance(dep.db, t, avance, dep.ahora());
  }

  const ig = avance.instagram!;
  const deInstagram = { permalink: ig.permalink, imagenes: avance.imagenes?.length ?? 1, sinEtiquetas: ig.sinEtiquetas, formato: ig.formato };
  if (!p.facebook) return cerrar(dep, t, h, "publicado", { instagram: deInstagram, facebook: null });

  // 3 · Facebook (el espejo). Instagram ya salió: nunca se repite.
  if (!cabe(dep, "facebook")) return sinTiempo(dep, t);
  if (!ig.fila) return cerrar(dep, t, h, "publicado", { instagram: deInstagram, facebook: { ok: false, error: "otro", mensaje: FRASES_FACEBOOK.otro } });
  const espejo = await espejar(dep, t, { id: ig.fila, formato: ig.formato, imagenes: avance.imagenes ?? [] }, () => textoDeFacebook(ig.texto ?? armarTexto(h.evento, dep.ahora()), h.evento, enlaceConOrigen({ id: h.id, slug: h.slug }, "facebook", "post")));
  if (espejo === "reintentar") return "corriendo";
  return cerrar(dep, t, h, "publicado", { instagram: deInstagram, facebook: espejo });
}

/** El texto que va: el de la hoja o el que arma el sistema; nunca en una historia. */
function textoDe(t: Trabajo, h: ParaHoja, ahora: Date, quitadas: string[]): string | null {
  if (t.formato !== "4x5") return null;
  const propio = typeof t.pedido.texto === "string" ? t.pedido.texto.trim() : "";
  return propio ? propio.slice(0, 5000) : armarTexto(h.evento, ahora, quitadas);
}

/**
 * Publica en la página lo que salió en Instagram y lo anota. «reintentar» si falló algo pasajero y quedan reintentos (el trabajo ya volvió a la
 * cola); si no, cómo quedó Facebook.
 */
async function espejar(dep: Dependencias, t: Trabajo, ig: { id: string; formato: "4x5" | "9x16" | "carrusel"; imagenes: string[] }, textoFacebook: () => string | null): Promise<EspejoFacebook | "reintentar"> {
  const anotar = (fila: Record<string, unknown>) => dep.db.from("facebook_publicaciones").insert({ instagram_id: ig.id, ...deQue(t), formato: ig.formato, publicado_por: t.pedido_por, ...fila });
  if (!ig.imagenes.length) {
    await anotar({ estado: "error", error: "imagen" });
    return { ok: false, error: "imagen", mensaje: FRASES_FACEBOOK.imagen };
  }
  const historia = ig.formato === "9x16";
  const texto = historia ? null : textoFacebook();
  const varias = ig.formato === "carrusel" && ig.imagenes.length > 1 ? ig.imagenes : undefined;
  const r = await dep.h.publicarEnPagina({ imagen: ig.imagenes[0], texto, historia, imagenes: varias });
  if (r.ok) {
    await anotar({ estado: "publicada", post_id: r.postId, permalink: r.permalink });
    return { ok: true, permalink: r.permalink };
  }
  const sigue = trasFallo(r.error, t.fallos + 1);
  if (sigue.reintentar) {
    await devolverACola(dep.db, t, { ahora: dep.ahora(), esperaMs: sigue.esperaMs, error: r.error, fallo: true });
    return "reintentar";
  }
  await anotar({ estado: "error", error: r.error });
  return { ok: false, error: r.error, mensaje: FRASES_FACEBOOK[r.error] };
}

/** «Publicar en Facebook» / «Reintentar en Facebook»: la última publicación de Instagram del evento, en la página. */
async function soloFacebook(dep: Dependencias, t: Trabajo): Promise<"corriendo" | "terminada" | "fallida" | "sin_tiempo"> {
  const ahora = dep.ahora();
  const h = await dep.h.cargar(dep.db, t.evento_id!, ahora);
  if (!h) return cerrar(dep, t, null, "fallido", { facebook: { ok: false, error: "otro", mensaje: "No encontramos ese evento." } }, "otro");
  if (!sePuedePublicar(h.datos, ahora)) return cerrar(dep, t, h, "fallido", { facebook: { ok: false, error: "empezo", mensaje: FRASES_FACEBOOK.empezo } }, "empezo");
  const { data: ig } = await dep.db
    .from("instagram_publicaciones")
    .select("id, formato, imagen, carrusel")
    .eq("evento_id", t.evento_id!)
    .eq("estado", "publicada")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; formato: "4x5" | "9x16" | "carrusel"; imagen: string | null; carrusel: string[] | null }>();
  if (!ig) return cerrar(dep, t, h, "fallido", { facebook: { ok: false, error: "otro", mensaje: "Este evento todavía no está en Instagram." } }, "otro");
  const { data: ya } = await dep.db.from("facebook_publicaciones").select("permalink").eq("instagram_id", ig.id).eq("estado", "publicada").limit(1).maybeSingle<{ permalink: string | null }>();
  if (ya) return cerrar(dep, t, h, "publicado", { facebook: { ok: true, permalink: ya.permalink } });
  if (!cabe(dep, "facebook")) return sinTiempo(dep, t);
  const imagenes = ig.formato === "carrusel" && ig.carrusel?.length ? ig.carrusel : ig.imagen ? [ig.imagen] : [];
  const propio = ig.formato !== "9x16" && typeof t.pedido.texto === "string" && t.pedido.texto.trim() ? t.pedido.texto.trim().slice(0, 5000) : null;
  const espejo = await espejar(dep, t, { id: ig.id, formato: ig.formato, imagenes }, () => textoDeFacebook(propio ?? armarTexto(h.evento, dep.ahora()), h.evento, enlaceConOrigen({ id: h.id, slug: h.slug }, "facebook", "post")));
  if (espejo === "reintentar") return "corriendo";
  return espejo.ok ? cerrar(dep, t, h, "publicado", { facebook: espejo }) : cerrar(dep, t, h, "fallido", { facebook: espejo }, espejo.error);
}

// ===== OL-479: la semana de Instagram

const quitadasDe = (t: Trabajo) => (Array.isArray(t.pedido.quitadas) ? t.pedido.quitadas.filter((x): x is string => typeof x === "string").slice(0, 60) : []);
const propioDe = (t: Trabajo) => (typeof t.pedido.texto === "string" && t.pedido.texto.trim() ? t.pedido.texto.trim().slice(0, 5000) : null);
/** La campaña de la marca de origen: el día de la semana que lo publicó (o el trabajo, si lo publicó otra cosa). */
const campanaDe = (t: Trabajo) => (t.pedido.casilla ? `semana-${t.pedido.casilla}` : `trabajo-${t.id}`);

/** Sube las imágenes ya dibujadas (en orden); null si una no se pudo subir. */
async function subirTodas(dep: Dependencias, t: Trabajo, imagenes: Buffer[]): Promise<string[] | null> {
  const subidas: string[] = [];
  for (const bytes of imagenes) {
    const url = await dep.h.subir(dep.db, t.pedido_por ?? "redes", bytes);
    if (!url) return null;
    subidas.push(url);
  }
  return subidas;
}

/** Anota lo publicado en Instagram y lo deja en el avance (para no repetirlo si se retoma). */
async function anotarPublicada(dep: Dependencias, t: Trabajo, avance: AvanceTrabajo, r: Extract<Resultado, { ok: true }>, o: { formato: "4x5" | "9x16" | "carrusel"; imagenes: string[]; texto: string | null; etiquetas: string[]; ubicacion: string | null; coautores: string[] }) {
  const anotada = await dep.db
    .from("instagram_publicaciones")
    .insert({
      ...deQue(t),
      formato: o.formato,
      imagenes: o.imagenes.length,
      estado: "publicada",
      media_id: r.mediaId,
      permalink: r.permalink,
      imagen: o.imagenes[0],
      ...(o.formato === "carrusel" ? { carrusel: o.imagenes } : {}),
      etiquetas: r.sinEtiquetas ? [] : o.etiquetas.slice(0, 20),
      ubicacion: r.sinEtiquetas || o.formato === "9x16" ? null : o.ubicacion,
      coautores: r.sinCoautor || r.sinEtiquetas ? [] : o.coautores,
      publicado_por: t.pedido_por,
    })
    .select("id")
    .maybeSingle<{ id: string }>();
  avance.instagram = {
    fila: anotada.data?.id ?? null,
    mediaId: r.mediaId,
    permalink: r.permalink,
    sinEtiquetas: r.sinEtiquetas && (o.etiquetas.length > 0 || !!o.ubicacion),
    formato: o.formato,
    texto: o.texto,
    etiquetas: o.etiquetas,
    ...(o.coautores.length ? { sinCoautor: !!r.sinCoautor || r.sinEtiquetas } : {}),
  };
  await guardarAvance(dep.db, t, avance, dep.ahora());
}

/** Lo que dice el resultado de lo que salió en Instagram. */
const deInstagramDe = (avance: AvanceTrabajo) => {
  const ig = avance.instagram!;
  return { permalink: ig.permalink, imagenes: avance.imagenes?.length ?? 1, sinEtiquetas: ig.sinEtiquetas, formato: ig.formato, ...(ig.sinCoautor ? { sinCoautor: true } : {}) };
};

/**
 * La publicación de un artista o de un lugar de la semana: su tarjeta 4:5, su texto, su cuenta etiquetada y (el artista) invitada como coautora;
 * luego su historia 9:16 (la tarjeta alta, «la historia sale con la publicación»: si no se puede, la publicación queda y se dice) y el espejo en
 * Facebook con el enlace a su ficha.
 */
async function enFicha(dep: Dependencias, t: Trabajo): Promise<"corriendo" | "terminada" | "fallida" | "sin_tiempo"> {
  const ahora = dep.ahora();
  const tipo = t.artista_id ? "artista" : "lugar";
  const f = await dep.h.cargarFicha(dep.db, tipo, (t.artista_id ?? t.lugar_id)!, ahora);
  if (!f || !f.visible) return cerrar(dep, t, null, "fallido", { mensaje: "Esa ficha ya no se ve en la app: no se publicó." }, "otro", f?.nombre);
  // OL-488: sin su foto o su portada en la app, la tarjeta saldría con la imagen de relleno: no se publica (y se dice qué falta).
  if (!t.avance?.instagram && dep.h.conMaterial && !dep.h.conMaterial(f)) return cerrar(dep, t, null, "fallido", { mensaje: FRASE_SIN_MATERIAL }, "imagen", f.nombre);
  const formato = "4x5" as const;
  const quitadas = quitadasDe(t);
  const avance: AvanceTrabajo = { ...t.avance };
  const etiquetas = f.cuenta && !quitadas.includes(f.cuenta) ? [f.cuenta] : [];
  const ubicacion = f.ubicacion?.id ?? null;

  if (!avance.instagram) {
    const texto = propioDe(t) ?? textoDeFicha(f, ahora, quitadas);
    if (texto) {
      const r = revisarTexto(texto);
      if (r.problema) return cerrar(dep, t, null, "fallido", { mensaje: r.problema }, "texto", f.nombre);
    }
    if (!avance.imagenes?.length) {
      if (!cabe(dep, "imagenes")) return sinTiempo(dep, t);
      let bytes: Buffer | null = null;
      try {
        bytes = await dep.h.dibujarFicha(f, formato, ahora);
      } catch {
        bytes = null;
      }
      if (!bytes) return fallo(dep, t, "imagen", async () => (await anotarErrorInstagram(dep, t, "imagen", 1, formato), cerrar(dep, t, null, "fallido", { mensaje: FRASES.imagen }, "imagen", f.nombre)));
      const subidas = await subirTodas(dep, t, [bytes]);
      if (!subidas) return fallo(dep, t, "otro", async () => (await anotarErrorInstagram(dep, t, "otro", 1, formato), cerrar(dep, t, null, "fallido", { mensaje: FRASES.otro }, "otro", f.nombre)));
      avance.imagenes = subidas;
      avance.claves = [];
      await guardarAvance(dep.db, t, avance, dep.ahora());
    }
    if (!cabe(dep, "instagram")) return sinTiempo(dep, t);
    const usado = await dep.h.cupo();
    if (usado && usado.usadas >= usado.tope) {
      await anotarErrorInstagram(dep, t, "cupo", 1, formato);
      return cerrar(dep, t, null, "fallido", { mensaje: FRASES.cupo }, "cupo", f.nombre);
    }
    // El artista, invitado como coautor (si acepta, sale también en su perfil); un lugar, solo etiquetado.
    const coautores = tipo === "artista" ? etiquetas : [];
    const r = await dep.h.publicar({ imagen: avance.imagenes![0], texto, etiquetas, ubicacion, historia: false, coautores });
    if (!r.ok) {
      const clave = r.error;
      return fallo(dep, t, clave, async () => (await anotarErrorInstagram(dep, t, clave, 1, formato), cerrar(dep, t, null, "fallido", { mensaje: FRASES[clave] }, clave, f.nombre)));
    }
    await anotarPublicada(dep, t, avance, r, { formato, imagenes: avance.imagenes!, texto, etiquetas, ubicacion, coautores });
  }

  // La historia 9:16, una sola vez y sin reintentos: lo que importa ya salió.
  if (!avance.historia) {
    if (!cabe(dep, "instagram")) return sinTiempo(dep, t);
    avance.historia = await historiaDeFicha(dep, t, f, etiquetas);
    await guardarAvance(dep.db, t, avance, dep.ahora());
  }

  const ig = avance.instagram!;
  const deInstagram = deInstagramDe(avance);
  const historia = avance.historia;
  if (!t.pedido.facebook) return cerrar(dep, t, null, "publicado", { instagram: deInstagram, historia, facebook: null }, null, f.nombre);
  if (!cabe(dep, "facebook")) return sinTiempo(dep, t);
  if (!ig.fila) return cerrar(dep, t, null, "publicado", { instagram: deInstagram, historia, facebook: { ok: false, error: "otro", mensaje: FRASES_FACEBOOK.otro } }, null, f.nombre);
  const enlace = enlaceFichaConOrigen(tipo === "artista" ? "artistas" : "lugares", f.slug, "facebook", "post", campanaDe(t));
  const espejo = await espejar(dep, t, { id: ig.fila, formato: ig.formato, imagenes: avance.imagenes ?? [] }, () => textoDeFacebookFicha(ig.texto ?? textoDeFicha(f, dep.ahora(), quitadas), f.cuenta, enlace));
  if (espejo === "reintentar") return "corriendo";
  return cerrar(dep, t, null, "publicado", { instagram: deInstagram, historia, facebook: espejo }, null, f.nombre);
}

/** La historia de una ficha: la tarjeta alta, con su cuenta etiquetada; anotada como cualquier publicación. Nunca lanza. */
async function historiaDeFicha(dep: Dependencias, t: Trabajo, f: FichaParaPublicar, etiquetas: string[]): Promise<{ ok: boolean; permalink: string | null }> {
  try {
    const bytes = await dep.h.dibujarFicha(f, "9x16", dep.ahora());
    const [url] = (await subirTodas(dep, t, [bytes])) ?? [];
    if (!url) return { ok: false, permalink: null };
    const r = await dep.h.publicar({ imagen: url, texto: null, etiquetas, ubicacion: null, historia: true });
    if (!r.ok) {
      await anotarErrorInstagram(dep, t, r.error, 1, "9x16");
      return { ok: false, permalink: null };
    }
    await dep.db.from("instagram_publicaciones").insert({ ...deQue(t), formato: "9x16", imagenes: 1, estado: "publicada", media_id: r.mediaId, permalink: r.permalink, imagen: url, etiquetas: r.sinEtiquetas ? [] : etiquetas, publicado_por: t.pedido_por });
    return { ok: true, permalink: r.permalink };
  } catch {
    return { ok: false, permalink: null };
  }
}

/** «Esta semana»: el carrusel con su portada y los carteles de los eventos del fin (o la portada sola, si ningún cartel se pudo bajar). */
async function enSemana(dep: Dependencias, t: Trabajo): Promise<"corriendo" | "terminada" | "fallida" | "sin_tiempo"> {
  const ahora = dep.ahora();
  const ids = Array.isArray(t.pedido.eventos) && t.pedido.eventos.length ? t.pedido.eventos : t.evento_id ? [t.evento_id] : [];
  const s = await dep.h.cargarSemana(dep.db, ids, ahora);
  const titulo = "Esta semana";
  if (!s) return cerrar(dep, t, null, "fallido", { mensaje: "Los eventos de esa semana ya no se ven en la app: no se publicó." }, "otro", titulo);
  const avance: AvanceTrabajo = { ...t.avance };
  if (!avance.instagram) {
    const texto = propioDe(t) ?? textoDeSemana(s, ahora);
    const revisado = revisarTexto(texto);
    if (revisado.problema) return cerrar(dep, t, null, "fallido", { mensaje: revisado.problema }, "texto", titulo);
    if (!avance.imagenes?.length) {
      if (!cabe(dep, "imagenes")) return sinTiempo(dep, t);
      let hechas: { bytes: Buffer; etiquetas: string[] }[] = [];
      try {
        hechas = (await dep.h.imagenesSemana(s, ahora)).slice(0, 10);
      } catch {
        hechas = [];
      }
      if (!hechas.length) return fallo(dep, t, "imagen", async () => (await anotarErrorInstagram(dep, t, "imagen", 1), cerrar(dep, t, null, "fallido", { mensaje: FRASES.imagen }, "imagen", titulo)));
      const subidas = await subirTodas(dep, t, hechas.map((x) => x.bytes));
      if (!subidas) return fallo(dep, t, "otro", async () => (await anotarErrorInstagram(dep, t, "otro", hechas.length), cerrar(dep, t, null, "fallido", { mensaje: FRASES.otro }, "otro", titulo)));
      avance.imagenes = subidas;
      // Las cuentas que se etiquetan en cada imagen, en el mismo orden (la portada, ninguna).
      avance.claves = hechas.map((x) => x.etiquetas.join(","));
      await guardarAvance(dep.db, t, avance, dep.ahora());
    }
    if (!cabe(dep, "instagram")) return sinTiempo(dep, t);
    const imagenes = avance.imagenes!;
    const usado = await dep.h.cupo();
    if (usado && usado.usadas >= usado.tope) {
      await anotarErrorInstagram(dep, t, "cupo", imagenes.length);
      return cerrar(dep, t, null, "fallido", { mensaje: FRASES.cupo }, "cupo", titulo);
    }
    const porImagen = imagenes.map((_, i) => (avance.claves?.[i] ? avance.claves[i].split(",").filter(Boolean) : []));
    const etiquetas = [...new Set(porImagen.flat())];
    const ubicacion = s.ubicacion?.id ?? null;
    const carrusel = imagenes.length > 1;
    const r = carrusel
      ? await dep.h.publicarCarrusel({ imagenes: imagenes.map((imagen, i) => ({ imagen, etiquetas: porImagen[i] })), texto, ubicacion })
      : await dep.h.publicar({ imagen: imagenes[0], texto, etiquetas: [], ubicacion, historia: false });
    if (!r.ok) {
      const clave = r.error;
      return fallo(dep, t, clave, async () => (await anotarErrorInstagram(dep, t, clave, imagenes.length), cerrar(dep, t, null, "fallido", { mensaje: FRASES[clave] }, clave, titulo)));
    }
    await anotarPublicada(dep, t, avance, r, { formato: carrusel ? "carrusel" : "4x5", imagenes, texto, etiquetas, ubicacion, coautores: [] });
  }
  const ig = avance.instagram!;
  const deInstagram = deInstagramDe(avance);
  if (!t.pedido.facebook) return cerrar(dep, t, null, "publicado", { instagram: deInstagram, facebook: null }, null, titulo);
  if (!cabe(dep, "facebook")) return sinTiempo(dep, t);
  if (!ig.fila) return cerrar(dep, t, null, "publicado", { instagram: deInstagram, facebook: { ok: false, error: "otro", mensaje: FRASES_FACEBOOK.otro } }, null, titulo);
  const espejo = await espejar(dep, t, { id: ig.fila, formato: ig.formato, imagenes: avance.imagenes ?? [] }, () => textoDeFacebookFicha(ig.texto ?? textoDeSemana(s, dep.ahora()), null, null));
  if (espejo === "reintentar") return "corriendo";
  return cerrar(dep, t, null, "publicado", { instagram: deInstagram, facebook: espejo }, null, titulo);
}
