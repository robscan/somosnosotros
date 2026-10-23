import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hrefArtista, validarArtista } from "../artistas";
import { hrefEvento } from "../eventos";
import { hrefLugar, validarLugar } from "../lugares";
import { entradaDeArtista, entradaDeLugar, nombreDe, notaDeFestival, type TipoPropuesta } from "../propuestas";
import { zonaDePunto } from "../zona";
import { ponerCartel, type Almacen } from "./aceptarCartel";
import type { Mapbox } from "./mapbox";
import { ciudadDeCorrida, insertarEvento, ligarFicha, lugaresDeCiudad, prepararEvento, type Preparado } from "./publicarEvento";

/**
 * Aceptar una propuesta de lugar, evento o artista (OL-427, OL-429, OL-433, OL-434, OL-441, OL-448), sacado de la acción de la bandeja de
 * Ciudades (`aceptarPropuesta` en `src/app/admin/ciudades/acciones.ts`) sin cambiar lo que hace, para que la use también el guion de la Mac
 * que acepta una corrida entera (OL-453, `scripts/instituciones/aceptar-corrida.ts`; founder: «no me pongas a aprobar en front, aprueba tú por
 * favor»). Lo que cambia entre los dos va en `DepAceptar`:
 *   · `marcar`: crear la ficha (lugar o artista) y marcar la propuesta aceptada. La bandeja llama `aceptar_propuesta` con la sesión (la base
 *     exige el rol de quien acepta); el guion, con la llave de servicio, `aceptar_propuesta_como` (la misma función a nombre del admin, migración
 *     20261022170000).
 *   · `consultas`: con qué se pregunta «¿es este?» (`lugares_parecidos`): la sesión en la bandeja, la llave de servicio en el guion.
 *   · `admin`: la llave de servicio, para publicar el evento, ligarlo y poner su cartel.
 *   · `revalidar`: lo que la bandeja vuelve a pintar (nada en el guion).
 */

export type ResultadoAceptar = { ok: true; href: string | null; nota?: string; espera?: boolean; actos?: string[] } | { ok: false; error: string };
export type PropuestaLeida = { id: string; tipo: TipoPropuesta; datos: Record<string, unknown>; estado: string; corrida_id: string };
type Respuesta = { data: unknown; error: { code?: string; message?: string } | null };

export type DepAceptar = {
  /** Quien acepta: autor de lo que se publica y de las fichas. */
  yo: string;
  admin: SupabaseClient | null;
  consultas: Pick<SupabaseClient, "rpc">;
  marcar: (propuesta: string, ficha: Record<string, unknown>) => Promise<Respuesta>;
  mapbox: Mapbox | null;
  almacen: (admin: SupabaseClient) => Almacen;
  ahora: () => Date;
  revalidar?: { todo: () => void; ruta: (ruta: string) => void };
  /** Con qué se baja la imagen del cartel (por omisión, `fetch`; las pruebas pasan una falsa). */
  pedir?: typeof fetch;
  /** Solo comprobar si se podría aceptar (el guion con --simular): todo lo de antes de marcar, nada escrito. */
  soloComprobar?: boolean;
};

/** La línea de lo hecho cuando la imagen de la propuesta (la de la cartelera, OL-448) no se pudo poner como cartel: el evento ya está publicado. */
export const NOTA_SIN_CARTEL = "se publicó sin cartel: su imagen no se pudo bajar";
/** La línea cuando el evento se aceptó pero no se pudo insertar: lo publica la siguiente corrida de agendas. */
export const NOTA_NO_PUBLICADO = "no se pudo publicar ahora: se publica con la siguiente corrida de agendas";

/**
 * Los actos aceptados de un festival propuesto (`datos.marco_propuesto`) tras aceptarlo: los que ya tienen su evento (se publicaron con él) y
 * cuántos siguen sin publicar (los publica la siguiente corrida de agendas). Si no se puede leer, ninguno: la línea no dice nada de más.
 */
async function actosDelFestival(admin: SupabaseClient, festival: string): Promise<{ publicados: string[]; sinPublicar: number }> {
  const r = await admin.from("propuestas").select("id, ficha_id").eq("tipo", "evento").eq("estado", "aceptada").eq("datos->>marco_propuesto", festival).limit(500);
  if (r.error) return { publicados: [], sinPublicar: 0 };
  const filas = (r.data ?? []) as { id: string; ficha_id: string | null }[];
  return { publicados: filas.filter((f) => f.ficha_id).map((f) => f.id), sinPublicar: filas.filter((f) => !f.ficha_id).length };
}

/**
 * Aceptar una propuesta ya leída y aún sin decidir (lugar, evento o artista; un cartel va aparte). Un lugar pasa por la validación del alta de
 * lugar y por «¿es este?» (150 m); un artista, por la del alta de artista; un evento se arma y se comprueba antes de aceptar (`prepararEvento`) y,
 * aceptado, se inserta con la llave de servicio, se liga a su propuesta y, si trae imagen, se le pone como cartel. Si algo impide aceptar, no se
 * acepta y vuelve la frase de por qué.
 */
