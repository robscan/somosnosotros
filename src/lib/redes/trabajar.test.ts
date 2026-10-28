import { describe, expect, it, vi } from "vitest";
import type { ParaHoja } from "@/app/admin/instagram/datos";
import { baseFalsa, type Fila } from "../rutinas/baseFalsa";
import { reclamarTrabajo } from "./cola";
import { correrUnTrabajo, PLAZOS_MS, type Herramientas } from "./trabajar";

/**
 * OL-465 (bitácora 497): el trabajador de la cola de redes con una base en memoria (`baseFalsa`) y herramientas de mentira (sin Instagram,
 * Facebook, Storage ni teléfono). El reclamo sin carreras, los pasos con su avance, los reintentos con espera creciente, lo que no se reintenta,
 * Facebook que falla después de Instagram (Instagram no se repite) y el aviso, una sola vez.
 */
const T0 = new Date("2026-10-28T20:10:00.000Z");
const EVENTO = "e0000000-0000-4000-8000-000000000001";
const ADMIN = "a0000000-0000-4000-8000-000000000001";

const hoja = (o: Partial<ParaHoja> = {}): ParaHoja => ({
  id: EVENTO,
  slug: "cultura-mistica",
  titulo: "Cultura Mística",
  evento: { titulo: "Cultura Mística", inicio: "2026-10-30T23:00:00Z", fin: "2026-10-31T03:00:00Z", zona: "America/Mexico_City", clase: "puntual", precio: "$80", lugar: { nombre: "Aurora Co-Lab", usuario: "auroracolab" }, ciudad: "San Luis Potosí", artistas: [] },
  etiquetas: ["auroracolab"],
  texto: "",
  ubicacion: null,
  ciudad: { slug: "san-luis-potosi", nombre: "San Luis Potosí" },
  imagen: "https://x.test/cartel.jpg",
  sePuede: true,
  publicado: null,
  zona: "America/Mexico_City",
  carrusel: [],
  datos: { inicio: "2026-10-30T23:00:00Z", termina: "2026-10-31T03:00:00Z", zona: "America/Mexico_City", clase: "puntual", sesiones: [] },
  ...o,
});

function trabajo(o: Partial<Fila> = {}): Fila {
  return {
    id: `t${Math.random().toString(16).slice(2, 10)}`,
    evento_id: EVENTO,
    red: "instagram",
    formato: "4x5",
    pedido: { recorte: false, diseno: 0, texto: null, quitadas: [], facebook: true },
    estado: "en_cola",
    avance: {},
    resultado: null,
    intentos: 0,
    fallos: 0,
    error: null,
    turno: 0,
    ocupada_hasta: null,
    siguiente_en: T0.toISOString(),
    avisado_en: null,
    pedido_por: ADMIN,
    creado_en: T0.toISOString(),
    ...o,
  };
}

function preparar(filas: Fila[], h: Partial<Herramientas> = {}, o: { hoja?: ParaHoja | null } = {}) {
  const base = baseFalsa({ redes_trabajos: filas, instagram_publicaciones: [], facebook_publicaciones: [], eventos: [{ id: EVENTO, titulo: "Cultura Mística" }] });
  const avisos: { usuario: string | null; cuerpo: string }[] = [];
  const herramientas: Herramientas = {
    cargar: vi.fn(async () => (o.hoja === undefined ? hoja() : o.hoja)),
    dibujar: vi.fn(async () => [{ item: null, bytes: Buffer.from("jpeg") }]),
    subir: vi.fn(async (_db, carpeta) => `https://x.test/storage/${carpeta}/instagram-${Math.random().toString(16).slice(2, 6)}.jpg`),
    cupo: vi.fn(async () => ({ usadas: 3, tope: 100 })),
    publicar: vi.fn(async () => ({ ok: true as const, mediaId: "17900000000000465", permalink: "https://www.instagram.com/p/R465/", sinEtiquetas: false })),
    publicarCarrusel: vi.fn(async () => ({ ok: true as const, mediaId: "17900000000000466", permalink: "https://www.instagram.com/p/C466/", sinEtiquetas: false })),
    publicarEnPagina: vi.fn(async () => ({ ok: true as const, postId: "1_465", permalink: "https://www.facebook.com/1/posts/465" })),
    avisar: vi.fn(async (_db, usuario, aviso) => void avisos.push({ usuario, cuerpo: aviso.cuerpo })),
    ...h,
  };
  let reloj = T0.getTime();
  const dep = { db: base.db, ahora: () => new Date(reloj), hasta: T0.getTime() + 290_000, h: herramientas };
  // Pasar el tiempo es otra llamada a la ruta: su función tiene otra vez su plazo entero por delante.
  const pasar = (ms: number) => {
    reloj += ms;
    dep.hasta = reloj + 290_000;
  };
  return { ...base, dep, h: herramientas, avisos, pasar, fijarHasta: (ms: number) => (dep.hasta = ms) };
}

