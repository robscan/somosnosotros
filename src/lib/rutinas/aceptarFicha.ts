import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LIMITE_ENLACES, normalizarRedes, reconocerEnlace } from "../enlaces";
import { LIMITES_ARTISTA, LIMITES_LUGAR } from "../limites";
import { usuarioDeEnlace } from "./descubrir";
import type { AlmacenFichas } from "./fichasImagen";

/**
 * Aceptar una propuesta de «Completar fichas» (OL-489): poner en la ficha que ya existe el campo que propone, **solo si la ficha lo tiene vacío**
 * (nunca pisa lo que ya hay, aunque alguien lo haya puesto después de proponerse):
 *   · foto o portada: la imagen ya recortada (cuadrada o 3:2) que la rutina dejó en la carpeta de espera del bucket se pasa a la carpeta de quien
 *     acepta, como las fichas que ya existen (`<artistas|lugares>/<admin>/<foto|portada>-<uuid>.jpg`), y se pone en la ficha; las de espera se
 *     borran;
 *   · descripción: el texto propuesto (que la base vuelva a limitar a lo de siempre);
 *   · instagram: el enlace se añade a `redes`, si la ficha no tiene ya uno de Instagram y le cabe.
 * Si no se puede, no se pone nada y vuelve la frase de por qué (la tarjeta la dice). Marcar la propuesta va después, como en un cartel.
 */

export type DepFicha = { db: SupabaseClient; almacen: AlmacenFichas; yo: string };
export type FichaPuesta = { ok: true; tipo: "artista" | "lugar"; id: string; slug: string | null; campo: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPOS = ["foto", "portada", "descripcion", "instagram"] as const;
const texto = (v: unknown, tope = 2000) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, tope) : "");

export async function ponerEnFicha(dep: DepFicha, datos: Record<string, unknown>): Promise<FichaPuesta> {
  const tipo = datos.ficha_tipo === "artista" || datos.ficha_tipo === "lugar" ? datos.ficha_tipo : null;
  const id = typeof datos.ficha_id === "string" && UUID.test(datos.ficha_id) ? datos.ficha_id : null;
  const campo = CAMPOS.find((c) => c === datos.campo) ?? null;
  if (!tipo || !id || !campo || (tipo === "lugar" && campo === "foto")) return { ok: false, error: "A esta propuesta le falta la ficha o el campo. Recházala." };
  if (!UUID.test(dep.yo)) return { ok: false, error: "No se pudo aceptar. Recarga la página." };
  const tabla = tipo === "artista" ? "artistas" : "lugares";
  const columnas = tipo === "artista" ? "id, slug, foto, portada, descripcion, redes" : "id, slug, portada, descripcion, redes";
  const leido = await dep.db.from(tabla).select(columnas).eq("id", id).maybeSingle();
  if (leido.error) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  const f = leido.data as Record<string, unknown> | null;
  if (!f) return { ok: false, error: "Esa ficha ya no está. Recházala." };
  const listo = (): FichaPuesta => ({ ok: true, tipo, id, slug: typeof f.slug === "string" ? f.slug : null, campo });
  const yaTiene = "Esa ficha ya tiene ese dato: recházala como duplicado.";

  if (campo === "foto" || campo === "portada") {
    if (texto(f[campo])) return { ok: false, error: yaTiene };
    const espera = typeof datos.imagen === "string" ? dep.almacen.rutaDe(datos.imagen) : null;
    if (!espera || !espera.startsWith(`${tabla}/rutina-fichas/`)) return { ok: false, error: "La imagen de esta propuesta no está en la carpeta de espera. Recházala." };
    const bytes = await dep.almacen.leer(espera);
    if (!bytes) return { ok: false, error: "La imagen ya no está guardada. Recházala." };
    const ruta = `${tabla}/${dep.yo}/${campo}-${crypto.randomUUID()}.jpg`;
    const url = await dep.almacen.subir(ruta, bytes, "image/jpeg");
    if (!url) return { ok: false, error: "No se pudo guardar la imagen. Intenta de nuevo." };
    const r = await (f[campo] === "" ? dep.db.from(tabla).update({ [campo]: url }).eq("id", id).eq(campo, "") : dep.db.from(tabla).update({ [campo]: url }).eq("id", id).is(campo, null)).select("id");
    if (r.error || !r.data?.length) {
      // Otra pestaña (o quien gestiona la ficha) la puso a la vez: este archivo sobra.
      await dep.almacen.borrar([ruta]).catch(() => undefined);
      return { ok: false, error: r.error ? "No se pudo poner la imagen. Intenta de nuevo." : yaTiene };
    }
    const mini = typeof datos.miniatura === "string" ? dep.almacen.rutaDe(datos.miniatura) : null;
    await dep.almacen.borrar([espera, ...(mini && mini.startsWith(`${tabla}/rutina-fichas/`) ? [mini] : [])]).catch(() => undefined);
    return listo();
  }

  if (campo === "descripcion") {
    if (texto(f.descripcion)) return { ok: false, error: yaTiene };
    const tope = tipo === "artista" ? LIMITES_ARTISTA.descripcion : LIMITES_LUGAR.descripcion;
    const valor = texto(datos.valor, tope);
    if (valor.length < 40) return { ok: false, error: "La descripción propuesta está vacía. Recházala." };
    const r = await (f.descripcion === "" ? dep.db.from(tabla).update({ descripcion: valor }).eq("id", id).eq("descripcion", "") : dep.db.from(tabla).update({ descripcion: valor }).eq("id", id).is("descripcion", null)).select("id");
    if (r.error) return { ok: false, error: "No se pudo poner la descripción. Intenta de nuevo." };
    if (!r.data?.length) return { ok: false, error: yaTiene };
    return listo();
  }

  // instagram
  const enlace = reconocerEnlace(texto(datos.valor, 300));
  if (!enlace || enlace.red !== "instagram" || !usuarioDeEnlace(enlace.url)) return { ok: false, error: "El enlace de Instagram de esta propuesta no sirve. Recházala." };
  const redes = normalizarRedes(f.redes);
  if (redes.some((e) => e.red === "instagram")) return { ok: false, error: yaTiene };
  if (redes.length >= LIMITE_ENLACES) return { ok: false, error: `Esa ficha ya tiene ${LIMITE_ENLACES} enlaces: añádelo a mano si hace falta.` };
  const nuevas = [...redes, enlace];
  const r = await dep.db.from(tabla).update({ redes: nuevas }).eq("id", id).select("id");
  if (r.error || !r.data?.length) return { ok: false, error: "No se pudo añadir el Instagram. Intenta de nuevo." };
  return listo();
}
