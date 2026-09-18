import { describe, expect, it } from "vitest";
import { tarjetasDeSemana, type AparicionSemana } from "./eventosSemana";
import { SIN_FOTO, SIN_FOTO_ANCHA } from "./imagen";

const ahora = new Date("2026-09-18T18:00:00Z"); // Viernes, mediodía en México.
function aparicion(id: string, inicio = "2026-09-19T01:00:00Z", cambios: Partial<AparicionSemana["evento"]> = {}): AparicionSemana {
  return {
    ficha: { id, nombre: id, foto: null, visible: true },
    evento: { id: `evento-${id}`, inicio, termina: "2026-09-26T05:59:59Z", zona: "America/Mexico_City", visible: true, lugar_id: null, lugar: null, ...cambios },
  };
}
const tarjetas = (a: AparicionSemana[]) => tarjetasDeSemana(a, "artistas", ahora);

describe("Con eventos esta semana", () => {
  it("sin eventos no ofrece tarjetas", () => expect(tarjetas([])).toEqual([]));
  it("abarca hoy y siete días, también al cruzar el domingo; excluye el octavo día", () => {
    expect(tarjetas([
      aparicion("hoy"), aparicion("lunes", "2026-09-22T01:00:00Z"),
      aparicion("limite", "2026-09-26T05:59:59Z"), aparicion("fuera", "2026-09-26T06:00:00Z"),
    ]).map((a) => a.id)).toEqual(["hoy", "lunes", "limite"]);
  });
  it("respeta el día del evento, no la zona del navegador ni la fecha UTC", () => {
    const e = aparicion("tokio", "2026-09-26T14:59:59Z", { zona: "Asia/Tokyo", termina: "2026-09-26T15:00:00Z" });
    // Allí ya es sábado 19: el sábado 26 todavía entra.
    expect(tarjetas([e])).toHaveLength(1);
    e.evento.inicio = "2026-09-26T15:00:00Z";
    expect(tarjetas([e])).toEqual([]);
  });
  it("incluye eventos empezados días antes si siguen en curso y excluye los terminados", () => {
    const curso = aparicion("exposicion", "2026-09-10T18:00:00Z");
    expect(tarjetas([curso])[0].detalle).toBe("En curso");
    expect(tarjetas([aparicion("pasado", "2026-09-18T15:00:00Z", { termina: "2026-09-18T17:00:00Z" })])).toEqual([]);
  });
  it("excluye eventos ocultos/cancelados y los lugares privados u ocultos, incluso con sesión admin", () => {
    expect(tarjetas([
      aparicion("oculto", undefined, { visible: false }),
      aparicion("privado", undefined, { lugar_id: "l", lugar: { visible: true, privado: true } }),
      aparicion("lugar-oculto", undefined, { lugar_id: "l", lugar: { visible: false, privado: false } }),
      aparicion("lugar-no-legible", undefined, { lugar_id: "l", lugar: null }),
    ])).toEqual([]);
    const oculto = aparicion("artista-oculto"); oculto.ficha.visible = false;
    const privado = aparicion("lugar-privado"); privado.ficha.privado = true;
    expect(tarjetas([oculto, privado])).toEqual([]);
  });
  it("deduplica, elige la primera fecha elegible y ordena por instante, nombre e id de forma estable", () => {
    const lejano = aparicion("a", "2026-09-24T18:00:00Z");
    const cercano = aparicion("a", "2026-09-20T01:00:00Z");
    const empate = aparicion("b", "2026-09-19T19:00:00-06:00"); empate.ficha.nombre = "a";
    const primero = aparicion("z");
    const datos = [lejano, empate, cercano, primero, aparicion("a", undefined, { visible: false })];
    const r = tarjetas(datos);
    expect(r.map((a) => a.id)).toEqual(["z", "a", "b"]);
    expect(r[1].detalle).toBe("Mañana · 19:00");
    expect(tarjetas([...datos].reverse())).toEqual(r);
  });
  it("mantiene enlaces a las fichas y respaldo de imagen para ambos directorios", () => {
    expect(tarjetas([aparicion("a")])[0]).toMatchObject({ href: "/artistas/a", foto: SIN_FOTO });
    expect(tarjetasDeSemana([aparicion("l")], "lugares", ahora)[0]).toMatchObject({ href: "/lugares/l", foto: SIN_FOTO_ANCHA });
  });
  it("dos apariciones a la misma hora se desempatan por evento, sin depender del lote", () => {
    const a = aparicion("artista", "2026-09-19T01:00:00Z", { id: "a", zona: "America/Mexico_City" });
    const b = aparicion("artista", "2026-09-19T01:00:00Z", { id: "b", zona: "Europe/Madrid" });
    expect(tarjetas([b, a])).toEqual(tarjetas([a, b]));
    expect(tarjetas([b, a])[0].detalle).toBe("Hoy · 19:00");
  });
  it("una fecha inválida no rompe el directorio", () => {
    expect(tarjetas([aparicion("malo", "incorrecto"), aparicion("fin-malo", undefined, { termina: "incorrecto" })])).toEqual([]);
  });
});