describe("reclamar sin carreras", () => {
  it("dos llamadas a la vez con un solo trabajo: solo una lo toma", async () => {
    const { db, tablas } = baseFalsa({ redes_trabajos: [trabajo({ id: "t1" })] });
    const [a, b] = await Promise.all([reclamarTrabajo(db, T0), reclamarTrabajo(db, T0)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(tablas.redes_trabajos[0]).toMatchObject({ estado: "publicando", turno: 1, intentos: 1 });
  });
  it("no toma uno que espera su reintento ni uno que alguien trabaja; sí uno cuya función se cayó (y cuenta como fallo)", async () => {
    const futuro = new Date(T0.getTime() + 60_000).toISOString();
    const pasado = new Date(T0.getTime() - 1_000).toISOString();
    const { db, tablas } = baseFalsa({ redes_trabajos: [trabajo({ id: "espera", siguiente_en: futuro }), trabajo({ id: "ocupado", estado: "publicando", turno: 1, ocupada_hasta: futuro })] });
    expect(await reclamarTrabajo(db, T0)).toBeNull();
    tablas.redes_trabajos[1].ocupada_hasta = pasado;
    const t = await reclamarTrabajo(db, T0);
    expect(t?.id).toBe("ocupado");
    expect(tablas.redes_trabajos[1]).toMatchObject({ turno: 2, fallos: 1, intentos: 1 });
  });
});

describe("publicar en segundo plano", () => {
  it("imágenes → Instagram → Facebook: anota las dos publicaciones a nombre de quien lo pidió, queda «publicado» y avisa una vez", async () => {
    const t = trabajo({ id: "t1" });
    const { dep, tablas, h, avisos } = preparar([t]);
    const r = await correrUnTrabajo(dep);
    expect(r).toMatchObject({ corrida: "t1", estado: "terminada" });
    expect(h.dibujar).toHaveBeenCalledOnce();
    expect(h.publicar).toHaveBeenCalledWith(expect.objectContaining({ etiquetas: ["auroracolab"], historia: false, texto: expect.stringContaining("Cultura Mística") }));
    expect(tablas.instagram_publicaciones).toEqual([expect.objectContaining({ estado: "publicada", formato: "4x5", media_id: "17900000000000465", publicado_por: ADMIN, imagenes: 1 })]);
    expect(tablas.facebook_publicaciones).toEqual([expect.objectContaining({ estado: "publicada", post_id: "1_465", instagram_id: tablas.instagram_publicaciones[0].id, publicado_por: ADMIN })]);
    const fila = tablas.redes_trabajos[0];
    expect(fila).toMatchObject({ estado: "publicado", error: null, ocupada_hasta: null });
    expect(fila.resultado).toEqual({ instagram: { permalink: "https://www.instagram.com/p/R465/", imagenes: 1, sinEtiquetas: false, formato: "4x5" }, facebook: { ok: true, permalink: "https://www.facebook.com/1/posts/465" } });
    expect(avisos).toEqual([{ usuario: ADMIN, cuerpo: "Se publicó en Instagram y Facebook · Cultura Mística" }]);
    // Otra llamada no encuentra nada ni vuelve a avisar.
    expect(await correrUnTrabajo(dep)).toMatchObject({ corrida: null, estado: "nada" });
    expect(avisos).toHaveLength(1);
  });

  it("una historia sin Facebook: sin texto, y el aviso dice solo Instagram", async () => {
    const { dep, h, avisos, tablas } = preparar([trabajo({ formato: "9x16", pedido: { facebook: false } })]);
    await correrUnTrabajo(dep);
    expect(h.publicar).toHaveBeenCalledWith(expect.objectContaining({ historia: true, texto: null }));
    expect(h.publicarEnPagina).not.toHaveBeenCalled();
    expect(tablas.redes_trabajos[0].resultado).toMatchObject({ facebook: null });
    expect(avisos[0].cuerpo).toBe("Se publicó en Instagram · Cultura Mística");
  });

  it("un error pasajero vuelve a la cola con espera creciente; al cuarto fallo, «fallido», con su error anotado y el aviso", async () => {
    const { dep, tablas, h, avisos, pasar } = preparar([trabajo({ pedido: { facebook: false } })], { publicar: vi.fn(async () => ({ ok: false as const, error: "otro" as const })) });
    const esperas: number[] = [];
    for (let i = 0; i < 3; i++) {
      expect((await correrUnTrabajo(dep)).estado).toBe("corriendo");
      const f = tablas.redes_trabajos[0];
      expect(f).toMatchObject({ estado: "en_cola", error: "otro", fallos: i + 1 });
      esperas.push(Date.parse(String(f.siguiente_en)) - dep.ahora().getTime());
      // Antes de su espera no se toma.
      expect((await correrUnTrabajo(dep)).estado).toBe("nada");
      pasar(esperas[i]);
    }
    expect(esperas).toEqual([60_000, 180_000, 420_000]);
    expect((await correrUnTrabajo(dep)).estado).toBe("fallida");
    expect(tablas.redes_trabajos[0]).toMatchObject({ estado: "fallido", error: "otro" });
    expect(h.publicar).toHaveBeenCalledTimes(4);
    // Las imágenes se hicieron una vez: el avance se guardó y los reintentos no las repiten.
    expect(h.dibujar).toHaveBeenCalledOnce();
    expect(tablas.instagram_publicaciones).toEqual([expect.objectContaining({ estado: "error", error: "otro" })]);
    expect(avisos).toEqual([{ usuario: ADMIN, cuerpo: "No se pudo publicar Cultura Mística: Instagram no respondió." }]);
  });

  it("el cupo del día y un permiso vencido no se reintentan", async () => {
    const cupo = preparar([trabajo()], { cupo: vi.fn(async () => ({ usadas: 100, tope: 100 })) });
    expect((await correrUnTrabajo(cupo.dep)).estado).toBe("fallida");
    expect(cupo.tablas.redes_trabajos[0]).toMatchObject({ estado: "fallido", error: "cupo", fallos: 0 });
    expect(cupo.h.publicar).not.toHaveBeenCalled();
    expect(cupo.avisos[0].cuerpo).toBe("No se pudo publicar Cultura Mística: hoy ya van 100 publicaciones en Instagram.");
    const permiso = preparar([trabajo()], { publicar: vi.fn(async () => ({ ok: false as const, error: "permiso" as const })) });
    expect((await correrUnTrabajo(permiso.dep)).estado).toBe("fallida");
    expect(permiso.tablas.redes_trabajos[0]).toMatchObject({ estado: "fallido", error: "permiso" });
    expect(permiso.h.publicar).toHaveBeenCalledOnce();
  });

  it("si el evento ya empezó, no se publica nada", async () => {
    const { dep, tablas, h } = preparar([trabajo()], {}, { hoja: hoja({ datos: { inicio: "2026-10-28T19:00:00Z", termina: "2026-10-28T23:00:00Z", zona: "America/Mexico_City", clase: "puntual", sesiones: [] } }) });
    expect((await correrUnTrabajo(dep)).estado).toBe("fallida");
    expect(tablas.redes_trabajos[0]).toMatchObject({ estado: "fallido", error: "empezo" });
    expect(h.dibujar).not.toHaveBeenCalled();
  });

  it("Facebook falla después de Instagram: Instagram no se repite; se reintenta solo Facebook y, si no se logra, queda publicado con «Facebook: …»", async () => {
    const fb = vi.fn(async () => ({ ok: false as const, error: "otro" as const }));
    const { dep, tablas, h, avisos, pasar } = preparar([trabajo()], { publicarEnPagina: fb });
    expect((await correrUnTrabajo(dep)).estado).toBe("corriendo");
    expect(tablas.instagram_publicaciones).toHaveLength(1);
    expect(tablas.redes_trabajos[0].avance).toMatchObject({ instagram: { mediaId: "17900000000000465" } });
    for (const espera of [60_000, 180_000, 420_000]) {
      pasar(espera);
      await correrUnTrabajo(dep);
    }
    expect(h.publicar).toHaveBeenCalledOnce();
    expect(fb).toHaveBeenCalledTimes(4);
    expect(tablas.redes_trabajos[0]).toMatchObject({ estado: "publicado", error: null });
    expect(tablas.redes_trabajos[0].resultado).toMatchObject({ facebook: { ok: false, error: "otro" } });
    expect(tablas.facebook_publicaciones).toEqual([expect.objectContaining({ estado: "error", error: "otro" })]);
    expect(avisos).toEqual([{ usuario: ADMIN, cuerpo: "Se publicó en Instagram · Cultura Mística. Facebook: Facebook no respondió." }]);
  });

  it("Facebook sin permiso: no se reintenta y queda publicado con su error", async () => {
    const { dep, tablas } = preparar([trabajo()], { publicarEnPagina: vi.fn(async () => ({ ok: false as const, error: "permiso" as const })) });
    expect((await correrUnTrabajo(dep)).estado).toBe("terminada");
    expect(tablas.redes_trabajos[0].resultado).toMatchObject({ facebook: { ok: false, error: "permiso" } });
  });

  it("un paso que no cabe en lo que le queda a la función se deja para la siguiente llamada (sin contar como fallo)", async () => {
    const { dep, tablas, h, fijarHasta } = preparar([trabajo()]);
    fijarHasta(T0.getTime() + PLAZOS_MS.imagenes - 1);
    expect(await correrUnTrabajo(dep)).toMatchObject({ corrida: null, estado: "nada" });
    expect(tablas.redes_trabajos[0]).toMatchObject({ estado: "en_cola", fallos: 0 });
    expect(h.dibujar).not.toHaveBeenCalled();
    // Con tiempo para las imágenes pero no para Instagram: las imágenes quedan guardadas y no se repiten.
    fijarHasta(T0.getTime() + PLAZOS_MS.imagenes + 1);
    await correrUnTrabajo(dep);
    expect(h.dibujar).toHaveBeenCalledOnce();
    expect((tablas.redes_trabajos[0].avance as { imagenes: string[] }).imagenes).toHaveLength(1);
    expect(h.publicar).not.toHaveBeenCalled();
    fijarHasta(T0.getTime() + 290_000);
    expect((await correrUnTrabajo(dep)).estado).toBe("terminada");
    expect(h.dibujar).toHaveBeenCalledOnce();
    expect(h.publicar).toHaveBeenCalledOnce();
  });

  it("un carrusel: las imágenes en el orden de la hoja y Facebook con todas las fotos", async () => {
    const carrusel = [
      { clave: "portada", titulo: "Cultura Mística", imagen: "https://x.test/marco.jpg", eventos: [EVENTO], usuarios: [] },
      { clave: "acto-1", titulo: "Tambores", imagen: "https://x.test/a1.jpg", eventos: ["acto-1"], usuarios: ["tamborista"] },
    ];
    const dibujar = vi.fn(async (_db: unknown, _h: unknown, o: { items: { clave: string }[] }) => o.items.map((item) => ({ item: item as never, bytes: Buffer.from(item.clave) })));
    const { dep, tablas, h } = preparar([trabajo({ pedido: { facebook: true, imagenes: ["acto-1", "portada"] } })], { dibujar }, { hoja: hoja({ carrusel }) });
    expect((await correrUnTrabajo(dep)).estado).toBe("terminada");
    expect(dibujar.mock.calls[0][2].items.map((i) => i.clave)).toEqual(["acto-1", "portada"]);
    // El lugar va en todas las imágenes (un artista que la ficha no etiqueta, no).
    const enviadas = (h.publicarCarrusel as ReturnType<typeof vi.fn>).mock.calls[0][0].imagenes as { imagen: string; etiquetas: string[] }[];
    expect(enviadas.map((i) => i.etiquetas)).toEqual([["auroracolab"], ["auroracolab"]]);
    expect(enviadas.map((i) => i.imagen)).toEqual((tablas.redes_trabajos[0].avance as { imagenes: string[] }).imagenes);
    expect(tablas.instagram_publicaciones[0]).toMatchObject({ formato: "carrusel", imagenes: 2 });
    expect((h.publicarEnPagina as ReturnType<typeof vi.fn>).mock.calls[0][0].imagenes).toHaveLength(2);
  });

  it("«Publicar en Facebook»: espeja la última de Instagram; si ya estaba en la página, no publica otra", async () => {
    const ig = { id: "ig1", evento_id: EVENTO, estado: "publicada", formato: "4x5", imagen: "https://x.test/ig.jpg", carrusel: null, creado_en: T0.toISOString() };
    const { dep, tablas, h, avisos } = preparar([trabajo({ red: "facebook", pedido: { texto: null } })]);
    tablas.instagram_publicaciones.push(ig);
    expect((await correrUnTrabajo(dep)).estado).toBe("terminada");
    expect(h.publicarEnPagina).toHaveBeenCalledWith(expect.objectContaining({ imagen: "https://x.test/ig.jpg", historia: false }));
    expect(tablas.facebook_publicaciones).toEqual([expect.objectContaining({ instagram_id: "ig1", estado: "publicada" })]);
    expect(avisos[0].cuerpo).toBe("Se publicó en Facebook · Cultura Mística");
    tablas.redes_trabajos.push(trabajo({ id: "t2", red: "facebook" }));
    expect((await correrUnTrabajo(dep)).estado).toBe("terminada");
    expect(h.publicarEnPagina).toHaveBeenCalledOnce();
  });

  it("uno que se cayó a medias más de tres veces ya no se insiste", async () => {
    const { dep, tablas, h } = preparar([trabajo({ estado: "publicando", turno: 4, fallos: 3, ocupada_hasta: new Date(T0.getTime() - 1).toISOString() })]);
    expect((await correrUnTrabajo(dep)).estado).toBe("fallida");
    expect(tablas.redes_trabajos[0]).toMatchObject({ estado: "fallido", error: "otro", fallos: 4 });
    expect(h.publicar).not.toHaveBeenCalled();
  });
});
