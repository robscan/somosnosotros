/**
 * Qué teléfono es y qué puede con la app y los avisos (decisiones 1, 2 y 7 de docs/rediseno/17). Lógica pura: recibe lo
 * que dice el navegador y decide; `pushCliente` le pasa los datos reales. Sin `window` aquí, para poder probarla.
 */

export type Plataforma = {
  /** iPhone o iPad (el iPad con Safari se presenta como Mac, pero tiene pantalla táctil). */
  ios: boolean;
  /** Safari de verdad: ni Chrome ni Firefox del iPhone ni el navegador de otra app. */
  safari: boolean;
  /** Versión mayor de Safari ("Version/26.0" → 26); null si no se sabe. */
  versionSafari: number | null;
  /** Dentro del navegador de otra app (Instagram, Facebook): ahí no se instala ni llegan avisos. */
  deOtraApp: "Instagram" | "Facebook" | null;
  /** Computadora: ni iPhone, ni iPad, ni Android. */
  computadora: boolean;
  /** Chrome de escritorio de verdad (no Edge, Opera ni Brave). Para decir dónde se activa un permiso ahí. */
  chrome: boolean;
  /** Abierta desde el icono del inicio. */
  instalada: boolean;
};

export function leerPlataforma(agente: string, puntosTactiles: number, instalada: boolean): Plataforma {
  // El iPad con Safari reporta 5 puntos táctiles (medido; ver la prueba de IPAD_COMO_MAC). Un Mac de verdad puede
  // dar un número mayor que cero sin ser un iPad — Sidecar/Universal Control con un iPad o una pantalla táctil
  // externa conectada, o un trackpad Force Touch en ciertas combinaciones (bitácora 166, OL-131): cualquier umbral
  // bajo (antes ">1") confunde esa Mac con un iPad y la manda por el camino equivocado (etiqueta "el teléfono",
  // instalar antes de poder activar avisos). Solo el valor exacto que da un iPad cuenta.
  const ipadComoMac = /Macintosh/.test(agente) && puntosTactiles >= 5;
  const ios = /iPhone|iPad|iPod/.test(agente) || ipadComoMac;
  const deOtraApp = /Instagram/.test(agente) ? "Instagram" : /FBAN|FBAV|FB_IAB/.test(agente) ? "Facebook" : null;
  const otroNavegador = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(agente);
  const safari = ios && /Safari\//.test(agente) && !otroNavegador && !deOtraApp;
  const version = agente.match(/Version\/(\d+)/);
  const computadora = !ios && !/Android|Mobile/i.test(agente);
  // Chrome de escritorio de verdad: no Edge, Opera ni Brave, que también dicen "Chrome/" en su UA.
  const chrome = computadora && /Chrome\//.test(agente) && !/Edg\/|OPR\/|Brave\//.test(agente);
  return {
    ios,
    safari,
    versionSafari: safari && version ? Number(version[1]) : null,
    deOtraApp,
    computadora,
    chrome,
    instalada,
  };
}

export type EstadoPush = "otra-app" | "instalar-primero" | "no-soportado" | "bloqueado" | "apagado" | "encendido";

/**
 * El orden importa: Safari del iPhone solo tiene avisos dentro de la app instalada, así que primero se mira si es un
 * iPhone sin instalar (hoja de instalar) y solo después si el navegador los soporta. Al revés, todo iPhone respondía
 * "no se puede" y la hoja nunca salía (fricción I1 de docs/rediseno/16).
 */
export function decidirEstadoPush(p: Plataforma, s: { llave: boolean; soporte: boolean; permiso: NotificationPermission | null; suscrito: boolean }): EstadoPush {
  if (p.deOtraApp) return "otra-app";
  if (p.ios && !p.instalada) return "instalar-primero";
  if (!s.llave || !s.soporte) return "no-soportado";
  if (s.permiso === "denied") return "bloqueado";
  return s.suscrito ? "encendido" : "apagado";
}

export type ComoInstalar = "ya-instalada" | "un-toque" | "pasos-safari" | "abrir-en-safari" | "abrir-en-navegador" | "no";

/** Cómo se instala aquí. "un-toque": el navegador ya avisó que se puede (Chrome, Edge, Android) y abre su diálogo. */
export function decidirInstalar(p: Plataforma, avisoDelNavegador: boolean): ComoInstalar {
  if (p.instalada) return "ya-instalada";
  if (p.deOtraApp) return p.ios ? "abrir-en-safari" : "abrir-en-navegador";
  if (avisoDelNavegador) return "un-toque";
  if (p.ios) return p.safari ? "pasos-safari" : "abrir-en-safari";
  return "no";
}

