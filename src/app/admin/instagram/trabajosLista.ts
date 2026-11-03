import { ESTADO_FACEBOOK, type ClaveFacebook } from "@/lib/instagram/frases";
import { CUENTA_INSTAGRAM } from "@/lib/instagram/texto";
import { enCamino, LINEA_PUBLICADO, motivoLlano, textoEnCamino, type ClaveFallo, type EstadoTrabajo, type Red, type ResultadoTrabajo } from "@/lib/redes/reglas";
import type { TrabajoEnCamino } from "./colaPorEvento";

/**
 * OL-506 (prototipo firmado el 2026-11-02, bitácora 535): lo que la lista de Administración › Instagram sabe de los trabajos de la cola, para que la
 * tarjeta se quede en su sitio y cambie sola al publicar, sin volver a pedir la pantalla. Sin React ni red, para probarlo: de dónde sale cada
 * trabajo (lo que trae el servidor, la respuesta de «Publicar» y el sondeo), cuándo manda sobre lo que dice el servidor, qué dice el renglón y
 * cómo se recuerda en la sesión (Atrás dentro del minuto llega con la pantalla de la caché).
 */

/** Un trabajo como lo ve la lista. `id` null: Facebook respondió que ya estaba (no se guardó otro). */
export type Trabajo = {
  id: string | null;
  red: Red;
  estado: EstadoTrabajo["estado"];
  reintentando: boolean;
  conFacebook: boolean;
  error: ClaveFallo | null;
  resultado: ResultadoTrabajo | null;
  /** Cuándo se armó (en el servidor, ISO) la lista que había al pedirlo o al verlo en camino: lo que salga después, esa lista no lo sabe. */
  desde: string;
  /** El reloj del teléfono al anotarlo: la sesión lo olvida a los 10 min. */
  t: number;
};
/** Lo último de cada red de un evento. */
export type DelEvento = { instagram?: Trabajo; facebook?: Trabajo };
export type Trabajos = Readonly<Record<string, DelEvento>>;
/** Lo que pregunta el sondeo (`estadosTrabajos`): el trabajo entero; una respuesta corta (solo estado e intento) también vale. */
export type Respuesta = Record<string, Pick<EstadoTrabajo, "estado" | "reintentando"> & Partial<EstadoTrabajo>>;
/** Lo mínimo de un renglón que hace falta aquí (`Sugerencia`). */
export type Fila = { id: string; publicado: boolean; publicadoEn?: string | null; facebook: { estado: string } | null; enCamino?: TrabajoEnCamino[] };

/** La sesión recuerda los trabajos 10 min: lo que tarda de sobra una publicación con sus reintentos rápidos, y Atrás llega antes. */
export const MEMORIA_MS = 10 * 60_000;
/**
 * Al volver a la app, la lista se pide otra vez solo si no hay nada en camino y tiene más de 5 min (el umbral que el council de carga dejó para
 * decidir con datos, OL-500; mientras, 5): así no se mueve nada mientras se mira y lo viejo se pone al día.
 */
export const LISTA_VIEJA_MS = 5 * 60_000;
export const CLAVE_MEMORIA = "somosnosotros:instagram:trabajos";
const REDES: Red[] = ["instagram", "facebook"];

/** Lo que trae el servidor en camino en cada renglón (`enCamino`), como trabajos. */
export function semillas(filas: readonly Fila[], generada: string, ahora: number): Trabajos {
  const fuera: Record<string, DelEvento> = {};
  for (const s of filas) {
    for (const v of s.enCamino ?? []) {
      const red = v.red ?? (s.publicado ? "facebook" : "instagram");
      if (fuera[s.id]?.[red]) continue;
      fuera[s.id] = { ...fuera[s.id], [red]: { id: v.id, red, estado: "en_cola", reintentando: v.reintentando, conFacebook: !!v.conFacebook, error: null, resultado: null, desde: generada, t: ahora } };
    }
  }
  return fuera;
}

