/**
 * Lógica pura de la hoja «Dónde» (`components/HojaDonde`), la misma para «¿Dónde es?» del alta de evento (OL-173, OL-179,
 * OL-182 y OL-187, docs/rediseno/43) y «¿Dónde está?» del alta de lugar (OL-211): sin red ni DOM, para poder probarla sin
 * Mapbox ni React. Lo genérico de la pantalla (`combinarResultados`, `modoDePantalla`, `altoTeclado`) vive en
 * `@/lib/buscarLugares`. Aquí, en tres bloques: 1. Para qué se abre y el pin en construcción · 2. Lo del evento: qué guarda
 * «Agregar lugar» y la dirección leída del cartel · 3. Lo del lugar: avisar «ya existe» y el contexto de la búsqueda.
 */
import { combinarResultados, lugaresPorTexto, type LugarSugerido, type ResultadoBusqueda } from "@/lib/buscarLugares";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import { ciudadDeContexto, type ContextoDireccion } from "@/lib/direccionContexto";
import type { ModoSitio, OtroSitio } from "@/lib/eventos";
import { distanciaKm } from "@/lib/geo";
import type { Punto } from "@/lib/geo";
import { normalizarNombre, type LugarResumen } from "@/lib/lugares";

/* ---------------------------------------------------------------------------------------------------------------
   1. Para qué se abre y el pin en construcción
   --------------------------------------------------------------------------------------------------------------- */

/**
 * Para qué se abre la hoja: fijar el sitio de un evento o el punto de un lugar. Es la misma pantalla (campo, mapa, «Estoy
 * aquí», resumen del pin); solo cambian tres cosas, y las tres son del evento:
 * - Tocar un lugar registrado lo elige. Para un lugar solo avisa «ya existe» y lleva a su ficha (founder, OL-211: «sirven
 *   para avisar, no para elegirlos»: aquí se está creando o corrigiendo ESTE lugar).
 * - El sitio lleva nombre (el del lugar registrado, o el que se le pone a un pin suelto). El punto de un lugar no: su nombre
 *   vive en el formulario de fuera.
 * - Se puede registrar un lugar nuevo ahí mismo («Agregar lugar»).
 */
export type ParaQue = "evento" | "lugar";

/** El pin en construcción: viene de un lugar registrado (fijo) o de cualquier otro punto (nombre editable, solo en un evento). */
export type Borrador = {
  origen: "lugar" | "manual";
  nombre: string;
  direccion: string;
  punto: Punto | null;
  lugarId?: string;
  /** Solo cuando «Agregar lugar» acaba de crear uno de verdad y todavía no está en `lugares` (el primer pintado de la página). */
  lugarNuevo?: LugarResumen;
  /** El lugar elegido (registrado o recién creado) es privado: «Listo» lo guarda como sitio reservado, nunca por `lugar_id`
   *  (OL-179, founder 2026-09-24: «solo lo ve él»). Solo tiene sentido con `origen: "lugar"`. */
  privado?: boolean;
  /** Un sitio manual que debe guardarse como reservado (el panel «Agregar lugar» con el interruptor de privado encendido,
   *  sin que hubiera un lugar público parecido). Solo tiene sentido con `origen: "manual"`. */
  reservado?: boolean;
  editable: boolean;
  ciudad: string | null;
};

/**
 * El pin con el que abre la hoja de un evento: el lugar registrado que ya se eligió (fijo), el sitio suelto que ya se puso
 * (con su nombre, editable) o nada todavía.
 */
export function borradorDeEvento(modoSitio: ModoSitio, lugarId: string, otro: OtroSitio, lugares: readonly LugarResumen[]): Borrador | null {
  if (modoSitio === "lugar") {
    const l = lugares.find((x) => x.id === lugarId);
    return l ? { origen: "lugar", nombre: l.nombre, direccion: l.direccion ?? "", punto: { lat: l.lat, lng: l.lng }, lugarId: l.id, privado: l.privado === true, editable: false, ciudad: null } : null;
  }
  const punto = otro.reservado ? otro.privadoPunto : otro.sitioPunto;
  const direccion = otro.reservado ? otro.direccionPrivada : (otro.direccion ?? "");
  const nombre = otro.sitioTexto;
  if (!nombre.trim() && !direccion.trim() && !punto) return null;
  return { origen: "manual", nombre, direccion, punto, editable: true, ciudad: otro.ciudad };
}

