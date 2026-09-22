import { describe, expect, it } from "vitest";
import { decidirEstadoPush, decidirInstalar, dondeSeActivan, dondeSeRegistra, enEste, esteAparato, esteAparatoInicial, leerPlataforma, pasosInstalar, tituloInstalada } from "./plataforma";

const IPHONE_SAFARI_26 = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const IPHONE_SAFARI_18 = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IPHONE_APP_INSTALADA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1";
const IPHONE_INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0";
const IPAD_COMO_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
const MAC_SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const MAC_EDGE = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0";

const sinSoporte = { llave: true, soporte: false, permiso: null, suscrito: false } as const;
const conSoporte = { llave: true, soporte: true, permiso: "default", suscrito: false } as const;

describe("leerPlataforma", () => {
  it("reconoce Safari del iPhone y su versión", () => {
    const p = leerPlataforma(IPHONE_SAFARI_26, 5, false);
    expect(p).toMatchObject({ ios: true, safari: true, versionSafari: 26, deOtraApp: null, computadora: false });
  });
  it("Chrome del iPhone no es Safari", () => {
    expect(leerPlataforma(IPHONE_CHROME, 5, false)).toMatchObject({ ios: true, safari: false, versionSafari: null });
  });
  it("el navegador de Instagram es de otra app", () => {
    expect(leerPlataforma(IPHONE_INSTAGRAM, 5, false)).toMatchObject({ ios: true, safari: false, deOtraApp: "Instagram" });
  });
  it("el iPad que se presenta como Mac es iOS por la pantalla táctil; la Mac no", () => {
    expect(leerPlataforma(IPAD_COMO_MAC, 5, false)).toMatchObject({ ios: true, computadora: false });
    expect(leerPlataforma(MAC_CHROME, 0, false)).toMatchObject({ ios: false, computadora: true });
  });
  it("una Mac de verdad con puntos táctiles no confunde con un iPad (bitácora 166, OL-131)", () => {
    // Sidecar/Universal Control con un iPad, una pantalla táctil externa o un trackpad Force Touch pueden dar un
    // navigator.maxTouchPoints mayor que cero en una Mac real, sin ser un iPad; solo el valor exacto que reporta
    // un iPad (5, medido arriba) cuenta. Antes, cualquier valor mayor que 1 ya la trataba como iPad.
    expect(leerPlataforma(MAC_CHROME, 1, false)).toMatchObject({ ios: false, computadora: true });
    expect(leerPlataforma(MAC_CHROME, 2, false)).toMatchObject({ ios: false, computadora: true });
    expect(leerPlataforma(MAC_CHROME, 4, false)).toMatchObject({ ios: false, computadora: true });
  });
  it("Android no es computadora", () => {
    expect(leerPlataforma(ANDROID_CHROME, 5, false)).toMatchObject({ ios: false, computadora: false });
  });
  it("Chrome de escritorio se distingue de Safari, Edge y del Chrome del iPhone", () => {
    expect(leerPlataforma(MAC_CHROME, 0, false)).toMatchObject({ computadora: true, chrome: true });
    expect(leerPlataforma(MAC_SAFARI, 0, false)).toMatchObject({ computadora: true, chrome: false });
    expect(leerPlataforma(MAC_EDGE, 0, false)).toMatchObject({ computadora: true, chrome: false });
    expect(leerPlataforma(IPHONE_CHROME, 5, false)).toMatchObject({ computadora: false, chrome: false });
  });
});

describe("decidirEstadoPush", () => {
  it("en Safari del iPhone manda a instalar aunque el navegador no tenga avisos (antes decía que no se podía)", () => {
    expect(decidirEstadoPush(leerPlataforma(IPHONE_SAFARI_26, 5, false), sinSoporte)).toBe("instalar-primero");
  });
  it("en la app instalada del iPhone pide el permiso", () => {
    expect(decidirEstadoPush(leerPlataforma(IPHONE_APP_INSTALADA, 5, true), conSoporte)).toBe("apagado");
  });
  it("dentro de Instagram no se puede, antes que todo", () => {
    expect(decidirEstadoPush(leerPlataforma(IPHONE_INSTAGRAM, 5, false), conSoporte)).toBe("otra-app");
  });
  it("en Android: bloqueado, apagado o encendido según el permiso y el alta", () => {
    const p = leerPlataforma(ANDROID_CHROME, 5, false);
    expect(decidirEstadoPush(p, { ...conSoporte, permiso: "denied" })).toBe("bloqueado");
    expect(decidirEstadoPush(p, conSoporte)).toBe("apagado");
    expect(decidirEstadoPush(p, { ...conSoporte, permiso: "granted", suscrito: true })).toBe("encendido");
  });
  it("sin llave del servidor o sin soporte, no se puede", () => {
    const p = leerPlataforma(MAC_CHROME, 0, false);
    expect(decidirEstadoPush(p, { ...conSoporte, llave: false })).toBe("no-soportado");
    expect(decidirEstadoPush(p, sinSoporte)).toBe("no-soportado");
  });
});

