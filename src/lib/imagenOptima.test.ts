import { describe, expect, it } from "vitest";
import { CONFIG_IMAGENES, HOST_FOTOS, RUTA_FOTOS, fondoImagen, optimizable, tamanoImagenCarril } from "./imagenOptima";

const propia = `https://${HOST_FOTOS}${RUTA_FOTOS}artistas/persona/foto.jpg`;

describe("imágenes adaptadas (OL-263)", () => {
  it.each(["jpg", "jpeg", "png", "webp", "avif", "JPG"])("optimiza el archivo público propio %s sin cambiar su identidad", (ext) => {
    expect(optimizable(propia.replace(/jpg$/, ext))).toBe(true);
  });

  it.each([
    "", "/sin-foto.png", "blob:https://somosnosotros.org/abc", "data:image/png;base64,abc",
    "https://lh3.googleusercontent.com/avatar.jpg", "https://externo.example/foto.jpg",
    propia.replace(HOST_FOTOS, `${HOST_FOTOS}.otro.example`),
    propia.replace("https://", "http://"), propia.replace("https://", "https://admin@"),
    propia.replace(".co/", ".co:8443/"), propia.replace("/fotos/", "/obras/"),
    propia.replace("/public/", "/sign/"), propia + "?token=privado", propia + "#otro",
    propia.replace("foto.jpg", "../../obras/privada.jpg"),
    propia.replace("foto.jpg", "%2e%2e/privada.jpg"),
    propia.replace("foto.jpg", "%2fprivada.jpg"), propia.replace("foto.jpg", "%252fprivada.jpg"),
    propia.replace("foto.jpg", "a\\b.jpg"), propia.replace("foto.jpg", "a\nb.jpg"),
    propia.replace("jpg", "svg"), propia.replace("jpg", "gif"),
  ])("conserva directa la imagen fuera de la optimización: %s", (url) => {
    expect(optimizable(url)).toBe(false);
  });

  it("conserva nombres codificados y rutas versionadas por contenido", () => {
    expect(optimizable(propia.replace("foto.jpg", "portada%20de%20m%C3%BAsica-a3f6.jpg"))).toBe(true);
  });

  it("el fondo de la barra compacta usa una variante fija sin tocar URLs ajenas", () => {
    const fondo = new URL(fondoImagen(propia), "https://somosnosotros.org");
    expect(fondo.pathname).toBe("/_next/image");
    expect(fondo.searchParams.get("url")).toBe(propia);
    expect(fondo.searchParams.get("w")).toBe("384");
    expect(fondo.searchParams.get("q")).toBe("75");
    expect(fondoImagen("https://otra.example/foto.jpg")).toBe("https://otra.example/foto.jpg");
  });

  it("limita consumo y destinos también en el servidor", () => {
    expect(CONFIG_IMAGENES.remotePatterns).toEqual([{ protocol: "https", hostname: HOST_FOTOS, port: "", pathname: `${RUTA_FOTOS}**`, search: "" }]);
    expect([...CONFIG_IMAGENES.deviceSizes, ...CONFIG_IMAGENES.imageSizes].length).toBeLessThanOrEqual(6);
    expect(CONFIG_IMAGENES.qualities).toEqual([75]);
    expect(CONFIG_IMAGENES.formats).toEqual(["image/webp"]);
    expect(CONFIG_IMAGENES.minimumCacheTTL).toBeGreaterThanOrEqual(30 * 86400);
    expect(CONFIG_IMAGENES.maximumRedirects).toBe(0);
    expect(CONFIG_IMAGENES.dangerouslyAllowLocalIP).toBe(false);
    expect(CONFIG_IMAGENES.dangerouslyAllowSVG).toBe(false);
    expect(CONFIG_IMAGENES.maximumResponseBody).toBe(5 * 1024 * 1024);
  });

  it("declara las tres cajas del carril sin enviar tamaño de héroe a una miniatura", () => {
    expect(tamanoImagenCarril("grande")).toBe("(min-width: 1048px) 190px, 165px");
    // OL-370 y OL-372: la tarjeta mediana de un evento o de un artista, 4/5 de la grande (132 y, desde 1048, 152).
    expect(tamanoImagenCarril("cartelMediana")).toBe("(min-width: 1048px) 152px, 132px");
    // OL-372: el avatar de 64 de un lugar o un artista (a 2× pide la variante de 192, no la de 384 de la redonda de 104).
    expect(tamanoImagenCarril("avatar")).toBe("64px");
  });
});