/** El pin con el que abre la hoja de un lugar: el que ya tenga (al editar, o al volver a «Cambiar») o ninguno; sin nombre. */
export function borradorDeLugar(punto: Punto | null, direccion: string, ciudad: string): Borrador {
  return { origen: "manual", nombre: "", direccion, punto, editable: false, ciudad: ciudad || null };
}

/**
 * ¿Se puede tocar «Listo»? Hace falta un punto de verdad. En un evento, además, un nombre (el del lugar registrado ya lo
 * trae) y que no esté abierto el panel «Agregar lugar», que tiene su propio botón. En un lugar basta el punto.
 */
export function puedeListo(para: ParaQue, borrador: Pick<Borrador, "origen" | "nombre" | "punto"> | null, panelAgregar: boolean): boolean {
  if (!borrador?.punto) return false;
  if (para === "lugar") return true;
  return !panelAgregar && (borrador.origen === "lugar" || borrador.nombre.trim().length > 0);
}

/* ---------------------------------------------------------------------------------------------------------------
   2. Lo del evento
   --------------------------------------------------------------------------------------------------------------- */

export type DecisionGuardado = {
  /** "registrar": lugar de verdad, ficha pública, visible en Lugares. "privado": también se registra (OL-179,
   *  founder 2026-09-24: «si lo marca como privado sí se guarda»), pero con `privado = true` -sin ficha pública, y
   *  el EVENTO que lo usa se guarda como sitio reservado, no por `lugar_id` (ver `HojaDonde.tsx`). */
  modo: "registrar" | "privado";
  nombre: string;
  direccion: string;
};

/**
 * Qué hace «Guardar y usar este lugar» (docs/rediseno/43, paso 6; OL-179): registrar, con o sin privado según el
 * interruptor «Es un lugar privado». El nombre y la dirección se recortan aquí (la validación de verdad, del lado
 * del servidor, vuelve a limpiarlos igual que cualquier alta de lugar).
 */
export function decidirGuardado(privado: boolean, nombre: string, direccion: string): DecisionGuardado {
  return { modo: privado ? "privado" : "registrar", nombre: nombre.trim(), direccion: direccion.trim() };
}

/**
 * ¿Puede guardarse el lugar que se está agregando? (OL-182, doc 43 segunda versión — dos defectos reportados por
 * el founder en producción: la hoja «Agregar lugar» guardaba un punto inventado, y su botón a veces no hacía
 * nada). Hace falta un nombre Y un punto de verdad -nunca un pin inventado en silencio en el centro de contexto-;
 * el botón «Guardar y usar este lugar» queda apagado mientras `punto` sea `null`, con el porqué en texto chico
 * debajo («Falta la ubicación…»).
 */
export function puedeGuardarLugar({ nombre, punto }: { nombre: string; punto: Punto | null }): boolean {
  return nombre.trim().length > 0 && punto !== null;
}

/**
 * Qué dirección guardar al tocar «Guardar y usar este lugar» (OL-182, corrección del gestor sobre la entrega de
 * código: `guardarAgregar` tomaba solo la dirección YA RESUELTA -por una sugerencia o el reverse geocoding del
 * pin- e ignoraba que la persona la hubiera corregido a mano en el campo «Dirección», editable desde el doc 43).
 * Lo escrito manda; si está vacío o el reverse geocoding todavía no terminó («Ubicando…»), se usa la resuelta.
 */
export function direccionAGuardar(texto: string, resuelta: string): string {
  const escrito = texto.trim();
  return escrito && escrito !== "Ubicando…" ? escrito : resuelta;
}

/**
 * ¿«¿Dónde es?» se abrió con una dirección ya leída (del cartel o de una sugerencia) pero sin punto? (OL-187).
 * Bug del founder: «se leyó bien la dirección, pidió confirmar y seguía estando bien la dirección con el nombre
 * escritos en campo, pero no permitía seleccionar listo, el pin no se colocó» -nadie disparaba la búsqueda de esa
 * misma dirección, así que `puedeGuardarLugar`/«Listo» se quedaban apagados para siempre sin que la persona
 * volviera a escribir. Solo aplica al origen «manual»: un lugar YA REGISTRADO siempre trae su punto puesto al
 * elegirlo, nunca llega aquí sin él.
 */
export function necesitaConfirmarDireccion(borrador: Pick<Borrador, "origen" | "punto" | "direccion"> | null): boolean {
  return !!borrador && borrador.origen === "manual" && borrador.punto === null && borrador.direccion.trim().length > 0;
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
 * que exigir «exactamente una» dejaba el caso real del founder sin fijarse solo), se acepta el PRIMER resultado
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

