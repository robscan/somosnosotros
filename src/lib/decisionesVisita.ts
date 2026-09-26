/**
 * Recuerdo de las decisiones de esta visita (OL-222, bitácora 251): Next reutiliza una página ya vista hasta 60 s
 * (`experimental.staleTimes.dynamic`, bitácora 043) y siempre con Atrás/Adelante (nunca vuelve a pedirla), y desde
 * el PR #257 (OL-212, tercera vuelta) guardar Voy/Me interesa/Seguir desde una lista aplaza su `revalidatePath` con
 * `after()` para no repintar la pantalla desde la que se guarda. Esa página vieja, al volver a verla, no sabe nada
 * de lo decidido después: «Tus planes» seguía mostrando un evento ya quitado, con su check y todo.
 *
 * Mismo estilo que `lib/memoriaPantalla.ts`: sessionStorage (muere con la pestaña, nunca sale del teléfono), con
 * `Almacen` inyectable para las pruebas y try/catch en cada acceso (modo privado o almacenamiento bloqueado: sin
 * memoria, sin romper nada). Una sola entrada, con la cuenta que decidió adentro: si otra cuenta entra en la misma
 * pestaña (o nadie cerró sesión de verdad), lo de la cuenta anterior no aplica — se trata como si no hubiera nada.
 *
 * Cómo se corrige (decisión de este operador, ver bitácora 251): en vez de pasarle a cada lista la hora en que el
 * servidor armó la página —tocaría `CarrilTusPlanes`, `CarrilAgenda`, cada ficha, Agenda, Artistas y también
 * Lugares/`VistaLugares`, fuera de esta pieza—, cada decisión guardada se compara contra lo que trae el servidor:
 * si ya coincide, la página está al día y la decisión se limpia (ya no hace falta); si no coincide, manda la
 * decisión. Así ninguna pantalla ni componente nuevo tiene que enterarse de esto — los dos hooks (`useAsistenciaEnLista`,
 * `useSeguirEnLista`) lo resuelven solos y todo el que ya los use queda corregido, incluida Lugares. Límite conocido:
 * si otro dispositivo cambiara la misma decisión antes de que el servidor la reflejara aquí, esta pestaña tardaría en
 * verlo (se queda con lo decidido aquí hasta que el servidor coincida) — más seguro que el bug de hoy, que siempre
 * muestra lo viejo.
 *
 * «Tus planes al instante» (OL-224, bitácora 253): además de corregir el estado, ahora `guardarDecisionAsistencia`
 * puede guardar junto con la decisión una foto mínima de la tarjeta (`TarjetaConFecha`, lo que ya arma `tarjetaEvento`)
 * y `tarjetasTusPlanes` la agrega a lo que trae el servidor cuando el evento decidido (Voy o Me interesa, futuro, y
 * que el servidor todavía no incluye) no estaba en «Tus planes» — así aparece ahí sin esperar a la próxima visita,
 * en cualquier fila de Inicio donde se haya decidido. Para que la fila de «Tus planes» se entere aunque la decisión
 * se haya guardado desde OTRA fila (otro componente, mismo render de la página), `suscribirseDecisionesVisita` +
 * `crudoDecisionesVisita` exponen este módulo como un external store de `useSyncExternalStore` (mismo patrón que
 * `lib/avisoSalida.ts`): cada escritura avisa, y quien esté suscrito vuelve a pintar.
 *
 * Una decisión con tarjeta no la borra `limpiarAsistenciasResueltas` aunque el estado ya coincida (bug real, visto
 * al reproducir con Chrome real: ir a Agenda con datos frescos y volver a Inicio, todavía con su copia vieja de 60 s,
 * la borraba antes de que «Tus planes» llegara a usarla) — la borra `limpiarTarjetasTusPlanesResueltas`, y solo
 * cuando la propia fila de «Tus planes» recibe una lista fresca que ya trae ese evento.
 */

import { compararEventos } from "./agenda";
import type { Asistencia } from "./deslizar";
import type { TarjetaConFecha } from "./destacados";
import { eventoPaso } from "./fechas";

