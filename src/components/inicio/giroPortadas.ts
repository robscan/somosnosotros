import { useSyncExternalStore } from "react";
import { destinoDeGiro, giroQuerido, leerGiro, llego, suavizar, suscribirseGiro, traslaciones, type Postura } from "@/lib/giroPortadas";
import { leerPlataforma } from "@/lib/plataforma";

/**
 * El giro de las portadas del sistema en el teléfono (OL-375, P8 del prototipo firmado: `moverCapas`, `alOrientar`, `MAX_UNIDADES`). Uno solo
 * para toda la página: cada portada con figura se registra (`registrarPortada`) y el sensor (`deviceorientation`) solo se escucha si el giro está
 * encendido en este teléfono (la preferencia de Ajustes, sin «Reducir movimiento»), con la página a la vista (`visibilitychange`) y con alguna
 * portada en pantalla (`IntersectionObserver`). Cada lectura fija a dónde van las figuras desde la postura en que se activó; un cuadro de
 * `requestAnimationFrame` las acerca un quinto y se detiene al llegar. Solo cambia el `transform` de las dos capas de cada portada a la vista
 * (`data-capa`): nada más se repinta.
 */

type ConPermiso = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

function almacen(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const plataforma = () => leerPlataforma(navigator.userAgent, navigator.maxTouchPoints ?? 0, false);
const conPermiso = () => typeof DeviceOrientationEvent !== "undefined" && typeof (DeviceOrientationEvent as ConPermiso).requestPermission === "function";

/** ¿Hay giroscopio aquí? Un teléfono o una tableta que dé la orientación; en una computadora no (y el renglón de Ajustes ni sale). */
export function haySensorDeGiro(): boolean {
  if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") return false;
  return !plataforma().computadora;
}

/**
 * ¿Hay que pedir el permiso con un toque? En el iPhone y el iPad (WebKit: Safari, la web instalada y la app) sí: sin un toque, Safari no pregunta.
 * Chrome también trae `requestPermission`, pero nunca pregunta: devuelve el estado de su permiso de sensores, que en Android viene dado («granted»
 * en Chrome 154 de la Mac con Android imitado; «prompt» en el Chromium 153 de las pruebas, que no tiene a quién preguntar). En Android no se pide
 * nada: se escucha el giro y ya.
 */
export const pidePermisoDeGiro = (): boolean => conPermiso() && plataforma().ios;

/**
 * Pide el permiso del giroscopio del iPhone; true si lo dio (y donde no hay `requestPermission`). Desde un toque, el iPhone pregunta; sin toque,
 * solo responde si ya lo dio en esta sesión del navegador, sin preguntar nada. Nunca truena. La llamada sale antes del primer `await`: dentro del
 * toque. Solo para el iPhone (`pidePermisoDeGiro`): en Chrome el «prompt» no quiere decir que no.
 */
export async function pedirPermisoDeGiro(): Promise<boolean> {
  if (!conPermiso()) return true;
  try {
    return (await (DeviceOrientationEvent as ConPermiso).requestPermission!()) === "granted";
  } catch {
    return false;
  }
}

const reducirMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)");

/** ¿El giro está encendido en este teléfono? Hay giroscopio, no pide reducir el movimiento y la persona lo quiere (o no eligió y es Android). */
export function giroEncendido(): boolean {
  return haySensorDeGiro() && !reducirMovimiento().matches && giroQuerido(leerGiro(almacen()), pidePermisoDeGiro());
}

function suscribirse(escucha: () => void): () => void {
  const quitar = suscribirseGiro(escucha);
  const consulta = reducirMovimiento();
  consulta.addEventListener("change", escucha);
  return () => {
    quitar();
    consulta.removeEventListener("change", escucha);
  };
}

/** El giro encendido, para pintar (el recorte de la portada baja con él). En el servidor, apagado: ahí no se dibuja. */
export const useGiroEncendido = (): boolean => useSyncExternalStore(suscribirse, giroEncendido, () => false);

// ===== El sensor y el pintado: uno solo para la página.
const portadas = new Set<Element>();
const aLaVista = new Set<Element>();
let observador: IntersectionObserver | null = null;
let estado: "quieto" | "pidiendo" | "escuchando" = "quieto";
/** El iPhone no dio el permiso sin un toque en esta visita: no se vuelve a pedir hasta que cambie la preferencia (el toque de Ajustes). */
let sinPermiso = false;
let base: Postura | null = null;
let actual = { x: 0, y: 0 };
let destino = { x: 0, y: 0 };
let cuadro = 0;
let atento = false;

