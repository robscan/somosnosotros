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
      expect(limpiarUrlAnalitica("/lugares?q=rosa&tipo=museo")).toBe("https://somosnosotros.org/lugares?tipo=museo");
      expect(limpiarUrlAnalitica("/agenda?filtro=siguiendo&cuanto=gratis&que=talleres&desde=2026-10-07")).toBe("https://somosnosotros.org/agenda?filtro=siguiendo&cuanto=gratis&que=talleres");
      expect(limpiarUrlAnalitica("/lugares?tipo=museo&tipo=foro&utm_source=x")).toBe("https://somosnosotros.org/lugares?tipo=museo&tipo=foro");
    });

    it("remueve parámetros privados y mantiene públicos", () => {
      expect(limpiarUrlAnalitica("/lugares?q=concierto&tipo=galeria")).toBe(
        "https://somosnosotros.org/lugares?tipo=galeria"
      );
    });
  });

  describe("OL-334 · F13: valores validados contra la lista cerrada de cada filtro", () => {
    it("el caso de Codex: un valor libre en un parámetro permitido no sale", () => {
      expect(limpiarUrlAnalitica("https://somosnosotros.org/agenda?tipo=correo%40local.test")).toBe("https://somosnosotros.org/agenda");
      expect(limpiarUrlAnalitica("/agenda?tipo=correo%40local.test")).toBe("https://somosnosotros.org/agenda");
    });

    it("cada parámetro conserva sus valores válidos", () => {
      expect(limpiarUrlAnalitica("/lugares?tipo=casa_de_cultura")).toBe("https://somosnosotros.org/lugares?tipo=casa_de_cultura");
      expect(limpiarUrlAnalitica("/lugares?tipo=cafe_bar")).toBe("https://somosnosotros.org/lugares?tipo=cafe_bar");
      expect(limpiarUrlAnalitica("/nuevo?tipo=artista")).toBe("https://somosnosotros.org/nuevo?tipo=artista");
      expect(limpiarUrlAnalitica("/agenda?que=exposiciones")).toBe("https://somosnosotros.org/agenda?que=exposiciones");
      expect(limpiarUrlAnalitica("/agenda?que=festivales")).toBe("https://somosnosotros.org/agenda?que=festivales");
      expect(limpiarUrlAnalitica("/agenda?filtro=siguiendo")).toBe("https://somosnosotros.org/agenda?filtro=siguiendo");
      expect(limpiarUrlAnalitica("/artistas?hace=artes_visuales")).toBe("https://somosnosotros.org/artistas?hace=artes_visuales");
      expect(limpiarUrlAnalitica("/artistas?disciplina=circo")).toBe("https://somosnosotros.org/artistas?disciplina=circo");
    });

    it("cada parámetro quita lo que no está en su lista", () => {
      expect(limpiarUrlAnalitica("/lugares?tipo=ana%40correo.mx")).toBe("https://somosnosotros.org/lugares");
      expect(limpiarUrlAnalitica("/agenda?que=rosa")).toBe("https://somosnosotros.org/agenda");
      expect(limpiarUrlAnalitica("/agenda?filtro=cercanos")).toBe("https://somosnosotros.org/agenda");
      expect(limpiarUrlAnalitica("/artistas?hace=mi-banda")).toBe("https://somosnosotros.org/artistas");
      expect(limpiarUrlAnalitica("/artistas?disciplina=por_completar")).toBe("https://somosnosotros.org/artistas");
      // En /artistas `que` es una subcategoría que escribió la gente: no es de una lista cerrada.
      expect(limpiarUrlAnalitica("/artistas?hace=musica&que=Los%20Vecinos")).toBe("https://somosnosotros.org/artistas?hace=musica");
    });

    it("distingue mayúsculas y no cuela nombres como constructor o __proto__", () => {
      expect(limpiarUrlAnalitica("/lugares?tipo=MUSEO&constructor=museo&__proto__=museo&toString=x")).toBe("https://somosnosotros.org/lugares");
    });

    it("cuanto es una lista con comas: solo quedan las clases de costo válidas", () => {
      expect(limpiarUrlAnalitica("/agenda?cuanto=gratis,cooperacion")).toBe("https://somosnosotros.org/agenda?cuanto=gratis%2Ccooperacion");
      expect(limpiarUrlAnalitica("/agenda?cuanto=gratis,ana%40correo.mx")).toBe("https://somosnosotros.org/agenda?cuanto=gratis");
      expect(limpiarUrlAnalitica("/agenda?cuanto=ana%40correo.mx")).toBe("https://somosnosotros.org/agenda");
      expect(limpiarUrlAnalitica("/agenda?cuanto=")).toBe("https://somosnosotros.org/agenda");
    });

    it("un parámetro repetido conserva solo los valores válidos", () => {
      expect(limpiarUrlAnalitica("/lugares?tipo=museo&tipo=a%40b.mx&tipo=foro")).toBe("https://somosnosotros.org/lugares?tipo=museo&tipo=foro");
    });
  });

  describe("OL-334 · F13: la ficha de una persona no manda su id", () => {
    it("/personas/<id> queda en /personas", () => {
      expect(limpiarUrlAnalitica("https://somosnosotros.org/personas/00000000-0000-0000-0000-000000000001")).toBe("https://somosnosotros.org/personas");
      expect(limpiarUrlAnalitica("/personas/00000000-0000-0000-0000-000000000001?tipo=museo&q=x")).toBe("https://somosnosotros.org/personas?tipo=museo");
      expect(limpiarUrlAnalitica("/personas")).toBe("https://somosnosotros.org/personas");
    });

    it("también con la barra codificada o en mayúsculas", () => {
      expect(limpiarUrlAnalitica("/personas%2F00000000-0000-0000-0000-000000000001")).toBe("https://somosnosotros.org/personas");
      expect(limpiarUrlAnalitica("/Personas/00000000-0000-0000-0000-000000000001")).toBe("https://somosnosotros.org/personas");
    });

    it("no toca las fichas públicas por slug ni rutas que solo empiezan parecido", () => {
      expect(limpiarUrlAnalitica("/lugares/casa-de-la-cultura")).toBe("https://somosnosotros.org/lugares/casa-de-la-cultura");
      expect(limpiarUrlAnalitica("/artistas/los-vecinos")).toBe("https://somosnosotros.org/artistas/los-vecinos");
      expect(limpiarUrlAnalitica("/eventos/fiesta-mayor")).toBe("https://somosnosotros.org/eventos/fiesta-mayor");
      expect(limpiarUrlAnalitica("/personasx/uno")).toBe("https://somosnosotros.org/personasx/uno");
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
        limpiarUrlAnalitica("/artistas?buscar=lopez&ciudad=slp&disciplina=artes_visuales")
      ).toBe("https://somosnosotros.org/artistas?disciplina=artes_visuales");
    });

    it("mantiene ruta correcta después de limpiar", () => {
      expect(limpiarUrlAnalitica("/lugares/123?q=teatro&tipo=museo")).toBe(
        "https://somosnosotros.org/lugares/123?tipo=museo"
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
