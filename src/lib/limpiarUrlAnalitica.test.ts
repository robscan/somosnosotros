import { describe, it, expect } from "vitest";
import { limpiarUrlAnalitica } from "./limpiarUrlAnalitica";

describe("limpiarUrlAnalitica", () => {
  describe("Rutas públicas permitidas", () => {
    it("permite rastrear la página de inicio", () => {
      expect(limpiarUrlAnalitica("/")).toBe("https://somosnosotros.org/");
    });

    it("permite rastrear una lista de lugares sin query", () => {
      expect(limpiarUrlAnalitica("/lugares")).toBe("https://somosnosotros.org/lugares");
    });

    it("permite rastrear una ficha de lugar", () => {
      expect(limpiarUrlAnalitica("/lugares/123")).toBe("https://somosnosotros.org/lugares/123");
    });

    it("permite rastrear una lista de eventos", () => {
      expect(limpiarUrlAnalitica("/eventos")).toBe("https://somosnosotros.org/eventos");
    });

    it("permite rastrear una ficha de evento", () => {
      expect(limpiarUrlAnalitica("/eventos/abc-def")).toBe(
        "https://somosnosotros.org/eventos/abc-def"
      );
    });

    it("permite rastrear una lista de artistas", () => {
      expect(limpiarUrlAnalitica("/artistas")).toBe("https://somosnosotros.org/artistas");
    });

    it("permite rastrear la página de reglas", () => {
      expect(limpiarUrlAnalitica("/reglas")).toBe("https://somosnosotros.org/reglas");
    });

    it("permite rastrear la página de privacidad", () => {
      expect(limpiarUrlAnalitica("/privacidad")).toBe("https://somosnosotros.org/privacidad");
    });
  });

  describe("Rutas privadas bloqueadas", () => {
    it("no traceia rutas de admin", () => {
      expect(limpiarUrlAnalitica("/admin")).toBeNull();
    });

    it("no traceia subrutas de admin", () => {
      expect(limpiarUrlAnalitica("/admin/usuarios")).toBeNull();
      expect(limpiarUrlAnalitica("/admin/reportes")).toBeNull();
    });

    it("no traceia la ruta de perfil", () => {
      expect(limpiarUrlAnalitica("/perfil")).toBeNull();
    });

    it("no traceia rutas de ajustes", () => {
      expect(limpiarUrlAnalitica("/ajustes")).toBeNull();
    });

    it("no traceia rutas de invitación", () => {
      expect(limpiarUrlAnalitica("/invitacion/abc123")).toBeNull();
    });

    it("no traceia rutas de reclamación", () => {
      expect(limpiarUrlAnalitica("/reclamar/xyz789")).toBeNull();
    });

    it("no traceia rutas de entrada", () => {
      expect(limpiarUrlAnalitica("/entrar")).toBeNull();
    });
  });

  describe("Parámetros privados removidos", () => {
    it("remueve la query de búsqueda", () => {
      expect(limpiarUrlAnalitica("/lugares?q=teatro")).toBe("https://somosnosotros.org/lugares");
    });

    it("remueve el parámetro de ciudad", () => {
      expect(limpiarUrlAnalitica("/lugares?ciudad=SLP")).toBe("https://somosnosotros.org/lugares");
    });

    it("remueve múltiples parámetros privados", () => {
      expect(limpiarUrlAnalitica("/lugares?q=danza&ciudad=monterrey")).toBe(
        "https://somosnosotros.org/lugares"
      );
    });

    it("remueve token de invitación", () => {
      expect(limpiarUrlAnalitica("/lugares?token=abc123xyz")).toBe(
        "https://somosnosotros.org/lugares"
      );
    });

    it("remueve código de acceso", () => {
      expect(limpiarUrlAnalitica("/eventos?codigo=123456")).toBe(
        "https://somosnosotros.org/eventos"
      );
    });

    it("mantiene parámetros públicos permitidos", () => {
      expect(limpiarUrlAnalitica("/lugares?tipo=museo&estado=activo")).toBe(
        "https://somosnosotros.org/lugares?tipo=museo&estado=activo"
      );
    });

    it("remueve parámetros privados y mantiene públicos", () => {
      expect(limpiarUrlAnalitica("/eventos?q=concierto&tipo=gratuito")).toBe(
        "https://somosnosotros.org/eventos?tipo=gratuito"
      );
    });
  });

  describe("Casos complejos", () => {
    it("limpia URL completa con protocolo y conserva el origen real", () => {
      expect(limpiarUrlAnalitica("https://somosnosotros.org/lugares?q=música")).toBe(
        "https://somosnosotros.org/lugares"
      );
    });

    it("conserva el origen real cuando la entrada trae otro dominio", () => {
      expect(limpiarUrlAnalitica("https://otro-dominio.example/lugares?q=música")).toBe(
        "https://otro-dominio.example/lugares"
      );
    });

    it("remueve múltiples parámetros manteniendo orden", () => {
      expect(
        limpiarUrlAnalitica("/artistas?buscar=lopez&ciudad=slp&disciplina=artes-visuales")
      ).toBe("https://somosnosotros.org/artistas?disciplina=artes-visuales");
    });

    it("mantiene ruta correcta después de limpiar", () => {
      expect(limpiarUrlAnalitica("/lugares/123?q=teatro&tipo=cultural")).toBe(
        "https://somosnosotros.org/lugares/123?tipo=cultural"
      );
    });

    it("el resultado siempre empieza por https://", () => {
      expect(limpiarUrlAnalitica("/lugares")).toMatch(/^https:\/\//);
      expect(limpiarUrlAnalitica("https://somosnosotros.org/eventos")).toMatch(/^https:\/\//);
    });
  });

  describe("Casos fallidos", () => {
    it("devuelve null para URL inválida", () => {
      expect(limpiarUrlAnalitica(":::invalid")).toBeNull();
    });

    it("devuelve null para URL vacía", () => {
      expect(limpiarUrlAnalitica("")).toBeNull();
    });
  });
});
