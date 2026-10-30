import "server-only";
import { llamarGraph } from "../instagram/api";

/**
 * Business Discovery de la Graph API (OL-489; `docs/investigaciones/vigilancia-instagram-lugares.md` §3): lo público de una cuenta profesional
 * de Instagram leído con el token de la marca (`GET /{nuestra cuenta}?fields=business_discovery.username(<cuenta>){…}`, con el permiso
 * `instagram_manage_insights` que trae el token de «Conectar Instagram»). Solo se pide lo que la rutina «Completar fichas» usa: nombre,
 * biografía, sitio, foto de perfil y las últimas publicaciones (imagen, texto, enlace y fecha). Una cuenta personal, privada o con restricción
 * de edad no devuelve nada. Nunca lanza ni registra el token: null si no se pudo leer (y `limite` si Meta dijo que ya no hay cupo).
 */

export type CuentaGraph = { token: string; usuario: string };
export type Publicacion = { id: string; tipo: string; imagen: string | null; texto: string; enlace: string | null; fecha: string | null };
export type Perfil = { usuario: string; nombre: string; biografia: string; sitio: string | null; foto: string | null; publicaciones: Publicacion[] };
export type Lectura = { perfil: Perfil | null; limite: boolean };

/** Un nombre de usuario de Instagram válido (lo que admite la API y lo que guarda la ficha). */
export const USUARIO = /^[A-Za-z0-9._]{1,30}$/;
export const PUBLICACIONES = 12;

const CAMPOS = `business_discovery.username(%s){username,name,biography,website,profile_picture_url,media.limit(${PUBLICACIONES}){id,media_type,media_url,thumbnail_url,caption,permalink,timestamp}}`;

const texto = (v: unknown, tope: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, tope) : "");
const https = (v: unknown): string | null => (typeof v === "string" && /^https:\/\/[^\s]{4,1500}$/.test(v) ? v : null);

export async function leerCuenta(usuario: string, cuenta: CuentaGraph, traer: typeof fetch): Promise<Lectura> {
  if (!USUARIO.test(usuario) || !/^[0-9]{1,40}$/.test(cuenta.usuario)) return { perfil: null, limite: false };
  const r = (await llamarGraph(traer, "GET", `/${cuenta.usuario}`, { fields: CAMPOS.replace("%s", usuario) }, cuenta.token)) as Record<string, unknown> & {
    error?: { code?: number };
  };
  const code = r.error?.code ?? 0;
  if (r.error) return { perfil: null, limite: code === 4 || code === 17 || code === 32 || code === 613 };
  const bd = r.business_discovery as Record<string, unknown> | undefined;
  if (!bd || typeof bd !== "object") return { perfil: null, limite: false };
  const media = (bd.media as { data?: unknown } | undefined)?.data;
  const publicaciones: Publicacion[] = (Array.isArray(media) ? media : [])
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .map((m) => {
      const tipo = texto(m.media_type, 20);
      return {
        id: texto(m.id, 40),
        tipo,
        // Un video da su miniatura: `media_url` es el video.
        imagen: tipo === "VIDEO" ? https(m.thumbnail_url) : https(m.media_url),
        texto: texto(m.caption, 600),
        enlace: https(m.permalink),
        fecha: typeof m.timestamp === "string" && Number.isFinite(Date.parse(m.timestamp)) ? m.timestamp : null,
      };
    })
    .filter((p) => p.id);
  const propio = texto(bd.username, 30);
  return {
    perfil: {
      usuario: USUARIO.test(propio) ? propio : usuario,
      nombre: texto(bd.name, 120),
      biografia: texto(bd.biography, 600),
      sitio: https(bd.website),
      foto: https(bd.profile_picture_url),
      publicaciones,
    },
    limite: false,
  };
}

/** Sin acentos, en minúscula y solo letras y números separados por un espacio: para comparar nombres. */
export function normal(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Los nombres de usuario que probaría una persona para una ficha sin Instagram (el encargo: el nombre sin espacios, con puntos y con guiones
 * bajos), sin acentos ni signos, de 3 a 30 caracteres. Como mucho `max`.
 */
export function usuariosPlausibles(nombre: string, max = 4): string[] {
  const palabras = normal(nombre).split(" ").filter(Boolean);
  if (!palabras.length) return [];
  const sinArticulos = palabras.filter((p, i) => i === 0 || !["el", "la", "los", "las", "de", "del", "y"].includes(p));
  const juntas = [palabras.join(""), palabras.join("."), palabras.join("_"), sinArticulos.join(""), sinArticulos.join("_")];
  return [...new Set(juntas)].filter((u) => u.length >= 3 && USUARIO.test(u)).slice(0, max);
}

/**
 * ¿Es esta cuenta la de la ficha? Solo si su nombre completo o su biografía contienen el nombre de la ficha (todas sus palabras de 3 letras o
 * más, en orden) **y** la ciudad (su nombre o un alias) aparece en la biografía, en el nombre o en el sitio. Un homónimo de otra ciudad no entra.
 */
export function esLaCuenta(p: Pick<Perfil, "nombre" | "biografia" | "sitio">, ficha: string, ciudades: readonly string[]): boolean {
  const n = normal(ficha);
  if (!n) return false;
  const nombre = normal(p.nombre);
  const bio = normal(p.biografia);
  const contiene = (texto: string, frase: string) => !!frase && ` ${texto} `.includes(` ${frase} `);
  const deNombre = contiene(nombre, n) || contiene(bio, n);
  const sitio = normal(p.sitio ?? "").replace(/ /g, "");
  const enCiudad = ciudades
    .map(normal)
    .filter((c) => c.length >= 3)
    .some((c) => contiene(bio, c) || contiene(nombre, c) || (!!sitio && sitio.includes(c.replace(/ /g, ""))));
  return deNombre && enCiudad;
}

/** El usuario de un enlace de Instagram de la ficha (`https://www.instagram.com/<usuario>/`), o null. */
export function usuarioDeEnlace(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)instagram\.com$/i.test(u.hostname)) return null;
    const primero = u.pathname.split("/").filter(Boolean)[0] ?? "";
    return USUARIO.test(primero) && !["p", "reel", "reels", "stories", "explore", "tv"].includes(primero.toLowerCase()) ? primero : null;
  } catch {
    return null;
  }
}
