import { describe, expect, it } from "vitest";
import { caducoEn, claveDeVuelta, conexionPendiente, estadoConexion, fechaConexion, FRASES_CONEXION, leerConexion, type FilaConexion, type UltimoTrabajo } from "./conexionEstado";

// OL-471 (bitácora 503): lo que dice el bloque «Conexión» de Administración › Instagram.
const AHORA = new Date("2026-10-28T18:00:00Z");
const TODOS = ["business_management", "instagram_basic", "instagram_content_publish", "instagram_manage_insights", "pages_manage_posts", "pages_read_engagement", "pages_show_list"];
const fila = (permisos = TODOS): FilaConexion => ({ pagina_nombre: "Somos Nosotrxs", instagram_usuario: "smsnstrsapp", permisos, conectado_en: "2026-10-28T17:00:00Z" });

describe("estadoConexion", () => {
  it("conectada con todo: quién, qué puede y desde cuándo", () => {
    expect(estadoConexion(fila(), true, AHORA)).toEqual({
      titulo: "Conectada como Somos Nosotrxs (@smsnstrsapp)",
      detalle: "Publica y lee cuentas · desde el 28 de octubre",
      falta: false,
      boton: "Reconectar",
      punto: "ok",
      etiqueta: "Instagram conectado como @smsnstrsapp",
      hoja: {
        cuenta: "@smsnstrsapp",
        detalle: "Página Somos Nosotrxs · conectada desde el 28 de octubre",
        puede: ["Publicar en Instagram", "Publicar en la página de Facebook", "Leer otras cuentas para completar fichas"],
        nota: "Solo hace falta reconectar si cambia la contraseña de Facebook o si deja de publicar; aquí te avisamos.",
        principal: false,
      },
    });
  });
  it("sin el permiso de leer cuentas: pide reconectar", () => {
    const e = estadoConexion(fila(TODOS.filter((p) => p !== "instagram_manage_insights")), true, AHORA);
    expect(e).toMatchObject({ detalle: "Falta el permiso para leer cuentas: reconecta", falta: true, boton: "Reconectar", punto: "mal", etiqueta: "A la conexión con Instagram le faltan permisos" });
    expect(e.hoja).toMatchObject({ principal: true, puede: ["Publicar en Instagram", "Publicar en la página de Facebook"] });
  });
  it("sin el permiso de la página de Facebook: publica solo en Instagram", () => {
    expect(estadoConexion(fila(TODOS.filter((p) => p !== "pages_manage_posts")), true, AHORA).detalle).toBe("Publica solo en Instagram y lee cuentas · desde el 28 de octubre");
  });
  it("sin conexión propia: usa el token de respaldo (o no hay ninguno)", () => {
    expect(estadoConexion(null, true, AHORA)).toMatchObject({ titulo: "Sin conexión propia", detalle: "Publica con la llave de respaldo", falta: false, boton: "Conectar Instagram", punto: "no", etiqueta: "Instagram sin conexión propia" });
    expect(estadoConexion(null, false, AHORA)).toMatchObject({ titulo: "Sin conexión", falta: true, boton: "Conectar Instagram", punto: "no", etiqueta: "Instagram sin conexión" });
    expect(estadoConexion(null, false, AHORA).hoja).toMatchObject({ cuenta: "Sin conexión", principal: true, puede: [] });
  });
  it("la fecha en la hora de México, con el año si no es este", () => {
    expect(fechaConexion(new Date("2026-10-29T03:00:00Z"), AHORA)).toBe("28 de octubre");
    expect(fechaConexion(new Date("2025-12-01T18:00:00Z"), AHORA)).toBe("1 de diciembre de 2025");
  });
});

