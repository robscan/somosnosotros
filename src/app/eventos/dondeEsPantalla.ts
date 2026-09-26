/**
 * Lógica pura de la pantalla completa "¿Dónde es?" DEL ALTA DE EVENTO (OL-173, docs/rediseno/43; lugar privado de
 * OL-179): sin red ni DOM, para poder probarla sin levantar Mapbox ni React. Lo genérico de esta pantalla
 * (`combinarResultados`, `modoDePantalla`, `altoTeclado`) se movió a `@/lib/buscarLugares` en OL-211, compartido
 * con "Agregar lugar" (`src/app/lugares/HojaDondeLugar.tsx`) — re-exportado aquí para no romper nada que ya
 * importara de este archivo. Lo que sigue siendo solo del EVENTO: qué guarda "Agregar lugar" según el interruptor
 * "Es un lugar privado" (`decidirGuardado`), y la confirmación automática de una dirección ya leída del cartel
 * (OL-187).
 */
import type { ResultadoBusqueda } from "@/lib/buscarLugares";
import type { Punto } from "@/lib/geo";
import { normalizarNombre } from "@/lib/lugares";

export type { ModoPantalla, ResultadoLugarRegistrado, ResultadoMapbox, ResultadoBusqueda } from "@/lib/buscarLugares";
export { altoTeclado, combinarResultados, modoDePantalla } from "@/lib/buscarLugares";

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