export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type Decidido<V> = { valor: V; hora: number };
/** Además del valor, la tarjeta mínima de ese evento (solo si ya se guardó una vez, OL-224): con ella, `tarjetasTusPlanes`
 *  puede agregarla a «Tus planes» sin volver a pedirle nada al servidor. */
type DecididoAsistencia = Decidido<Asistencia> & { tarjeta?: TarjetaConFecha };
type Datos = {
  cuenta: string;
  asistencia: Record<string, DecididoAsistencia>;
  seguirLugar: Record<string, Decidido<boolean>>;
  seguirArtista: Record<string, Decidido<boolean>>;
};

const CLAVE = "somosnosotros:visita";

function vacio(cuenta: string): Datos {
  return { cuenta, asistencia: {}, seguirLugar: {}, seguirArtista: {} };
}

function almacenDelNavegador(): Almacen | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null; // modo privado o almacenamiento bloqueado: sin memoria, sin romper nada
  }
}

/** Lo guardado, si es de esta cuenta; si no (u otra cuenta, o no hay nada, o está roto), como si no hubiera nada. */
function leer(cuenta: string, almacen: Almacen | null): Datos {
  if (!almacen) return vacio(cuenta);
  try {
    const crudo = almacen.getItem(CLAVE);
    if (!crudo) return vacio(cuenta);
    const d = JSON.parse(crudo) as Partial<Datos> | null;
    if (!d || typeof d !== "object" || d.cuenta !== cuenta) return vacio(cuenta);
    return { cuenta, asistencia: d.asistencia ?? {}, seguirLugar: d.seguirLugar ?? {}, seguirArtista: d.seguirArtista ?? {} };
  } catch {
    return vacio(cuenta);
  }
}

function escribir(datos: Datos, almacen: Almacen | null): void {
  if (!almacen) return;
  try {
    almacen.setItem(CLAVE, JSON.stringify(datos));
  } catch {
    return; // no se guardó nada: no hay cambio que avisar
  }
  notificarCambioDecisionesVisita();
}

/**
 * Voy, Me interesa o quitar (`null`) en un evento, decidido ahora mismo desde una lista. `tarjeta` (OL-224, bitácora
 * 253, opcional): la foto mínima de esa tarjeta, para poder agregarla a «Tus planes» sin el servidor — solo hace
 * falta al decidir Voy o Me interesa (al quitar, `null`, no se manda). Si esta vez no llega (por ejemplo, la ficha de
 * un lugar que no arma tarjetas, o un Deshacer que vuelve a llamar sin ella) pero ya había una guardada, se conserva
 * tal cual: ni cambiar de Voy a Me interesa ni quitar y luego deshacer sin una tarjeta fresca deben perder la que ya
 * se tenía — quitar la deja «dormida» junto con el `null` (inofensiva: `tarjetasTusPlanes` nunca agrega una decisión
 * en `null`) por si un Deshacer posterior la vuelve a necesitar.
 */
export function guardarDecisionAsistencia(cuenta: string, eventoId: string, valor: Asistencia, almacen: Almacen | null = almacenDelNavegador(), tarjeta: TarjetaConFecha | null = null): void {
  if (!cuenta) return;
  const datos = leer(cuenta, almacen);
  const tarjetaFinal = tarjeta ?? datos.asistencia[eventoId]?.tarjeta;
  datos.asistencia[eventoId] = tarjetaFinal ? { valor, hora: Date.now(), tarjeta: tarjetaFinal } : { valor, hora: Date.now() };
  escribir(datos, almacen);
}

/** Seguir o dejar de seguir un lugar o artista, decidido ahora mismo desde una lista. */
export function guardarDecisionSeguir(cuenta: string, que: "lugar" | "artista", id: string, valor: boolean, almacen: Almacen | null = almacenDelNavegador()): void {
  if (!cuenta) return;
  const datos = leer(cuenta, almacen);
  const mapa = que === "lugar" ? datos.seguirLugar : datos.seguirArtista;
  mapa[id] = { valor, hora: Date.now() };
  escribir(datos, almacen);
}

