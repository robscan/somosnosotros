import type { GrupoBuscador } from "./buscarUnificado";

/**
 * El armazón de la app (docs/rediseno/50, P4): una sola rejilla con la barra de la app, la pantalla y la navegación.
 * No sabe qué hay dentro de la pantalla: el layout le dice cuál es (`data-vista`, según la ruta) y el CSS solo lee ese
 * atributo. Aquí vive lo puro: qué vista es cada ruta, a dónde lleva el «+» y cuáles son los cinco destinos.
 */

/**
 * - `raiz`: las cinco secciones de la navegación (y la pantalla que confirma un borrado): barra de la app y navegación.
 * - `ficha`: un evento, un lugar, un artista o una persona: en el teléfono llevan su propia cabecera; desde 792 la
 *   barra de la app ofrece Atrás y el menú, y el carril sigue a la vista.
 * - `tarea`: altas, ediciones, buscar, ajustes, entrar…: en el teléfono llevan su propia barra; desde 792 traen la barra de la
 *   app y el carril, con su cabecera propia debajo.
 * - `completa`: la pared y el mando de una obra colectiva y el letrero para imprimir; la pantalla se queda con todo.
 */
export type Vista = "raiz" | "ficha" | "tarea" | "completa";

/**
 * Desde este ancho la navegación es un carril a la izquierda, la barra de la app va en todas las vistas y nada se recoge: es el
 * `min-width: 792px` de las hojas de estilo, el corte de tableta del prototipo firmado (doc 50). Lo que lo lee desde JavaScript lo
 * toma de aquí.
 */
export const CARRIL = "(min-width: 792px)";

const RAICES: readonly string[] = ["/", "/agenda", "/lugares", "/artistas", "/perfil", "/borrado"];
/** Las secciones cuyo `/:id` es una ficha (`/eventos/nuevo` no: es un alta). */
const FICHAS: readonly string[] = ["eventos", "lugares", "artistas", "personas"];

/** La vista de una ruta (`usePathname`, sin consulta). Lo que no es raíz, ficha ni pantalla completa es una tarea. */
export function vistaDeRuta(ruta: string): Vista {
  if (RAICES.includes(ruta)) return "raiz";
  const [seccion, id, ...resto] = ruta.split("/").filter(Boolean);
  if (seccion === "obra" || (seccion === "artistas" && resto.join("/") === "letrero")) return "completa";
  if (FICHAS.includes(seccion) && id && id !== "nuevo" && resto.length === 0) return "ficha";
  return "tarea";
}

/** Las fichas que siempre traen su menú «···» (Reportar está siempre): la persona no, a veces no lo tiene. */
const FICHAS_CON_MENU: readonly string[] = ["eventos", "lugares", "artistas"];

/**
 * ¿La ruta es una ficha que siempre trae su menú «···»? Entonces la barra de la app lo dibuja desde el primer cuadro, en el HTML
 * del servidor, y no espera a que la ficha se lo preste al hidratar (a 1 280 aparecía un instante después de Atrás).
 */
export function fichaConMenu(ruta: string): boolean {
  return vistaDeRuta(ruta) === "ficha" && FICHAS_CON_MENU.includes(ruta.split("/").filter(Boolean)[0]);
}

/** Lo que se puede dar de alta desde el «+» de la barra: cada sección lleva a la suya; fuera de ellas, un evento. */
export type Alta = "evento" | "lugar" | "artista";

export function altaDeRuta(ruta: string): Alta {
  if (ruta === "/lugares" || ruta.startsWith("/lugares/")) return "lugar";
  if (ruta === "/artistas" || ruta.startsWith("/artistas/")) return "artista";
  return "evento";
}

const ALTAS: Record<Alta, { href: string; etiqueta: string; conCiudad: boolean }> = {
  evento: { href: "/eventos/nuevo", etiqueta: "Publicar un evento", conCiudad: true },
  lugar: { href: "/lugares/nuevo", etiqueta: "Registrar un lugar", conCiudad: false },
  artista: { href: "/artistas/nuevo", etiqueta: "Registrar un artista", conCiudad: true },
};

/**
 * A dónde lleva el «+» y cómo se llama para quien no lo ve. Con la ciudad que se está viendo (`?ciudad=`), el evento y
 * el artista empiezan ahí (bitácoras 051, 053 y OL-100); el lugar se ubica por su dirección y no la lleva. Con o sin
 * sesión lleva al alta: la sesión se pide después, con el valor por delante.
 */
export function enlaceDeAlta(alta: Alta, ciudad: string | null): { href: string; etiqueta: string } {
  const { href, etiqueta, conCiudad } = ALTAS[alta];
  return { href: conCiudad && ciudad ? `${href}?ciudad=${encodeURIComponent(ciudad)}` : href, etiqueta };
}

/**
 * Desde qué tipo se abre Buscar: el de la sección en que se está (Inicio, Agenda y lo que no es Lugares ni Artistas cuentan como
 * eventos; una ficha, como su sección). Lee la ruta igual que el «+».
 */
export function buscarDesdeRuta(ruta: string): GrupoBuscador {
  return { evento: "eventos", lugar: "lugares", artista: "artistas" }[altaDeRuta(ruta)] as GrupoBuscador;
}

/**
 * A dónde lleva la lupa de la barra, en las tres medidas y desde cualquier pantalla: a Buscar (una pantalla de tarea con su propio
 * campo), con la ciudad que se está viendo y el tipo de la sección de donde se abre, que manda qué grupo sale primero.
 */
export function enlaceDeBusqueda(ciudad: string | null, desde: GrupoBuscador): string {
  const consulta = new URLSearchParams({ desde });
  if (ciudad) consulta.set("ciudad", ciudad);
  return `/buscar?${consulta}`;
}

/**
 * Los cinco destinos de la navegación, en su orden. `recuerda`: la sección vuelve a la última URL que se vio en ella
 * (filtro, ciudad); Perfil no tiene filtros que recordar.
 */
export const DESTINOS = [
  { clave: "inicio", href: "/", etiqueta: "Inicio", recuerda: true },
  { clave: "agenda", href: "/agenda", etiqueta: "Agenda", recuerda: true },
  { clave: "lugares", href: "/lugares", etiqueta: "Lugares", recuerda: true },
  { clave: "artistas", href: "/artistas", etiqueta: "Artistas", recuerda: true },
  { clave: "perfil", href: "/perfil", etiqueta: "Perfil", recuerda: false },
] as const;


/** ¿La ruta está dentro de este destino? El inicio es solo `/`; los demás, su ruta y lo que cuelga de ella. */
export function estaEnDestino(ruta: string, href: string): boolean {
  return href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(`${href}/`);
}
