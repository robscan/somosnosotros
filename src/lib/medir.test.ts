import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
vi.mock("@vercel/analytics", () => ({ track: (...a: unknown[]) => track(...a) }));

import { claseMedida, contextoGoogle, datosAsistencia, formatoMedido, medicionActivaEnCliente, EVENTOS, fichaDeEnlace, MAX_DATOS, medirCliente, plantillaMedida, tandaMedida, validarMedicion } from "./medir";
import { limpiarUrlEvento, limpiarUrlGoogle } from "./limpiarUrlAnalitica";

/** La marca del rol que pinta `MarcaAdmin`: «admin», «otro» o ninguna (aún sin resolver). */
const marca = (rol: "admin" | "otro" | null) =>
  vi.stubGlobal("document", { querySelector: (sel: string) => (rol && sel === "[data-medir-rol]" ? { getAttribute: (a: string) => (a === "data-medir-rol" ? rol : null) } : null) });

/** Una ventana mínima: dirección, `gtag` y la marca del rol (por omisión, resuelto y no admin). */
function ponerVentana({ href = "https://somosnosotros.org/eventos/fiesta", admin = false, rol, gtag }: { href?: string; admin?: boolean; rol?: "admin" | "otro" | null; gtag?: (...a: unknown[]) => void } = {}) {
  vi.stubGlobal("window", { location: { href }, gtag });
  marca(rol !== undefined ? rol : admin ? "admin" : "otro");
}

const red = vi.fn();
beforeEach(() => {
  track.mockReset();
  red.mockReset();
  red.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", red);
  vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_MEDIR_DEPURAR", "");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("la lista cerrada (OL-325)", () => {
  it("cada evento tiene nombre snake_case de 40 o menos y a lo más 2 datos, cada uno con opciones fijas", () => {
    for (const [nombre, datos] of Object.entries(EVENTOS)) {
      expect(nombre).toMatch(/^[a-z][a-z0-9_]{0,39}$/);
      expect(Object.keys(datos).length).toBeLessThanOrEqual(MAX_DATOS);
      for (const opciones of Object.values(datos) as readonly string[][]) {
        expect(opciones.length).toBeGreaterThan(0);
        for (const o of opciones) expect(o).toMatch(/^[a-z_]{1,40}$/);
      }
    }
  });
  it("acepta un evento con sus datos tal cual", () => {
    expect(validarMedicion("entrar", { paso: "listo", metodo: "google" })).toEqual({ paso: "listo", metodo: "google" });
    expect(validarMedicion("app_instalada")).toEqual({});
  });
  it("rechaza un nombre que no está en la lista", () => {
    expect(validarMedicion("visita_a_perfil", {})).toBeNull();
    expect(validarMedicion("Entrar", { paso: "listo", metodo: "google" })).toBeNull();
    expect(validarMedicion("toString", {})).toBeNull();
  });
  it("rechaza una opción que no existe (texto libre, un nombre, un correo)", () => {
    expect(validarMedicion("entrar", { paso: "listo", metodo: "rosa@gmail.com" })).toBeNull();
    expect(validarMedicion("busqueda", { resultados: "teatro" })).toBeNull();
    expect(validarMedicion("evento_creado", { cartel: true })).toBeNull();
  });
  it("rechaza datos de más, de menos o más de 2", () => {
    expect(validarMedicion("evento_creado", { cartel: "si", id: "0b3c" })).toBeNull();
    expect(validarMedicion("asistencia", { estado: "voy" })).toBeNull();
    expect(validarMedicion("asistencia", { estado: "voy", cambio: "puesto", extra: "x" })).toBeNull();
    expect(validarMedicion("app_instalada", { plataforma: "android" })).toBeNull();
  });
  it("rechaza lo que no es un objeto, sin lanzar", () => {
    expect(validarMedicion("busqueda", null)).toBeNull();
    expect(validarMedicion("busqueda", ["si"])).toBeNull();
    expect(validarMedicion("busqueda", "si")).toBeNull();
  });
});