export async function aceptarLeida(dep: DepAceptar, p: PropuestaLeida, ciudad: string | null): Promise<ResultadoAceptar> {
  const { yo, admin } = dep;
  const ruta = (r: string) => dep.revalidar?.ruta(r);
  let ficha: Record<string, unknown> = {};
  let evento: Preparado | null = null;
  if (p.tipo === "evento") {
    if (!admin) return { ok: false, error: "No se puede publicar ahora. Intenta más tarde." };
    const enCiudad = await ciudadDeCorrida(admin, p.corrida_id);
    if (!enCiudad) return { ok: false, error: "Esa ciudad ya no está. Recarga la página." };
    const lugares = await lugaresDeCiudad(admin, enCiudad);
    if (!lugares) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
    evento = await prepararEvento({ db: admin, mapbox: dep.mapbox, ahora: dep.ahora() }, p.datos, enCiudad, lugares, yo);
    if (!evento.ok) return { ok: false, error: evento.error };
  } else if (p.tipo === "lugar") {
    const { datos, errores } = validarLugar(entradaDeLugar(p, ciudad), { esAdmin: true });
    const primero = Object.values(errores)[0];
    if (primero) return { ok: false, error: primero };
    const { data: parecidos } = await dep.consultas.rpc("lugares_parecidos", { p_nombre: datos.nombre, p_lat: datos.lat, p_lng: datos.lng });
    const parecido = Array.isArray(parecidos) ? (parecidos[0] as { nombre?: string } | undefined) : undefined;
    if (parecido) return { ok: false, error: `Ya está «${parecido.nombre ?? datos.nombre}» muy cerca: recházala como duplicado.` };
    ficha = { nombre: datos.nombre, tipo: datos.tipo, detalle: datos.detalle, direccion: datos.direccion, lat: datos.lat, lng: datos.lng, ciudad: datos.ciudad, zona: zonaDePunto(datos.lat, datos.lng), redes: datos.redes };
  } else if (p.tipo === "artista") {
    const { datos, errores } = validarArtista(entradaDeArtista(p, ciudad), { esAdmin: true });
    const primero = Object.values(errores)[0];
    if (primero) return { ok: false, error: primero };
    ficha = { nombre: datos.nombre, disciplina: datos.disciplina, detalle: datos.detalle, tipo: datos.tipo, ciudad: datos.ciudad, redes: datos.redes };
  }

  if (dep.soloComprobar) return evento?.ok ? { ok: true, href: null, ...(evento.espera ? { nota: evento.espera, espera: true } : evento.nota ? { nota: evento.nota } : {}) } : { ok: true, href: null };
  const { data, error } = await dep.marcar(p.id, ficha);
  if (error?.code === "23505") return { ok: false, error: `Ya hay una ficha llamada «${nombreDe(p)}»: recházala como duplicado.` };
  if (error) return { ok: false, error: "No se pudo aceptar. Intenta de nuevo." };
  const r = (data ?? {}) as { ficha_id?: string | null; slug?: string | null };
  dep.revalidar?.todo();
  if (p.tipo === "lugar") {
    ruta("/");
    ruta("/lugares");
  }
  if (p.tipo === "artista") ruta("/artistas");
  if (p.tipo === "evento" && admin && evento?.ok) {
    // Un acto aceptado antes que su festival (OL-433) queda aceptado sin publicarse: lo dice su frase, no «no se pudo publicar» (OL-434).
    if (evento.espera) return { ok: true, href: null, nota: evento.espera, espera: true };
    const creado = await insertarEvento(admin, evento.fila);
    if (!creado) return { ok: true, href: null, nota: NOTA_NO_PUBLICADO };
    if (!(await ligarFicha(admin, p.id, creado.id))) {
      // Otra pestaña la aceptó a la vez y ya tiene su evento: este sobra.
      await admin.from("eventos").delete().eq("id", creado.id);
      return { ok: true, href: null };
    }
    // La imagen que trae la propuesta (la de la Cartelera de la Ciudad de México, OL-448) se pone como cartel por el camino de «Buscar
    // carteles»: se baja, se prepara y se guarda en Storage. Si no se puede, el evento queda publicado sin cartel y la línea lo dice.
    const sinCartel = typeof p.datos.imagen === "string" && !(await ponerCartel({ db: admin, almacen: dep.almacen(admin), ahora: dep.ahora, pedir: dep.pedir }, { evento_id: creado.id, imagen: p.datos.imagen }, yo)).ok;
    if (sinCartel) evento.nota = [evento.nota, NOTA_SIN_CARTEL].filter(Boolean).join(" · ");
    ruta("/");
    ruta(hrefEvento(creado));
    const lugarId = evento.fila.lugar_id;
    if (typeof lugarId === "string") ruta(`/lugares/${lugarId}`);
    if (p.datos.clase === "festival") {
      // `ligarFicha` ya publicó colgados de él los actos aceptados que lo esperaban (OL-433): la línea dice cuántos (OL-434).
      const actos = await actosDelFestival(admin, p.id);
      return { ok: true, href: hrefEvento(creado), nota: notaDeFestival(actos.publicados.length, actos.sinPublicar), actos: actos.publicados };
    }
    // Un costo de la agenda que no es cifra, gratis ni cooperación quedó «Por confirmar» (OL-441): la línea lo dice.
    return evento.nota ? { ok: true, href: hrefEvento(creado), nota: evento.nota } : { ok: true, href: hrefEvento(creado) };
  }
  if (!r.ficha_id) return { ok: true, href: null };
  return { ok: true, href: p.tipo === "lugar" ? hrefLugar({ id: r.ficha_id, slug: r.slug }) : hrefArtista({ id: r.ficha_id, slug: r.slug }) };
}
