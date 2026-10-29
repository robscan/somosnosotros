import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import BotonTuAnio from "./BotonTuAnio";
import DocumentoPdf from "./DocumentoPdf";
import Historial from "./Historial";
import HistorialCuerpo from "./HistorialCuerpo";
import type { EventoPasado } from "@/lib/historialFichas";
import type { PropsDocumento } from "@/lib/opcionesDocumento";

/**
 * La fila de botones de «Trayectoria» / «Historial» (OL-396, «O junto a "Tu año"»): «Tu año» y «Presentación» o «Informe», cada uno
 * solo si quien pinta la sección se lo pasa (quien gestiona la ficha; «Tu año» con algo de este año, el PDF con algo pasado). Desde OL-473 (A1)
 * es lo primero de la sección, antes de quiénes pasaron y la lista (`HistorialCuerpo`).
 */

function* recorrer(n: ReactNode): Generator<ReactElement<Record<string, unknown>>> {
  if (Array.isArray(n)) for (const x of n) yield* recorrer(x);
  else if (isValidElement<Record<string, unknown>>(n)) {
    yield n;
    yield* recorrer(n.props.children as ReactNode);
  }
}

const EVENTO: EventoPasado = { id: "e1", slug: "e1", titulo: "E1", inicio: "2026-10-09T01:00:00Z", fin: null, zona: "America/Mexico_City", imagen: null, lugar_id: null, sitio_texto: "Jardín", sitio_direccion: null, sitio_reservado: false, lugar: null, festival: null, artistas: [], van: 0, cancelado: false };
const DOC: PropsDocumento = { que: "artista", opciones: [{ formato: "carta", periodo: null, paginas: 1, href: "/api/documento?que=artista&id=x&formato=carta", archivo: "presentacion-x.pdf", ayuda: "…" }], etiquetasPeriodo: null };

const pinta = (extra: { tuAnio?: string | null; documento?: PropsDocumento | null }) => [...recorrer(Historial({ de: "artista", artistaId: "a-1", historial: { eventos: [EVENTO], lleno: false }, ...extra }))];

describe("la fila de «Tu año» y el PDF (OL-396)", () => {
  it("con los dos: una fila con «Tu año» y «Presentación»", () => {
    const el = pinta({ tuAnio: "/artistas/x/tu-anio", documento: DOC });
    expect(el.filter((e) => e.type === BotonTuAnio)).toHaveLength(1);
    const pdf = el.filter((e) => e.type === DocumentoPdf);
    expect(pdf).toHaveLength(1);
    expect(pdf[0].props.que).toBe("artista");
  });

  it("solo el PDF (nada de este año, pero sí pasado): sin «Tu año»", () => {
    const el = pinta({ tuAnio: null, documento: DOC });
    expect(el.filter((e) => e.type === BotonTuAnio)).toHaveLength(0);
    expect(el.filter((e) => e.type === DocumentoPdf)).toHaveLength(1);
  });

  it("sin permiso (ni uno ni otro): ninguna fila", () => {
    const el = pinta({});
    expect(el.filter((e) => e.type === BotonTuAnio || e.type === DocumentoPdf)).toHaveLength(0);
  });
});

describe("A1: «Tu año» y el PDF, lo primero de la sección (OL-473)", () => {
  /** Los hijos directos del plegado, en su orden. */
  const hijos = (extra: { tuAnio?: string | null; documento?: PropsDocumento | null }) => {
    const raiz = Historial({ de: "artista", artistaId: "a-1", historial: { eventos: [EVENTO], lleno: false }, ...extra }) as ReactElement<{ children: ReactNode }>;
    return ([raiz.props.children].flat(2) as unknown[]).filter((x): x is ReactElement<Record<string, unknown>> => isValidElement(x));
  };

  it("con sesión de quien gestiona: la fila de botones va antes que el cuerpo (quiénes pasaron, los años y la lista)", () => {
    const h = hijos({ tuAnio: "/artistas/x/tu-anio", documento: DOC });
    expect(h).toHaveLength(2);
    expect([...recorrer(h[0])].some((e) => e.type === BotonTuAnio)).toBe(true);
    expect(h[1].type).toBe(HistorialCuerpo);
  });

  it("sin botones, el plegado empieza por el cuerpo", () => {
    const h = hijos({});
    expect(h.map((e) => e.type)).toEqual([HistorialCuerpo]);
  });

  it("el cuerpo recibe los renglones ya hechos, quiénes pasaron y, sin sesión, nada que seguir (Seguir lleva a entrar)", () => {
    const cuerpo = hijos({}).find((e) => e.type === HistorialCuerpo)!;
    expect(cuerpo.props).toMatchObject({ de: "artista", plegado: "trayectoria", titulo: "Se ha presentado en", seguidos: null, avisos: null });
    expect((cuerpo.props.filas as { id: string; sitio: string }[]).map((f) => [f.id, f.sitio])).toEqual([["e1", "Jardín"]]);
  });
});