describe("el creador de cartel (OL-336)", () => {
  it("cada paso con sus datos: desde dónde se abrió, la tanda, el diseño y el formato", () => {
    expect(validarMedicion("cartel_abierto", { desde: "publicado" })).toEqual({ desde: "publicado" });
    expect(validarMedicion("cartel_otros", { tanda: tandaMedida(1) })).toEqual({ tanda: "segunda" });
    expect(validarMedicion("cartel_elegido", { plantilla: plantillaMedida("cine-sangre"), formato: formatoMedido("4x5") })).toEqual({ plantilla: "cine_sangre", formato: "publicacion" });
    expect(validarMedicion("cartel_formato", { formato: formatoMedido("9x16") })).toEqual({ formato: "historia" });
    expect(validarMedicion("cartel_titulo_acortado")).toEqual({});
    expect(validarMedicion("cartel_descargado", { plantilla: "deco_sol", formato: "historia" })).toEqual({ plantilla: "deco_sol", formato: "historia" });
    expect(validarMedicion("cartel_usado", { plantilla: "zine_cinta", formato: "publicacion" })).toEqual({ plantilla: "zine_cinta", formato: "publicacion" });
    expect(validarMedicion("cartel_ninguno", { tanda: "tercera" })).toEqual({ tanda: "tercera" });
  });
  it("nunca el evento (ni su slug ni su id), ni lo escrito en «Acortar título», ni una plantilla que no es del catálogo", () => {
    expect(validarMedicion("cartel_abierto", { desde: "menu", evento: "oca" })).toBeNull();
    expect(validarMedicion("cartel_usado", { plantilla: "cine_sangre", formato: "publicacion", evento: "00000000-0000-4000-8000-000000000001" })).toBeNull();
    expect(validarMedicion("cartel_titulo_acortado", { titulo: "LXS COLOCAOS" })).toBeNull();
    expect(validarMedicion("cartel_elegido", { plantilla: "cine-sangre", formato: "publicacion" })).toBeNull();
    expect(plantillaMedida("no-existe")).toBeNull();
    expect(validarMedicion("cartel_abierto", { desde: "/eventos/oca" })).toBeNull();
  });
  it("la tanda de la pantalla (0, 1, 2) se mide como primera, segunda o tercera", () => {
    expect([0, 1, 2, 7].map(tandaMedida)).toEqual(["primera", "segunda", "tercera", "primera"]);
  });
});

describe("claseMedida", () => {
  it("la clase del alta si es de la lista; si no, puntual (como el servidor)", () => {
    expect(claseMedida("exposicion")).toBe("exposicion");
    expect(claseMedida("taller")).toBe("taller");
    expect(claseMedida(null)).toBe("puntual");
    expect(claseMedida("concierto")).toBe("puntual");
    expect(validarMedicion("evento_creado", { cartel: "si", clase: claseMedida("festival") })).toEqual({ cartel: "si", clase: "festival" });
    expect(validarMedicion("evento_creado", { cartel: "si" })).toBeNull();
  });
});

describe("datosAsistencia y fichaDeEnlace", () => {
  it("puesto, quitado o nada", () => {
    expect(datosAsistencia("voy", null)).toEqual({ estado: "voy", cambio: "puesto" });
    expect(datosAsistencia("me_interesa", "voy")).toEqual({ estado: "me_interesa", cambio: "puesto" });
    expect(datosAsistencia(null, "me_interesa")).toEqual({ estado: "me_interesa", cambio: "quitado" });
    expect(datosAsistencia(null, null)).toBeNull();
  });
  it("qué ficha se comparte, por su dirección; la app o una persona, nada", () => {
    expect(fichaDeEnlace("https://somosnosotros.org/eventos/fiesta-1")).toBe("evento");
    expect(fichaDeEnlace("https://somosnosotros.org/lugares/teatro")).toBe("lugar");
    expect(fichaDeEnlace("/artistas/ana")).toBe("artista");
    expect(fichaDeEnlace("https://somosnosotros.org")).toBeNull();
    expect(fichaDeEnlace("https://somosnosotros.org/personas/0b3c")).toBeNull();
  });
});

