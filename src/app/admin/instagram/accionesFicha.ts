"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { esUuid } from "@/lib/formulario";
import { cargarFicha, fichaConMaterial, textoDeFicha } from "@/lib/instagram/ficha";
import { revisarTexto } from "@/lib/instagram/texto";
import { dispararPaso, origenPropio } from "@/lib/rutinas/disparar";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { comoCliente, enInstagramDeFicha, fueraDeInstagram, type EnInstagramDeFicha } from "./semana";

/**
 * «Publicar en Instagram» desde la ficha de un artista o de un lugar (OL-515; pedido del founder: «así como ya pasa con el evento»): la hoja
 * enseña la tarjeta y el texto como saldrían hoy y «Publicar ahora» guarda un trabajo en la cola de redes, sin día de la semana (el mismo
 * trabajador de OL-479 lo publica: la tarjeta, su cuenta etiquetada, la historia y el espejo en Facebook). Solo la administración.
 */

type Tipo = "artista" | "lugar";

async function sesionAdmin() {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return null;
  const supabase = await clienteServidor();
  return supabase ? { supabase, yo: actual.perfil.id } : null;
}

export type PreparadaFicha =
  | { ok: true; nombre: string; cuenta: string | null; texto: string; ubicacion: string | null; en: EnInstagramDeFicha }
  | { ok: false; mensaje: string };

const SOLO_ADMIN = "Solo la administración publica en Instagram.";

/** Por qué no se puede publicar esta ficha, en una frase llana; null si se puede. */
async function impedimento(s: NonNullable<Awaited<ReturnType<typeof sesionAdmin>>>, tipo: Tipo, id: string, f: NonNullable<Awaited<ReturnType<typeof cargarFicha>>>): Promise<string | null> {
  if (!f.visible) return "Esta ficha está oculta: no se publica en Instagram.";
  if (await fueraDeInstagram(s.supabase, tipo, id)) return "Dijo que no a salir en Instagram. Se vuelve a poner desde «Fuera de Instagram», en este mismo menú.";
  if (!fichaConMaterial(f)) return "A esta ficha le falta su foto en la app: súbela antes de publicarla.";
  return null;
}

/** Lo que la hoja necesita: el texto que arma el sistema, su cuenta, la ubicación y cómo va en Instagram. */
export async function prepararFicha(tipo: Tipo, id: string): Promise<PreparadaFicha> {
  const s = esUuid(id) && (tipo === "artista" || tipo === "lugar") ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: SOLO_ADMIN };
  const ahora = new Date();
  const f = await cargarFicha(comoCliente(s.supabase), tipo, id, ahora);
  if (!f) return { ok: false, mensaje: "Esa ficha ya no existe." };
  const no = await impedimento(s, tipo, id, f);
  if (no) return { ok: false, mensaje: no };
  return { ok: true, nombre: f.nombre, cuenta: f.cuenta, texto: textoDeFicha(f, ahora), ubicacion: f.ubicacion?.nombre ?? null, en: await enInstagramDeFicha(s.supabase, tipo, id, ahora) };
}

/** `repetido`: ya salió antes y falta confirmar (la hoja pregunta «¿Publicarlo otra vez?»). */
export type PublicadaFicha = { ok: true } | { ok: false; mensaje: string; yaIba?: true } | { ok: false; repetido: string };

/**
 * «Publicar ahora»: comprueba lo que se puede comprobar al momento (que es de la administración, que la ficha se ve, que no dijo que no, que
 * tiene material, que el texto cabe y que no va ya en camino) y guarda el trabajo. Si ya salió antes, pide confirmar (`repetir`). El trabajo se
 * guarda con la llave de servicio (la administración no escribe en la cola por sí misma, y `redes_encolar` solo sabe de eventos), a nombre de
 * quien lo pidió, que es quien recibe el aviso al terminar.
 */
export async function publicarFicha(tipo: Tipo, id: string, repetir = false): Promise<PublicadaFicha> {
  const s = esUuid(id) && (tipo === "artista" || tipo === "lugar") ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: SOLO_ADMIN };
  const ahora = new Date();
  const f = await cargarFicha(comoCliente(s.supabase), tipo, id, ahora);
  if (!f) return { ok: false, mensaje: "Esa ficha ya no existe." };
  const no = await impedimento(s, tipo, id, f);
  if (no) return { ok: false, mensaje: no };
  const problema = revisarTexto(textoDeFicha(f, ahora)).problema;
  if (problema) return { ok: false, mensaje: problema };
  const en = await enInstagramDeFicha(s.supabase, tipo, id, ahora);
  if (en.publicando) return { ok: false, yaIba: true, mensaje: "Ya se está publicando. Te avisamos en el teléfono cuando salga." };
  if (en.salio && !repetir) return { ok: false, repetido: en.salio };
  const admin = clienteAdmin();
  const NO_SE_GUARDO = { ok: false as const, mensaje: "No se pudo guardar la publicación. Intenta de nuevo; no se publicó nada." };
  if (!admin) return NO_SE_GUARDO;
  const { error } = await admin.from("redes_trabajos").insert({ [tipo === "artista" ? "artista_id" : "lugar_id"]: id, red: "instagram", formato: "4x5", pedido: { facebook: true, tipo }, pedido_por: s.yo });
  if (error) return NO_SE_GUARDO;
  try {
    const h = await headers();
    const origen = origenPropio(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
    after(() => dispararPaso(origen, { ruta: "/api/redes/correr" }));
  } catch {
    console.warn("redes: no se pudo pedir el primer intento; lo toma el latido");
  }
  return { ok: true };
}
