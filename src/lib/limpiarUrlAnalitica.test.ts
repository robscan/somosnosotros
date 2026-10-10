import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { limpiarUrlAnalitica, limpiarUrlEvento } from "./limpiarUrlAnalitica";

describe("limpiarUrlAnalitica", () => {
  describe("Rutas públicas permitidas", () => {
    it("permite rastrear la página de inicio", () => {
      expect(limpiarUrlAnalitica("/")).toBe("https://somosnosotros.org/");
    });

    it("permite rastrear una lista de lugares sin query", () => {
      expect(limpiarUrlAnalitica("/lugares")).toBe("https://somosnosotros.org/lugares");
    });

    it("una ficha de lugar se mide como su sección (OL-340)", () => {
      expect(limpiarUrlAnalitica("/lugares/123")).toBe("https://somosnosotros.org/lugares");
    });

    it("permite rastrear una lista de eventos", () => {
      expect(limpiarUrlAnalitica("/eventos")).toBe("https://somosnosotros.org/eventos");
    });

    it("una ficha de evento se mide como su sección (OL-340)", () => {
      expect(limpiarUrlAnalitica("/eventos/abc-def")).toBe("https://somosnosotros.org/eventos");
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

    it("no toca rutas que solo empiezan parecido", () => {
      expect(limpiarUrlAnalitica("/personasx/uno")).toBe("https://somosnosotros.org/personasx/uno");
    });
  });

  describe("OL-340 · la ruta de una ficha queda en su sección, sin slug ni id", () => {
    // Slugs e ids inventados: ninguno es de producción.
    const SLUG = "casa-inventada-zz9";
    const UUID = "00000000-0000-4000-8000-000000000340";
    const base = "https://somosnosotros.org";

    it("cada ruta dinámica de la app, con lo que siga (editar, cartel, letrero, novedades…)", () => {
      const casos: [string, string][] = [
        [`/lugares/${SLUG}`, "/lugares"],
        [`/lugares/${SLUG}/editar`, "/lugares"],
        [`/eventos/${SLUG}`, "/eventos"],
        [`/eventos/${SLUG}/editar`, "/eventos"],
        [`/eventos/${SLUG}/cartel`, "/eventos"],
        [`/eventos/${SLUG}/calendario`, "/eventos"],
        [`/artistas/${SLUG}`, "/artistas"],
        [`/artistas/${SLUG}/editar`, "/artistas"],
        [`/artistas/${SLUG}/letrero`, "/artistas"],
        [`/artistas/${SLUG}/novedades/nueva`, "/artistas"],
        [`/artistas/${SLUG}/novedades/${UUID}/editar`, "/artistas"],
        [`/sitios/${SLUG}`, "/sitios"],
        [`/e/${SLUG}`, "/e"],
        [`/personas/${UUID}`, "/personas"],
        [`/obra/${UUID}/mando`, "/obra"],
        [`/obra/${UUID}/pared`, "/obra"],
        [`/api/cartel/${UUID}`, "/api"],
        [`/api/cartel-nuevo/${UUID}`, "/api"],
        [`/auth/apple/fin`, "/auth"],
      ];
      for (const [ruta, seccion] of casos) {
        expect(limpiarUrlAnalitica(ruta), ruta).toBe(base + seccion);
        expect(limpiarUrlAnalitica(base + ruta), ruta).toBe(base + seccion);
      }
    });

    it("también en mayúsculas", () => {
      expect(limpiarUrlAnalitica(`/Lugares/${SLUG}`)).toBe(`${base}/lugares`);
      expect(limpiarUrlAnalitica(`/EVENTOS/${SLUG}/Cartel`)).toBe(`${base}/eventos`);
      expect(limpiarUrlAnalitica(`/Sitios/${SLUG.toUpperCase()}`)).toBe(`${base}/sitios`);
      expect(limpiarUrlAnalitica(`/E/${SLUG}`)).toBe(`${base}/e`);
    });

    it("también con barra final o barras repetidas", () => {
      expect(limpiarUrlAnalitica(`/lugares/${SLUG}/`)).toBe(`${base}/lugares`);
      expect(limpiarUrlAnalitica(`/eventos/${SLUG}/editar/`)).toBe(`${base}/eventos`);
      expect(limpiarUrlAnalitica(`/e/${SLUG}/`)).toBe(`${base}/e`);
      expect(limpiarUrlAnalitica("/lugares/")).toBe(`${base}/lugares`);
      expect(limpiarUrlAnalitica(`${base}//lugares/${SLUG}`)).toBe(`${base}/lugares`);
      expect(limpiarUrlAnalitica(`/lugares//${SLUG}`)).toBe(`${base}/lugares`);
    });

    it("también con la barra codificada (%2f, %2F, doble) o una letra codificada", () => {
      expect(limpiarUrlAnalitica(`/lugares%2F${SLUG}`)).toBe(`${base}/lugares`);
      expect(limpiarUrlAnalitica(`/lugares%2f${SLUG}`)).toBe(`${base}/lugares`);
      expect(limpiarUrlAnalitica(`/eventos%2F${SLUG}%2Fcartel`)).toBe(`${base}/eventos`);
      expect(limpiarUrlAnalitica(`/sitios%2F${SLUG}`)).toBe(`${base}/sitios`);
      expect(limpiarUrlAnalitica(`/e%2F${SLUG}`)).toBe(`${base}/e`);
      expect(limpiarUrlAnalitica(`/lugares%252F${SLUG}`)).toBe(`${base}/lugares`);
      expect(limpiarUrlAnalitica(`/%6Cugares/${SLUG}`)).toBe(`${base}/lugares`);
      expect(limpiarUrlAnalitica(`/%2Flugares/${SLUG}`)).toBe(`${base}/lugares`);
    });

    it("con un «%» suelto (no se puede decodificar) también se reduce", () => {
      expect(limpiarUrlAnalitica(`/lugares/${SLUG}%`)).toBe(`${base}/lugares`);
      expect(limpiarUrlAnalitica(`/lugares%2F${SLUG}%zz`)).toBe(`${base}/lugares`);
    });

    it("la consulta permitida se conserva igual que en las listas (la misma regla que /personas)", () => {
      expect(limpiarUrlAnalitica(`/lugares/${SLUG}?tipo=museo&q=x&lugar=${UUID}`)).toBe(`${base}/lugares?tipo=museo`);
      expect(limpiarUrlAnalitica(`/eventos/${SLUG}/cartel?desde=publicado`)).toBe(`${base}/eventos`);
    });

    it("las listas sin slug y su consulta permitida no cambian", () => {
      expect(limpiarUrlAnalitica("/lugares")).toBe(`${base}/lugares`);
      expect(limpiarUrlAnalitica("/agenda")).toBe(`${base}/agenda`);
      expect(limpiarUrlAnalitica("/artistas")).toBe(`${base}/artistas`);
      expect(limpiarUrlAnalitica("/lugares?tipo=museo&tipo=foro")).toBe(`${base}/lugares?tipo=museo&tipo=foro`);
      expect(limpiarUrlAnalitica("/agenda?que=talleres&filtro=siguiendo&cuanto=gratis")).toBe(`${base}/agenda?que=talleres&filtro=siguiendo&cuanto=gratis`);
      expect(limpiarUrlAnalitica("/artistas?hace=musica")).toBe(`${base}/artistas?hace=musica`);
    });

    it("las demás rutas fijas tampoco cambian, ni las que solo empiezan parecido", () => {
      expect(limpiarUrlAnalitica("/nuevo/evento")).toBe(`${base}/nuevo/evento`);
      expect(limpiarUrlAnalitica("/nuevo/lugar")).toBe(`${base}/nuevo/lugar`);
      expect(limpiarUrlAnalitica("/nuevo/artista")).toBe(`${base}/nuevo/artista`);
      expect(limpiarUrlAnalitica("/buscar")).toBe(`${base}/buscar`);
      expect(limpiarUrlAnalitica("/novedades")).toBe(`${base}/novedades`);
      expect(limpiarUrlAnalitica("/")).toBe(`${base}/`);
      expect(limpiarUrlAnalitica("/lugaresx/uno")).toBe(`${base}/lugaresx/uno`);
      expect(limpiarUrlAnalitica("/ejemplo/uno")).toBe(`${base}/ejemplo/uno`);
      expect(limpiarUrlAnalitica("/sitiosx")).toBe(`${base}/sitiosx`);
    });

    it("las rutas privadas siguen sin mandarse", () => {
      expect(limpiarUrlAnalitica(`/admin/personas/${UUID}`)).toBeNull();
      expect(limpiarUrlAnalitica(`/admin/obras-colectivas/${UUID}`)).toBeNull();
      expect(limpiarUrlAnalitica("/admin/lugares")).toBeNull();
      expect(limpiarUrlAnalitica("/perfil")).toBeNull();
      expect(limpiarUrlAnalitica("/ajustes/editar")).toBeNull();
      expect(limpiarUrlAnalitica(`/entrar?siguiente=/lugares/${SLUG}`)).toBeNull();
    });

    it("limpiarUrlEvento: una acción en una ficha va con su sección, nunca con el slug", () => {
      expect(limpiarUrlEvento(`${base}/eventos/${SLUG}`)).toBe(`${base}/eventos`);
      expect(limpiarUrlEvento(`${base}/eventos/${SLUG}/cartel?desde=publicado`)).toBe(`${base}/eventos`);
      expect(limpiarUrlEvento(`${base}/lugares/${SLUG}`)).toBe(`${base}/lugares`);
      expect(limpiarUrlEvento(`${base}/artistas/${SLUG}`)).toBe(`${base}/artistas`);
      expect(limpiarUrlEvento(`${base}/sitios/${SLUG}`)).toBe(`${base}/sitios`);
      expect(limpiarUrlEvento(`/Eventos%2F${SLUG}/`)).toBe(`${base}/eventos`);
      expect(limpiarUrlEvento(`${base}/lugares?tipo=museo`)).toBe(`${base}/lugares?tipo=museo`);
    });

    it("limpiarUrlEvento: en una ruta privada queda el primer tramo, también con la barra codificada", () => {
      expect(limpiarUrlEvento(`${base}/admin/personas/${UUID}`)).toBe(`${base}/admin`);
      expect(limpiarUrlEvento(`${base}/entrar%2F${SLUG}`)).toBe(`${base}/entrar`);
      expect(limpiarUrlEvento(`${base}/perfil%2f${SLUG}`)).toBe(`${base}/perfil`);
    });
  });

  describe("OL-340 · ninguna ruta dinámica de src/app deja salir su slug", () => {
    // Si mañana aparece una ruta con `[slug]` o `[id]` (o cualquier tramo dinámico) que la limpieza no cubre, esta prueba falla.
    const APP = fileURLToPath(new URL("../app/", import.meta.url));
    const MARCA = "slug-inventado-zz9";

    /** Las carpetas de `src/app` con un tramo dinámico, como ruta de la URL con la marca en cada tramo dinámico. */
    function rutasDinamicas(carpeta: string): string[] {
      return readdirSync(carpeta).flatMap((nombre) => {
        const ruta = join(carpeta, nombre);
        if (!statSync(ruta).isDirectory()) return [];
        const debajo = rutasDinamicas(ruta);
        if (!nombre.startsWith("[")) return debajo;
        const tramos = relative(APP, ruta)
          .split(sep)
          .filter((t) => !/^\(.*\)$/.test(t) && !t.startsWith("@")) // grupos de rutas y ranuras no salen en la URL
          .map((t) => (t.startsWith("[") ? MARCA : t));
        return [`/${tramos.join("/")}`, ...debajo];
      });
    }

    const rutas = rutasDinamicas(APP);

    it("encuentra las rutas dinámicas de la app (la búsqueda funciona)", () => {
      expect(rutas).toContain(`/lugares/${MARCA}`);
      expect(rutas).toContain(`/eventos/${MARCA}`);
      expect(rutas).toContain(`/artistas/${MARCA}`);
      expect(rutas).toContain(`/sitios/${MARCA}`);
      expect(rutas.length).toBeGreaterThanOrEqual(10);
    });

    it("ni la vista ni la acción mandan el tramo dinámico de ninguna", () => {
      // Más la dirección corta del cartel, que no es una carpeta: la resuelve el proxy.
      for (const ruta of [...rutas, `/e/${MARCA}`]) {
        const codificada = `/${ruta.slice(1).replaceAll("/", "%2F")}`;
        for (const variante of [ruta, `${ruta}/editar`, `${ruta}/`, codificada]) {
          const vista = limpiarUrlAnalitica(`https://somosnosotros.org${variante}`);
          expect((vista ?? "").toLowerCase(), variante).not.toContain(MARCA);
          const accion = limpiarUrlEvento(`https://somosnosotros.org${variante}`);
          expect(accion.toLowerCase(), variante).not.toContain(MARCA);
        }
      }
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

    it("mantiene ruta correcta después de limpiar (la ficha, en su sección)", () => {
      expect(limpiarUrlAnalitica("/lugares/123?q=teatro&tipo=museo")).toBe(
        "https://somosnosotros.org/lugares?tipo=museo"
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