/** Corre las dos capas de una portada (`data-capa`: 1 atrás, 2 adelante); en (0, 0) les quita el `transform`, como al dibujarlas. */
function mover(portada: Element, x: number, y: number) {
  const t = x === 0 && y === 0 ? null : traslaciones(x, y);
  for (const capa of portada.querySelectorAll("[data-capa]")) {
    const valor = t ? (capa.getAttribute("data-capa") === "1" ? t.atras : t.delante) : null;
    if (capa.getAttribute("transform") === valor) continue;
    if (valor) capa.setAttribute("transform", valor);
    else capa.removeAttribute("transform");
  }
}

function paso() {
  cuadro = 0;
  actual = { x: suavizar(actual.x, destino.x), y: suavizar(actual.y, destino.y) };
  for (const portada of aLaVista) mover(portada, actual.x, actual.y);
  if (!llego(actual, destino)) cuadro = requestAnimationFrame(paso);
}

function alOrientar(ev: DeviceOrientationEvent) {
  if (ev.gamma == null || ev.beta == null) return;
  const postura = { gamma: ev.gamma, beta: ev.beta };
  base ??= postura;
  const nuevo = destinoDeGiro(base, postura);
  // El teléfono quieto: ni un cuadro.
  if (llego(destino, nuevo) && llego(actual, nuevo)) return;
  destino = nuevo;
  if (!cuadro) cuadro = requestAnimationFrame(paso);
}

async function empezar() {
  estado = "pidiendo";
  base = null;
  actual = { x: 0, y: 0 };
  destino = { x: 0, y: 0 };
  // Solo el iPhone pide permiso. Sin un toque solo responde si ya lo dio en esta sesión; si no, las portadas se quedan quietas hasta que se
  // encienda en Ajustes. En Android se escucha sin pedir nada.
  if (pidePermisoDeGiro() && !(await pedirPermisoDeGiro())) {
    if (estado === "pidiendo") {
      estado = "quieto";
      sinPermiso = true;
    }
    return;
  }
  if (estado !== "pidiendo") return; // se apagó mientras el teléfono respondía
  estado = "escuchando";
  window.addEventListener("deviceorientation", alOrientar);
}

function parar() {
  window.removeEventListener("deviceorientation", alOrientar);
  estado = "quieto";
  cancelAnimationFrame(cuadro);
  cuadro = 0;
  actual = { x: 0, y: 0 };
  destino = { x: 0, y: 0 };
  for (const portada of portadas) mover(portada, 0, 0);
}

function actualizar() {
  const debe = aLaVista.size > 0 && document.visibilityState === "visible" && giroEncendido();
  if (debe && estado === "quieto" && !sinPermiso) void empezar();
  else if (!debe && estado !== "quieto") parar();
}

function alCruzar(entradas: IntersectionObserverEntry[]) {
  for (const e of entradas) {
    if (e.isIntersecting) {
      aLaVista.add(e.target);
      if (estado === "escuchando") mover(e.target, actual.x, actual.y);
    } else {
      aLaVista.delete(e.target);
      mover(e.target, 0, 0);
    }
  }
  actualizar();
}

/**
 * Registra una portada con figura para el giro; devuelve con qué quitarla. La primera pone a escuchar la página (`visibilitychange`, la
 * preferencia y «Reducir movimiento»), una vez y para siempre: sin portadas no hace nada.
 */
export function registrarPortada(portada: Element): () => void {
  if (!atento) {
    atento = true;
    document.addEventListener("visibilitychange", actualizar);
    suscribirse(() => {
      sinPermiso = false;
      actualizar();
    });
  }
  portadas.add(portada);
  observador ??= new IntersectionObserver(alCruzar, { threshold: 0.1 });
  observador.observe(portada);
  return () => {
    portadas.delete(portada);
    aLaVista.delete(portada);
    observador?.unobserve(portada);
    actualizar();
  };
}

/** Una portada recién dibujada llega quieta: si el giro corre y está a la vista, sus capas van a donde están las demás. */
export function reaplicarGiro(portada: Element): void {
  if (estado === "escuchando" && aLaVista.has(portada)) mover(portada, actual.x, actual.y);
}
