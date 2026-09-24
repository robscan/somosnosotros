/**
 * Lógica pura de la pantalla completa "¿Dónde es?" (OL-173, docs/rediseno/43): sin red ni DOM, para poder probarla
 * sin levantar Mapbox ni React. Tres piezas: el orden de la lista flotante (lugares registrados primero, luego lo
 * que trae Mapbox), la decisión de si "Agregar lugar" registra un lugar de verdad o lo guarda solo en el evento
 * ("Es un lugar privado, no registrarlo"), y dónde va la barra de acciones (variante B, sticky sobre el teclado o
 * al pie) usando `visualViewport` cuando existe.
 */
import type { LugarSugerido } from "@/lib/buscarLugares";
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
  /** "registrar": crea un lugar de verdad (ficha pública, visible en Lugares). "privado": solo queda en el evento. */
  modo: "registrar" | "privado";
  nombre: string;
  direccion: string;
};

/**
 * Qué hace "Guardar y usar este lugar" (docs/rediseno/43, paso 6): registrado salvo que la persona marque "Es un
 * lugar privado, no registrarlo". El nombre y la dirección se recortan aquí (la validación de verdad, del lado del
 * servidor, vuelve a limpiarlos igual que cualquier alta de lugar).
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
