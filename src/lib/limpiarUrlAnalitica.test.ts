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

    it("remueve el nombre que se buscó y se llevó al alta", () => {
      expect(limpiarUrlAnalitica("/nuevo?tipo=artista&nombre=Los%20Vecinos")).toBe("https://somosnosotros.org/nuevo?tipo=artista");
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

    it("mantiene solo los parámetros de la lista blanca (lo desconocido se quita)", () => {
      // Antes (lista negra) `estado` pasaba; con la lista blanca (OL-325, F03) un parámetro que no está en ella no sale.
      expect(limpiarUrlAnalitica("/lugares?tipo=museo&estado=activo")).toBe(
        "https://somosnosotros.org/lugares?tipo=museo"
      );
    });

    it("F03: el alta de lugar con el punto del mapa no deja salir ni el nombre ni la posición", () => {
      expect(limpiarUrlAnalitica("https://somosnosotros.org/nuevo/lugar?nombre=Casa%20de%20la%20Cultura&lat=22.151123&lng=-100.977456")).toBe(
        "https://somosnosotros.org/nuevo/lugar"
      );
      expect(limpiarUrlAnalitica("/nuevo/lugar?nombre=Casa&lat=22.151123&lng=-100.977456&ciudad=slp")).toBe("https://somosnosotros.org/nuevo/lugar");
    });

    it("F03: ids, fechas de duplicar y texto libre tampoco salen", () => {
      expect(limpiarUrlAnalitica("/nuevo/evento?lugar=0b3c2a1e-0000-4000-8000-000000000000&artista=7&desde=0b3c&ciudad=slp")).toBe("https://somosnosotros.org/nuevo/evento");
      expect(limpiarUrlAnalitica("/buscar?q=rosa&tipo=lugares")).toBe("https://somosnosotros.org/buscar?tipo=lugares");
      expect(limpiarUrlAnalitica("/agenda?filtro=semana&cuanto=gratis&que=teatro&desde=2026-10-07")).toBe("https://somosnosotros.org/agenda?filtro=semana&cuanto=gratis&que=teatro");
      expect(limpiarUrlAnalitica("/lugares?tipo=museo&tipo=teatro&utm_source=x")).toBe("https://somosnosotros.org/lugares?tipo=museo&tipo=teatro");
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
