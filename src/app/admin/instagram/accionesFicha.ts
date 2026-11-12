"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import type { ArtistaDestacado, LugarDestacado } from "@/lib/instagram/destacado";
import { esUuid } from "@/lib/formulario";
import { cargarFicha, carruselEnHoja, contenidoDeFicha, fichaConMaterial, textoDeFicha, type CarruselEnHoja, type FichaParaPublicar } from "@/lib/instagram/ficha";
import { lineaYaSalio } from "@/lib/instagram/semana";
import { revisarTexto } from "@/lib/instagram/texto";
import { dispararPaso, origenPropio } from "@/lib/rutinas/disparar";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { encolarFicha, pedidoLimpio, type PedidoFicha } from "./colaFicha";
import { comoCliente, enInstagramDeFicha, fueraDeInstagram, type EnInstagramDeFicha } from "./semana";

/**
 * «Publicar en Instagram» desde la ficha de un artista o de un lugar (OL-515; pedido del founder: «así como ya pasa con el evento»): la hoja
 * enseña la tarjeta y el texto como saldrían hoy, con los mismos mandos que la hoja de un día de la semana (el texto, la etiqueta, Facebook), y
 * «Publicar ahora» guarda un trabajo en la cola de redes sin día de la semana por `redes_encolar_ficha` (con la sesión de la administración, nunca
 * con la llave de servicio). Lo publica el mismo trabajador de la semana (OL-479): la tarjeta 4:5 sin «de la semana», su cuenta etiquetada, la
 * historia y el espejo en Facebook. Solo la administración.
 */

type Tipo = "artista" | "lugar";

async function sesionAdmin() {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return null;
  return clienteServidor();
}
type Supabase = NonNullable<Awaited<ReturnType<typeof sesionAdmin>>>;

const SOLO_ADMIN = "Solo la administración publica en Instagram.";
const NO_EXISTE = "Esa ficha ya no existe.";
const OCULTA = "Esta ficha está oculta: no se publica en Instagram.";
const FUERA = "Dijo que no a salir en Instagram. Se vuelve a poner desde «Fuera de Instagram», en este mismo menú.";
const SIN_MATERIAL = "A esta ficha le falta su foto en la app: súbela antes de publicarla.";
const NO_SE_GUARDO = "No se pudo guardar la publicación. Intenta de nuevo; no se publicó nada.";
const YA_VA = "Ya se está publicando. Te avisamos en el teléfono cuando salga.";

/** Lo que la hoja enseña: con estos datos el teléfono arma el mismo texto que el trabajador (`textoDeDestacado`). */
export type ContenidoFicha =
  | { tipo: "artista"; datos: ArtistaDestacado; cuenta: string | null; credito: string | null }
  | { tipo: "lugar"; datos: LugarDestacado; cuenta: string | null; credito: string | null };

export type PreparadaFicha =
  // OL-516: `carrusel`, las imágenes que saldrán (la tarjeta y sus eventos de esta semana); una sola, la tarjeta.
  | { ok: true; tipo: Tipo; nombre: string; contenido: ContenidoFicha; carrusel: CarruselEnHoja; ubicacion: { nombre: string } | null; ciudad: { nombre: string }; en: EnInstagramDeFicha; ahora: string }
  | { ok: false; mensaje: string };

/** Por qué no se puede publicar esta ficha, en una frase llana; null si se puede. */
async function impedimento(s: Supabase, f: FichaParaPublicar): Promise<string | null> {
  if (!f.visible) return OCULTA;
  if (await fueraDeInstagram(s, f.tipo, f.id)) return FUERA;
  if (!fichaConMaterial(f)) return SIN_MATERIAL;
  return null;
}

/** Prepara la hoja: la ficha, lo que hace falta para su texto, su ubicación y cómo va en Instagram. */
export async function prepararFicha(tipo: Tipo, id: string): Promise<PreparadaFicha> {
  const s = esUuid(id) && (tipo === "artista" || tipo === "lugar") ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: SOLO_ADMIN };
  const ahora = new Date();
  const f = await cargarFicha(comoCliente(s), tipo, id, ahora);
  if (!f) return { ok: false, mensaje: NO_EXISTE };
  const no = await impedimento(s, f);
  if (no) return { ok: false, mensaje: no };
  return {
    ok: true,
    tipo,
    nombre: f.nombre,
    contenido: contenidoDeFicha(f),
    carrusel: carruselEnHoja(f, ahora),
    ubicacion: f.ubicacion ? { nombre: f.ubicacion.nombre } : null,
    ciudad: { nombre: f.ciudad },
    en: await enInstagramDeFicha(s, tipo, id, ahora),
    ahora: ahora.toISOString(),
  };
}

/** `repetido`: ya salió antes y falta confirmar (la hoja pregunta «¿Publicar otra vez…?», con «Salió en Instagram hace 9 días»). */
export type PublicadaFicha = { ok: true } | { ok: false; mensaje: string; yaIba?: true } | { ok: false; repetido: string };

/** Lo que dice la base cuando no se puede, en una frase llana. */
function frase(e: { code?: string; message?: string }): string {
  if (e.code === "42501") return SOLO_ADMIN;
  if (e.code === "23503") return NO_EXISTE;
  if (e.code === "22023") {
    const m = e.message ?? "";
    if (/oculta/.test(m)) return OCULTA;
    if (/fuera de Instagram/.test(m)) return FUERA;
    if (/material/.test(m)) return SIN_MATERIAL;
  }
  return NO_SE_GUARDO;
}

/**
 * «Publicar ahora» (o «Sí, publicar otra vez», con `repetir`): comprueba lo que se puede decir en una frase antes de guardar (que la ficha se ve,
 * que no dijo que no, que tiene material y que el texto cabe) y guarda el trabajo con lo de la hoja (`pedido`: el texto si se cambió, las cuentas
 * que no se etiquetan y Facebook). La base vuelve a comprobarlo todo y dice si ya va en camino o si ya salió.
 */
export async function publicarFicha(tipo: Tipo, id: string, pedido: PedidoFicha, repetir = false): Promise<PublicadaFicha> {
  const s = esUuid(id) && (tipo === "artista" || tipo === "lugar") ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: SOLO_ADMIN };
  const ahora = new Date();
  const f = await cargarFicha(comoCliente(s), tipo, id, ahora);
  if (!f) return { ok: false, mensaje: NO_EXISTE };
  const no = await impedimento(s, f);
  if (no) return { ok: false, mensaje: no };
  const p = pedidoLimpio(pedido);
  const problema = revisarTexto(p.texto ?? textoDeFicha(f, ahora, p.quitadas)).problema;
  if (problema) return { ok: false, mensaje: problema };
  const r = await encolarFicha(s, tipo, id, p, repetir === true);
  if ("duplicado" in r) return { ok: false, yaIba: true, mensaje: YA_VA };
  if ("repetido" in r) return { ok: false, repetido: lineaYaSalio(r.repetido, ahora) };
  if (!r.ok) return { ok: false, mensaje: frase(r.error) };
  try {
    const h = await headers();
    const origen = origenPropio(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
    after(() => dispararPaso(origen, { ruta: "/api/redes/correr" }));
  } catch {
    console.warn("redes: no se pudo pedir el primer intento; lo toma el latido");
  }
  return { ok: true };
}