// OL-495: «caducó» se deduce del último trabajo de Instagram que terminó en la cola.
const trabajo = (estado: string, error: string | null, terminado_en: string): UltimoTrabajo => ({ estado, error, terminado_en });
describe("caducó", () => {
  const permiso = trabajo("fallido", "permiso", "2026-10-28T20:00:00Z");
  it("el último trabajo falló por permiso después de conectar: caducó, con el día", () => {
    expect(caducoEn(fila(), permiso)?.toISOString()).toBe("2026-10-28T20:00:00.000Z");
    const e = estadoConexion(fila(), true, new Date("2026-10-29T18:00:00Z"), permiso);
    expect(e).toMatchObject({ titulo: "Instagram dejó de publicar", detalle: "La conexión caducó el mié 28 de oct: reconecta", falta: true, boton: "Reconectar", punto: "mal", etiqueta: "La conexión con Instagram caducó" });
    expect(e.hoja).toMatchObject({ cuenta: "@smsnstrsapp", detalle: "Dejó de publicar el mié 28 de oct: la conexión caducó", principal: true, puede: [] });
  });
  it("antes de reconectar, por otra cosa o si el último salió bien: no caducó", () => {
    expect(caducoEn(fila(), trabajo("fallido", "permiso", "2026-10-28T16:00:00Z"))).toBeNull();
    expect(caducoEn(fila(), trabajo("fallido", "cupo", "2026-10-28T20:00:00Z"))).toBeNull();
    expect(caducoEn(fila(), trabajo("publicado", null, "2026-10-28T20:00:00Z"))).toBeNull();
    expect(caducoEn(fila(), null)).toBeNull();
    expect(estadoConexion(fila(), true, AHORA, trabajo("fallido", "imagen", "2026-10-28T20:00:00Z")).punto).toBe("ok");
  });
  it("con la llave de respaldo (sin fila) también caduca; sin ninguna, es «sin conexión»", () => {
    expect(estadoConexion(null, true, AHORA, permiso)).toMatchObject({ punto: "mal", hoja: { cuenta: "Sin conexión propia" } });
    expect(estadoConexion(null, false, AHORA, permiso)).toMatchObject({ punto: "no", titulo: "Sin conexión" });
  });
  it("para la portada: solo lo que pide atención", () => {
    expect(conexionPendiente(fila(), true, null, AHORA)).toBeNull();
    expect(conexionPendiente(null, true, null, AHORA)).toBeNull();
    expect(conexionPendiente(null, false, null, AHORA)).toEqual({ titulo: "Sin conexión", detalle: "Conecta Instagram para publicar", punto: "no" });
    expect(conexionPendiente(fila(), true, permiso, new Date("2026-10-29T18:00:00Z"))).toEqual({ titulo: "Instagram dejó de publicar", detalle: "La conexión caducó el mié 28 de oct: reconecta", punto: "mal" });
  });
});

describe("leerConexion", () => {
  /** Un cliente de mentira que anota lo que se le pide y responde lo de cada tabla. */
  const cliente = (respuestas: Record<string, { data: unknown; error: unknown }>) => {
    const pedido: Record<string, unknown[]> = {};
    const from = (tabla: string) => {
      const pasos: unknown[] = [];
      pedido[tabla] = pasos;
      const q = new Proxy({}, { get: (_o, k) => (k === "then" ? (r: (x: unknown) => void) => r(respuestas[tabla]) : (...a: unknown[]) => (pasos.push([k, ...a]), q)) });
      return q;
    };
    return { db: { from } as never, pedido };
  };
  it("la fila y el último trabajo de Instagram que terminó, del más reciente", async () => {
    const { db, pedido } = cliente({ instagram_conexion: { data: [fila()], error: null }, redes_trabajos: { data: [{ estado: "fallido", error: "permiso", terminado_en: "2026-10-28T20:00:00Z" }], error: null } });
    expect(await leerConexion(db)).toEqual({ fila: fila(), ultimo: { estado: "fallido", error: "permiso", terminado_en: "2026-10-28T20:00:00Z" } });
    expect(pedido.redes_trabajos).toEqual([["select", "estado, error, terminado_en"], ["eq", "red", "instagram"], ["in", "estado", ["publicado", "fallido"]], ["order", "terminado_en", { ascending: false }], ["limit", 1]]);
  });
  it("lo que no se pudo leer llega null: no inventa un problema", async () => {
    const { db } = cliente({ instagram_conexion: { data: null, error: { code: "x" } }, redes_trabajos: { data: null, error: { code: "x" } } });
    expect(await leerConexion(db)).toEqual({ fila: null, ultimo: null });
  });
});

describe("claveDeVuelta", () => {
  it("solo las claves conocidas", () => {
    expect(claveDeVuelta("conectado")).toBe("conectado");
    expect(claveDeVuelta("pagina")).toBe("pagina");
    expect(claveDeVuelta("<script>")).toBeNull();
    expect(claveDeVuelta("toString")).toBeNull();
    expect(claveDeVuelta(null)).toBeNull();
  });
  it("las frases no llevan nada técnico", () => {
    for (const f of Object.values(FRASES_CONEXION)) expect(f).not.toMatch(/token|oauth|state|http|error|[0-9]{3}/i);
  });
});
