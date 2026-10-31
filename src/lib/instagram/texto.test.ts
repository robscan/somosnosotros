import { describe, expect, it } from "vitest";
import { textoArtista, textoLugar, type ArtistaDestacado, type LugarDestacado } from "./destacado";
import { armarTexto, conCreditoDeFoto, cuandoDelTexto, etiquetasDeLaFoto, etiquetasDelTexto, hashtag, INVITACION, revisarTexto, usuarioDeInstagram, type EventoIg } from "./texto";

/** OL-458 (bitácora 490): el texto que arma el sistema para Instagram, lo firmado en el prototipo `admin-instagram.html`. */
const ahora = new Date("2026-10-03T17:00:00Z"); // sábado 3 de octubre, 11:00 en San Luis Potosí
const feleal: EventoIg = {
  titulo: "Feleal: un viaje por el mundo en acordeón",
  inicio: "2026-10-04T23:00:00Z",
  fin: "2026-10-05T01:00:00Z",
  zona: "America/Mexico_City",
  clase: "puntual",
  precio: null,
  lugar: { nombre: "Museo Nacional de la Máscara", usuario: null },
  ciudad: "San Luis Potosí",
  artistas: [{ nombre: "Feleal", usuario: "feleal", disciplina: "musica" }],
};

describe("armarTexto", () => {
  it("arma el texto firmado: título, cuándo, 📍 lugar · ciudad, precio, con, invitación y etiquetas", () => {
    expect(armarTexto(feleal, ahora)).toBe(
      [
        "Feleal: un viaje por el mundo en acordeón\nDomingo 4 de octubre · 5:00–7:00 pm\n📍 Museo Nacional de la Máscara · San Luis Potosí\nGratis",
        "Con @feleal",
        "Sigue a @smsnstrsapp para enterarte de más planes. Este y otros eventos, en somosnosotrxs.org (enlace en la bio).",
        "#SanLuisPotosi #AgendaCultural #Musica #SomosNosotrxs",
      ].join("\n\n"),
    );
  });
  it("menciona al lugar y a los artistas con usuario; a los demás, por su nombre", () => {
    const t = armarTexto({ ...feleal, precio: "$150", lugar: { nombre: "Teatro de la Paz", usuario: "teatrodelapazslp" }, artistas: [{ nombre: "Pimpolina", usuario: "pimpolina.clown", disciplina: "teatro" }, { nombre: "Ana Ruiz", usuario: null, disciplina: null }] }, ahora);
    expect(t).toContain("📍 Teatro de la Paz @teatrodelapazslp · San Luis Potosí\n$150");
    expect(t).toContain("Con @pimpolina.clown y Ana Ruiz");
  });
  it("quitar una etiqueta quita su mención: queda el nombre", () => {
    const e = { ...feleal, lugar: { nombre: "Teatro de la Paz", usuario: "teatrodelapazslp" } };
    const t = armarTexto(e, ahora, ["feleal", "teatrodelapazslp"]);
    expect(t).toContain("📍 Teatro de la Paz · San Luis Potosí");
    expect(t).toContain("Con Feleal");
    expect(t).not.toMatch(/@feleal|@teatrodelapazslp/);
  });
  it("siempre invita a seguir la cuenta y a la app, antes de las etiquetas", () => {
    const t = armarTexto({ ...feleal, artistas: [] }, ahora);
    expect(t.indexOf(INVITACION)).toBeGreaterThan(0);
    expect(t.indexOf(INVITACION)).toBeLessThan(t.indexOf("#SanLuisPotosi"));
    expect(t).not.toContain("Con ");
  });
  it("sin lugar ni sitio, la ciudad sola", () => {
    expect(armarTexto({ ...feleal, lugar: null }, ahora)).toContain("📍 San Luis Potosí\n");
  });
  it("una exposición en curso dice hasta cuándo; un taller por venir, sus días y la hora", () => {
    expect(cuandoDelTexto({ inicio: "2026-10-02T06:00:00Z", fin: "2027-02-13T05:59:00Z", zona: "America/Mexico_City", clase: "exposicion" }, ahora)).toBe("Hasta el vie 12 de feb de 2027");
    expect(cuandoDelTexto({ inicio: "2026-10-10T23:00:00Z", fin: "2026-10-13T01:00:00Z", zona: "America/Mexico_City", clase: "taller" }, ahora)).toMatch(/^Del 10 al 12 de oct · 5:00 pm$/);
  });
});

describe("etiquetas", () => {
  it("sin acento y sin espacios", () => {
    expect(hashtag("San Luis Potosí")).toBe("#SanLuisPotosi");
    expect(hashtag("Ciudad de México")).toBe("#CiudadDeMexico");
    expect(hashtag("  ")).toBe("");
  });
  it("de 3 a 5: ciudad, agenda, clase o disciplina, marca", () => {
    expect(etiquetasDelTexto({ ciudad: "Oaxaca", clase: "puntual", artistas: [] })).toEqual(["#Oaxaca", "#AgendaCultural", "#SomosNosotrxs"]);
    expect(etiquetasDelTexto({ ciudad: "Oaxaca", clase: "festival", artistas: [{ nombre: "a", usuario: null, disciplina: "musica" }, { nombre: "b", usuario: null, disciplina: "danza" }] })).toEqual(["#Oaxaca", "#AgendaCultural", "#Festival", "#Musica", "#SomosNosotrxs"]);
  });
  it("en la foto: el lugar y los artistas con usuario, sin repetir y sin los quitados", () => {
    const e = { lugar: { nombre: "Teatro", usuario: "teatro" }, artistas: [{ nombre: "A", usuario: "a", disciplina: null }, { nombre: "B", usuario: null, disciplina: null }, { nombre: "A2", usuario: "a", disciplina: null }] };
    expect(etiquetasDeLaFoto(e)).toEqual(["teatro", "a"]);
    expect(etiquetasDeLaFoto(e, ["teatro"])).toEqual(["a"]);
  });
});

