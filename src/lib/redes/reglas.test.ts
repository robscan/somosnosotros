import { describe, expect, it } from "vitest";
import { trabajosPorEvento } from "@/app/admin/instagram/colaPorEvento";
import { avisoDeTrabajo, botonReciente, enCamino, esPasajero, leerEstadoTrabajo, leerReciente, lineaDeTrabajo, mensajeDeFallo, preguntaRepetir, REFRESCO_MS, textoEnCamino, trasFallo } from "./reglas";

/** OL-465 (bitácora 497): las reglas de la cola de redes, sin base ni red. */
describe("qué se reintenta", () => {
  it("lo pasajero sí (Instagram procesando la imagen o sin responder, un 5xx, la red); el cupo, el permiso, ya empezó o el texto, no", () => {
    expect(esPasajero("imagen")).toBe(true);
    expect(esPasajero("otro")).toBe(true);
    for (const c of ["cupo", "permiso", "empezo", "texto"] as const) expect(esPasajero(c)).toBe(false);
  });
  it("hasta 3 reintentos, con espera creciente: 1, 3 y 7 minutos; al cuarto fallo, ya no", () => {
    expect(trasFallo("otro", 1)).toEqual({ reintentar: true, esperaMs: 60_000 });
    expect(trasFallo("imagen", 2)).toEqual({ reintentar: true, esperaMs: 180_000 });
    expect(trasFallo("otro", 3)).toEqual({ reintentar: true, esperaMs: 420_000 });
    expect(trasFallo("otro", 4)).toEqual({ reintentar: false });
    expect(trasFallo("cupo", 1)).toEqual({ reintentar: false });
    expect(trasFallo("permiso", 1)).toEqual({ reintentar: false });
  });
});

describe("sin duplicados: lo que dice el botón", () => {
  it("lee lo que contesta la base y nada más", () => {
    expect(leerReciente({ estado: "publicando" })).toEqual({ estado: "publicando" });
    expect(leerReciente({ estado: "publicado", minutos: 7 })).toEqual({ estado: "publicado", minutos: 7 });
    expect(leerReciente({ estado: "publicado", minutos: -3 })).toEqual({ estado: "publicado", minutos: 0 });
    expect(leerReciente(null)).toBeNull();
    expect(leerReciente({ estado: "otro" })).toBeNull();
    expect(leerReciente("publicando")).toBeNull();
  });
  it("«Se está publicando» o «Ya se publicó hace N min»", () => {
    expect(botonReciente({ estado: "publicando" })).toBe("Se está publicando");
    expect(botonReciente({ estado: "publicado", minutos: 0 })).toBe("Ya se publicó hace un momento");
    expect(botonReciente({ estado: "publicado", minutos: 1 })).toBe("Ya se publicó hace 1 min");
    expect(botonReciente({ estado: "publicado", minutos: 12 })).toBe("Ya se publicó hace 12 min");
  });
  it("y pregunta antes de repetir (también en Facebook)", () => {
    expect(preguntaRepetir({ estado: "publicando" })).toBe("Este evento ya se está publicando. ¿Publicarlo otra vez?");
    expect(preguntaRepetir({ estado: "publicado", minutos: 3 })).toBe("Este evento se publicó hace 3 min. ¿Publicarlo otra vez?");
    expect(preguntaRepetir({ estado: "publicado", minutos: 3 }, "facebook")).toBe("Este evento se publicó en Facebook hace 3 min. ¿Publicarlo otra vez?");
  });
});

describe("el aviso al terminar", () => {
  const base = { id: "t1", evento_id: "e1", titulo: "Cultura Mística", red: "instagram" as const, estado: "publicado" as const, error: null };
  it("publicado en las dos redes, con el título, y abre la hoja de ese evento", () => {
    expect(avisoDeTrabajo({ ...base, resultado: { instagram: { permalink: "https://www.instagram.com/p/X/", imagenes: 1, sinEtiquetas: false, formato: "4x5" }, facebook: { ok: true, permalink: null } } })).toEqual({
      titulo: "Publicado",
      cuerpo: "Se publicó en Instagram y Facebook · Cultura Mística",
      url: "/admin/instagram?evento=e1",
      tag: "redes-t1",
    });
  });
  it("solo en Instagram, o en Instagram con Facebook fallido (dice por qué, en llano)", () => {
    expect(avisoDeTrabajo({ ...base, resultado: { facebook: null } }).cuerpo).toBe("Se publicó en Instagram · Cultura Mística");
    expect(avisoDeTrabajo({ ...base, resultado: { facebook: { ok: false, error: "permiso", mensaje: "…" } } }).cuerpo).toBe("Se publicó en Instagram · Cultura Mística. Facebook: falta el permiso de la página de Facebook.");
  });
  it("solo en Facebook", () => {
    expect(avisoDeTrabajo({ ...base, red: "facebook", resultado: { facebook: { ok: true, permalink: null } } }).cuerpo).toBe("Se publicó en Facebook · Cultura Mística");
  });
  it("no se pudo: «No se pudo publicar <título>: <motivo llano>»", () => {
    expect(avisoDeTrabajo({ ...base, estado: "fallido", error: "cupo", resultado: null })).toMatchObject({ titulo: "No se publicó", cuerpo: "No se pudo publicar Cultura Mística: hoy ya van 100 publicaciones en Instagram." });
    expect(avisoDeTrabajo({ ...base, estado: "fallido", error: "imagen", resultado: null }).cuerpo).toBe("No se pudo publicar Cultura Mística: Instagram no aceptó la imagen.");
    expect(avisoDeTrabajo({ ...base, estado: "fallido", error: "empezo", resultado: null }).cuerpo).toBe("No se pudo publicar Cultura Mística: el evento ya empezó.");
    expect(avisoDeTrabajo({ ...base, red: "facebook", estado: "fallido", error: "permiso", resultado: null }).cuerpo).toBe("No se pudo publicar Cultura Mística: falta el permiso de la página de Facebook.");
  });
  it("un título muy largo se corta (el aviso del teléfono no lo enseña entero)", () => {
    expect(avisoDeTrabajo({ ...base, titulo: "x".repeat(120), resultado: null }).cuerpo).toBe(`Se publicó en Instagram · ${"x".repeat(79)}…`);
  });
});

