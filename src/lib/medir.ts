import { track } from "@vercel/analytics";
import { limpiarUrlEvento } from "@/lib/limpiarUrlAnalitica";

/**
 * Medir acciones (OL-325, retoma OL-190; founder, 2026-09-25: «Firmo privacidad, deja fuera acciones de admins, sin analytics plus»;
 * 2026-10-07: «… impleméntalo para que funcione en Vercel y Google Analytics»).
 *
 * La LISTA CERRADA de lo que se mide: cada evento con sus datos, y cada dato con sus opciones fijas. Máximo 2 datos por evento. Nunca
 * texto libre, nombre, correo, id de persona, lo que se escribió al buscar, ubicación ni ids de fichas. Lo que no está aquí no se manda:
 * añadir un evento es añadir una línea a esta lista (y su renglón al aviso de privacidad si dice algo nuevo).
 *
 * Los nombres van en snake_case y con 40 caracteres o menos: así valen igual en Vercel y en Google Analytics (GA4 corta a 40).
 */
export const EVENTOS = {
  /** Entrar a la cuenta: se pidió (código por correo o salida a Apple/Google), quedó dentro o no se pudo. */
  entrar: { paso: ["pedido", "listo", "fallo"], metodo: ["correo", "apple", "google"] },
  /** Se publicó un evento (el alta por pasos). */
  evento_creado: { cartel: ["si", "no"] },
  /** La lectura automática del cartel: leyó o no pudo (sin cupo no es una lectura y no se mide). */
  cartel_leido: { resultado: ["ok", "fallo"] },
  /** Se registró un lugar: desde su alta o desde «¿Dónde es?» al publicar un evento (uno que ya existía no cuenta). */
  lugar_creado: { desde: ["alta", "evento"] },
  /** Se registró un artista; `soy`: con la casilla «Soy yo» / «Es mi grupo». */
  artista_creado: { soy: ["si", "no"] },
  /** «Voy» o «Me interesa», puesto o quitado. */
  asistencia: { estado: ["voy", "me_interesa"], cambio: ["puesto", "quitado"] },
  /** Seguir un lugar o un artista, o dejar de seguirlo. */
  seguir: { que: ["lugar", "artista"], cambio: ["puesto", "quitado"] },
  /** Una búsqueda que llegó con respuesta: si trajo algo o nada. Nunca lo escrito. */
  busqueda: { resultados: ["si", "no"] },
  /** Compartir una ficha: la hoja del teléfono, WhatsApp (sin hoja) o «Copiar» el enlace. */
  compartir: { que: ["evento", "lugar", "artista"], medio: ["hoja", "whatsapp", "copiado"] },
  /** Avisos encendidos: por correo o en el teléfono. */
  aviso_activado: { canal: ["correo", "telefono"] },
  /** Un reporte enviado, y de qué tipo de ficha. */
  reporte: { que: ["lugar", "evento", "perfil", "artista"] },
  /** La app quedó instalada (el aviso `appinstalled`: Chrome, Edge y Android; Safari de iPhone nunca lo da). */
  app_instalada: {},
  /** Una pantalla no cargó (la de «Algo falló»). */
  error_pantalla: {},
} as const satisfies Record<string, Record<string, readonly string[]>>;

export type NombreEvento = keyof typeof EVENTOS;
/** Los datos de un evento: cada uno, una de sus opciones. */
export type DatosDe<N extends NombreEvento> = { -readonly [K in keyof (typeof EVENTOS)[N]]: (typeof EVENTOS)[N][K] extends readonly (infer O)[] ? O : never };
/** Los argumentos tras el nombre: nada si el evento no lleva datos, sus datos si los lleva. */
export type ArgsDe<N extends NombreEvento> = keyof (typeof EVENTOS)[N] extends never ? [] : [DatosDe<N>];

export const MAX_DATOS = 2;
const NOMBRE_VALIDO = /^[a-z][a-z0-9_]{0,39}$/;

/**
 * Comprueba un evento contra la lista cerrada y devuelve sus datos tal cual se mandan, o null si algo no cuadra (un nombre que no está,
 * un dato de más o de menos, una opción que no existe, más de 2 datos). No lanza nunca: medir falla en silencio.
 */
export function validarMedicion(nombre: string, datos: unknown = {}): Record<string, string> | null {
  try {
    if (!NOMBRE_VALIDO.test(nombre) || !Object.hasOwn(EVENTOS, nombre)) return null;
    const esquema = EVENTOS[nombre as NombreEvento] as Record<string, readonly string[]>;
    if (datos === null || typeof datos !== "object" || Array.isArray(datos)) return null;
    const entrada = datos as Record<string, unknown>;
    const claves = Object.keys(entrada);
    const esperadas = Object.keys(esquema);
    if (claves.length > MAX_DATOS || claves.length !== esperadas.length) return null;
    const limpio: Record<string, string> = {};
    for (const clave of esperadas) {
      const valor = entrada[clave];
      if (typeof valor !== "string" || !esquema[clave].includes(valor)) return null;
      limpio[clave] = valor;
    }
    return limpio;
  } catch {
    return null;
  }
}

