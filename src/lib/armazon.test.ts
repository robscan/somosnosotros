import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { altaDeRuta, buscarDesdeRuta, CARRIL, DESTINOS, enlaceDeAlta, enlaceDeBusqueda, estaEnDestino, fichaConMenu, vistaDeRuta } from "./armazon";

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

describe("armazón: el menú «···» de la ficha", () => {
  it("evento, lugar y artista siempre lo traen: la barra de la app lo dibuja sin esperar", () => {
    for (const ruta of ["/eventos/concierto-de-la-sinfonica", "/lugares/teatro-de-la-paz", "/artistas/aaron-cadena"]) expect(fichaConMenu(ruta), ruta).toBe(true);
  });
  it("la persona a veces no lo tiene, y lo que no es ficha no lo pide", () => {
    for (const ruta of ["/personas/8f1c2d9e", "/", "/lugares", "/eventos/nuevo", "/eventos/concierto/editar", "/ajustes"]) expect(fichaConMenu(ruta), ruta).toBe(false);
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
  it("lleva siempre a Buscar, con la ciudad que se ve y el tipo de la sección de donde se abre", () => {
    expect(enlaceDeBusqueda(null, "eventos")).toBe("/buscar?desde=eventos");
    expect(enlaceDeBusqueda("cordoba-espana", "lugares")).toBe("/buscar?desde=lugares&ciudad=cordoba-espana");
  });
  it("el tipo de origen sale de la ruta: Lugares y Artistas (y sus fichas) son los suyos; todo lo demás, eventos", () => {
    expect(buscarDesdeRuta("/lugares")).toBe("lugares");
    expect(buscarDesdeRuta("/lugares/teatro-de-la-paz")).toBe("lugares");
    expect(buscarDesdeRuta("/artistas")).toBe("artistas");
    expect(buscarDesdeRuta("/artistas/aaron-cadena")).toBe("artistas");
    for (const ruta of ["/", "/agenda", "/perfil", "/eventos/concierto", "/ajustes"]) expect(buscarDesdeRuta(ruta)).toBe("eventos");
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

describe("armazón: el corte del carril", () => {
  it("el corte de JavaScript es el mismo que el de la rejilla del armazón en las hojas de estilo", () => {
    const css = readFileSync("src/components/Armazon.module.css", "utf8");
    expect(CARRIL).toBe("(min-width: 792px)");
    expect(css).toContain("@media (min-width: 792px) {");
    // El teléfono es lo que queda por debajo: 791, uno menos.
    expect(css).toContain("@media (max-width: 791px) {");
  });
});
