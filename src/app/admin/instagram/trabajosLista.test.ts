import { describe, expect, it } from "vitest";
import { anotar, combinar, conRespuesta, encolado, enlaceVer, fusionar, leerMemoria, lineaFacebook, lineaInstagram, MEMORIA_MS, semillas, vigente, vivosDe, type Fila, type Trabajo } from "./trabajosLista";

// OL-506: el dueño del estado de la lista de Instagram, sin React: sembrado, respuesta de «Publicar», sondeo y reconciliación al volver.
const GENERADA = "2026-10-07T16:00:00.000Z";
const fila = (id: string, o: Partial<Fila> = {}): Fila => ({ id, publicado: false, publicadoEn: null, facebook: null, enCamino: [], ...o });

describe("OL-506 · trabajos de la lista de Instagram", () => {
  it("se siembra con lo que trae el servidor en camino, con su red", () => {
    const t = semillas(
      [fila("e1", { enCamino: [{ id: "t1", reintentando: true, red: "instagram", conFacebook: true }] }), fila("e2", { publicado: true, facebook: { estado: "publicando" }, enCamino: [{ id: "t2", reintentando: false }] }), fila("e3")],
      GENERADA,
      0,
    );
    expect(t.e1.instagram).toMatchObject({ id: "t1", estado: "en_cola", reintentando: true, conFacebook: true, desde: GENERADA });
    // Sin la red (una respuesta de antes): lo publicado espera a Facebook; lo demás, a Instagram.
    expect(t.e2.facebook).toMatchObject({ id: "t2", red: "facebook" });
    expect(t.e3).toBeUndefined();
  });

  it("la respuesta de «Publicar» anota el trabajo en camino; Facebook que ya estaba queda publicado", () => {
    let t = anotar({}, "e1", encolado("instagram", { id: "t9" }, true, GENERADA, 1000));
    expect(t.e1.instagram).toMatchObject({ id: "t9", estado: "en_cola", conFacebook: true, t: 1000 });
    expect(lineaInstagram(t.e1.instagram!)).toEqual({ texto: "Publicando…", estado: "en-camino" });
    t = anotar(t, "e2", encolado("facebook", { id: null, yaEstaba: true }, true, GENERADA, 1000));
    expect(t.e2.facebook).toMatchObject({ id: null, estado: "publicado", conFacebook: false });
    expect(lineaFacebook(t.e2)).toEqual({ texto: "Facebook: publicado", girando: false });
  });

  it("el sondeo entrega el estado nuevo: «Reintentando…», luego «Publicado · hace un momento» con su «Ver» y la línea de Facebook", () => {
    const filas = [fila("e1")];
    let t = anotar({}, "e1", encolado("instagram", { id: "t9" }, true, GENERADA, 1000));
    expect(vivosDe(filas, t)).toEqual([{ id: "t9", reintentando: false }]);
    expect(conRespuesta(t, { t9: { estado: "en_cola", reintentando: false } }, 2000)).toBeNull();
    t = fusionar(t, conRespuesta(t, { t9: { estado: "publicando", reintentando: true } }, 2000)!);
    expect(lineaInstagram(t.e1.instagram!)).toEqual({ texto: "Reintentando…", estado: "reintentando" });
    expect(vivosDe(filas, t)).toEqual([{ id: "t9", reintentando: true }]);
    const resultado = { instagram: { permalink: "https://www.instagram.com/p/DEMO/", imagenes: 1, sinEtiquetas: false, formato: "4x5" as const }, facebook: { ok: true as const, permalink: null } };
    t = fusionar(t, conRespuesta(t, { t9: { estado: "publicado", reintentando: false, resultado } }, 4000)!);
    expect(lineaInstagram(t.e1.instagram!)).toEqual({ texto: "Publicado · hace un momento", estado: "hecho" });
    expect(enlaceVer(t.e1.instagram!)).toBe("https://www.instagram.com/p/DEMO/");
    expect(lineaFacebook(t.e1)).toEqual({ texto: "Facebook: publicado", girando: false });
    expect(vivosDe(filas, t)).toEqual([]);
    // La misma respuesta otra vez no cambia nada.
    expect(conRespuesta(t, { t9: { estado: "publicado", reintentando: false, resultado } }, 6000)).toBeNull();
  });

  it("lo que no se pudo publicar dice la frase de hoy en rojo; Facebook que falla dice su motivo; sin enlace, «Ver» lleva a la cuenta", () => {
    let t = anotar({}, "e1", encolado("instagram", { id: "t9" }, false, GENERADA, 1000));
    t = fusionar(t, conRespuesta(t, { t9: { estado: "fallido", reintentando: false, error: "imagen" } }, 2000)!);
    expect(lineaInstagram(t.e1.instagram!)).toEqual({ texto: "No se publicó: Instagram no aceptó la imagen", estado: "fallido" });
    expect(lineaFacebook(t.e1)).toBeNull();
    t = anotar(t, "e2", encolado("facebook", { id: "t8" }, false, GENERADA, 1000));
    expect(lineaFacebook(t.e2)).toEqual({ texto: "Facebook: publicando…", girando: true });
    t = fusionar(t, conRespuesta(t, { t8: { estado: "fallido", reintentando: false, error: "permiso" } }, 2000)!);
    expect(lineaFacebook(t.e2)).toEqual({ texto: "Facebook: falta permiso", girando: false });
    expect(enlaceVer({ ...t.e1.instagram!, estado: "publicado" })).toBe("https://www.instagram.com/smsnstrsapp/");
  });

  it("el trabajo manda hasta que la lista se vuelve a pedir y ya lo sabe", () => {
    const ig: Trabajo = { ...encolado("instagram", { id: "t9" }, false, GENERADA, 1000), estado: "publicado" };
    // La lista de la caché (Atrás dentro del minuto): el evento sigue en «Para publicar».
    expect(vigente(fila("e1"), ig)).toBe(true);
    // La lista nueva: salió después de que se armó la que lo pidió.
    expect(vigente(fila("e1", { publicado: true, publicadoEn: "2026-10-07T16:00:09.000Z" }), ig)).toBe(false);
    // «Publicar otra vez» lo ya publicado: la lista de antes dice la publicación vieja.
    expect(vigente(fila("e1", { publicado: true, publicadoEn: "2026-10-06T19:40:00.000Z" }), ig)).toBe(true);
    // Mientras va, siempre.
    expect(vigente(fila("e1", { publicado: true, publicadoEn: "2026-10-07T16:00:09.000Z" }), { ...ig, estado: "publicando" })).toBe(true);
    const fb: Trabajo = { ...encolado("facebook", { id: "t8" }, false, GENERADA, 1000), estado: "publicado" };
    expect(vigente(fila("e2", { publicado: true, facebook: { estado: "nada" } }), fb)).toBe(true);
    expect(vigente(fila("e2", { publicado: true, facebook: { estado: "publicada" } }), fb)).toBe(false);
  });

  it("al volver (Atrás dentro del minuto) lo recordado manda sobre lo sembrado de la caché, salvo un trabajo nuevo que la sesión no conoce", () => {
    const recordado = { e1: { instagram: { ...encolado("instagram", { id: "t9" }, false, GENERADA, 1000), estado: "publicado" as const } } };
    // La caché trae el mismo trabajo todavía en camino: queda como se dejó.
    const cache = semillas([fila("e1", { enCamino: [{ id: "t9", reintentando: false, red: "instagram" }] })], GENERADA, 0);
    expect(combinar(recordado, cache).e1.instagram).toMatchObject({ id: "t9", estado: "publicado" });
    // Otro trabajo en camino (otra pestaña): manda el nuevo.
    const otro = semillas([fila("e1", { enCamino: [{ id: "t10", reintentando: false, red: "instagram" }] })], GENERADA, 0);
    expect(combinar(recordado, otro).e1.instagram).toMatchObject({ id: "t10", estado: "en_cola" });
  });

  it("la sesión recuerda 10 min y olvida lo que no puede leer", () => {
    const t = anotar({}, "e1", encolado("instagram", { id: "t9" }, false, GENERADA, 1000));
    const texto = JSON.stringify(t);
    expect(leerMemoria(texto, 1000 + MEMORIA_MS - 1).e1?.instagram?.id).toBe("t9");
    expect(leerMemoria(texto, 1000 + MEMORIA_MS)).toEqual({});
    expect(leerMemoria("{no es json", 0)).toEqual({});
    expect(leerMemoria(null, 0)).toEqual({});
  });
});