/** «Voy» / «Me interesa»: qué se puso o qué se quitó, a partir de lo que había y lo que queda. Null si no cambió nada. */
export function datosAsistencia(nuevo: "voy" | "me_interesa" | null, previo: "voy" | "me_interesa" | null): DatosDe<"asistencia"> | null {
  if (nuevo) return { estado: nuevo, cambio: "puesto" };
  if (previo) return { estado: previo, cambio: "quitado" };
  return null;
}

/** Qué ficha se comparte, por su dirección (`/eventos/…`, `/lugares/…`, `/artistas/…`); otra cosa (la app, una persona) no se mide. */
export function fichaDeEnlace(url: string): DatosDe<"compartir">["que"] | null {
  try {
    const seccion = new URL(url, "https://somosnosotros.org").pathname.split("/")[1];
    return seccion === "eventos" ? "evento" : seccion === "lugares" ? "lugar" : seccion === "artistas" ? "artista" : null;
  } catch {
    return null;
  }
}

/** Escribe en consola lo que se mediría, solo con `NEXT_PUBLIC_MEDIR_DEPURAR=1` (local y vista previa). */
function depurar(...partes: unknown[]) {
  try {
    if (process.env.NEXT_PUBLIC_MEDIR_DEPURAR === "1") console.info("[medir]", ...partes);
  } catch {
    // sin consola: nada
  }
}

/** Solo se manda en producción (Vercel pone `NEXT_PUBLIC_VERCEL_ENV`); en vista previa y local, nunca. */
export function medicionActivaEnCliente(): boolean {
  return process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
}

/**
 * ¿Mira la administración? El layout pinta `<i hidden data-medir-admin>` solo para quien es admin (`MarcaAdmin`, en el servidor, con el
 * mismo dato que ya decide el acceso a Administración); sin él, nadie lo es. No expone nada más: ni quién es ni su id.
 */
export const MARCA_ADMIN = "data-medir-admin";
export function esAdminEnPantalla(): boolean {
  try {
    return typeof document !== "undefined" && document.querySelector(`[${MARCA_ADMIN}]`) !== null;
  } catch {
    return false;
  }
}

type Gtag = (...args: unknown[]) => void;

/**
 * Lo que Google Analytics lee de la página en cada envío, ya limpio: sin `?q=`, sin el nombre que se buscó, sin tokens, sin la ruta
 * entera de lo privado (queda solo su primer tramo: «/entrar») y sin el título de la pestaña (lleva nombres de personas y de fichas;
 * va la ruta en su lugar). Sin referente: podría traer la búsqueda de la página anterior.
 */
export function contextoGoogle(href: string): { page_location: string; page_title: string; page_referrer: string } {
  const ubicacion = limpiarUrlEvento(href);
  let titulo = "/";
  try {
    titulo = new URL(ubicacion).pathname;
  } catch {
    // ubicación rara: la raíz
  }
  return { page_location: ubicacion, page_title: titulo, page_referrer: "" };
}

/**
 * Mide una acción desde el teléfono: a Vercel Analytics (`track`) y, si está cargado, a Google Analytics (`gtag('event', …)`) con el
 * mismo nombre y los mismos datos. Solo en producción y nunca para la administración. No lanza nunca y no espera a nadie: quien llama
 * sigue con lo suyo.
 */
export function medirCliente<N extends NombreEvento>(nombre: N, ...args: ArgsDe<N>): void {
  try {
    const datos = validarMedicion(nombre, args[0] ?? {});
    if (!datos) {
      depurar("fuera de la lista, no se manda:", nombre, args[0]);
      return;
    }
    const admin = esAdminEnPantalla();
    if (!medicionActivaEnCliente()) {
      depurar(nombre, datos, admin ? "(admin: no se mandaría)" : "(fuera de producción: no se manda)");
      return;
    }
    if (admin) return;
    try {
      track(nombre, datos);
    } catch {
      // Vercel no está: sigue
    }
    try {
      const gtag = typeof window !== "undefined" ? ((window as unknown as { gtag?: Gtag }).gtag ?? null) : null;
      if (typeof gtag === "function") {
        const contexto = contextoGoogle(window.location.href);
        gtag("set", contexto);
        gtag("event", nombre, { ...datos, ...contexto });
      }
    } catch {
      // Google no está o falló: sigue
    }
  } catch {
    // medir nunca rompe la acción
  }
}
