import type { GrupoBuscador } from "./buscarUnificado";
import type { Punto } from "./geo";

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
/** Las secciones cuyo `/:id` es una ficha. */
const FICHAS: readonly string[] = ["eventos", "lugares", "artistas", "personas"];

/** La vista de una ruta (`usePathname`, sin consulta). Lo que no es raíz, ficha ni pantalla completa es una tarea. */
export function vistaDeRuta(ruta: string): Vista {
  if (RAICES.includes(ruta)) return "raiz";
  const [seccion, id, ...resto] = ruta.split("/").filter(Boolean);
  if (seccion === "obra" || (seccion === "artistas" && resto.join("/") === "letrero")) return "completa";
  if (FICHAS.includes(seccion) && id && resto.length === 0) return "ficha";
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

/** El tipo con el que abre la pantalla de alta (`?tipo=`): lo que no es un tipo conocido es un evento. */
export function altaDeParametro(valor: string | undefined): Alta {
  return valor === "lugar" || valor === "artista" ? valor : "evento";
}

/** `etiqueta`: cómo se llama el «+» para quien no lo ve; `titulo`: el de la pantalla de alta. */
const ALTAS: Record<Alta, { etiqueta: string; titulo: string; conCiudad: boolean }> = {
  evento: { etiqueta: "Publicar un evento", titulo: "Publicar un evento", conCiudad: true },
  lugar: { etiqueta: "Registrar un lugar", titulo: "Registrar un lugar", conCiudad: false },
  artista: { etiqueta: "Registrar artista", titulo: "Registrar artista", conCiudad: true },
};

/** El título de la pantalla de alta de cada tipo. */
export function tituloDeAlta(alta: Alta): string {
  return ALTAS[alta].titulo;
}

/**
 * A dónde lleva el «+» y cómo se llama para quien no lo ve: a la pantalla de alta, con el tipo de la sección en que se
 * está (`altaDeRuta`). Cada tipo tiene su alta por pasos: el evento (`/nuevo/evento`, OL-312), el lugar (`/nuevo/lugar`, OL-315) y el
 * artista (`/nuevo/artista`, OL-316). Con la ciudad que se está viendo (`?ciudad=`), el evento y el artista empiezan ahí (bitácoras 051, 053
 * y OL-100); el lugar se ubica por su dirección y no la lleva. Con el `nombre` de lo que se buscó y no se encontró (Buscar), el lugar o el
 * artista abren con él ya puesto; y con el `punto` donde se sostuvo el dedo en el mapa de Lugares (seis decimales: a unos 10 cm), el lugar ya
 * ubicado. Con o sin sesión lleva al alta: la sesión se pide después, con el valor por delante.
 */
export function enlaceDeAlta(alta: Alta, ciudad: string | null, nombre: string | null = null, punto: Punto | null = null): { href: string; etiqueta: string } {
  const { etiqueta, conCiudad } = ALTAS[alta];
  if (alta === "evento") return { href: enlaceAltaEvento({ ciudad }), etiqueta };
  if (alta === "lugar") return { href: enlaceAltaLugar({ nombre, lat: punto?.lat.toFixed(6), lng: punto?.lng.toFixed(6) }), etiqueta };
  return { href: enlaceAltaArtista({ ciudad: conCiudad ? ciudad : null, nombre }), etiqueta };
}

/**
 * Lo que puede llevar el alta de evento por pasos (OL-312): el lugar desde cuya ficha se publica («Publicar aquí»), el artista desde la suya
 * («Publicar fecha»), el evento que se duplica (`desde`) y la ciudad que se veía.
 */
export type ConsultaAltaEvento = { lugar?: string | null; artista?: string | null; desde?: string | null; ciudad?: string | null };

/** La dirección del alta de evento por pasos con lo que ya se sabe, en un orden fijo; lo vacío no va. */
export function enlaceAltaEvento({ lugar, artista, desde, ciudad }: ConsultaAltaEvento = {}): string {
  const consulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries({ lugar, artista, desde, ciudad })) if (valor) consulta.set(clave, valor);
  return `/nuevo/evento${consulta.size ? `?${consulta}` : ""}`;
}

/**
 * Lo que puede llevar el alta de lugar por pasos (OL-315): la ciudad que se veía (acerca la búsqueda y, a menos de 50 km, es la ciudad del
 * lugar si el mapa no la da), el nombre que se buscó y no se encontró y el punto donde se sostuvo el dedo en el mapa de Lugares.
 */
export type ConsultaAltaLugar = { ciudad?: string | null; nombre?: string | null; lat?: string | null; lng?: string | null };

/** La dirección del alta de lugar por pasos con lo que ya se sabe, en un orden fijo; lo vacío no va. */
export function enlaceAltaLugar({ ciudad, nombre, lat, lng }: ConsultaAltaLugar = {}): string {
  const consulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries({ ciudad, nombre, lat, lng })) if (valor) consulta.set(clave, valor);
  return `/nuevo/lugar${consulta.size ? `?${consulta}` : ""}`;
}

/**
 * Lo que puede llevar el alta de artista por pasos (OL-316): la ciudad que se veía (la del artista de entrada; se cambia en «Revisa») y el
 * nombre que se buscó y no se encontró (Buscar).
 */
export type ConsultaAltaArtista = { ciudad?: string | null; nombre?: string | null };

/** La dirección del alta de artista por pasos con lo que ya se sabe, en un orden fijo; lo vacío no va. */
export function enlaceAltaArtista({ ciudad, nombre }: ConsultaAltaArtista = {}): string {
  const consulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries({ ciudad, nombre })) if (valor) consulta.set(clave, valor);
  return `/nuevo/artista${consulta.size ? `?${consulta}` : ""}`;
}

/**
 * A dónde llevan «Lugar» y «Artista» en la tira del primer paso de un alta (OL-313): cada uno a su alta por pasos (OL-315 y OL-316), los
 * dos con la ciudad que se veía. El lugar también la lleva (a diferencia del «+» de Lugares, que se ubica por su punto): su alta la usa para
 * acercar la búsqueda.
 */
export function enlaceAltaDeTipo(tipo: "lugar" | "artista", ciudad: string | null): string {
  return tipo === "lugar" ? enlaceAltaLugar({ ciudad }) : enlaceAltaArtista({ ciudad });
}

/**
 * `/nuevo` ya no es una pantalla (OL-316): cada tipo tiene su alta por pasos. Sin tipo, con `tipo=evento` (o lo que no es un tipo) o con un
 * evento ya armado (`lugar`, `artista`, `desde`, que antes abrían solo como evento), la dirección del alta de evento con los mismos datos
 * (OL-312); con `tipo=lugar`, la del lugar con la ciudad, el nombre y el punto (OL-315); con `tipo=artista`, la del artista con la ciudad y el
 * nombre. La responde el proxy con un 308.
 */
export function redireccionDeNuevo({ tipo, nombre, lat, lng, ...consulta }: ConsultaAltaEvento & Omit<ConsultaAltaLugar, "ciudad"> & { tipo?: string | null }): string {
  const armado = !!(consulta.desde || consulta.lugar || consulta.artista);
  const alta = altaDeParametro(tipo ?? undefined);
  if (armado || alta === "evento") return enlaceAltaEvento(consulta);
  return alta === "lugar" ? enlaceAltaLugar({ ciudad: consulta.ciudad, nombre, lat, lng }) : enlaceAltaArtista({ ciudad: consulta.ciudad, nombre });
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
