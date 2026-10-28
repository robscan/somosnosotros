import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParaHoja } from "@/app/admin/instagram/datos";
import type { PedidoFacebook, ResultadoFacebook } from "../facebook/api";
import { enlaceConOrigen, textoDeFacebook } from "../facebook/texto";
import type { Pedido, PedidoCarrusel, Resultado } from "../instagram/api";
import { etiquetasPorImagen, imagenesPedidas, type ImagenCarrusel } from "../instagram/carrusel";
import { sePuedePublicar } from "../instagram/elegir";
import { FRASES, FRASES_FACEBOOK } from "../instagram/frases";
import { armarTexto, etiquetasDeLaFoto, revisarTexto } from "../instagram/texto";
import type { AvisoPush } from "../push";
import { devolverACola, guardarAvance, marcarAvisado, reclamarTrabajo, terminar, type AvanceTrabajo, type Trabajo } from "./cola";
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
    salida = t.red === "facebook" ? await soloFacebook(dep, t) : await enInstagram(dep, t);
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

/** Termina el trabajo y avisa (una vez). */
async function cerrar(dep: Dependencias, t: Trabajo, h: ParaHoja | null, estado: "publicado" | "fallido", resultado: ResultadoTrabajo, error: ClaveFallo | null = null): Promise<"terminada" | "fallida"> {
  const ahora = dep.ahora();
  const escrito = await terminar(dep.db, t, { ahora, estado, resultado, error });
  if (escrito && (await marcarAvisado(dep.db, t.id, ahora))) {
    const titulo = h?.titulo ?? (await tituloDe(dep.db, t.evento_id));
    await dep.h.avisar(dep.db, t.pedido_por, avisoDeTrabajo({ id: t.id, evento_id: t.evento_id, titulo, red: t.red, estado, error, resultado }));
  }
  return estado === "publicado" ? "terminada" : "fallida";
}

async function tituloDe(db: SupabaseClient, eventoId: string): Promise<string> {
  const { data } = await db.from("eventos").select("titulo").eq("id", eventoId).maybeSingle<{ titulo: string }>();
  return data?.titulo ?? "el evento";
}

/** Anota un intento fallido en Instagram (como antes de la cola: la lista y la base guardan cada error). */
async function anotarErrorInstagram(dep: Dependencias, t: Trabajo, error: Exclude<ClaveFallo, "texto">, imagenes: number) {
  await dep.db.from("instagram_publicaciones").insert({ evento_id: t.evento_id, formato: imagenes > 1 ? "carrusel" : t.formato, imagenes, estado: "error", error, publicado_por: t.pedido_por });
}

/** Una publicación de Instagram (con su espejo en Facebook, si se pidió). */
async function enInstagram(dep: Dependencias, t: Trabajo): Promise<"corriendo" | "terminada" | "fallida" | "sin_tiempo"> {
  const ahora = dep.ahora();
  const h = await dep.h.cargar(dep.db, t.evento_id, ahora);
  if (!h) return cerrar(dep, t, null, "fallido", { mensaje: "No encontramos ese evento." }, "otro");
  const p = t.pedido;
  const quitadas = Array.isArray(p.quitadas) ? p.quitadas.filter((x): x is string => typeof x === "string").slice(0, 60) : [];
  const avance: AvanceTrabajo = { ...t.avance };

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
  const espejo = await espejar(dep, t, h, { id: ig.fila, formato: ig.formato, imagenes: avance.imagenes ?? [] }, ig.texto);
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
async function espejar(dep: Dependencias, t: Trabajo, h: ParaHoja, ig: { id: string; formato: "4x5" | "9x16" | "carrusel"; imagenes: string[] }, textoInstagram: string | null): Promise<EspejoFacebook | "reintentar"> {
  const anotar = (fila: Record<string, unknown>) => dep.db.from("facebook_publicaciones").insert({ instagram_id: ig.id, evento_id: t.evento_id, formato: ig.formato, publicado_por: t.pedido_por, ...fila });
  if (!ig.imagenes.length) {
    await anotar({ estado: "error", error: "imagen" });
    return { ok: false, error: "imagen", mensaje: FRASES_FACEBOOK.imagen };
  }
  const historia = ig.formato === "9x16";
  const texto = historia ? null : textoDeFacebook(textoInstagram ?? armarTexto(h.evento, dep.ahora()), h.evento, enlaceConOrigen({ id: h.id, slug: h.slug }, "facebook", "post"));
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
  const h = await dep.h.cargar(dep.db, t.evento_id, ahora);
  if (!h) return cerrar(dep, t, null, "fallido", { facebook: { ok: false, error: "otro", mensaje: "No encontramos ese evento." } }, "otro");
  if (!sePuedePublicar(h.datos, ahora)) return cerrar(dep, t, h, "fallido", { facebook: { ok: false, error: "empezo", mensaje: FRASES_FACEBOOK.empezo } }, "empezo");
  const { data: ig } = await dep.db
    .from("instagram_publicaciones")
    .select("id, formato, imagen, carrusel")
    .eq("evento_id", t.evento_id)
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
  const espejo = await espejar(dep, t, h, { id: ig.id, formato: ig.formato, imagenes }, propio);
  if (espejo === "reintentar") return "corriendo";
  return espejo.ok ? cerrar(dep, t, h, "publicado", { facebook: espejo }) : cerrar(dep, t, h, "fallido", { facebook: espejo }, espejo.error);
}
