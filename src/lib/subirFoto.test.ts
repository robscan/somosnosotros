import { beforeEach, describe, expect, it, vi } from "vitest";
import { subirFoto, TAMANO_MAX_FOTO } from "./subirFoto";

const mocks = vi.hoisted(() => ({
  cliente: vi.fn(),
  reducir: vi.fn(),
  from: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock("./supabase/navegador", () => ({ clienteNavegador: mocks.cliente }));
vi.mock("./imagen", async (original) => ({ ...(await original<typeof import("./imagen")>()), prepararImagen: mocks.reducir }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.cliente.mockReturnValue({ storage: { from: mocks.from } });
  mocks.from.mockReturnValue({ upload: mocks.upload, getPublicUrl: mocks.getPublicUrl });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.reducir.mockImplementation(async (archivo: File) => ({ archivo }));
  mocks.getPublicUrl.mockImplementation((ruta: string) => ({ data: { publicUrl: `https://storage.local/fotos/${ruta}` } }));
});

describe("subirFoto", () => {
  for (const carpeta of ["perfiles", "lugares", "artistas"] as const) {
    it(`conserva carpeta y propietario en ${carpeta}, con nombre aleatorio sin sobrescritura`, async () => {
      const foto = new File(["foto"], "foto.JPG", { type: "image/jpeg" });
      const resultado = await subirFoto(carpeta, "cuenta", "portada", foto);
      const [ruta, archivo, opciones] = mocks.upload.mock.calls[0];
      expect(ruta).toMatch(new RegExp(`^${carpeta}/cuenta/portada-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.jpg$`));
      expect(archivo).toBe(foto);
      expect(opciones).toEqual({ upsert: false, contentType: "image/jpeg" });
      expect(mocks.from).toHaveBeenCalledWith("fotos");
      expect(resultado).toEqual({ url: `https://storage.local/fotos/${ruta}` });
      await subirFoto(carpeta, "cuenta", "portada", foto);
      expect(mocks.upload.mock.calls[1][0]).not.toBe(ruta);
    });
  }

  it("usa la extension y tipo de la imagen reducida", async () => {
    const original = new File(["png"], "imagen.png", { type: "image/png" });
    const reducida = new File(["jpg"], "imagen.jpg", { type: "image/jpeg" });
    mocks.reducir.mockResolvedValue({ archivo: reducida });
    await subirFoto("perfiles", "cuenta", "foto", original);
    expect(mocks.reducir).toHaveBeenCalledWith(original, { ladoMaximo: 1600, tope: TAMANO_MAX_FOTO });
    expect(mocks.upload.mock.calls[0][0]).toMatch(/\.jpg$/);
    expect(mocks.upload.mock.calls[0][1]).toBe(reducida);
  });

  it("prepara antes de comprobar el peso: una captura grande que se comprime sube (OL-352)", async () => {
    const grande = new File([new Uint8Array(TAMANO_MAX_FOTO + 1)], "captura.png", { type: "image/png" });
    const chica = new File([new Uint8Array(300 * 1024)], "captura.jpg", { type: "image/jpeg" });
    mocks.reducir.mockResolvedValue({ archivo: chica });
    expect(await subirFoto("lugares", "cuenta", "evento", grande, "imagen", "cartel")).toHaveProperty("url");
    expect(mocks.reducir).toHaveBeenCalledWith(grande, { ladoMaximo: 2000, tope: TAMANO_MAX_FOTO });
    expect(mocks.upload.mock.calls[0][1]).toBe(chica);
    expect(mocks.upload.mock.calls[0][0]).toMatch(/\.jpg$/);
  });

  it("el lado depende del uso: perfil 800, portada 1600, cartel 2000", async () => {
    const foto = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    await subirFoto("perfiles", "cuenta", "foto", foto, "foto", "perfil");
    await subirFoto("lugares", "cuenta", "portada", foto);
    await subirFoto("lugares", "cuenta", "cartel-foto", foto, "foto", "cartel");
    expect(mocks.reducir.mock.calls.map((c) => c[1].ladoMaximo)).toEqual([800, 1600, 2000]);
  });

  it("si no se pudo leer y la original pasa del tope, dice que pesa; si cabe, que no se pudo leer; nunca sube", async () => {
    mocks.reducir.mockResolvedValue({ fallo: "lectura" });
    const grande = new File([new Uint8Array(TAMANO_MAX_FOTO + 1)], "foto.heic");
    expect(await subirFoto("perfiles", "cuenta", "foto", grande)).toEqual({ error: "La foto pesa más de 5 MB. Elige otra.", motivo: "pesa" });
    expect(await subirFoto("perfiles", "cuenta", "foto", new File(["texto"], "nota.jpg"))).toEqual({ error: "No se pudo leer la imagen. Prueba con otra.", motivo: "lectura" });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("no sube lo que, aun preparado, pasa del tope", async () => {
    mocks.reducir.mockResolvedValue({ archivo: new File([new Uint8Array(TAMANO_MAX_FOTO + 1)], "foto.jpg", { type: "image/jpeg" }) });
    expect(await subirFoto("perfiles", "cuenta", "foto", new File(["x"], "foto.jpg"))).toMatchObject({ motivo: "pesa" });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("sin cliente devuelve un error y no toca Storage", async () => {
    mocks.cliente.mockReturnValue(null);
    expect(await subirFoto("perfiles", "cuenta", "foto", new File([], "foto.jpg"))).toMatchObject({ motivo: "subida" });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("no publica una URL ni reintenta con upsert ante un error de subida", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "Object already exists" } });
    expect(await subirFoto("perfiles", "cuenta", "foto", new File([], "foto.jpg"))).toMatchObject({ motivo: "subida" });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.getPublicUrl).not.toHaveBeenCalled();
  });
});
