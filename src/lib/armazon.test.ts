import { describe, expect, it } from "vitest";
import { altaDeRuta, DESTINOS, enlaceDeAlta, enlaceDeBusqueda, estaEnDestino, vistaDeRuta } from "./armazon";

describe("armazón: la vista de cada ruta (data-vista)", () => {
  it("las cinco secciones y la pantalla que confirma un borrado son raíz", () => {
    for (const ruta of ["/", "/agenda", "/lugares", "/artistas", "/perfil", "/borrado"]) expect(vistaDeRuta(ruta)).toBe("raiz");
  });
  it("evento, lugar, artista y persona son fichas", () => {
    for (const ruta of ["/eventos/concierto-de-la-sinfonica", "/lugares/teatro-de-la-paz", "/artistas/aaron-cadena", "/personas/8f1c2d9e"]) expect(vistaDeRuta(ruta)).toBe("ficha");
  });
  it("las altas, las ediciones, ajustes, entrar y lo demás son tareas", () => {
    const tareas = [
      "/eventos/nuevo",
      "/lugares/nuevo",
      "/artistas/nuevo",
      "/eventos/concierto-de-la-sinfonica/editar",
      "/lugares/teatro-de-la-paz/editar",
      "/artistas/aaron-cadena/editar",
      "/artistas/aaron-cadena/novedades/nueva",
      "/ajustes",
      "/ajustes/editar",
      "/ajustes/bloqueados",
      "/entrar",
      "/novedades",
      "/admin",
      "/admin/personas/8f1c2d9e",
      "/reglas",
      "/privacidad",
      "/ayuda",
    ];
    for (const ruta of tareas) expect(vistaDeRuta(ruta), ruta).toBe("tarea");
  });
  it("la pared, el mando y el letrero se quedan con toda la pantalla", () => {
    for (const ruta of ["/obra/4d2e/pared", "/obra/4d2e/mando", "/artistas/aaron-cadena/letrero"]) expect(vistaDeRuta(ruta), ruta).toBe("completa");
  });
});

describe("armazón: el «+» de la barra", () => {
  it("cada sección lleva a su alta y fuera de ellas se publica un evento", () => {
    expect(altaDeRuta("/")).toBe("evento");
    expect(altaDeRuta("/agenda")).toBe("evento");
    expect(altaDeRuta("/perfil")).toBe("evento");
    expect(altaDeRuta("/lugares")).toBe("lugar");
    expect(altaDeRuta("/lugares/teatro-de-la-paz")).toBe("lugar");
    expect(altaDeRuta("/artistas")).toBe("artista");
    expect(altaDeRuta("/artistas/aaron-cadena")).toBe("artista");
    expect(altaDeRuta("/eventos/concierto")).toBe("evento");
  });
  it("lleva la ciudad que se está viendo a donde empieza el alta, y el lugar no la lleva", () => {
    expect(enlaceDeAlta("evento", null)).toEqual({ href: "/eventos/nuevo", etiqueta: "Publicar un evento" });
    expect(enlaceDeAlta("evento", "queretaro").href).toBe("/eventos/nuevo?ciudad=queretaro");
    expect(enlaceDeAlta("artista", "queretaro")).toEqual({ href: "/artistas/nuevo?ciudad=queretaro", etiqueta: "Registrar un artista" });
    expect(enlaceDeAlta("lugar", "queretaro")).toEqual({ href: "/lugares/nuevo", etiqueta: "Registrar un lugar" });
  });
});

describe("armazón: la lupa de la barra", () => {
  it("sin búsqueda propia lleva a la de Inicio, ya abierta y con la ciudad que se ve", () => {
    expect(enlaceDeBusqueda(null)).toBe("/?buscar=1");
    expect(enlaceDeBusqueda("cordoba-espana")).toBe("/?buscar=1&ciudad=cordoba-espana");
  });
});

describe("armazón: los cinco destinos", () => {
  it("son Inicio, Agenda, Lugares, Artistas y Perfil, en ese orden", () => {
    expect(DESTINOS.map((d) => d.etiqueta)).toEqual(["Inicio", "Agenda", "Lugares", "Artistas", "Perfil"]);
    expect(DESTINOS.map((d) => d.href)).toEqual(["/", "/agenda", "/lugares", "/artistas", "/perfil"]);
  });
  it("cada destino recuerda su última pantalla, salvo Perfil", () => {
    expect(DESTINOS.filter((d) => !d.recuerda).map((d) => d.clave)).toEqual(["perfil"]);
  });
  it("cada ruta raíz está en un solo destino; el inicio es solo la raíz del dominio", () => {
    for (const ruta of ["/", "/agenda", "/lugares", "/artistas", "/perfil"]) expect(DESTINOS.filter((d) => estaEnDestino(ruta, d.href)).map((d) => d.href)).toEqual([ruta]);
    expect(estaEnDestino("/agenda", "/")).toBe(false);
    expect(estaEnDestino("/lugares/teatro-de-la-paz", "/lugares")).toBe(true);
    expect(estaEnDestino("/lugaresX", "/lugares")).toBe(false);
    expect(DESTINOS.some((d) => estaEnDestino("/borrado", d.href))).toBe(false);
  });
});