/**
 * Lo recordado manda sobre lo sembrado (sabe más: lo vio terminar). Salvo un trabajo nuevo en camino que la sesión no conoce (lo pidió otra
 * pestaña u otro teléfono) cuando lo recordado ya terminó.
 */
export function combinar(recordados: Trabajos, sembrados: Trabajos): Trabajos {
  const fuera: Record<string, DelEvento> = { ...recordados };
  for (const [evento, del] of Object.entries(sembrados)) {
    const mio = fuera[evento] ?? {};
    const junto: DelEvento = { ...mio };
    for (const red of REDES) {
      const nuevo = del[red];
      if (!nuevo) continue;
      const viejo = mio[red];
      if (!viejo || (viejo.id !== nuevo.id && !enCamino(viejo))) junto[red] = nuevo;
    }
    fuera[evento] = junto;
  }
  return fuera;
}

/** La respuesta de «Publicar» (`{ ok, id }`), como trabajo recién puesto en la cola. `yaEstaba`: Facebook ya lo tenía. */
export function encolado(red: Red, r: { id: string | null; yaEstaba?: boolean }, conFacebook: boolean, generada: string, ahora: number): Trabajo {
  return { id: r.id, red, estado: r.yaEstaba ? "publicado" : "en_cola", reintentando: false, conFacebook: red === "instagram" && conFacebook, error: null, resultado: null, desde: generada, t: ahora };
}

/** Anota un trabajo de un evento (lo último de su red). */
export function anotar(t: Trabajos, eventoId: string, trabajo: Trabajo): Trabajos {
  return { ...t, [eventoId]: { ...t[eventoId], [trabajo.red]: trabajo } };
}

/** Lo que dijo el sondeo, sobre los trabajos que se ven. Devuelve lo que cambió (para anotarlo, con el reloj de `ahora`), o null si nada. */
export function conRespuesta(vistos: Trabajos, m: Respuesta, ahora: number): Trabajos | null {
  let cambios: Record<string, DelEvento> | null = null;
  for (const [evento, del] of Object.entries(vistos)) {
    for (const red of REDES) {
      const viejo = del[red];
      const r = viejo?.id ? m[viejo.id] : undefined;
      if (!viejo || !r) continue;
      const nuevo: Trabajo = {
        ...viejo,
        estado: r.estado,
        reintentando: !!r.reintentando,
        conFacebook: r.conFacebook ?? viejo.conFacebook,
        error: r.error !== undefined ? r.error : viejo.error,
        resultado: r.resultado !== undefined ? r.resultado : viejo.resultado,
        t: ahora,
      };
      if (nuevo.estado === viejo.estado && nuevo.reintentando === viejo.reintentando && nuevo.error === viejo.error && JSON.stringify(nuevo.resultado) === JSON.stringify(viejo.resultado)) continue;
      cambios ??= {};
      cambios[evento] = { ...(cambios[evento] ?? del), [red]: nuevo };
    }
  }
  return cambios;
}

/** Junta lo que cambió con lo que había. */
export function fusionar(t: Trabajos, cambios: Trabajos): Trabajos {
  const fuera: Record<string, DelEvento> = { ...t };
  for (const [evento, del] of Object.entries(cambios)) fuera[evento] = { ...fuera[evento], ...del };
  return fuera;
}

/**
 * ¿El trabajo manda sobre lo que dice el servidor en este renglón? Mientras va, siempre. Al terminar, hasta que la lista se vuelva a pedir y ya lo
 * sepa: Instagram, si el evento salió en Instagram después de que se armó la lista que lo pidió (`publicadoEn` ≥ `desde`); Facebook, si la lista
 * ya dice «publicado».
 */