describe("medirCliente", () => {
  it("en producción manda a Vercel y a Google (solo por el servidor) el mismo nombre y los mismos datos", () => {
    const gtag = vi.fn();
    ponerVentana({ gtag, href: "https://somosnosotros.org/buscar?q=rosa%20perez" });
    medirCliente("busqueda", { resultados: "si" });
    expect(track).toHaveBeenCalledWith("busqueda", { resultados: "si" });
    // A Google, una sola vez: por el servidor (Measurement Protocol), solo nombre y datos.
    expect(red).toHaveBeenCalledTimes(1);
    const [url, opciones] = red.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/medir");
    expect(opciones).toMatchObject({ method: "POST", keepalive: true });
    expect(JSON.parse(String(opciones.body))).toEqual({ nombre: "busqueda", datos: { resultados: "si" } });
    expect(String(opciones.body)).not.toContain("rosa");
  });
  it("las acciones no salen por gtag en el navegador (sin doble conteo): gtag queda para las vistas", () => {
    const gtag = vi.fn();
    ponerVentana({ gtag });
    medirCliente("asistencia", { estado: "voy", cambio: "puesto" });
    medirCliente("evento_creado", { cartel: "si", clase: "taller" });
    expect(gtag).not.toHaveBeenCalled();
    expect(red).toHaveBeenCalledTimes(2);
  });
  it("fuera de producción no manda nada", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    const gtag = vi.fn();
    ponerVentana({ gtag });
    medirCliente("evento_creado", { cartel: "no", clase: "puntual" });
    expect(track).not.toHaveBeenCalled();
    expect(gtag).not.toHaveBeenCalled();
    expect(red).not.toHaveBeenCalled();
  });
  it("con NEXT_PUBLIC_MEDIR_DEPURAR=1 fuera de producción lo escribe en la consola y no lo manda", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_MEDIR_DEPURAR", "1");
    const consola = vi.spyOn(console, "info").mockImplementation(() => {});
    ponerVentana();
    medirCliente("evento_creado", { cartel: "si", clase: "festival" });
    expect(consola).toHaveBeenCalledWith("[medir]", "evento_creado", { cartel: "si", clase: "festival" }, "(fuera de producción: no se manda)");
    expect(track).not.toHaveBeenCalled();
    consola.mockRestore();
  });
  it("para la administración no manda nada", () => {
    const gtag = vi.fn();
    ponerVentana({ gtag, admin: true });
    medirCliente("asistencia", { estado: "voy", cambio: "puesto" });
    expect(track).not.toHaveBeenCalled();
    expect(gtag).not.toHaveBeenCalled();
    expect(red).not.toHaveBeenCalled();
  });
  it("F10: mientras el rol no se sepa (la marca aún no llegó) no manda nada", () => {
    const gtag = vi.fn();
    ponerVentana({ gtag, rol: null });
    medirCliente("asistencia", { estado: "voy", cambio: "puesto" });
    expect(track).not.toHaveBeenCalled();
    expect(red).not.toHaveBeenCalled();
  });
  it("lo que no está en la lista no sale", () => {
    const gtag = vi.fn();
    ponerVentana({ gtag });
    (medirCliente as (n: string, d?: unknown) => void)("busqueda", { resultados: "si", texto: "rosa" });
    expect(track).not.toHaveBeenCalled();
    expect(gtag).not.toHaveBeenCalled();
  });
  it("nunca lanza, aunque Vercel y Google fallen", () => {
    track.mockImplementation(() => {
      throw new Error("sin red");
    });
    ponerVentana({
      gtag: () => {
        throw new Error("bloqueado");
      },
    });
    red.mockRejectedValue(new TypeError("fetch failed"));
    expect(() => medirCliente("reporte", { que: "evento" })).not.toThrow();
    vi.stubGlobal("fetch", undefined);
    expect(() => medirCliente("reporte", { que: "evento" })).not.toThrow();
  });
  it("si leer el entorno lanza (sin `process` en el navegador, como en un paquete de esbuild), no se mide y no lanza", () => {
    const original = Object.getOwnPropertyDescriptor(process, "env")!;
    Object.defineProperty(process, "env", {
      configurable: true,
      get() {
        throw new ReferenceError("process is not defined");
      },
    });
    try {
      expect(medicionActivaEnCliente()).toBe(false);
      ponerVentana({ gtag: vi.fn() });
      expect(() => medirCliente("entrar", { paso: "listo", metodo: "correo" })).not.toThrow();
    } finally {
      Object.defineProperty(process, "env", original);
    }
    expect(track).not.toHaveBeenCalled();
    expect(red).not.toHaveBeenCalled();
  });
  it("sin Google cargado manda solo a Vercel", () => {
    ponerVentana();
    medirCliente("app_instalada");
    expect(track).toHaveBeenCalledWith("app_instalada", {});
    expect(red).not.toHaveBeenCalled(); // sin Google preparado tampoco va al servidor
  });
});

describe("la página que acompaña a cada envío", () => {
  it("una acción en una ruta privada lleva solo su primer tramo", () => {
    expect(limpiarUrlEvento("https://somosnosotros.org/entrar?siguiente=%2Fnuevo%2Flugar%3Fnombre%3DCasa")).toBe("https://somosnosotros.org/entrar");
    expect(limpiarUrlEvento("https://somosnosotros.org/invitacion/ABC123")).toBe("https://somosnosotros.org/invitacion");
    expect(limpiarUrlEvento("/perfil")).toBe("https://somosnosotros.org/perfil");
  });
  it("la ruta de una persona pierde su id", () => {
    expect(limpiarUrlEvento("https://somosnosotros.org/personas/0b3c2a1e-0000-4000-8000-000000000000")).toBe("https://somosnosotros.org/personas");
    expect(limpiarUrlGoogle("https://somosnosotros.org/personas/0b3c2a1e-0000-4000-8000-000000000000")).toBe("https://somosnosotros.org/personas");
  });
  it("las vistas de Google: sin q ni nombre; lo privado no se manda", () => {
    expect(limpiarUrlGoogle("https://somosnosotros.org/buscar?q=teatro&tipo=lugares")).toBe("https://somosnosotros.org/buscar?tipo=lugares");
    expect(limpiarUrlGoogle("https://somosnosotros.org/nuevo/lugar?nombre=Casa%20de%20Rosa")).toBe("https://somosnosotros.org/nuevo/lugar");
    expect(limpiarUrlGoogle("https://somosnosotros.org/admin")).toBeNull();
    expect(limpiarUrlGoogle("https://somosnosotros.org/entrar?siguiente=/")).toBeNull();
  });
  it("el contexto de Google: la ruta en vez del título y sin referente", () => {
    expect(contextoGoogle("https://somosnosotros.org/lugares/teatro?ciudad=slp")).toEqual({ page_location: "https://somosnosotros.org/lugares/teatro", page_title: "/lugares/teatro", page_referrer: "" });
  });
});