describe("el trabajo como lo ven la hoja y la lista", () => {
  it("lee la fila y dice si va en camino", () => {
    const e = leerEstadoTrabajo({ id: "t1", red: "instagram", formato: "9x16", estado: "publicando", pedido: { facebook: true }, resultado: null, error: null })!;
    expect(e).toEqual({ id: "t1", red: "instagram", formato: "9x16", estado: "publicando", conFacebook: true, resultado: null, error: null, reintentando: false });
    expect(enCamino(e)).toBe(true);
    expect(enCamino({ estado: "publicado" })).toBe(false);
    expect(leerEstadoTrabajo(null)).toBeNull();
  });
  it("la línea del renglón: «Publicando…», «Facebook: publicando…» o por qué no se publicó", () => {
    const e = leerEstadoTrabajo({ id: "t1", red: "instagram", formato: "4x5", estado: "en_cola", pedido: {} })!;
    expect(lineaDeTrabajo(e)).toBe("Publicando…");
    expect(lineaDeTrabajo({ ...e, red: "facebook" })).toBe("Facebook: publicando…");
    expect(lineaDeTrabajo({ ...e, estado: "fallido", error: "imagen" })).toBe("No se publicó: Instagram no aceptó la imagen");
    expect(lineaDeTrabajo({ ...e, estado: "publicado" })).toBeNull();
  });
  it("OL-488: «Reintentando…» si la cola va en otro intento (un fallo pasajero anotado o más de un intento), solo mientras va en camino", () => {
    const en = (o: Record<string, unknown>) => leerEstadoTrabajo({ id: "t1", red: "instagram", formato: "4x5", estado: "en_cola", pedido: {}, ...o })!;
    expect(en({ intentos: 1, fallos: 0 }).reintentando).toBe(false);
    expect(en({ intentos: 1, fallos: 1 }).reintentando).toBe(true);
    expect(en({ intentos: 2, fallos: 0, estado: "publicando" }).reintentando).toBe(true);
    expect(en({ intentos: 2, fallos: 1, estado: "publicado" }).reintentando).toBe(false);
    expect(en({}).reintentando).toBe(false);
    expect(lineaDeTrabajo(en({ fallos: 1 }))).toBe("Reintentando…");
    expect(lineaDeTrabajo({ ...en({ fallos: 1 }), red: "facebook" })).toBe("Facebook: reintentando…");
    expect(textoEnCamino(en({}), true)).toBe("Instagram: publicando…");
    expect(textoEnCamino(en({ fallos: 1 }), true)).toBe("Instagram: reintentando…");
    expect(REFRESCO_MS).toBe(5_000);
  });
  it("OL-488: la cola por evento dice qué trabajos van en camino (para preguntar por ellos)", () => {
    const { vivos } = trabajosPorEvento([
      { id: "t2", evento_id: "e1", red: "instagram", formato: "4x5", estado: "en_cola", pedido: {}, intentos: 1, fallos: 1 },
      { id: "t1", evento_id: "e1", red: "instagram", formato: "4x5", estado: "publicado", pedido: {} },
      { id: "t3", evento_id: "e2", red: "facebook", formato: "4x5", estado: "publicando", pedido: {} },
    ]);
    expect(vivos.get("e1")).toEqual([{ id: "t2", reintentando: true }]);
    expect(vivos.get("e2")).toEqual([{ id: "t3", reintentando: false }]);
  });
  it("la frase larga de un fallo: la que guardó el trabajador o, si no, la corta", () => {
    const e = leerEstadoTrabajo({ id: "t1", red: "instagram", formato: "4x5", estado: "fallido", error: "permiso", resultado: { mensaje: "Instagram ya no nos deja publicar." } })!;
    expect(mensajeDeFallo(e)).toBe("Instagram ya no nos deja publicar.");
    expect(mensajeDeFallo({ ...e, resultado: null })).toBe("No se pudo publicar: hay que volver a conectar la cuenta de Instagram.");
  });
});