export function vigente(s: Fila, t: Trabajo | undefined): t is Trabajo {
  if (!t) return false;
  if (enCamino(t)) return true;
  if (t.red === "facebook") return s.facebook?.estado !== "publicada";
  return !(s.publicado && !!s.publicadoEn && s.publicadoEn >= t.desde);
}

/** Lo que va en camino y se ve: lo que pregunta el sondeo. */
export function vivosDe(filas: readonly Fila[], t: Trabajos): { id: string; reintentando: boolean }[] {
  const fuera: { id: string; reintentando: boolean }[] = [];
  for (const s of filas) {
    for (const red of REDES) {
      const x = t[s.id]?.[red];
      if (x?.id && enCamino(x) && vigente(s, x)) fuera.push({ id: x.id, reintentando: x.reintentando });
    }
  }
  return fuera;
}

/** El estado de la última línea del renglón (`ui/Renglon`). */
export type EstadoLinea = "en-camino" | "reintentando" | "hecho" | "fallido";
/** La línea de Facebook: su texto y si lleva el anillo. */
export type LineaFacebook = { texto: string; girando: boolean };

/** La línea de Instagram de un trabajo: «Publicando…», «Reintentando…», «Publicado · hace un momento» o «No se publicó: …». */
export function lineaInstagram(t: Trabajo): { texto: string; estado: EstadoLinea } {
  if (enCamino(t)) return { texto: textoEnCamino(t), estado: t.reintentando ? "reintentando" : "en-camino" };
  // La frase de `lineaDeTrabajo` (la que dice el servidor de un fallo).
  if (t.estado === "fallido") return { texto: `No se publicó: ${motivoLlano("instagram", t.error ?? "otro")}`, estado: "fallido" };
  return { texto: LINEA_PUBLICADO, estado: "hecho" };
}

/**
 * La línea de Facebook de lo que se publicó desde aquí: el trabajo de Facebook si lo hay (lo más nuevo) y, si no, lo que trajo el de Instagram con
 * «También en Facebook» al terminar. Mientras Instagram va, nada: Facebook va después, en el mismo trabajo.
 */
export function lineaFacebook(del: { instagram?: Trabajo; facebook?: Trabajo }): LineaFacebook | null {
  const fb = del.facebook;
  if (fb) {
    if (enCamino(fb)) return { texto: textoEnCamino(fb, true), girando: true };
    if (fb.estado === "publicado") return { texto: "Facebook: publicado", girando: false };
    return { texto: `Facebook: ${ESTADO_FACEBOOK[fb.error as ClaveFacebook] ?? "no se publicó"}`, girando: false };
  }
  const ig = del.instagram;
  if (!ig || !ig.conFacebook || ig.estado !== "publicado") return null;
  const r = ig.resultado?.facebook;
  if (!r) return null;
  return r.ok ? { texto: "Facebook: publicado", girando: false } : { texto: `Facebook: ${ESTADO_FACEBOOK[r.error] ?? "no se publicó"}`, girando: false };
}

/** A dónde lleva «Ver»: la publicación, si el trabajo trae su enlace; si no, la cuenta (@smsnstrsapp). */
export function enlaceVer(t: Trabajo): string {
  return t.resultado?.instagram?.permalink ?? `https://www.instagram.com/${CUENTA_INSTAGRAM}/`;
}

/** La memoria de la sesión: lo de los últimos 10 min. Lo que no se pueda leer, nada. */
export function leerMemoria(texto: string | null, ahora: number): Trabajos {
  if (!texto) return {};
  try {
    const crudo = JSON.parse(texto) as Record<string, DelEvento>;
    const fuera: Record<string, DelEvento> = {};
    for (const [evento, del] of Object.entries(crudo ?? {})) {
      for (const red of REDES) {
        const t = del?.[red];
        if (t && typeof t.t === "number" && ahora - t.t < MEMORIA_MS && typeof t.estado === "string") fuera[evento] = { ...fuera[evento], [red]: t };
      }
    }
    return fuera;
  } catch {
    return {};
  }
}
