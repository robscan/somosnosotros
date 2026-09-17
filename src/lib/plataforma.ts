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
  /** Abierta desde el icono del inicio. */
  instalada: boolean;
};

export function leerPlataforma(agente: string, puntosTactiles: number, instalada: boolean): Plataforma {
  const ipadComoMac = /Macintosh/.test(agente) && puntosTactiles > 1;
  const ios = /iPhone|iPad|iPod/.test(agente) || ipadComoMac;
  const deOtraApp = /Instagram/.test(agente) ? "Instagram" : /FBAN|FBAV|FB_IAB/.test(agente) ? "Facebook" : null;
  const otroNavegador = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(agente);
  const safari = ios && /Safari\//.test(agente) && !otroNavegador && !deOtraApp;
  const version = agente.match(/Version\/(\d+)/);
  return {
    ios,
    safari,
    versionSafari: safari && version ? Number(version[1]) : null,
    deOtraApp,
    computadora: !ios && !/Android|Mobile/i.test(agente),
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

/** "en este teléfono" o "en esta computadora": el sistema sabe dónde está (decisión 9). */
export function enEste(p: Plataforma | null): string {
  return p?.computadora ? "en esta computadora" : "en este teléfono";
}

/** Dónde se deshace un permiso bloqueado. */
export function dondeSeActivan(p: Plataforma | null): string {
  return p?.ios ? "en Ajustes del iPhone › Notificaciones › Somos Nosotros" : "en la configuración del sitio de tu navegador";
}
