import { describe, expect, it } from "vitest";
import { destinoConSlug, esUuidExacto, rutaConUuid } from "./redireccionSlug";

const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("esUuidExacto", () => {
  it("acepta la forma 8-4-4-4-12 en minúsculas y en mayúsculas", () => {
    expect(esUuidExacto(UUID)).toBe(true);
    expect(esUuidExacto(UUID.toUpperCase())).toBe(true);
  });
  it("rechaza slugs, UUID sin guiones y cadenas del largo justo pero mal formadas", () => {
    expect(esUuidExacto("noche-de-jazz")).toBe(false);
    expect(esUuidExacto("trio-xochitl-2")).toBe(false);
    expect(esUuidExacto(UUID.replaceAll("-", ""))).toBe(false);
    // 36 caracteres con guiones y hexadecimal, pero con los guiones fuera de sitio: esUuid de lib/formulario lo
    // daría por bueno; aquí no, porque decide una consulta extra.
    expect(esUuidExacto("3f2504e04-f89-41d3-9a0c-0305e82c3301")).toBe(false);
    expect(esUuidExacto("")).toBe(false);
  });
});

describe("rutaConUuid", () => {
  it("reconoce la ficha de las tres secciones con UUID", () => {
    expect(rutaConUuid(`/artistas/${UUID}`)).toEqual({ tabla: "artistas", uuid: UUID, resto: "" });
    expect(rutaConUuid(`/lugares/${UUID}`)).toEqual({ tabla: "lugares", uuid: UUID, resto: "" });
    expect(rutaConUuid(`/eventos/${UUID}`)).toEqual({ tabla: "eventos", uuid: UUID, resto: "" });
  });
  it("conserva el tramo posterior (editar, calendario)", () => {
    expect(rutaConUuid(`/eventos/${UUID}/editar`)).toEqual({ tabla: "eventos", uuid: UUID, resto: "/editar" });
    expect(rutaConUuid(`/eventos/${UUID}/calendario`)?.resto).toBe("/calendario");
  });
  it("deja pasar las direcciones con slug: no pagan ninguna consulta", () => {
    expect(rutaConUuid("/eventos/noche-de-jazz")).toBeNull();
    expect(rutaConUuid("/artistas/trio-xochitl-2/editar")).toBeNull();
    expect(rutaConUuid("/lugares/nuevo")).toBeNull();
  });
  it("ignora las secciones sin slug y las listas", () => {
    expect(rutaConUuid(`/obra/${UUID}`)).toBeNull();
    expect(rutaConUuid(`/personas/${UUID}`)).toBeNull();
    expect(rutaConUuid(`/admin/obras-colectivas/${UUID}`)).toBeNull();
    expect(rutaConUuid("/eventos")).toBeNull();
    expect(rutaConUuid("/")).toBeNull();
  });
});

describe("destinoConSlug", () => {
  const ruta = { tabla: "eventos" as const, uuid: UUID, resto: "" };
  it("cambia el UUID por el slug y conserva la query tal cual", () => {
    expect(destinoConSlug(ruta, "noche-de-jazz")).toBe("/eventos/noche-de-jazz");
    expect(destinoConSlug(ruta, "noche-de-jazz", "?accion=voy&nuevo=1")).toBe("/eventos/noche-de-jazz?accion=voy&nuevo=1");
    expect(destinoConSlug(ruta, "noche-de-jazz", "")).toBe("/eventos/noche-de-jazz");
  });
  it("conserva el tramo posterior antes de la query", () => {
    expect(destinoConSlug({ ...ruta, resto: "/editar" }, "noche-de-jazz", "?error=x")).toBe("/eventos/noche-de-jazz/editar?error=x");
  });
  it("devuelve solo la ruta y escapa un slug raro sin romper la ruta", () => {
    expect(destinoConSlug({ tabla: "artistas", uuid: UUID, resto: "" }, "trio-xochitl-2")).toBe("/artistas/trio-xochitl-2");
    expect(destinoConSlug(ruta, "a/b")).toBe("/eventos/a%2Fb");
  });
});