/* ---------------------------------------------------------------------------------------------------------------
   3. Lo del lugar
   --------------------------------------------------------------------------------------------------------------- */

/** Radio de «ya existe» (mismo umbral que la regla de los 150 m de `lugares/acciones.ts`, `lugares_parecidos`). */
export const RADIO_YA_EXISTE_M = 150;

/**
 * ¿Hay un lugar YA REGISTRADO a menos de 150 m del punto que se está fijando? A diferencia de `lugares_parecidos`
 * (que además exige el mismo nombre normalizado, para decidir si ALGO que se está guardando debe reutilizar un
 * registro existente), esta es solo una advertencia temprana mientras se elige la ubicación -no importa el nombre
 * que traiga el pin todavía-: los pines del mapa «sirven para avisar «ya existe» ... y llevar a su ficha, no para
 * elegirlos» (founder, OL-211). Con más de uno cerca, se avisa del más cercano.
 */
export function lugarCercano(lugares: readonly LugarResumen[], punto: Punto, radioM = RADIO_YA_EXISTE_M): LugarResumen | null {
  let mejor: { lugar: LugarResumen; distanciaM: number } | null = null;
  for (const l of lugares) {
    const distanciaM = distanciaKm(punto, { lat: l.lat, lng: l.lng }) * 1000;
    if (distanciaM < radioM && (!mejor || distanciaM < mejor.distanciaM)) mejor = { lugar: l, distanciaM };
  }
  return mejor?.lugar ?? null;
}

/**
 * El texto con el que arranca la búsqueda al abrir la pantalla desde «Buscar» (sin ubicación todavía): el nombre
 * ya escrito en el formulario, si lo hay (founder, OL-211: «el nombre del lugar puede ya venir escrito del
 * formulario») — así la primera búsqueda ya trae algo, en vez de obligar a escribirlo dos veces. Reabrir desde
 * «Cambiar» (ya hay ubicación) arranca con el campo vacío: no tiene sentido repetir la búsqueda que ya se resolvió.
 */
export function textoInicialBusqueda(nombreForm: string, yaUbicado: boolean): string {
  return yaUbicado ? "" : nombreForm.trim();
}

/**
 * El contexto para acercar la búsqueda de Mapbox (OL-100), en la misma cascada para las dos hojas: pin ya puesto → texto →
 * ciudad elegida → posición del teléfono → San Luis Potosí de respaldo. Sin la «ciudad elegida» (`ciudadContexto`), la
 * hoja se quedaba en el respaldo sin ninguna pista real casi siempre (nadie llega con el teléfono ya ubicado), y sin pista
 * real no hay `bbox` (`bboxParaContexto`): Mapbox buscaba en todo el país y devolvía sugerencias de otros estados (corrección
 * del gestor, revisión sobre el PR #249: «Laboratorio de Arte Escénico» traía Aguascalientes, Pachuca y CDMX). Con el pin YA
 * puesto (editando, o ya fijado en esta misma sesión) el propio punto manda.
 */
export function contextoDondeEsta(punto: Punto | null, q: string, ciudadContexto: Ciudad | null | undefined, yo: Punto | null, posicionTelefono: Punto | null): ContextoDireccion {
  if (punto) return { ciudad: CIUDAD_INICIAL, centro: punto, origen: "posicion" };
  return ciudadDeContexto({ texto: q, ciudadChip: ciudadContexto, posicion: yo ?? posicionTelefono });
}

/**
 * Los renglones de la lista flotante: lugares registrados que coinciden con el texto (comparación pura, sin red)
 * PRIMERO, luego lo que trae Mapbox (`combinarResultados`, docs/rediseno/43). Corrección del gestor (revisión sobre el
 * PR #249): un lugar registrado que coincide debe salir SIEMPRE, llegue o no algo de Mapbox (el `resultadosMapbox` que ya
 * haya, incluso vacío o con varios) nunca lo saca de la lista ni le quita el primer lugar.
 */
export function resultadosDondeEsta(lugares: readonly LugarResumen[], q: string, resultadosMapbox: readonly LugarSugerido[]): ResultadoBusqueda[] {
  const texto = q.trim();
  const lugaresFiltrados = texto ? lugaresPorTexto([...lugares], q) : [];
  const conTextoLargo = texto.length >= 3;
  return combinarResultados(lugaresFiltrados, conTextoLargo ? resultadosMapbox : []);
}
