import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cargarNuevos } from "./accionesAgenda";
import { CAMPOS_NUEVOS, LIMITE_NUEVOS, rangoNuevos } from "@/lib/cargarNuevos";
import { filtroSinPasar } from "@/lib/fechas";

const m = vi.hoisted(() => ({ cliente: vi.fn(), claims: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: m.cliente }));
const NOW = Date.parse("2026-09-18T18:00:00.000Z");
const DAY = 86400000;
const CIUDAD = "San Luis Potosí";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const USER = id(9001);
const fecha = (ms: number) => new Date(ms).toISOString();
function evento(n = 1) {
  return { id: id(n), slug: `evento-${n}`, titulo: `Evento ${n}`, inicio: fecha(NOW + n * 3600000), fin: null as string | null,
    zona: "America/Mexico_City", imagen: null, precio: "$120" as string | null, lugar_id: null,
    sitio_texto: "Plaza", sitio_reservado: false, sitio_lat: null, sitio_lng: null,
    creado_en: fecha(NOW - DAY), ciudad: CIUDAD, visible: true,
    lugar: null as unknown, artistas: null as unknown };
}
type Fila = ReturnType<typeof evento>;
type Resultado = { data: unknown; error: unknown };
let filas: Fila[];
let consultas: Consulta[];
let respuestas: Map<string, Resultado>;
let colgada: string | null;
let decisiones: { evento_id: string; usuario_id: string; estado: string }[];

class Consulta {
  campos = "";
  filtros = new Map<string, unknown>();
  orden: { campo: string; asc: boolean }[] = [];
  limite = Infinity;
  pasos: string[] = [];
  signal?: AbortSignal;
  constructor(readonly tabla: string, readonly args?: { ids: string[] }) { consultas.push(this); }
  select(campos: string) { this.campos = campos; return this; }
  eq(campo: string, valor: unknown) { this.filtros.set(campo, valor); return this; }
  gte(campo: string, valor: string) { this.filtros.set(`gte:${campo}`, valor); return this; }
  lte(campo: string, valor: string) { this.filtros.set(`lte:${campo}`, valor); return this; }
  or(valor: string) { this.filtros.set("or", valor); return this; }
  in(campo: string, valor: string[]) { this.filtros.set(`in:${campo}`, valor); return this; }
  order(campo: string, opciones?: { ascending?: boolean }) { this.orden.push({ campo, asc: opciones?.ascending !== false }); return this; }
  limit(n: number) { this.limite = n; return this; }
  abortSignal(signal: AbortSignal) { this.pasos.push("abortSignal"); this.signal = signal; return this; }
  maybeSingle() { this.pasos.push("maybeSingle"); return this; }
  then(resolve: (r: Resultado) => unknown, reject?: (e: unknown) => unknown) { return this.ejecutar().then(resolve, reject); }
  async ejecutar(): Promise<Resultado> {
    if (colgada === this.tabla) return new Promise(() => {});
    const sustituida = respuestas.get(this.tabla);
    if (sustituida) return sustituida;
    if (this.tabla === "perfiles") return { data: { id: USER }, error: null };
    if (this.tabla === "van_por_evento") return { data: this.args!.ids.map((evento_id) => ({ evento_id, n: "2" })), error: null };
    if (this.tabla === "asistencias") return { data: decisiones.filter((d) => d.usuario_id === this.filtros.get("usuario_id")
      && (this.filtros.get("in:evento_id") as string[]).includes(d.evento_id)).slice(0, this.limite), error: null };
    if (this.tabla !== "eventos") throw new Error("No se permiten catalogos ni consultas extra");
    // Emula el WHERE/ORDER/LIMIT del banco, no filtrado posterior de la action.
    const corte = Date.parse(this.filtros.get("gte:creado_en") as string);
    const sello = Date.parse(this.filtros.get("lte:creado_en") as string);
    const reloj = Date.parse(String(this.filtros.get("or")).split('"')[1]);
    const data = filas.filter((f) => f.visible === this.filtros.get("visible") && f.ciudad === this.filtros.get("ciudad")
      && Date.parse(f.creado_en) >= corte && Date.parse(f.creado_en) <= sello
      && (f.fin ? Date.parse(f.fin) : Date.parse(f.inicio) + 12 * 3600000) >= reloj);
    data.sort((a, b) => {
      for (const o of this.orden) {
        const campo = o.campo as keyof Fila;
        const comparacion = String(a[campo]).localeCompare(String(b[campo]));
        if (comparacion) return o.asc ? comparacion : -comparacion;
      }
      return 0;
    });
    return { data: data.slice(0, this.limite), error: null };
  }
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW); vi.clearAllMocks();
  filas = [evento()]; consultas = []; respuestas = new Map(); decisiones = []; colgada = null;
  m.claims.mockResolvedValue({ data: null, error: null });
  m.cliente.mockResolvedValue({ auth: { getClaims: m.claims }, from: (tabla: string) => new Consulta(tabla),
    rpc: (nombre: string, args: { ids: string[] }) => new Consulta(nombre, args) });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
