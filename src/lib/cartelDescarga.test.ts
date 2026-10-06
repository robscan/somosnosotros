import { describe, expect, it } from "vitest";
import { cartelDescargable, extensionDeImagen, nombreDeCartel } from "./cartelDescarga";

const SUPABASE = "https://proyecto.supabase.co";
const FOTOS = `${SUPABASE}/storage/v1/object/public/fotos/`;

describe("cartelDescargable", () => {
  it("solo las imágenes del bucket público propio", () => {
    expect(cartelDescargable(`${FOTOS}lugares/u1/evento-1.jpg`, SUPABASE)).toBe(true);
    expect(cartelDescargable(`${FOTOS}lugares/u1/evento-1.jpg`, `${SUPABASE}/`)).toBe(true);
    expect(cartelDescargable("https://otro.example/storage/v1/object/public/fotos/x.jpg", SUPABASE)).toBe(false);
    expect(cartelDescargable(`${SUPABASE}/storage/v1/object/public/obras/x.jpg`, SUPABASE)).toBe(false);
    expect(cartelDescargable(`${SUPABASE.replace("https", "http")}/storage/v1/object/public/fotos/x.jpg`, SUPABASE)).toBe(false);
  });

  it("sin imagen o sin configuración, no", () => {
    expect(cartelDescargable(null, SUPABASE)).toBe(false);
    expect(cartelDescargable("", SUPABASE)).toBe(false);
    expect(cartelDescargable(`${FOTOS}x.jpg`, null)).toBe(false);
    expect(cartelDescargable(FOTOS, SUPABASE)).toBe(false);
  });

  it("nada de querys, fragmentos, escapes de ruta ni caracteres raros", () => {
    for (const mala of [`${FOTOS}x.jpg?token=1`, `${FOTOS}x.jpg#a`, `${FOTOS}../obras/x.jpg`, `${FOTOS}%2e%2e/x.jpg`, `${FOTOS}a%2fb.jpg`, `${FOTOS}a b.jpg`, `${FOTOS}a\\b.jpg`]) expect(cartelDescargable(mala, SUPABASE), mala).toBe(false);
  });
});

describe("extensionDeImagen y nombreDeCartel", () => {
  it("la extensión sale del tipo, con o sin parámetros; lo que no es imagen no tiene", () => {
    expect(extensionDeImagen("image/jpeg")).toBe("jpg");
    expect(extensionDeImagen("image/PNG; charset=binary")).toBe("png");
    expect(extensionDeImagen("image/webp")).toBe("webp");
    expect(extensionDeImagen("image/svg+xml")).toBeNull();
    expect(extensionDeImagen("text/html")).toBeNull();
    expect(extensionDeImagen(null)).toBeNull();
  });

  it("el nombre lleva el slug limpio, y sin slug queda «cartel»", () => {
    expect(nombreDeCartel("lectura-en-voz-alta-ab12", "jpg")).toBe("cartel-lectura-en-voz-alta-ab12.jpg");
    expect(nombreDeCartel('mal"nombre/../x', "png")).toBe("cartel-mal-nombre-x.png");
    expect(nombreDeCartel(null, "jpg")).toBe("cartel.jpg");
  });
});
