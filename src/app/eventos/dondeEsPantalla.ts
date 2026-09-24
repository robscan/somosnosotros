/**
 * Lógica pura de la pantalla completa "¿Dónde es?" (OL-173, docs/rediseno/43; lugar privado de OL-179): sin red ni
 * DOM, para poder probarla sin levantar Mapbox ni React. Tres piezas: el orden de la lista flotante (lugares
 * registrados primero, luego lo que trae Mapbox), qué guarda "Agregar lugar" según el interruptor "Es un lugar
 * privado" (`decidirGuardado`), y dónde va la barra de acciones -un solo botón, "Agregar lugar"- sticky sobre el
 * teclado o al pie, usando `visualViewport` cuando existe.
 */
import type { LugarSugerido } from "@/lib/buscarLugares";
import type { Punto } from "@/lib/geo";
import type { LugarResumen } from "@/lib/lugares";

export type ResultadoLugarRegistrado = { tipo: "lugar"; lugar: LugarResumen };
export type ResultadoMapbox = { tipo: "mapbox"; item: LugarSugerido };
export type ResultadoBusqueda = ResultadoLugarRegistrado | ResultadoMapbox;

/**
 * Lugares registrados primero (el directorio manda), luego lo que trae Mapbox (docs/rediseno/43, paso 2): ninguna
 * lista se reordena entre sí, solo se concatenan — cada una ya viene en su propio orden (`lugaresPorTexto` filtra
 * el directorio; `sugerirLugares`/`buscarConContexto` ya ordenan lo de Mapbox por relevancia y cercanía).
 */
export function combinarResultados(lugares: readonly LugarResumen[], mapbox: readonly LugarSugerido[]): ResultadoBusqueda[] {
  return [...lugares.map((lugar): ResultadoLugarRegistrado => ({ tipo: "lugar", lugar })), ...mapbox.map((item): ResultadoMapbox => ({ tipo: "mapbox", item }))];
}

export type ModoPantalla = "inicial" | "resultados" | "no-encontrado" | "agregar";

/** Qué se muestra bajo el campo: nada al abrir, la lista con resultados, el aviso "no está registrado", o el panel "Agregar lugar". */
export function modoDePantalla(texto: string, panelAgregar: boolean, hayResultados: boolean): ModoPantalla {
  if (panelAgregar) return "agregar";
  if (!texto.trim()) return "inicial";
  return hayResultados ? "resultados" : "no-encontrado";
}

export type DecisionGuardado = {
  /** "registrar": lugar de verdad, ficha pública, visible en Lugares. "privado": también se registra (OL-179,
   *  founder 2026-09-24: "si lo marca como privado sí se guarda"), pero con `privado = true` -sin ficha pública, y
   *  el EVENTO que lo usa se guarda como sitio reservado, no por `lugar_id` (ver `HojaDondeEs.tsx`). */
  modo: "registrar" | "privado";
  nombre: string;
  direccion: string;
};

/**
 * Qué hace "Guardar y usar este lugar" (docs/rediseno/43, paso 6; OL-179): registrar, con o sin privado según el
 * interruptor "Es un lugar privado". El nombre y la dirección se recortan aquí (la validación de verdad, del lado
 * del servidor, vuelve a limpiarlos igual que cualquier alta de lugar).
 */
export function decidirGuardado(privado: boolean, nombre: string, direccion: string): DecisionGuardado {
  return { modo: privado ? "privado" : "registrar", nombre: nombre.trim(), direccion: direccion.trim() };
}

/**
 * Alto del teclado en píxeles, tal como lo mide `visualViewport` (iOS): la ventana completa menos el área visible
 * y su desplazamiento. Sin `visualViewport` (navegador que no lo da), 0: la barra se queda al pie, como pide el
 * punto 5 del encargo ("si no hay visualViewport, al pie").
 */
export function altoTeclado(altoVentana: number, visualViewport: { height: number; offsetTop: number } | null): number {
  if (!visualViewport) return 0;
  const oculto = altoVentana - visualViewport.height - visualViewport.offsetTop;
  return oculto > 1 ? Math.round(oculto) : 0;
}

/**
 * ¿Puede guardarse el lugar que se está agregando? (OL-182, doc 43 segunda versión — dos defectos reportados por
 * el founder en producción: la hoja "Agregar lugar" guardaba un punto inventado, y su botón a veces no hacía
 * nada). Hace falta un nombre Y un punto de verdad -nunca un pin inventado en silencio en el centro de contexto-;
 * el botón "Guardar y usar este lugar" queda apagado mientras `punto` sea `null`, con el porqué en texto chico
 * debajo ("Falta la ubicación…").
 */
export function puedeGuardarLugar({ nombre, punto }: { nombre: string; punto: Punto | null }): boolean {
  return nombre.trim().length > 0 && punto !== null;
}

/**
 * Qué dirección guardar al tocar "Guardar y usar este lugar" (OL-182, corrección del gestor sobre la entrega de
 * código: `guardarAgregar` tomaba solo la dirección YA RESUELTA -por una sugerencia o el reverse geocoding del
 * pin- e ignoraba que la persona la hubiera corregido a mano en el campo "Dirección", editable desde el doc 43).
 * Lo escrito manda; si está vacío o el reverse geocoding todavía no terminó ("Ubicando…"), se usa la resuelta.
 */
export function direccionAGuardar(texto: string, resuelta: string): string {
  const escrito = texto.trim();
  return escrito && escrito !== "Ubicando…" ? escrito : resuelta;
}
