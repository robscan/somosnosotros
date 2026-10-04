import { describe, expect, it } from "vitest";
import { objetoYaExiste, rutaConContenido } from "./nombre-contenido.mjs";

describe("URLs de importaciones inmutables por contenido", () => {
  const ruta = "artistas/autor/importadas/nombre.jpg";
  it("usa SHA-256 de los bytes finales y conserva carpeta/extensión", () => {
    expect(rutaConContenido(ruta, Buffer.from("abc"))).toBe(
      "artistas/autor/importadas/nombre-ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad.jpg",
    );
  });
  it("repetir contenido reutiliza la URL; cambiar la foto crea otra", () => {
    expect(rutaConContenido(ruta, Buffer.from([0, 255]))).toBe(rutaConContenido(ruta, new Uint8Array([0, 255])));
    expect(rutaConContenido(ruta, Buffer.from([0, 255]))).not.toBe(rutaConContenido(ruta, Buffer.from([255, 0])));
  });
  it("un punto en la carpeta no se interpreta como extensión", () => {
    expect(rutaConContenido("carpeta.con.puntos/foto", Buffer.from("abc"))).toMatch(/^carpeta\.con\.puntos\/foto-[a-f0-9]{64}$/);
  });
  it("reutiliza solo un conflicto de objeto, también con la respuesta antigua400", () => {
    expect(objetoYaExiste({ code: "ResourceAlreadyExists", status: 400 })).toBe(true);
    expect(objetoYaExiste({ code: "KeyAlreadyExists", status: 409 })).toBe(true);
    expect(objetoYaExiste({ statusCode: "409", message: "The resource already exists" })).toBe(true);
    expect(objetoYaExiste({ status: 400, message: "Asset Already Exists" })).toBe(true);
    for (const error of [null, { status: 409, message: "Other conflict" }, { status: 400, message: "Invalid request" }, { status: 403, message: "Duplicate" }, { code: "AccessDenied", statusCode: "409", message: "The resource already exists" }]) {
      expect(objetoYaExiste(error)).toBe(false);
    }
  });
});
