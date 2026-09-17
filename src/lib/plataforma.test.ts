import { describe, expect, it } from "vitest";
import { decidirEstadoPush, decidirInstalar, enEste, leerPlataforma, pasosInstalar } from "./plataforma";

const IPHONE_SAFARI_26 = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const IPHONE_SAFARI_18 = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IPHONE_APP_INSTALADA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1";
const IPHONE_INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0";
const IPAD_COMO_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

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
  it("Android no es computadora", () => {
    expect(leerPlataforma(ANDROID_CHROME, 5, false)).toMatchObject({ ios: false, computadora: false });
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

describe("enEste", () => {
  it("dice computadora o teléfono", () => {
    expect(enEste(leerPlataforma(MAC_CHROME, 0, false))).toBe("en esta computadora");
    expect(enEste(leerPlataforma(IPHONE_SAFARI_18, 5, false))).toBe("en este teléfono");
    expect(enEste(null)).toBe("en este teléfono");
  });
});
