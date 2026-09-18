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
vi.mock("./imagen", () => ({ reducirImagen: mocks.reducir }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.cliente.mockReturnValue({ storage: { from: mocks.from } });
  mocks.from.mockReturnValue({ upload: mocks.upload, getPublicUrl: mocks.getPublicUrl });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.reducir.mockImplementation(async (archivo: File) => archivo);
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
    mocks.reducir.mockResolvedValue(reducida);
    await subirFoto("perfiles", "cuenta", "foto", original);
    expect(mocks.reducir).toHaveBeenCalledWith(original);
    expect(mocks.upload.mock.calls[0][0]).toMatch(/\.jpg$/);
    expect(mocks.upload.mock.calls[0][1]).toBe(reducida);
  });

  it("no sube ni reduce una foto demasiado grande", async () => {
    const grande = new File([new Uint8Array(TAMANO_MAX_FOTO + 1)], "foto.jpg");
    expect(await subirFoto("perfiles", "cuenta", "foto", grande)).toMatchObject({ motivo: "pesa" });
    expect(mocks.reducir).not.toHaveBeenCalled();
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
