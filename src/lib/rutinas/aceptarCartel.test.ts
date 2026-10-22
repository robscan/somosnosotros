import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LADOS, TAMANO_MAX_FOTO } from "../imagen";
import { ponerCartel, type Almacen } from "./aceptarCartel";
import { baseFalsa } from "./baseFalsa";

/**
 * Aceptar un cartel de «Buscar carteles» (OL-444) con una base en memoria, un Storage falso y una red falsa: se baja la imagen, se prepara
 * como un cartel que sube una persona (lado de 2000 y JPEG en el tope), se guarda en `lugares/<quien acepta>/evento-<uuid>.jpg` y se pone en
 * el evento con sus colores, solo si el evento sigue sin cartel.
 */

const AHORA = new Date("2026-10-22T16:00:00Z");
const YO = "11111111-2222-4333-8444-555555555555";
const EV = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const IMAGEN = "https://forositio.mx/carteles/jazz.png";
const SUPABASE = "https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/";

let grande: Buffer;
beforeAll(async () => {
  // Un PNG ancho de 3000 × 1500: tiene que quedar en 2000 × 1000 y en JPEG.
  grande = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "#dd2244" } }).png().toBuffer();
});

function mundo(evento: Record<string, unknown> = {}) {
  const base = baseFalsa({ eventos: [{ id: EV, slug: "jazz-en-el-foro", imagen: null, lugar_id: "L1", termina: "2026-10-30T04:00:00Z", ...evento }] });
  const subidas: { ruta: string; bytes: Buffer; tipo: string }[] = [];
  const borradas: string[] = [];
  const almacen: Almacen = {
    subir: async (ruta, bytes, tipo) => (subidas.push({ ruta, bytes, tipo }), `${SUPABASE}${ruta}`),
    borrar: async (ruta) => void borradas.push(ruta),
  };
  const pedir = vi.fn(async (url: string) => (url === IMAGEN ? new Response(new Uint8Array(grande)) : new Response("no", { status: 404 }))) as unknown as typeof fetch;
  return { base, subidas, borradas, almacen, pedir, dep: { db: base.db, almacen, pedir, ahora: () => AHORA } };
}
const datos = (extra: Record<string, unknown> = {}) => ({ evento_id: EV, imagen: IMAGEN, pagina: "https://forositio.mx/agenda", titulo: "Jazz en el Foro", ...extra });

describe("aceptar un cartel (OL-444)", () => {
  it("baja la imagen, la deja como cartel (2000 de lado, JPEG), la sube a la carpeta de quien acepta y la pone en el evento con sus colores", async () => {
    const m = mundo();
    const r = await ponerCartel(m.dep, datos(), YO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(m.subidas).toHaveLength(1);
    const [s] = m.subidas;
    expect(s.ruta).toMatch(new RegExp(`^lugares/${YO}/evento-[0-9a-f-]{36}\\.jpg$`));
    expect(s.tipo).toBe("image/jpeg");
    const meta = await sharp(s.bytes).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", LADOS.cartel, 1000]);
    expect(s.bytes.length).toBeLessThanOrEqual(TAMANO_MAX_FOTO);
    expect(r.url).toBe(`${SUPABASE}${s.ruta}`);
    expect(r.evento).toEqual({ id: EV, slug: "jazz-en-el-foro", lugar_id: "L1" });
    const ev = m.base.tablas.eventos[0];
    expect(ev.imagen).toBe(r.url);
    expect(ev.colores_cartel).toBeTruthy();
  });

  it("no acepta si el evento ya tiene cartel, ya pasó o ya no está, ni si la imagen ya no se baja: lo dice en una frase y no sube nada", async () => {
    const conCartel = mundo({ imagen: `${SUPABASE}lugares/x/evento-1.jpg` });
    expect(await ponerCartel(conCartel.dep, datos(), YO)).toEqual({ ok: false, error: "Ese evento ya tiene cartel: recházala como duplicado." });
    const pasado = mundo({ termina: "2026-10-20T00:00:00Z" });
    expect(await ponerCartel(pasado.dep, datos(), YO)).toEqual({ ok: false, error: "Ese evento ya pasó. Recházala." });
    const sinEvento = mundo();
    sinEvento.base.tablas.eventos = [];
    expect(await ponerCartel(sinEvento.dep, datos(), YO)).toEqual({ ok: false, error: "Ese evento ya no está. Recházala." });
    const rota = mundo();
    expect(await ponerCartel(rota.dep, datos({ imagen: "https://forositio.mx/ya-no.jpg" }), YO)).toEqual({ ok: false, error: "La imagen ya no se pudo bajar de esa página. Recházala." });
    const mala = mundo();
    expect(await ponerCartel(mala.dep, datos({ imagen: "http://forositio.mx/x.jpg" }), YO)).toEqual({ ok: false, error: "A esta propuesta le falta el evento o la imagen. Recházala." });
    expect(await ponerCartel(mala.dep, datos({ evento_id: "E1" }), YO)).toEqual({ ok: false, error: "A esta propuesta le falta el evento o la imagen. Recházala." });
    for (const m of [conCartel, pasado, sinEvento, rota, mala]) expect(m.subidas).toHaveLength(0);
  });

  it("si a medio camino otro le puso cartel al evento, no lo pisa y borra el archivo que sobra", async () => {
    const m = mundo();
    m.base.antesDe((o) => {
      if (o.tabla === "eventos" && o.op === "update") m.base.tablas.eventos[0].imagen = `${SUPABASE}lugares/otra/evento-2.jpg`;
    });
    const r = await ponerCartel(m.dep, datos(), YO);
    expect(r).toEqual({ ok: false, error: "Ese evento ya tiene cartel: recházala como duplicado." });
    expect(m.base.tablas.eventos[0].imagen).toBe(`${SUPABASE}lugares/otra/evento-2.jpg`);
    expect(m.borradas).toEqual([m.subidas[0].ruta]);
  });

  it("si Storage no la guarda, no toca el evento", async () => {
    const m = mundo();
    const r = await ponerCartel({ ...m.dep, almacen: { subir: async () => null } }, datos(), YO);
    expect(r).toEqual({ ok: false, error: "No se pudo guardar el cartel. Intenta de nuevo." });
    expect(m.base.tablas.eventos[0].imagen).toBeNull();
  });
});