describe("decidirInstalar", () => {
  it("instalada no ofrece nada", () => {
    expect(decidirInstalar(leerPlataforma(IPHONE_APP_INSTALADA, 5, true), false)).toBe("ya-instalada");
  });
  it("con el aviso del navegador es un toque; sin él, en Android no hay cómo", () => {
    expect(decidirInstalar(leerPlataforma(ANDROID_CHROME, 5, false), true)).toBe("un-toque");
    expect(decidirInstalar(leerPlataforma(ANDROID_CHROME, 5, false), false)).toBe("no");
  });
  it("en iPhone: pasos en Safari; en otro navegador, abrir en Safari", () => {
    expect(decidirInstalar(leerPlataforma(IPHONE_SAFARI_26, 5, false), false)).toBe("pasos-safari");
    expect(decidirInstalar(leerPlataforma(IPHONE_CHROME, 5, false), false)).toBe("abrir-en-safari");
    expect(decidirInstalar(leerPlataforma(IPHONE_INSTAGRAM, 5, false), false)).toBe("abrir-en-safari");
  });
});

describe("pasosInstalar", () => {
  it("iOS 26: cinco toques, con Compartir dentro de ···, Ver más y el nombre de hoy, Agregar a Inicio", () => {
    expect(pasosInstalar(26).map((p) => p.que)).toEqual(["Toca ···", "Compartir", "Ver más", "Agregar a Inicio", "Agregar"]);
  });
  it("antes de iOS 26: Compartir abajo y tres toques", () => {
    expect(pasosInstalar(18).map((p) => p.que)).toEqual(["Toca Compartir", "Agregar a pantalla de inicio", "Agregar"]);
  });
  it("si no se sabe la versión, los pasos de hoy (iOS 26)", () => {
    expect(pasosInstalar(null)).toHaveLength(5);
  });
});

describe("enEste y esteAparato", () => {
  it("dice computadora o teléfono, en minúscula y a mitad de frase", () => {
    expect(enEste(leerPlataforma(MAC_CHROME, 0, false))).toBe("en esta computadora");
    expect(enEste(leerPlataforma(IPHONE_SAFARI_18, 5, false))).toBe("en este teléfono");
    expect(enEste(null)).toBe("en este teléfono");
    expect(esteAparato(leerPlataforma(MAC_CHROME, 0, false))).toBe("esta computadora");
  });
  it("esteAparatoInicial empieza la frase con mayúscula, para los avisos de ubicación", () => {
    expect(esteAparatoInicial(leerPlataforma(MAC_CHROME, 0, false))).toBe("Esta computadora");
    expect(esteAparatoInicial(leerPlataforma(IPHONE_SAFARI_18, 5, false))).toBe("Este teléfono");
    expect(esteAparatoInicial(null)).toBe("Este teléfono");
  });
});

describe("dondeSeActivan", () => {
  it("en el iPhone manda a Ajustes; en Chrome de escritorio, a Permisos del sitio; en otro navegador, algo genérico", () => {
    expect(dondeSeActivan(leerPlataforma(IPHONE_SAFARI_18, 5, false))).toBe("en Ajustes del iPhone › Notificaciones › Somos Nosotros");
    expect(dondeSeActivan(leerPlataforma(MAC_CHROME, 0, false))).toBe("en Chrome: el candado junto a la dirección › Permisos del sitio › Notificaciones");
    expect(dondeSeActivan(leerPlataforma(MAC_SAFARI, 0, false))).toBe("en la configuración del sitio de tu navegador");
    expect(dondeSeActivan(null)).toBe("en la configuración del sitio de tu navegador");
  });
});

describe("dondeSeRegistra", () => {
  it("nombra Chrome cuando lo es; genérico si no, y sin plataforma", () => {
    expect(dondeSeRegistra(leerPlataforma(MAC_CHROME, 0, false))).toBe(
      "Revisa que las notificaciones de Chrome estén permitidas en el sistema, y que esta no sea una ventana de incógnito o invitado",
    );
    expect(dondeSeRegistra(leerPlataforma(MAC_SAFARI, 0, false))).toBe(
      "Revisa que las notificaciones de tu navegador estén permitidas en el sistema, y que esta no sea una ventana de incógnito o invitado",
    );
    expect(dondeSeRegistra(null)).toBe(
      "Revisa que las notificaciones de tu navegador estén permitidas en el sistema, y que esta no sea una ventana de incógnito o invitado",
    );
  });
});

describe("tituloInstalada", () => {
  it("quita la marca del final: la ventana instalada ya la pone", () => {
    expect(tituloInstalada("Lugares · Somos Nosotros")).toBe("Lugares");
    expect(tituloInstalada("Agenda cultural de San Luis Potosí · Somos Nosotros")).toBe("Agenda cultural de San Luis Potosí");
  });
  it("sin la marca al final, no toca nada", () => {
    expect(tituloInstalada("Somos Nosotros")).toBe("Somos Nosotros");
  });
  it("si no queda nada tras quitarla, se queda con el nombre del sitio (nunca una pestaña en blanco)", () => {
    expect(tituloInstalada(" · Somos Nosotros")).toBe("Somos Nosotros");
  });
});
