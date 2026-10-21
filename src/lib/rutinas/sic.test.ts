import { describe, expect, it } from "vitest";
import { candidatosDeTabla, claveDeEstado, leerCsv, leerSic, TABLAS_SIC, textoDeSic, urlTablaSic } from "./sic";

const NOMBRES = ["San Luis Potosí", "Soledad de Graciano Sánchez"];
const TEATRO = TABLAS_SIC.find((t) => t.tabla === "teatro")!;
const RNBP = TABLAS_SIC.find((t) => t.tabla === "rnbp")!;

/** Una tabla de teatros como la del SIC (mismas columnas), en Latin-1 como llega. */
const CSV_TEATRO = [
  "teatro_id,teatro_nombre,teatro_fecha_fundacion,teatro_adscripcion,estado_id,nom_ent,municipio_id,nom_mun,localidad_id,nom_loc,teatro_calle_numero,teatro_colonia,teatro_cp,teatro_telefono1,pagina_web,facebook,twitter,instagram,email,gmaps_longitud,gmaps_latitud,teatro_aforo,teatro_tipo_escenario,link_sic,fecha_mod",
  '736,"Teatro Alaquines","2009-01-01","H. Ayuntamiento",24,"San Luis Potosí",2,"Alaquines",1,"Alaquines","Hidalgo 1","Centro","79360","482 361","","","","","x@correo.example",-99.60086,22.12815,300,"","http://sic.gob.mx/ficha.php?table=teatro&table_id=736","2025-01-29"',
  '900,"Teatro de la Paz","1894-01-01","Gobierno del Estado",24,"San Luis Potosí",28,"San Luis Potosí",1,"San Luis Potosí","Villerías 205, esquina Escobedo","Centro","78000","444 812","www.teatrodelapaz.example","https://www.facebook.com/teatrodelapaz.example","","","prensa@correo.example",-100.9738,22.1519,1450,"","http://sic.gob.mx/ficha.php?table=teatro&table_id=900","2024-05-01"',
  '901,"Foro ""La Carrilla""","2010-01-01","Independiente",24,"San Luis Potosí",35,"Soledad de Graciano Sánchez",1,"Soledad de Graciano Sánchez","Av. Juárez 10","Centro","78430","","","","","","",-100.938,22.183,80,"","","2024-05-01"',
  '902,"Teatro de la Paz","1894-01-01","Repetido",24,"San Luis Potosí",28,"San Luis Potosí",1,"San Luis Potosí","","","","","","","","","",0,0,0,"","","2024-05-01"',
].join("\r\n");
const latin1 = (t: string) => new Uint8Array(Buffer.from(t, "latin1"));

describe("el catálogo del SIC", () => {
  it("la clave del estado sale del código que da Mapbox o del nombre; fuera de México, null", () => {
    expect(claveDeEstado("MX-SLP")).toBe(24);
    expect(claveDeEstado("slp")).toBe(24);
    expect(claveDeEstado(null, "Querétaro")).toBe(22);
    expect(claveDeEstado("", "Ciudad de México")).toBe(9);
    expect(claveDeEstado("CA-ON", "Ontario")).toBeNull();
    expect(urlTablaSic(9, "museo")).toBe("https://sic.cultura.gob.mx/opendata/d/9_museo_directorio.csv");
  });

  it("lee CSV con comillas, comas y comillas dobles dentro, y saltos \\r\\n", () => {
    const filas = leerCsv('a,b,c\r\n1,"x, y","dijo ""hola"""\r\n2,"dos\nlíneas",z\r\n');
    expect(filas).toEqual([
      ["a", "b", "c"],
      ["1", "x, y", 'dijo "hola"'],
      ["2", "dos\nlíneas", "z"],
    ]);
  });

  it("Latin-1 a texto: los acentos llegan bien", () => {
    expect(textoDeSic(latin1("San Luis Potosí, Querétaro"))).toBe("San Luis Potosí, Querétaro");
  });

  it("solo las filas de la ciudad y sus alias, sin repetir, con dirección, punto, redes seguras y la ficha del SIC en https; sin teléfonos ni correos", () => {
    const c = candidatosDeTabla(textoDeSic(latin1(CSV_TEATRO)), TEATRO, NOMBRES);
    expect(c.map((x) => x.nombre)).toEqual(["Teatro de la Paz", 'Foro "La Carrilla"']);
    expect(c[0]).toEqual({
      fuente: "sic",
      nombre: "Teatro de la Paz",
      tipo: "foro",
      detalle: null,
      direccion: "Villerías 205, esquina Escobedo, Centro, 78000",
      municipio: "San Luis Potosí",
      lat: 22.1519,
      lng: -100.9738,
      redes: ["https://www.teatrodelapaz.example/", "https://www.facebook.com/teatrodelapaz.example"],
      url: "https://sic.cultura.gob.mx/ficha.php?table=teatro&table_id=900",
    });
    expect(JSON.stringify(c)).not.toMatch(/@correo|444 812/);
    expect(c[1].municipio).toBe("Soledad de Graciano Sánchez");
  });

  it("una biblioteca pública que no dice «biblioteca» lo lleva delante", () => {
    const csv = ["rnbp_id,rnbp_nombre,estado_id,nom_ent,municipio_id,nom_mun,localidad_id,nom_loc,rnbp_calle_numero,rnbp_colonia,rnbp_cp,rnbp_pagina_web,gmaps_longitud,gmaps_latitud,link_sic", '5,"Lic. Primo Feliciano Velázquez",24,"San Luis Potosí",28,"San Luis Potosí",1,"San Luis Potosí","Calle 1","Centro","78000","",-100.97,22.15,""'].join("\n");
    const [b] = candidatosDeTabla(csv, RNBP, NOMBRES);
    expect(b.nombre).toBe("Biblioteca Lic. Primo Feliciano Velázquez");
    expect(b.tipo).toBe("biblioteca");
  });

  it("descarga las tablas del estado en paralelo; una que no llega solo se cuenta, y no repite entre tablas", async () => {
    const pedidas: string[] = [];
    const pedir = (async (url: string) => {
      pedidas.push(url);
      if (url.includes("_teatro_")) return new Response(latin1(CSV_TEATRO));
      if (url.includes("_museo_")) return new Response("no", { status: 500 });
      return new Response(latin1("x_id,x_nombre,nom_mun\n"));
    }) as typeof fetch;
    const l = await leerSic(24, NOMBRES, pedir);
    expect(pedidas).toHaveLength(TABLAS_SIC.length);
    expect(pedidas.every((u) => u.startsWith("https://sic.cultura.gob.mx/opendata/d/24_"))).toBe(true);
    expect(l.tablasFallidas).toBe(1);
    expect(l.tablasLeidas).toBe(TABLAS_SIC.length - 1);
    expect(l.candidatos.map((c) => c.nombre)).toEqual(["Teatro de la Paz", 'Foro "La Carrilla"']);
  });
});