/**
 * Lo que dio el servidor (`decididas`/`asistencias` de la lista), corregido con las decisiones de esta visita que
 * el servidor todavía no refleje. Sin sesión (`servidor` null) no hay nada que corregir. Puro: no toca el almacén.
 */
export function corregirAsistencias(cuenta: string | null, servidor: Record<string, Asistencia> | null, almacen: Almacen | null = almacenDelNavegador()): Record<string, Asistencia> | null {
  if (!cuenta || !servidor) return servidor;
  const datos = leer(cuenta, almacen);
  let corregido = servidor;
  for (const [id, decidido] of Object.entries(datos.asistencia)) {
    const actual = servidor[id] ?? null;
    if (actual === decidido.valor) continue; // el servidor ya lo refleja
    if (corregido === servidor) corregido = { ...servidor };
    corregido[id] = decidido.valor;
  }
  return corregido;
}

/** Lo mismo que `corregirAsistencias`, para `iniciales` (los ids que sigue) de lugares o artistas. */
export function corregirSeguidos(cuenta: string | null, que: "lugar" | "artista", servidor: string[] | null, almacen: Almacen | null = almacenDelNavegador()): string[] | null {
  if (!cuenta || !servidor) return servidor;
  const datos = leer(cuenta, almacen);
  const mapa = que === "lugar" ? datos.seguirLugar : datos.seguirArtista;
  const entradas = Object.entries(mapa);
  if (entradas.length === 0) return servidor;
  const conjunto = new Set(servidor);
  let cambio = false;
  for (const [id, decidido] of entradas) {
    if (conjunto.has(id) === decidido.valor) continue; // el servidor ya lo refleja
    cambio = true;
    if (decidido.valor) conjunto.add(id);
    else conjunto.delete(id);
  }
  return cambio ? [...conjunto] : servidor;
}

/**
 * Llegó una foto nueva del servidor (de cualquier pantalla: Agenda, una ficha, Mi perfil…): lo que ya coincide se
 * limpia, para no seguir corrigiendo con eso ni dejarlo tirado. Una decisión con tarjeta (OL-224, bitácora 253) no
 * se borra aquí aunque el estado ya coincida: esa tarjeta la sigue necesitando «Tus planes» mientras SU PROPIA
 * página siga mostrando la copia vieja (`staleTimes`, hasta 60 s, o Atrás) — esta pantalla que llama aquí no tiene
 * forma de saber si esa otra ya se enteró. La borra `limpiarTarjetasTusPlanesResueltas`, cuando la propia fila lo
 * confirma.
 */
export function limpiarAsistenciasResueltas(cuenta: string | null, servidor: Record<string, Asistencia> | null, almacen: Almacen | null = almacenDelNavegador()): void {
  if (!cuenta || !servidor) return;
  const datos = leer(cuenta, almacen);
  let cambio = false;
  for (const [id, decidido] of Object.entries(datos.asistencia)) {
    if ((servidor[id] ?? null) === decidido.valor && !decidido.tarjeta) {
      delete datos.asistencia[id];
      cambio = true;
    }
  }
  if (cambio) escribir(datos, almacen);
}

/** Lo mismo que `limpiarAsistenciasResueltas`, para Seguir. */
export function limpiarSeguidosResueltos(cuenta: string | null, que: "lugar" | "artista", servidor: string[] | null, almacen: Almacen | null = almacenDelNavegador()): void {
  if (!cuenta || !servidor) return;
  const datos = leer(cuenta, almacen);
  const mapa = que === "lugar" ? datos.seguirLugar : datos.seguirArtista;
  const conjunto = new Set(servidor);
  let cambio = false;
  for (const [id, decidido] of Object.entries(mapa)) {
    if (conjunto.has(id) === decidido.valor) {
      delete mapa[id];
      cambio = true;
    }
  }
  if (cambio) escribir(datos, almacen);
}

/** Al cerrar sesión (`BotonSalir`): el recuerdo es de la cuenta que se fue, no de quien entre después en la misma pestaña. */
export function borrarDecisionesVisita(almacen: Almacen | null = almacenDelNavegador()): void {
  if (!almacen) return;
  try {
    almacen.removeItem(CLAVE);
  } catch {
    return;
  }
  notificarCambioDecisionesVisita();
}

