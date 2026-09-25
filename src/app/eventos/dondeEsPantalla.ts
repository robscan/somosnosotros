/**
 * Lógica pura de la pantalla completa "¿Dónde es?" (OL-173, docs/rediseno/43; lugar privado de OL-179): sin red ni
 * DOM, para poder probarla sin levantar Mapbox ni React. Tres piezas: el orden de la lista flotante (lugares
 * registrados primero, luego lo que trae Mapbox), qué guarda "Agregar lugar" según el interruptor "Es un lugar
 * privado" (`decidirGuardado`), y dónde va la barra de acciones -un solo botón, "Agregar lugar"- sticky sobre el
 * teclado o al pie, usando `visualViewport` cuando existe.
 */
import type { LugarSugerido } from "@/lib/buscarLugares";
import type { Punto } from "@/lib/geo";
import { normalizarNombre, type LugarResumen } from "@/lib/lugares";

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

/**
 * ¿"¿Dónde es?" se abrió con una dirección ya leída (del cartel o de una sugerencia) pero sin punto? (OL-187).
 * Bug del founder: "se leyó bien la dirección, pidió confirmar y seguía estando bien la dirección con el nombre
 * escritos en campo, pero no permitía seleccionar listo, el pin no se colocó" -nadie disparaba la búsqueda de esa
 * misma dirección, así que `puedeGuardarLugar`/"Listo" se quedaban apagados para siempre sin que la persona
 * volviera a escribir. Solo aplica al origen "manual": un lugar YA REGISTRADO siempre trae su punto puesto al
 * elegirlo (`elegirLugarLista`), nunca llega aquí sin él.
 */
export function necesitaConfirmarDireccion(draft: { origen: "lugar" | "manual"; punto: Punto | null; direccion: string } | null): boolean {
  return !!draft && draft.origen === "manual" && draft.punto === null && draft.direccion.trim().length > 0;
}

function direccionDe(r: ResultadoBusqueda): string {
  return (r.tipo === "lugar" ? r.lugar.direccion : r.item.direccion) ?? "";
}

/**
 * ¿Hay una sola coincidencia clara entre lugares registrados y lo que trae Mapbox para la dirección leída del
 * cartel (OL-187)? Con exactamente un resultado se fija solo -sigue siendo una búsqueda real de esa misma
 * dirección, nunca un punto inventado (regla de OL-182)-.
 *
 * Con más de uno (revisión del gestor sobre el primer arreglo: Mapbox casi siempre trae varias sugerencias para
 * una dirección con número -una exacta y otras de la misma calle en otra colonia o con otro número cerca-, así
 * que exigir "exactamente una" dejaba el caso real del founder sin fijarse solo), se acepta el PRIMER resultado
 * cuya dirección -normalizada con `normalizarNombre` (sin acentos, minúsculas, sin puntuación, espacios
 * colapsados), igual que ya compara `lugaresPorTexto`- EMPIEZA por la calle y el número de la dirección leída (la
 * parte antes de la primera coma). Sin un número en esa parte (una dirección sin número, o sin coma reconocible),
 * o si ninguna coincide así, no se fija nada -la persona elige con un toque de la lista, que ya queda abierta.
 */
export function coincidenciaClara(combinados: readonly ResultadoBusqueda[], direccionLeida = ""): ResultadoBusqueda | null {
  if (combinados.length === 1) return combinados[0];
  const calleYNumero = direccionLeida.split(",")[0] ?? "";
  if (!/\d/.test(calleYNumero)) return null;
  const prefijo = normalizarNombre(calleYNumero);
  if (!prefijo) return null;
  return combinados.find((r) => normalizarNombre(direccionDe(r)).startsWith(prefijo)) ?? null;
}
