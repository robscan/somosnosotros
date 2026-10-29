import { describe, expect, it } from "vitest";
import { armarTexto, INVITACION, type EventoIg } from "../instagram/texto";
import { DOMINIO_VISIBLE, enlaceConOrigen, enlaceFichaConOrigen, INVITACION_FACEBOOK, textoDeFacebook, textoDeFacebookFicha } from "./texto";

/** OL-461 (bitácora 493): el texto de la página de Facebook a partir del de Instagram, y los enlaces con marca de origen. */
const ahora = new Date("2026-10-07T16:00:00Z");
const ID = "11111111-1111-4111-8111-111111111111";
const pollum: EventoIg = {
  titulo: "Delirium Pollum, clown y pantomima con Pimpolina",
  inicio: "2026-10-11T00:00:00Z",
  fin: "2026-10-11T02:00:00Z",
  zona: "America/Mexico_City",
  clase: "puntual",
  precio: "$150",
  lugar: { nombre: "Teatro de la Paz", usuario: "teatrodelapazslp" },
  ciudad: "San Luis Potosí",
  artistas: [
    { nombre: "Pimpolina", usuario: "pimpolina.clown", disciplina: "teatro" },
    { nombre: "Ana Ruiz", usuario: null, disciplina: null },
  ],
};
const ENLACE = enlaceConOrigen({ id: ID, slug: "delirium-pollum" }, "facebook", "post");

describe("enlaceConOrigen", () => {
  it("la ficha con su slug, en el dominio de la marca, con red, medio y el id del evento", () => {
    expect(ENLACE).toBe(`https://${DOMINIO_VISIBLE}/eventos/delirium-pollum?utm_source=facebook&utm_medium=post&utm_campaign=${ID}`);
    expect(enlaceConOrigen({ id: ID, slug: null }, "instagram", "story")).toBe(`https://somosnosotrxs.org/eventos/${ID}?utm_source=instagram&utm_medium=story&utm_campaign=${ID}`);
  });
  it("un slug raro no rompe la dirección", () => {
    expect(enlaceConOrigen({ id: ID, slug: "a b/c" }, "facebook", "post")).toContain("/eventos/a%20b%2Fc?");
  });
});

describe("textoDeFacebook", () => {
  it("del texto que arma el sistema: sin @, con el enlace tocable y la invitación de Facebook; las etiquetas iguales", () => {
    const ig = armarTexto(pollum, ahora);
    const fb = textoDeFacebook(ig, pollum, ENLACE);
    expect(fb).toBe(
      [
        "Delirium Pollum, clown y pantomima con Pimpolina\nSábado 10 de octubre · 6:00–8:00 pm\n📍 Teatro de la Paz · San Luis Potosí\n$150",
        "Con Pimpolina y Ana Ruiz",
        `Ficha del evento: ${ENLACE}`,
        INVITACION_FACEBOOK,
        "#SanLuisPotosi #AgendaCultural #Teatro #SomosNosotrxs",
      ].join("\n\n"),
    );
    expect(fb).not.toContain("@");
    expect(fb).not.toContain("enlace en la bio");
    expect(fb).toContain("entra a somosnosotrxs.org");
  });
  it("un texto escrito a mano: cambia las menciones conocidas y deja lo demás", () => {
    const ig = `¡Hoy! @pimpolina.clown en el Teatro de la Paz @teatrodelapazslp. Escríbele a @otra.cuenta.\n\n${INVITACION}\n\n#Teatro`;
    const fb = textoDeFacebook(ig, pollum, ENLACE);
    expect(fb).toContain("¡Hoy! Pimpolina en el Teatro de la Paz. Escríbele a @otra.cuenta.");
    expect(fb).toContain(`Ficha del evento: ${ENLACE}\n\n${INVITACION_FACEBOOK}\n\n#Teatro`);
  });
  it("una mención que empieza igual que otra no se toca", () => {
    const fb = textoDeFacebook("Con @pimpolina.clownoficial y @pimpolina.clown", pollum, ENLACE);
    expect(fb).toContain("Con @pimpolina.clownoficial y Pimpolina");
  });
  it("sin la invitación (la quitaron): el enlace va antes de las etiquetas; sin etiquetas, al final; sin «enlace en la bio»", () => {
    expect(textoDeFacebook("Hola\n\n#Teatro #SanLuisPotosi", pollum, ENLACE)).toBe(`Hola\n\nFicha del evento: ${ENLACE}\n\n#Teatro #SanLuisPotosi`);
    expect(textoDeFacebook("Hola, más en somosnosotrxs.org (enlace en la bio).", pollum, ENLACE)).toBe(`Hola, más en somosnosotrxs.org.\n\nFicha del evento: ${ENLACE}`);
  });
  it("la cuenta de la marca suelta va por su nombre", () => {
    expect(textoDeFacebook("Síguenos en @smsnstrsapp", { lugar: null, artistas: [] }, ENLACE)).toContain("Síguenos en Somos Nosotrxs");
  });
  it("un lugar sin usuario y artistas sin usuario quedan igual", () => {
    const e = { ...pollum, lugar: { nombre: "Foro", usuario: null }, artistas: [{ nombre: "Ana", usuario: null, disciplina: null }] };
    const fb = textoDeFacebook(armarTexto(e, ahora), e, ENLACE);
    expect(fb).toContain("📍 Foro · San Luis Potosí");
    expect(fb).toContain("Con Ana");
  });
});

describe("el texto de Facebook de un artista o un lugar (OL-479)", () => {
  const ig = [
    "Cantautora potosina.",
    "Música · Canción · San Luis Potosí\nPróxima fecha: viernes 16 de octubre, 7:00 pm, en el Teatro de la Paz @teatrodelapazslp.",
    "Lee su ficha en somosnosotrxs.org/artistas/valeria (enlace en la bio).\nMás de su trabajo en @valeria\nFoto: @valeria",
    "Sigue a @smsnstrsapp para conocer a más artistas de tu ciudad.",
    "#SanLuisPotosi #ArtistasLocales #SomosNosotrxs",
  ].join("\n\n");
  const enlace = enlaceFichaConOrigen("artistas", "valeria", "facebook", "post", "semana-2026-10-12");
  it("el enlace con su marca de origen", () => {
    expect(enlace).toBe(`https://${DOMINIO_VISIBLE}/artistas/valeria?utm_source=facebook&utm_medium=post&utm_campaign=semana-2026-10-12`);
  });
  it("el enlace tocable, la cuenta como dirección, sin menciones sueltas y la invitación a la página", () => {
    const fb = textoDeFacebookFicha(ig, "valeria", enlace);
    expect(fb).toContain(`Lee su ficha: ${enlace}`);
    expect(fb).toContain("Más de su trabajo en instagram.com/valeria\nFoto: instagram.com/valeria");
    expect(fb).toContain("en el Teatro de la Paz.");
    expect(fb).toContain("Sigue la página para conocer a más artistas de tu ciudad.");
    expect(fb).not.toMatch(/@|enlace en la bio/);
  });
  it("un texto cambiado a mano sin la ficha: el enlace antes de las etiquetas", () => {
    const fb = textoDeFacebookFicha("Hola.\n\n#SanLuisPotosi", null, enlace);
    expect(fb).toBe(`Hola.\n\nFicha: ${enlace}\n\n#SanLuisPotosi`);
  });
});
