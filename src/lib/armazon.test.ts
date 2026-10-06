import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { puntoDeTexto } from "./geo";
import { altaDeParametro, altaDeRuta, buscarDesdeRuta, CARRIL, DESTINOS, enlaceAltaEvento, enlaceDeAlta, enlaceDeBusqueda, estaEnDestino, fichaConMenu, redireccionDeNuevo, tituloDeAlta, vistaDeRuta } from "./armazon";

describe("armazón: la vista de cada ruta (data-vista)", () => {
  it("las cinco secciones y la pantalla que confirma un borrado son raíz", () => {
    for (const ruta of ["/", "/agenda", "/lugares", "/artistas", "/perfil", "/borrado"]) expect(vistaDeRuta(ruta)).toBe("raiz");
  });
  it("evento, lugar, artista y persona son fichas", () => {
    for (const ruta of ["/eventos/concierto-de-la-sinfonica", "/lugares/teatro-de-la-paz", "/artistas/aaron-cadena", "/personas/8f1c2d9e"]) expect(vistaDeRuta(ruta)).toBe("ficha");
  });
  it("las altas, las ediciones, ajustes, entrar y lo demás son tareas", () => {
    const tareas = [
      "/nuevo",
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
    for (const ruta of ["/personas/8f1c2d9e", "/", "/lugares", "/nuevo", "/eventos/concierto/editar", "/ajustes"]) expect(fichaConMenu(ruta), ruta).toBe(false);
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
  it("lleva a la pantalla de alta con el tipo de la sección, y la ciudad que se está viendo solo al evento y al artista; el evento, a su alta por pasos", () => {
    expect(enlaceDeAlta("evento", null)).toEqual({ href: "/nuevo/evento", etiqueta: "Publicar un evento" });
    expect(enlaceDeAlta("evento", "queretaro").href).toBe("/nuevo/evento?ciudad=queretaro");
    expect(enlaceDeAlta("artista", "queretaro")).toEqual({ href: "/nuevo?tipo=artista&ciudad=queretaro", etiqueta: "Registrar artista" });
    expect(enlaceDeAlta("lugar", "queretaro")).toEqual({ href: "/nuevo?tipo=lugar", etiqueta: "Registrar un lugar" });
  });
  it("con el nombre que se buscó y no se encontró, el alta abre con él puesto (y bien escrito en la URL)", () => {
    expect(enlaceDeAlta("artista", null, "Los Vecinos").href).toBe("/nuevo?tipo=artista&nombre=Los+Vecinos");
    expect(enlaceDeAlta("lugar", "queretaro", "Foro & Café").href).toBe("/nuevo?tipo=lugar&nombre=Foro+%26+Caf%C3%A9");
    expect(enlaceDeAlta("artista", "queretaro", "Trío Xochitl").href).toBe("/nuevo?tipo=artista&ciudad=queretaro&nombre=Tr%C3%ADo+Xochitl");
  });
  it("con el punto donde se sostuvo el dedo en el mapa, el alta abre con el lugar ya ubicado (y el nombre del sitio, si lo había)", () => {
    const punto = { lat: 22.15113049, lng: -100.97860012 };
    expect(enlaceDeAlta("lugar", null, null, punto).href).toBe("/nuevo?tipo=lugar&lat=22.151130&lng=-100.978600");
    expect(enlaceDeAlta("lugar", "queretaro", "Museo de la Máscara", punto).href).toBe("/nuevo?tipo=lugar&nombre=Museo+de+la+M%C3%A1scara&lat=22.151130&lng=-100.978600");
    // Lo que arma lo lee `puntoDeTexto`: ida y vuelta, en la precisión que viaja.
    const consulta = new URL(enlaceDeAlta("lugar", null, null, punto).href, "https://somosnosotros.org").searchParams;
    expect(puntoDeTexto(consulta.get("lat") ?? undefined, consulta.get("lng") ?? undefined)).toEqual({ lat: 22.15113, lng: -100.9786 });
  });
  it("el tipo con el que abre la pantalla de alta sale de la consulta: lo desconocido es un evento", () => {
    expect(altaDeParametro("lugar")).toBe("lugar");
    expect(altaDeParametro("artista")).toBe("artista");
    expect(altaDeParametro("evento")).toBe("evento");
    for (const raro of [undefined, "", "Lugar", "lugares", "x"]) expect(altaDeParametro(raro), String(raro)).toBe("evento");
  });
  it("cada tipo tiene su título en la pantalla de alta", () => {
    expect(tituloDeAlta("evento")).toBe("Publicar un evento");
    expect(tituloDeAlta("lugar")).toBe("Registrar un lugar");
    expect(tituloDeAlta("artista")).toBe("Registrar artista");
  });
  it("el tipo del «+» sobrevive al viaje: lo que arma enlaceDeAlta lo lee altaDeParametro", () => {
    for (const ruta of ["/", "/agenda", "/perfil", "/lugares", "/lugares/teatro-de-la-paz", "/artistas", "/artistas/aaron-cadena"]) {
      const alta = altaDeRuta(ruta);
      const consulta = new URL(enlaceDeAlta(alta, null).href, "https://somosnosotros.org").searchParams;
      expect(altaDeParametro(consulta.get("tipo") ?? undefined), ruta).toBe(alta);
    }
  });
});

describe("armazón: el alta de evento por pasos (OL-312)", () => {
  const ID = "0b0b0b0b-0000-4000-8000-000000000001";
  it("lleva lo que ya se sabe, en un orden fijo y sin lo vacío", () => {
    expect(enlaceAltaEvento()).toBe("/nuevo/evento");
    expect(enlaceAltaEvento({ lugar: ID })).toBe(`/nuevo/evento?lugar=${ID}`);
    expect(enlaceAltaEvento({ artista: ID, ciudad: "queretaro" })).toBe(`/nuevo/evento?artista=${ID}&ciudad=queretaro`);
    expect(enlaceAltaEvento({ ciudad: "queretaro", desde: ID, lugar: null, artista: "" })).toBe(`/nuevo/evento?desde=${ID}&ciudad=queretaro`);
  });
  it("/nuevo con un evento se va a /nuevo/evento con sus datos: sin tipo, tipo=evento, un tipo desconocido o un evento ya armado", () => {
    expect(redireccionDeNuevo({})).toBe("/nuevo/evento");
    expect(redireccionDeNuevo({ tipo: "evento", ciudad: "queretaro" })).toBe("/nuevo/evento?ciudad=queretaro");
    expect(redireccionDeNuevo({ tipo: "x" })).toBe("/nuevo/evento");
    expect(redireccionDeNuevo({ lugar: ID })).toBe(`/nuevo/evento?lugar=${ID}`);
    expect(redireccionDeNuevo({ artista: ID, ciudad: "queretaro" })).toBe(`/nuevo/evento?artista=${ID}&ciudad=queretaro`);
    expect(redireccionDeNuevo({ desde: ID })).toBe(`/nuevo/evento?desde=${ID}`);
    // Un evento ya armado abría solo como evento aunque dijera otro tipo; sigue igual.
    expect(redireccionDeNuevo({ tipo: "lugar", lugar: ID })).toBe(`/nuevo/evento?lugar=${ID}`);
  });
  it("un lugar o un artista se quedan en /nuevo", () => {
    expect(redireccionDeNuevo({ tipo: "lugar" })).toBeNull();
    expect(redireccionDeNuevo({ tipo: "artista", ciudad: "queretaro" })).toBeNull();
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