const entrar = () => m.claims.mockResolvedValue({ data: { claims: { sub: USER } }, error: null });

describe("cargarNuevos: contrato DB y datos", () => {
  it("anonimo carga ciudad por nombre exacto, snapshot y solo 20 en DB", async () => {
    const r = await cargarNuevos(CIUDAD, 0);
    expect(r).toMatchObject({ ok: true, asistencias: null, sello: fecha(NOW), eventos: [{ precio: "$120", van: 2 }] });
    const e = consultas.find((q) => q.tabla === "eventos")!;
    expect(e.campos).toBe(CAMPOS_NUEVOS); expect(e.limite).toBe(20); expect(LIMITE_NUEVOS).toBe(20);
    expect(e.filtros).toEqual(new Map<string, unknown>([["visible", true], ["ciudad", CIUDAD], ["or", filtroSinPasar(new Date(NOW))],
      ["gte:creado_en", fecha(NOW - 7 * DAY)], ["lte:creado_en", fecha(NOW)]]));
    expect(e.orden).toEqual([{ campo: "creado_en", asc: false }, { campo: "inicio", asc: true }, { campo: "titulo", asc: true }, { campo: "id", asc: true }]);
    expect(consultas.map((q) => q.tabla)).toEqual(["eventos", "van_por_evento"]);
  });
  it("encuentra el nuevo que queda fuera de los primeros 300 de Todos", async () => {
    filas = Array.from({ length: 350 }, (_, i) => ({ ...evento(i + 1), creado_en: fecha(NOW - 2 * DAY) }));
    filas[349].creado_en = fecha(NOW - 1000);
    expect([...filas].sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 300).some((f) => f.id === id(350))).toBe(false);
    const r = await cargarNuevos(CIUDAD, 0);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.eventos).toHaveLength(20); expect(r.eventos[0].id).toBe(id(350)); }
    expect(consultas.filter((q) => q.tabla === "eventos")).toHaveLength(1);
  });
  it("empates se resuelven por inicio, titulo e id antes del corte", async () => {
    filas = [evento(4), evento(3), evento(2), evento(1)];
    filas[0].inicio = filas[1].inicio = filas[2].inicio;
    filas[0].titulo = filas[1].titulo = "A"; filas[2].titulo = "Z";
    const r = await cargarNuevos(CIUDAD, 0);
    if (!r.ok) throw new Error(r.error);
    expect(r.eventos.map((f) => f.id)).toEqual([id(1), id(3), id(4), id(2)]);
  });
  it("solo publica visibles, no pasados, de esa ciudad y dentro de siete dias", async () => {
    filas = Array.from({ length: 5 }, (_, i) => evento(i + 1));
    filas[1].visible = false; filas[2].ciudad = "Zacatecas";
    filas[3].inicio = fecha(NOW - 2 * DAY); filas[4].creado_en = fecha(NOW - 8 * DAY);
    const r = await cargarNuevos(CIUDAD, 0);
    expect(r.ok && r.eventos.map((f) => f.id)).toEqual([id(1)]);
  });
  it("respeta corte reciente inclusivo y snapshot anterior sin usarlo como reloj de sinPasar", async () => {
    const corte = NOW - 2 * DAY, sello = fecha(NOW - DAY);
    filas = [evento(1), { ...evento(2), creado_en: fecha(corte) }, { ...evento(3), creado_en: fecha(corte - 1) }, { ...evento(4), creado_en: fecha(NOW - 1) }];
    const r = await cargarNuevos(CIUDAD, corte, sello);
    expect(r.ok && r.eventos.map((f) => f.id)).toEqual([id(1), id(2)]);
    expect(r.ok && r.sello).toBe(sello);
    expect(consultas[0].filtros.get("or")).toBe(filtroSinPasar(new Date(NOW)));
  });
  it("snapshot vencido recupera ahora, sin bucle de error", async () => {
    const r = await cargarNuevos(CIUDAD, 0, fecha(NOW - 8 * DAY));
    expect(r).toMatchObject({ ok: true, sello: fecha(NOW) });
    expect(consultas[0].filtros.get("gte:creado_en")).toBe(fecha(NOW - 7 * DAY));
  });
  it("snapshot anterior al corte recupera ahora", async () => {
    expect(rangoNuevos(CIUDAD, NOW - DAY, fecha(NOW - 2 * DAY), new Date(NOW))?.sello).toBe(fecha(NOW));
  });
  it("reloj cliente futuro no vacia la ventana", async () => {
    await cargarNuevos(CIUDAD, NOW + DAY);
    expect(consultas[0].filtros.get("gte:creado_en")).toBe(fecha(NOW - 7 * DAY));
  });
  it("precio null, joins nulos y conteo ausente son datos validos", async () => {
    filas[0].precio = null; respuestas.set("van_por_evento", { data: [], error: null });
    expect(await cargarNuevos(CIUDAD, 0)).toMatchObject({ ok: true, eventos: [{ precio: null, lugar: null, artistas: [], van: 0 }] });
  });
  it("normaliza joins objeto/array y nombres de artistas como page", async () => {
    filas[0].lugar = [{ nombre: "Foro", portada: null, lat: 22, lng: -100 }];
    filas[0].artistas = [{ artista: { nombre: "Uno" } }, { artista: [{ nombre: "Dos" }] }, { artista: null }];
    expect(await cargarNuevos(CIUDAD, 0)).toMatchObject({ ok: true, eventos: [{ lugar: { nombre: "Foro" }, artistas: ["Uno", "Dos"] }] });
  });
  it("cuentas y decisiones propias se piden solo para los 20 IDs, sin N+1", async () => {
    entrar(); filas = Array.from({ length: 30 }, (_, i) => evento(i + 1));
    decisiones = [{ evento_id: id(1), usuario_id: USER, estado: "voy" }, { evento_id: id(2), usuario_id: id(9002), estado: "voy" }, { evento_id: id(30), usuario_id: USER, estado: "me_interesa" }];
    const r = await cargarNuevos(CIUDAD, 0);
    if (!r.ok) throw new Error(r.error);
    expect(r.asistencias).toEqual({ [id(1)]: "voy" });
    expect(consultas.map((q) => q.tabla)).toEqual(["perfiles", "eventos", "van_por_evento", "asistencias"]);
    expect(consultas[0].pasos).toEqual(["abortSignal", "maybeSingle"]);
    expect(consultas[2].args?.ids).toEqual(r.eventos.map((e) => e.id));
    expect(consultas[3].filtros.get("in:evento_id")).toEqual(r.eventos.map((e) => e.id));
    expect(consultas[3].limite).toBe(20);
  });
  it.each([false, true])("vacio real con sesion=%s no pide conteos ni asistencias", async (sesion) => {
    if (sesion) entrar(); filas = [];
    expect(await cargarNuevos(CIUDAD, 0)).toEqual({ ok: true, eventos: [], asistencias: sesion ? {} : null, sello: fecha(NOW) });
    expect(consultas.some((q) => q.tabla === "van_por_evento" || q.tabla === "asistencias")).toBe(false);
  });
  it("nombre Unicode directo no requiere que exista en un catalogo", async () => {
    filas[0].ciudad = "Ciudad de México";
    const r = await cargarNuevos("Ciudad de México", 0);
    expect(r.ok && r.eventos.map((e) => e.id)).toEqual([id(1)]);
    expect(consultas[0].filtros.get("ciudad")).toBe("Ciudad de México");
  });
  it("el borde exacto de siete dias entra y un milisegundo anterior no", async () => {
    filas = [{ ...evento(1), creado_en: fecha(NOW - 7 * DAY) }, { ...evento(2), creado_en: fecha(NOW - 7 * DAY - 1) }];
    const r = await cargarNuevos(CIUDAD, 0);
    expect(r.ok && r.eventos.map((e) => e.id)).toEqual([id(1)]);
  });
  it("evento en curso no se excluye por haber empezado", async () => {
    filas[0].inicio = fecha(NOW - DAY); filas[0].fin = fecha(NOW + DAY);
    const r = await cargarNuevos(CIUDAD, 0);
    expect(r.ok && r.eventos.map((e) => e.id)).toEqual([id(1)]);
  });
  it("sello no avanza durante Auth y excluye publicaciones posteriores al snapshot", async () => {
    filas.push({ ...evento(2), creado_en: fecha(NOW + 1000) });
    m.claims.mockImplementation(async () => { vi.setSystemTime(NOW + 60000); return { data: null, error: null }; });
    const r = await cargarNuevos(CIUDAD, 0);
    expect(r.ok && r.sello).toBe(fecha(NOW));
    expect(r.ok && r.eventos.map((e) => e.id)).toEqual([id(1)]);
  });
  it("sesion valida sin decisiones conserva mapa vacio, no anonimo", async () => {
    entrar(); expect(await cargarNuevos(CIUDAD, 0)).toMatchObject({ ok: true, asistencias: {} });
  });
  it("relaciones vacias por RLS no eliminan el evento", async () => {
    filas[0].lugar = []; filas[0].artistas = [{ artista: [] }];
    expect(await cargarNuevos(CIUDAD, 0)).toMatchObject({ ok: true, eventos: [{ lugar: null, artistas: [] }] });
  });
  it("precio humano no se interpreta como numero", async () => {
    filas[0].precio = "Desde $80, estudiantes gratis";
    expect(await cargarNuevos(CIUDAD, 0)).toMatchObject({ ok: true, eventos: [{ precio: "Desde $80, estudiantes gratis" }] });
  });
});