export type Glifo = "puntos" | "compartir" | "ver-mas" | "agregar-inicio" | "agregar";
export type Paso = { glifo: Glifo; que: string; donde: string };

/**
 * Los pasos del Safari de la persona, con los nombres que muestra el iPhone en español. En iOS 26 (medido en el
 * simulador en español de Latinoamérica, 2026-09-16): Compartir vive dentro de ···, la opción se llama "Agregar a Inicio"
 * y está tras "Ver más". Antes de iOS 26, Compartir estaba abajo al centro y la opción era "Agregar a pantalla de inicio".
 */
export function pasosInstalar(versionSafari: number | null): Paso[] {
  const agregar: Paso = { glifo: "agregar", que: "Agregar", donde: "Arriba a la derecha" };
  if (versionSafari !== null && versionSafari < 26) {
    return [{ glifo: "compartir", que: "Toca Compartir", donde: "Abajo, al centro" }, { glifo: "agregar-inicio", que: "Agregar a pantalla de inicio", donde: "En la lista" }, agregar];
  }
  return [
    { glifo: "puntos", que: "Toca ···", donde: "Abajo a la derecha" },
    { glifo: "compartir", que: "Compartir", donde: "El primero del menú" },
    { glifo: "ver-mas", que: "Ver más", donde: "Al final de la fila" },
    { glifo: "agregar-inicio", que: "Agregar a Inicio", donde: "Debajo de Buscar en la página" },
    agregar,
  ];
}

/**
 * El título de cada página termina en " · Somos Nosotros" (bueno para una pestaña o un resultado de Google: dice de
 * qué sitio es). Abierta desde el icono, esa marca ya la pone la ventana misma (el nombre con el que se instaló) y
 * el sistema operativo vuelve a sumarla en las suyas (Exposé, la lista de ventanas del Dock): se ve repetida
 * ("Somos Nosotros" al inicio y al final). Dentro de la app instalada alcanza con el nombre de la pantalla (OL-059).
 */
export function tituloInstalada(titulo: string): string {
  return titulo.replace(/ · Somos Nosotros$/, "") || "Somos Nosotros";
}

/**
 * "Este teléfono" o "esta computadora", para empezar una frase (decisión 9). Única función que sabe cómo se nombra el
 * aparato: `enEste` y los textos de ubicación se construyen sobre ella, para no repetir el ternario en cada pantalla.
 */
export function esteAparato(p: Plataforma | null): string {
  return p?.computadora ? "esta computadora" : "este teléfono";
}

/** "en este teléfono" o "en esta computadora": el sistema sabe dónde está (decisión 9). */
export function enEste(p: Plataforma | null): string {
  return `en ${esteAparato(p)}`;
}

/** "Este teléfono" o "Esta computadora", con mayúscula, para empezar una frase (los avisos de ubicación de los formularios). */
export function esteAparatoInicial(p: Plataforma | null): string {
  const s = esteAparato(p);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Dónde se deshace un permiso bloqueado o silenciado, en ESE navegador (decisión 9 y bitácora 147). En Chrome de
 * escritorio el permiso no siempre queda "denied": Chrome puede volverlo silencioso (un icono junto a la dirección
 * en vez del aviso) sin que el sitio se entere de si la persona ya decidió o no lo ha visto.
 */
export function dondeSeActivan(p: Plataforma | null): string {
  if (p?.ios) return "en Ajustes del iPhone › Notificaciones › Somos Nosotros";
  if (p?.chrome) return "en Chrome: el candado junto a la dirección › Permisos del sitio › Notificaciones";
  return "en la configuración del sitio de tu navegador";
}

/**
 * Cuando el navegador dice "concedido" pero se niega a registrar el aviso (bitácora 164, OL-129): el permiso del
 * SITIO no es el único candado. Un perfil efímero (incógnito, invitado) o las notificaciones del sistema apagadas
 * para el navegador dan el mismo error genérico sin avisar por qué.
 */
export function dondeSeRegistra(p: Plataforma | null): string {
  const navegador = p?.chrome ? "Chrome" : "tu navegador";
  return `Revisa que las notificaciones de ${navegador} estén permitidas en el sistema, y que esta no sea una ventana de incógnito o invitado`;
}