/**
 * «Tus planes» con lo decidido en esta visita, agregado a lo que trae el servidor (OL-224, bitácora 253): tocar Voy o
 * Me interesa en cualquier fila de Inicio guarda ahí mismo la tarjeta (`guardarDecisionAsistencia`); aquí se agrega
 * al final, en su lugar por fecha, solo si el servidor todavía no la trae — una página fresca que ya la incluya
 * manda (su foto, su «N van» y su fecha son las buenas, la del recuerdo se descarta) — y solo si el evento decidido
 * sigue vigente (`eventoPaso`, igual que el resto de la app). Quitar (`null`) nunca agrega nada. Puro: no toca el
 * almacén ni lo escribe.
 */
export function tarjetasTusPlanes(cuenta: string | null, servidor: TarjetaConFecha[], ahora: Date = new Date(), almacen: Almacen | null = almacenDelNavegador()): TarjetaConFecha[] {
  if (!cuenta) return servidor;
  const datos = leer(cuenta, almacen);
  const enServidor = new Set(servidor.map((t) => t.id));
  const agregadas: TarjetaConFecha[] = [];
  for (const [id, decidido] of Object.entries(datos.asistencia)) {
    if (decidido.valor === null || enServidor.has(id) || !decidido.tarjeta) continue;
    if (eventoPaso(decidido.tarjeta.inicio, decidido.tarjeta.fin, ahora, decidido.tarjeta.zona)) continue;
    agregadas.push(decidido.tarjeta);
  }
  if (agregadas.length === 0) return servidor;
  return [...servidor, ...agregadas].toSorted(compararEventos);
}

/**
 * La propia fila de «Tus planes» recibió una lista fresca del servidor que ya trae un evento con tarjeta guardada
 * (OL-224, bitácora 253): esa tarjeta ya no hace falta (la real, con su foto y su «N van» al día, la reemplaza) y se
 * borra junto con su decisión — a diferencia de `limpiarAsistenciasResueltas` (que cualquier pantalla dispara y por
 * eso nunca toca una decisión con tarjeta), esta la dispara solo `CarrilEventosCliente` cuando `tusPlanes` es cierto,
 * así que "está en esta lista" es la confirmación correcta: nadie más la necesita para esto.
 */
export function limpiarTarjetasTusPlanesResueltas(cuenta: string | null, servidor: TarjetaConFecha[] | null, almacen: Almacen | null = almacenDelNavegador()): void {
  if (!cuenta || !servidor) return;
  const datos = leer(cuenta, almacen);
  const enServidor = new Set(servidor.map((t) => t.id));
  let cambio = false;
  for (const [id, decidido] of Object.entries(datos.asistencia)) {
    if (decidido.tarjeta && enServidor.has(id)) {
      delete datos.asistencia[id];
      cambio = true;
    }
  }
  if (cambio) escribir(datos, almacen);
}

type Escucha = () => void;
const escuchas = new Set<Escucha>();

/**
 * Para leer con `useSyncExternalStore` (Tus planes, OL-224, bitácora 253; mismo patrón que `lib/avisoSalida.ts`):
 * vuelve a pintar esa fila cuando OTRA fila de Inicio (otro componente, mismo render de la página) guarda una
 * decisión en esta visita, sin `useEffect` + `setState`.
 */
export function suscribirseDecisionesVisita(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => {
    escuchas.delete(escucha);
  };
}

function notificarCambioDecisionesVisita(): void {
  escuchas.forEach((escucha) => escucha());
}

/** El texto crudo del recuerdo, para el `getSnapshot` de `useSyncExternalStore`: cambia con cualquier escritura de
 *  esta visita (a cualquier cuenta); en el servidor, o sin almacén, siempre "". */
export function crudoDecisionesVisita(almacen: Almacen | null = almacenDelNavegador()): string {
  if (!almacen) return "";
  try {
    return almacen.getItem(CLAVE) ?? "";
  } catch {
    return "";
  }
}
