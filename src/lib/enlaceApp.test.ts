import { describe, expect, it } from "vitest";
import { rutaDeEnlaceApp } from "./enlaceApp";

/** OL-474: «Abrir» del letrero y los enlaces con la app abierta llevan a la ficha; nada de fuera mueve la app. */
describe("rutaDeEnlaceApp", () => {
  it("convierte una dirección de nuestros dominios en su ruta, con consulta y ancla", () => {
    expect(rutaDeEnlaceApp("https://somosnosotros.org/")).toBe("/");
    expect(rutaDeEnlaceApp("https://somosnosotros.org/eventos/concierto-en-el-jardin")).toBe("/eventos/concierto-en-el-jardin");
    expect(rutaDeEnlaceApp("https://somosnosotros.org/lugares/museo?vista=lista#mapa")).toBe("/lugares/museo?vista=lista#mapa");
    expect(rutaDeEnlaceApp("https://www.somosnosotros.org/artistas/ana")).toBe("/artistas/ana");
    expect(rutaDeEnlaceApp("https://somosnosotrxs.org/e/cumbia")).toBe("/e/cumbia");
    expect(rutaDeEnlaceApp("https://WWW.SomosNosotrxs.org/agenda")).toBe("/agenda");
  });

  it("ignora otros dominios, otros esquemas y lo que no es una dirección", () => {
    for (const d of [
      "https://otro.example/eventos/x",
      "https://somosnosotros.org.otro.example/eventos/x",
      "https://falso-somosnosotros.org/eventos/x",
      "http://somosnosotros.org/eventos/x",
      "somosnosotros://eventos/x",
      "javascript:alert(1)",
      "https://usuario:clave@somosnosotros.org/eventos/x",
      "https://somosnosotros.org:8443/eventos/x",
      "/eventos/x",
      "",
      null,
      undefined,
      42,
    ]) {
      expect(rutaDeEnlaceApp(d), String(d)).toBeNull();
    }
  });

  it("deja fuera lo que el archivo de enlaces universales deja en el navegador", () => {
    for (const d of [
      "https://somosnosotros.org/auth/callback?token_hash=x",
      "https://somosnosotros.org/auth",
      "https://somosnosotros.org/api/estado",
      "https://somosnosotros.org/avisos/baja?t=x",
      "https://somosnosotros.org/eventos/concierto/calendario",
    ]) {
      expect(rutaDeEnlaceApp(d), d).toBeNull();
    }
    expect(rutaDeEnlaceApp("https://somosnosotros.org/autores")).toBe("/autores");
    expect(rutaDeEnlaceApp("https://somosnosotros.org/eventos/calendario-de-fiestas")).toBe("/eventos/calendario-de-fiestas");
  });
});
