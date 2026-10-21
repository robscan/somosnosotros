import { describe, expect, it } from "vitest";
import { listaSic } from "./sicFalso";
import { artistasDeListaSic, escuelasDeSic, festivalesDeSic, leerSicArtistas, TABLAS_ARTISTAS_SIC, urlListaSic } from "./sicArtistas";

const GRUPOS = TABLAS_ARTISTAS_SIC[0];

describe("las listas de artistas del SIC (OL-430)", () => {
  const html = listaSic("gpo_artistico", {
    "Ciudad Valles": [["10", "Huapangueros de la Sierra", "Música"]],
    "": [["11", "Grupo Sin Municipio", "Danza"]],
    "San Luis Potosí": [
      ["12", "Los Tecolotes del Desierto", "Música"],
      ["13", "Compañía Escénica Polvo &amp; Sal", "Teatro"],
      ["14", "Donde Brota la Voz", "Multidisciplinaria"],
      ["15", "Colectivo Tinta Roja", "Artes plásticas"],
    ],
    "Soledad de Graciano Sánchez": [["16", "Ensamble del Altiplano", "Música"]],
  });

  it("solo los del municipio de la ciudad (o sus alias), con su disciplina de la app, su tipo y su ficha del SIC", () => {
    const a = artistasDeListaSic(html, GRUPOS, ["San Luis Potosí", "Soledad de Graciano Sánchez"]);
    expect(a.map((x) => [x.nombre, x.disciplina, x.detalle, x.tipo, x.municipio, x.url])).toEqual([
      ["Los Tecolotes del Desierto", "musica", null, "grupo", "San Luis Potosí", "https://sic.cultura.gob.mx/ficha.php?table=gpo_artistico&table_id=12"],
      ["Compañía Escénica Polvo & Sal", "teatro", null, "grupo", "San Luis Potosí", "https://sic.cultura.gob.mx/ficha.php?table=gpo_artistico&table_id=13"],
      ["Donde Brota la Voz", "otro", "Multidisciplinario", "grupo", "San Luis Potosí", "https://sic.cultura.gob.mx/ficha.php?table=gpo_artistico&table_id=14"],
      ["Colectivo Tinta Roja", "artes_visuales", null, "colectivo", "San Luis Potosí", "https://sic.cultura.gob.mx/ficha.php?table=gpo_artistico&table_id=15"],
      ["Ensamble del Altiplano", "musica", null, "grupo", "Soledad de Graciano Sánchez", "https://sic.cultura.gob.mx/ficha.php?table=gpo_artistico&table_id=16"],
    ]);
    // Sin teléfonos, correos ni domicilios: la lista no los trae y la ficha no se abre.
    expect(a.every((x) => x.redes.length === 0 && x.fuente === "padrones" && x.nombreFuente === "Sistema de Información Cultural")).toBe(true);
  });

  it("descarga las dos listas del estado; la que no llega solo se cuenta", async () => {
    const pedidas: string[] = [];
    const pedir = (async (url: string) => {
      pedidas.push(url);
      return url.includes("gpo_artistico") ? new Response(html) : new Response("x", { status: 500 });
    }) as typeof fetch;
    const l = await leerSicArtistas(24, ["San Luis Potosí"], pedir);
    expect(pedidas).toEqual([urlListaSic("gpo_artistico", 24), urlListaSic("artista", 24)]);
    expect(l).toMatchObject({ leidas: 1, fallidas: 1 });
    expect(l.candidatos).toHaveLength(4);
  });

  it("las pistas: los festivales del estado y las escuelas de arte de la ciudad, con su sitio", () => {
    const festivales = ["festival_id,festival_nombre,festival_disciplina,festival_sede,pagina_web,email", '1,"Festival del Desierto","","","festivaldesierto.example","x@example.org"', '2,"Encuentro de Son","","","",""'].join("\n");
    expect(festivalesDeSic(festivales)).toEqual([
      { nombre: "Festival del Desierto", web: "https://festivaldesierto.example/" },
      { nombre: "Encuentro de Son", web: null },
    ]);
    const escuelas = [
      "educacion_artistica_id,educacion_artistica_nombre,nom_mun,nom_loc,email,pagina_web",
      '1,"Licenciatura en Artes","San Luis Potosí","San Luis Potosí","a@uni.example","https://artes.uni.example"',
      '2,"Escuela de Danza de Valles","Ciudad Valles","Ciudad Valles","",""',
    ].join("\n");
    expect(escuelasDeSic(escuelas, ["San Luis Potosí"])).toEqual([{ nombre: "Licenciatura en Artes", web: "https://artes.uni.example/" }]);
  });
});
