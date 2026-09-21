import { describe, expect, it, vi } from "vitest";
import { debeAvisar, esquemaSeguro, guardarSinAvisoSalida, sinAvisoSalida, suscribirseAvisoSalida } from "./avisoSalida";
import { dominioDe } from "./enlaces";

/** Almacén falso en memoria, con la misma forma mínima que localStorage, para probar sin el navegador. */
function almacenFalso(inicial: Record<string, string> = {}) {
  const datos: Record<string, string> = { ...inicial };
  return {
    getItem: (k: string) => datos[k] ?? null,
    setItem: (k: string, v: string) => {
      datos[k] = v;
    },
    removeItem: (k: string) => {
      delete datos[k];
    },
    datos,
  };
}

describe("esquemaSeguro", () => {
  it("solo http y https", () => {
    expect(esquemaSeguro("https://boletia.com/evento")).toBe(true);
    expect(esquemaSeguro("http://casa1100.mx")).toBe(true);
    expect(esquemaSeguro("javascript:alert(1)")).toBe(false);
    expect(esquemaSeguro("mailto:hola@somosnosotros.org")).toBe(false);
    expect(esquemaSeguro("")).toBe(false);
  });
});

describe("sinAvisoSalida / guardarSinAvisoSalida", () => {
  it("por default avisa (false) y guarda/quita la preferencia", () => {
    const almacen = almacenFalso();
    expect(sinAvisoSalida(almacen)).toBe(false);
    guardarSinAvisoSalida(almacen, true);
    expect(sinAvisoSalida(almacen)).toBe(true);
    expect(almacen.datos["sn-sin-aviso-salida"]).toBe("1");
    guardarSinAvisoSalida(almacen, false);
    expect(sinAvisoSalida(almacen)).toBe(false);
    expect(almacen.datos["sn-sin-aviso-salida"]).toBeUndefined();
  });
  it("sin almacén (SSR o modo privado) siempre avisa: false, y guardar no truena", () => {
    expect(sinAvisoSalida(null)).toBe(false);
    expect(() => guardarSinAvisoSalida(null, true)).not.toThrow();
  });
  it("un almacén que truena al leer o escribir (modo privado real) tampoco rompe: sigue avisando", () => {
    const roto = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    };
    expect(sinAvisoSalida(roto)).toBe(false);
    expect(() => guardarSinAvisoSalida(roto, true)).not.toThrow();
  });
});

describe("debeAvisar", () => {
  const base = { href: "https://boletia.com/x", boton: 0, meta: false, ctrl: false, shift: false, alt: false, sinAviso: false };
  it("un clic normal a http(s), sin preferencia guardada, sí avisa", () => {
    expect(debeAvisar(base)).toBe(true);
  });
  it("clic central o cualquier modificador deja pasar el enlace (sin hoja)", () => {
    expect(debeAvisar({ ...base, boton: 1 })).toBe(false);
    expect(debeAvisar({ ...base, meta: true })).toBe(false);
    expect(debeAvisar({ ...base, ctrl: true })).toBe(false);
    expect(debeAvisar({ ...base, shift: true })).toBe(false);
    expect(debeAvisar({ ...base, alt: true })).toBe(false);
  });
  it("un esquema que no sea http/https deja pasar el enlace, sin hoja ni error: nunca se guardó como red o sitio, pero alguien pudo forzarlo", () => {
    expect(debeAvisar({ ...base, href: "javascript:alert(1)" })).toBe(false);
    expect(debeAvisar({ ...base, href: "mailto:hola@somosnosotros.org" })).toBe(false);
    expect(debeAvisar({ ...base, href: "tel:+524441234567" })).toBe(false);
  });
  it("con la preferencia guardada, no avisa", () => {
    expect(debeAvisar({ ...base, sinAviso: true })).toBe(false);
  });
});

describe("suscribirseAvisoSalida", () => {
  it("avisa a quien está suscrito cada vez que se guarda la preferencia, y deja de avisar tras desuscribirse", () => {
    const almacen = almacenFalso();
    const escucha = vi.fn();
    const dejarDeEscuchar = suscribirseAvisoSalida(escucha);
    guardarSinAvisoSalida(almacen, true);
    expect(escucha).toHaveBeenCalledTimes(1);
    guardarSinAvisoSalida(almacen, false);
    expect(escucha).toHaveBeenCalledTimes(2);
    dejarDeEscuchar();
    guardarSinAvisoSalida(almacen, true);
    expect(escucha).toHaveBeenCalledTimes(2);
  });
});

describe("dominioDe (reusado de lib/enlaces): el dominio que muestra la hoja sale de la URL real", () => {
  it("sin www ni ruta, y no se deja engañar por el texto del enlace", () => {
    expect(dominioDe("https://www.boletia.com/foro-luz-de-agua/huapango")).toBe("boletia.com");
    expect(dominioDe("https://sub.un-dominio-largo.mx/x?y=1")).toBe("sub.un-dominio-largo.mx");
  });
});
