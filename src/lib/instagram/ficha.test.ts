import { describe, expect, it } from "vitest";
import { fichaConMaterial, textoDeFicha, type FichaParaPublicar } from "./ficha";

/**
 * OL-505 («Repisa»): qué material pide la tarjeta de la semana y de quién es el crédito de la foto. El artista sale con su foto de perfil (sin
 * portada): necesita solo esa foto en el Storage de la app y su crédito es el de siempre («Foto: @cuenta»). El lugar no necesita material (sin
 * portada sale L1) y el crédito de su portada (OL-491) solo va si la portada sale en la tarjeta (L2).
 */
const URL = "https://proyecto.supabase.co";
const PROPIA = `${URL}/storage/v1/object/public/fotos/a/b.jpg`;
const AJENA = "https://otra-pagina.test/portada.jpg";
const AHORA = new Date("2026-11-02T18:00:00Z");
const ig = (u: string) => [{ url: `https://www.instagram.com/${u}` }];
const DESCRIPCION = "Cantautora potosina. Escribe canciones sobre el desierto, la carretera y las abuelas.";

const ficha = (o: Partial<FichaParaPublicar> = {}): FichaParaPublicar => ({
  tipo: "artista", id: "a1", slug: "valeria-quiroz", nombre: "Valeria Quiroz", ciudad: "San Luis Potosí", ciudadSlug: "san-luis-potosi", visible: true, grupo: false,
  ceja: "Música · Canción", cuenta: "valeriaquiroz", portada: null, portadaCredito: "Ana López · CC BY 4.0", foto: PROPIA, proxima: null, semana: [],
  datos: { nombre: "Valeria Quiroz", slug: "valeria-quiroz", descripcion: DESCRIPCION, disciplina: "musica", detalle: "canción", ciudad: "San Luis Potosí", redes: ig("valeriaquiroz"), proxima: null },
  ubicacion: null,
  ...o,
});
const lugar = (portada: string | null) =>
  ficha({ tipo: "lugar", slug: "bajo-ceiba", nombre: "Bajo Ceiba", foto: null, portada, datos: { nombre: "Bajo Ceiba", slug: "bajo-ceiba", descripcion: DESCRIPCION, tipo: "foro", ciudad: "San Luis Potosí", direccion: null, redes: ig("bajoceiba_salas"), semana: [] } });

describe("el material de la tarjeta (OL-505)", () => {
  it("el artista: su foto propia basta, sin portada", () => {
    expect(fichaConMaterial(ficha({ foto: PROPIA, portada: null }), URL)).toBe(true);
    expect(fichaConMaterial(ficha({ foto: null, portada: PROPIA }), URL)).toBe(false);
    expect(fichaConMaterial(ficha({ foto: AJENA, portada: PROPIA }), URL)).toBe(false);
  });
  it("el lugar: con o sin portada (sin ella sale L1)", () => {
    expect(fichaConMaterial(lugar(null), URL)).toBe(true);
    expect(fichaConMaterial(lugar(AJENA), URL)).toBe(true);
    expect(fichaConMaterial(lugar(PROPIA), URL)).toBe(true);
  });
});

describe("el crédito de la foto en el texto", () => {
  it("el artista: «Foto: @cuenta» (su foto de perfil), aunque su portada tenga crédito", () => {
    const t = textoDeFicha(ficha({ portada: PROPIA }), AHORA, [], URL);
    expect(t).toContain("Foto: @valeriaquiroz");
    expect(t).not.toContain("Ana López");
  });
  it("el lugar con su portada en la tarjeta (L2): el crédito de la portada", () => {
    expect(textoDeFicha(lugar(PROPIA), AHORA, [], URL)).toContain("Foto: Ana López · CC BY 4.0");
  });
  it("el lugar sin portada que se pueda dibujar (L1): sin ese crédito", () => {
    expect(textoDeFicha(lugar(null), AHORA, [], URL)).not.toContain("Ana López");
    expect(textoDeFicha(lugar(AJENA), AHORA, [], URL)).not.toContain("Ana López");
  });
});