describe("cargarNuevos: fallo explicito y argumentos acotados", () => {
  it.each(["", " ", "x".repeat(121), "Ciudad\nOtra", null, 123])("rechaza ciudad invalida %s antes de consultar", async (ciudad) => {
    expect((await cargarNuevos(ciudad as string, 0)).ok).toBe(false); expect(m.cliente).not.toHaveBeenCalled();
  });
  it.each([NaN, Infinity, -1, 0.5, "0", null, 8_640_000_000_000_001])("rechaza desde invalido %s", async (desde) => {
    expect((await cargarNuevos(CIUDAD, desde as number)).ok).toBe(false); expect(m.cliente).not.toHaveBeenCalled();
  });
  it.each(["", "ayer", "2026-02-30T00:00:00.000Z", fecha(NOW + 1), "x".repeat(200), null, 12])("rechaza snapshot invalido %s", async (hasta) => {
    expect((await cargarNuevos(CIUDAD, 0, hasta as string)).ok).toBe(false); expect(m.cliente).not.toHaveBeenCalled();
  });
  it("cliente ausente no es lista vacia", async () => {
    m.cliente.mockResolvedValue(null); expect((await cargarNuevos(CIUDAD, 0)).ok).toBe(false);
  });
  it.each([{ data: null, error: { message: "Auth no disponible" } }, { data: { claims: {} }, error: null }])("Auth fallido/malformado no degrada a anonimo", async (r) => {
    m.claims.mockResolvedValue(r); expect((await cargarNuevos(CIUDAD, 0)).ok).toBe(false); expect(consultas).toHaveLength(0);
  });
  it.each(["perfiles", "eventos", "van_por_evento", "asistencias"])("error de %s no se disfraza de exito", async (tabla) => {
    entrar(); respuestas.set(tabla, { data: [], error: { message: "detalle privado" } });
    const r = await cargarNuevos(CIUDAD, 0); expect(r.ok).toBe(false); expect(JSON.stringify(r)).not.toContain("detalle privado");
  });
  it.each(["perfiles", "eventos", "van_por_evento", "asistencias"])("data null en %s no es vacio valido", async (tabla) => {
    entrar(); respuestas.set(tabla, { data: null, error: null }); expect((await cargarNuevos(CIUDAD, 0)).ok).toBe(false);
  });
  it("perfil ajeno no se usa para decisiones", async () => {
    entrar(); respuestas.set("perfiles", { data: { id: id(9002) }, error: null }); expect((await cargarNuevos(CIUDAD, 0)).ok).toBe(false);
  });
  it("respuesta de mas de 20 no se recorta silenciosamente", async () => {
    respuestas.set("eventos", { data: Array.from({ length: 21 }, (_, i) => evento(i + 1)), error: null });
    expect((await cargarNuevos(CIUDAD, 0)).ok).toBe(false);
  });
  it("conteo nulo no inventa cero", async () => {
    respuestas.set("van_por_evento", { data: [{ evento_id: id(1), n: null }], error: null }); expect((await cargarNuevos(CIUDAD, 0)).ok).toBe(false);
  });
  it("decisiones de un evento no solicitado se rechazan", async () => {
    entrar(); respuestas.set("asistencias", { data: [{ evento_id: id(999), estado: "voy" }], error: null }); expect((await cargarNuevos(CIUDAD, 0)).ok).toBe(false);
  });
  it("timeout DB aborta y devuelve error sin eventos ni sello", async () => {
    colgada = "eventos"; const pendiente = cargarNuevos(CIUDAD, 0);
    await vi.advanceTimersByTimeAsync(8001);
    const r = await pendiente; expect(r.ok).toBe(false); expect(r).not.toHaveProperty("eventos"); expect(r).not.toHaveProperty("sello");
    expect(consultas[0].signal?.aborted).toBe(true);
  });
  it("timeout Auth no acaba consultando eventos", async () => {
    m.claims.mockReturnValue(new Promise(() => {})); const pendiente = cargarNuevos(CIUDAD, 0);
    await vi.advanceTimersByTimeAsync(8001); expect((await pendiente).ok).toBe(false); expect(consultas).toHaveLength(0);
  });
});