describe("usuarioDeInstagram", () => {
  it("sale del enlace de Instagram de las redes de la ficha", () => {
    expect(usuarioDeInstagram([{ red: "facebook", url: "https://facebook.com/x" }, { url: "https://www.instagram.com/Teatro.DeLaPaz/" }])).toBe("teatro.delapaz");
    expect(usuarioDeInstagram({ instagram: "https://instagram.com/aether.slp" })).toBe("aether.slp");
    expect(usuarioDeInstagram([{ url: "https://www.instagram.com/p/ABC123/" }])).toBeNull();
    expect(usuarioDeInstagram([])).toBeNull();
    expect(usuarioDeInstagram(null)).toBeNull();
  });
});

describe("revisarTexto: los límites de Instagram", () => {
  it("el texto armado cabe", () => {
    expect(revisarTexto(armarTexto(feleal, ahora)).problema).toBeNull();
  });
  it("2 200 caracteres", () => {
    expect(revisarTexto("a".repeat(2200)).problema).toBeNull();
    expect(revisarTexto("a".repeat(2201)).problema).toBe("El texto pasa de 2,200 caracteres: quítale 1.");
  });
  it("30 etiquetas y 20 menciones", () => {
    expect(revisarTexto(Array.from({ length: 30 }, (_, i) => `#e${i}`).join(" ")).problema).toBeNull();
    expect(revisarTexto(Array.from({ length: 31 }, (_, i) => `#e${i}`).join(" ")).problema).toBe("Lleva 31 etiquetas (#) y Instagram deja 30.");
    expect(revisarTexto(Array.from({ length: 20 }, (_, i) => `@u${i}`).join(" ")).problema).toBeNull();
    expect(revisarTexto(Array.from({ length: 21 }, (_, i) => `@u${i}`).join(" ")).problema).toBe("Lleva 21 menciones (@) y Instagram deja 20.");
  });
});

describe("conCreditoDeFoto: el crédito de la portada en la tarjeta de la semana (OL-491)", () => {
  const AHORA = new Date("2026-10-07T16:00:00Z");
  const ig = (u: string) => [{ url: `https://www.instagram.com/${u}` }];
  const lugar = (redes: unknown): LugarDestacado => ({
    nombre: "Museo del Ferrocarril",
    slug: "museo-del-ferrocarril",
    descripcion: "Antigua estación de ferrocarril convertida en museo, con locomotoras de vapor y salas sobre la historia del tren.",
    tipo: "museo",
    ciudad: "San Luis Potosí",
    direccion: null,
    redes,
    semana: [],
  });
  const artista: ArtistaDestacado = {
    nombre: "Valeria Quiroz",
    slug: "valeria-quiroz",
    descripcion: "Cantautora potosina. Escribe canciones sobre el desierto, la carretera y las abuelas, con guitarra y una loop station.",
    disciplina: "musica",
    detalle: "canción",
    ciudad: "San Luis Potosí",
    redes: ig("valeriaquiroz"),
    proxima: null,
  };
  const CREDITO = "Pablo Pérez · CC BY-SA 4.0";

  it("sin crédito no cambia: la foto vino de su Instagram y sigue «Foto: @cuenta»", () => {
    const t = textoLugar(lugar(ig("museoferrocarril")), AHORA);
    expect(conCreditoDeFoto(t, null)).toBe(t);
    expect(conCreditoDeFoto(t, "  ")).toBe(t);
    expect(t).toContain("Foto: @museoferrocarril");
  });
  it("con crédito, la línea «Foto:» dice el crédito en vez de la cuenta (la cuenta sigue en «Más en»)", () => {
    const t = conCreditoDeFoto(textoLugar(lugar(ig("museoferrocarril")), AHORA), CREDITO);
    expect(t).toContain(`Más en @museoferrocarril\nFoto: ${CREDITO}`);
    expect(t).not.toContain("Foto: @museoferrocarril");
    expect(t.match(/^Foto: /gm)).toHaveLength(1);
    const a = conCreditoDeFoto(textoArtista(artista, AHORA), CREDITO);
    expect(a).toContain(`Más de su trabajo en @valeriaquiroz\nFoto: ${CREDITO}`);
  });
  it("una ficha sin Instagram lleva su crédito tras «Lee su ficha»", () => {
    const t = conCreditoDeFoto(textoLugar(lugar([]), AHORA), CREDITO);
    expect(t).toContain(`Lee su ficha en somosnosotrxs.org/lugares/museo-del-ferrocarril (enlace en la bio).\nFoto: ${CREDITO}`);
  });
  it("el crédito va como se guardó, sin un «Foto:» doble ni saltos, y con su dirección si la trae", () => {
    const t = conCreditoDeFoto(textoLugar(lugar([]), AHORA), "Foto: Ana López\n· CC BY 4.0 (https://commons.wikimedia.org/wiki/File:X.jpg)");
    expect(t).toContain("\nFoto: Ana López · CC BY 4.0 (https://commons.wikimedia.org/wiki/File:X.jpg)\n");
    expect(revisarTexto(t).problema).toBeNull();
  });
});
