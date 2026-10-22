import { describe, expect, it } from "vitest";
import { precioDeAgenda } from "../cargaEventos";
import { localAIso } from "../fechas";
import { baseFalsa, type Fila } from "./baseFalsa";
import {
  alcaldiaDeDireccion,
  claseDeCartelera,
  clienteCartelera,
  cruzarRecinto,
  diaDeCartelera,
  ESPERA_MINIMA_MS,
  ESPERA_REINTENTO_MS,
  extraerObjetoJs,
  filasDeFicha,
  fueraDeLaCiudadDeMexico,
  mismoRecinto,
  leerFicha,
  leerLista,
  NOMBRE_FUENTE_CARTELERA,
  peticionesPorPaso,
  precioDeCartelera,
  REINTENTOS_CARTELERA,
  textoDeDescripcion,
  tipoDeRecinto,
  tituloDeCartelera,
  urlFicha,
  USER_AGENT_CARTELERA,
} from "./carteleraCdmx";
import { FICHA_EXPOSICION, FICHA_FESTIVAL, FICHA_SAN_ILDEFONSO, FICHA_TALLER, FICHA_TENIS, LISTA_1, LISTA_2 } from "./carteleraCdmxMuestras";
import { correrUnPaso, PLAZO_PASO_AGENDAS_MS, type Dependencias } from "./motor";
import { insertarEvento, prepararEvento } from "./publicarEvento";
import type { NotaCartelera } from "./carteleraCdmx";

const ZONA = "America/Mexico_City";
const local = (fechaHora: string) => localAIso(fechaHora, ZONA)!;
const HOY = "2026-10-22";

describe("la lista de la cartelera", () => {
  it("lee la página: cuántas hay, sus eventos (id, tipo, recinto, día, punto) y sus recintos (nombre, imagen, punto)", () => {
    const p = leerLista(LISTA_1)!;
    expect(p).toMatchObject({ pagina: 1, paginas: 2, total: 5, paginasRecintos: 2 });
    expect(p.eventos.map((e) => [e.id, e.tipo, e.recinto, e.dia])).toEqual([
      ["41272", "Museos y Exposiciones", "Colegio de San Ildefonso", "2026-10-22"],
      ["40293", "Cursos y Talleres", "Museo Panteón de San Fernando", "2026-10-23"],
      ["41628", "Festivales y Ferias", "Museo de la Ciudad de México", "2026-10-25"],
    ]);
    expect(p.eventos[0].punto).toEqual({ lat: 19.436122, lng: -99.130752 });
    expect(p.recintos[0]).toEqual({ id: "36", nombre: "FARO Indios Verdes", imagen: "https://cartelera.cdmx.gob.mx/wp-content/uploads/ae_usercontent/usercontent/indiosp.jpg", punto: { lat: 19.500719, lng: -99.11293 } });
    expect(leerLista(LISTA_2)).toMatchObject({ pagina: 2, paginas: 2 });
  });

  it("lo que no es la respuesta esperada no se lee (y no tumba nada)", () => {
    expect(leerLista("<html>Mantenimiento</html>")).toBeNull();
    expect(leerLista(JSON.stringify({ data: { event_data: {} } }))).toBeNull();
    const rara = leerLista(JSON.stringify({ data: { event_data: { event_pages_total: "3", event_items_list: [{ event_id: "x" }, { event_id: "7", event_name: "Uno", event_date_located: "31/02/2026" }, { event_id: "8", event_name: "Dos", event_date_located: "1/11/2026", event_lat: "", event_lon: "" }] } } }))!;
    expect(rara.eventos.map((e) => [e.id, e.dia, e.punto])).toEqual([["8", "2026-11-01", null]]);
    expect(rara.paginas).toBe(3);
  });
});

describe("la ficha de un evento", () => {
  it("saca el objeto `cdmx_billboard_event_info` de la página y lo lee: dirección, funciones, costos, recinto, imagen", () => {
    const f = leerFicha(FICHA_TALLER)!;
    expect(f).toMatchObject({
      id: "40293",
      titulo: "Taller. Teatro popular y máscaras",
      tipo: { id: "CURSOS_Y_TALLERES", nombre: "Cursos Y Talleres" },
      direccion: "Plaza de San Fernando 17, Guerrero, Cuauhtémoc, C.P. 06300, Ciudad de México",
      punto: { lat: 19.439105, lng: -99.148069 },
      duracionMin: 60,
      costos: [{ nombre: "General", precio: "Gratuito" }],
      recinto: { id: "81", nombre: "Museo Panteón de San Fernando" },
      imagen: "https://cartelera.cdmx.gob.mx/wp-content/uploads/ae_usercontent/usercontent/6a95d99979a71-panteon-san-fernando.jpg",
      enlace: "https://www.facebook.com/PanteonSanFer/",
      dia: "2026-10-23",
    });
    expect(f.funciones).toEqual([{ dias: ["2026-10-23", "2026-10-30", "2026-11-06", "2026-11-13", "2026-11-20", "2026-11-27", "2026-12-04"], horas: ["12:00"] }]);
    expect(f.descripcion).toMatch(/^Museo Panteón de San Fernando \| Todos los viernes .* Impartido por: Isabel Ruíz\. .* Actividad Gratuita \| Público General\.$/);
    expect(f.descripcion).not.toMatch(/<|&nbsp;|CarteleraCdMx/);
  });

  it("el objeto se saca entero aunque sus textos traigan llaves, comillas escapadas, punto y coma o comillas sencillas", () => {
    const html = `<script>var cdmx_billboard_event_info_otra = {"x":1};
      var cdmx_billboard_event_info = {"event_id":7,"event_name":"Concierto \\"Llaves\\" {y} más; ¿o no?","event_description":"<p>Cierra con }; y abre con {</p>","venue_name":"Foro 'Uno'","schedule":{"1":{"event_dates":["30\\/10\\/2026"],"event_hours":["19:00"]}},"costs":{}};
      var cdmx_billboard_messages = { 'a': '}' };</script>`;
    const crudo = extraerObjetoJs(html, "cdmx_billboard_event_info")!;
    expect(JSON.parse(crudo).event_id).toBe(7);
    const f = leerFicha(html)!;
    expect(f.titulo).toBe('Concierto "Llaves" {y} más; ¿o no?');
    expect(f.descripcion).toBe("Cierra con }; y abre con {");
    expect(f.recinto.nombre).toBe("Foro 'Uno'");
    expect(f.funciones).toEqual([{ dias: ["2026-10-30"], horas: ["19:00"] }]);
    // Sin el objeto, sin cerrar o con JSON roto: null.
    expect(leerFicha("<html><body>Sin datos</body></html>")).toBeNull();
    expect(extraerObjetoJs('var cdmx_billboard_event_info = {"a":"}', "cdmx_billboard_event_info")).toBeNull();
    expect(leerFicha("var cdmx_billboard_event_info = {event_id: 7};")).toBeNull();
  });

  it("los textos: el punto final del título, la descripción en texto plano y la alcaldía de la dirección", () => {
    expect(tituloDeCartelera("Universidad de México +475 Años de concebir futuros.")).toBe("Universidad de México +475 Años de concebir futuros");
    expect(tituloDeCartelera("Y entonces...")).toBe("Y entonces...");
    expect(textoDeDescripcion("<p><strong>Uno</strong></p><blockquote>Dos&nbsp;&amp; tres<br>cuatro</blockquote><p>CarteleraCdMx</p>")).toBe("Uno Dos & tres cuatro");
    expect(alcaldiaDeDireccion("Justo Sierra 16, Centro (Área 3), Cuauhtémoc, C.P. 06020, Ciudad de México")).toBe("Cuauhtémoc");
    expect(alcaldiaDeDireccion("Calle 10, Tolteca, Álvaro Obregón, C.P. 01150, Ciudad de México")).toBe("Álvaro Obregón");
    expect(alcaldiaDeDireccion("Sin código postal")).toBeNull();
    expect(diaDeCartelera("04/12/2026")).toBe("2026-12-04");
    expect(diaDeCartelera("31/02/2026")).toBeNull();
    expect(urlFicha("40293", "2026-10-23", "Taller. Teatro popular y máscaras")).toBe("https://cartelera.cdmx.gob.mx/40293/23-10-2026/taller-teatro-popular-y-mascaras");
  });

  it("los costos: «Gratuito» es gratis; una cantidad, su precio; varios, el primero manda y lo demás queda dicho", () => {
    expect(precioDeCartelera([{ nombre: "General", precio: "Gratuito" }])).toBe("Gratis");
    expect(precioDeCartelera([{ nombre: "Entrada al museo", precio: "$ 50" }])).toBe("$50");
    expect(precioDeCartelera([{ nombre: "General", precio: "$ 120" }, { nombre: "Estudiantes", precio: "$ 60" }])).toBe("General $120, Estudiantes $60");
    expect(precioDeCartelera([{ nombre: "Domingo", precio: "Gratuito" }, { nombre: "General $60.00 M.N. Están exentos del pago de la cuota: …", precio: "$ 60" }])).toBe("Domingo Gratis, $60");
    expect(precioDeCartelera([])).toBeNull();
    // Lo que queda en la propuesta pasa por la regla de siempre (`precioDeAgenda`).
    expect(precioDeAgenda(precioDeCartelera([{ nombre: "General", precio: "Gratuito" }]))).toBe("Gratis");
    expect(precioDeAgenda(precioDeCartelera(leerFicha(FICHA_EXPOSICION)!.costos))).toBe("$60");
  });

  it("la clase por el tipo de la cartelera: museos y exposiciones, talleres, festivales; lo demás, por su título o evento (nada se descarta)", () => {
    expect(claseDeCartelera("MUSEOS_Y_EXPOS", "Esencia del Arte Popular Mexicano")).toBe("exposicion");
    expect(claseDeCartelera("Museos y Exposiciones", "x")).toBe("exposicion");
    expect(claseDeCartelera("CURSOS_Y_TALLERES", "Tenis de Mesa")).toBe("taller");
    expect(claseDeCartelera("Festivales y Ferias", "Pachanga Antirracista")).toBe("festival");
    expect(claseDeCartelera("Congresos y Convenciones", "Coloquio: Aproximaciones sociales a la muerte")).toBe("puntual");
    expect(claseDeCartelera("AL_AIRE_LIBRE", "4° Festival de Xantolo de la Ciudad de México: Movimiento Sonoro")).toBe("festival");
    expect(claseDeCartelera("RECORRIDOS", "ZooAventuras Chapultepec")).toBe("puntual");
    expect(claseDeCartelera("", "Taller de grabado")).toBe("taller");
  });
});

describe("las filas que propone la rutina", () => {
  it("un taller: una fila por sesión de hoy en adelante, a su hora, con su fin por la duración; su ficha, su imagen y su punto", () => {
    const filas = filasDeFicha(leerFicha(FICHA_TALLER)!, { hoy: HOY, lugar: "Panteón de San Fernando" });
    expect(filas.map((f) => [f.fecha, f.hora, f.hora_fin])).toEqual(
      ["2026-10-23", "2026-10-30", "2026-11-06", "2026-11-13", "2026-11-20", "2026-11-27", "2026-12-04"].map((d) => [d, "12:00", "13:00"]),
    );
    expect(filas[0]).toMatchObject({
      titulo: "Taller. Teatro popular y máscaras",
      lugar: "Panteón de San Fernando",
      municipio: "Cuauhtémoc",
      precio: "Gratis",
      clase: "taller",
      url: "https://cartelera.cdmx.gob.mx/40293/23-10-2026/taller-teatro-popular-y-mascaras",
      imagen: "https://cartelera.cdmx.gob.mx/wp-content/uploads/ae_usercontent/usercontent/6a95d99979a71-panteon-san-fernando.jpg",
      lat: 19.439105,
      cartelera_id: "40293",
      recinto_id: "81",
      programa: null,
    });
    // Lo de antes de hoy no entra; si no queda nada, ninguna fila.
    expect(filasDeFicha(leerFicha(FICHA_TALLER)!, { hoy: "2026-11-27" })).toHaveLength(2);
    expect(filasDeFicha(leerFicha(FICHA_TALLER)!, { hoy: "2026-12-05" })).toEqual([]);
  });

  it("una exposición con varios días es UNA fila abierta (`visita`) del primero al último; con un solo día, un evento", () => {
    const [expo, ...resto] = filasDeFicha(leerFicha(FICHA_EXPOSICION)!, { hoy: HOY });
    expect(resto).toEqual([]);
    expect(expo).toMatchObject({ titulo: "Esencia del Arte Popular Mexicano", fecha: "2026-10-22", hora: "10:00", termina: "2026-11-29", clase: "exposicion", visita: true, hora_fin: null, lugar: "Museo de Arte Popular" });
    const [unDia] = filasDeFicha(leerFicha(FICHA_SAN_ILDEFONSO)!, { hoy: "2026-10-29" });
    expect(unDia).toMatchObject({ fecha: "2026-10-29", clase: "puntual", termina: null, precio: "$50" });
  });

  it("un festival al aire libre de un día, con su fin; un taller de muchas sesiones, hasta 31", () => {
    expect(filasDeFicha(leerFicha(FICHA_FESTIVAL)!, { hoy: HOY })).toEqual([expect.objectContaining({ fecha: "2026-10-25", hora: "11:00", hora_fin: "17:00", clase: "festival", precio: "Gratis" })]);
    const tenis = filasDeFicha(leerFicha(FICHA_TENIS)!, { hoy: HOY });
    expect(tenis).toHaveLength(21);
    expect(tenis[0]).toMatchObject({ municipio: "Álvaro Obregón", clase: "taller", hora: "10:00", hora_fin: "12:00" });
  });
});

describe("cuando la cartelera no dice la hora («00:00»)", () => {
  const ficha = (descripcion: string, tipo = "CURSOS_Y_TALLERES") =>
    leerFicha(
      `var cdmx_billboard_event_info = ${JSON.stringify({ event_id: 40980, event_name: "Fantasmitas", event_description: descripcion, event_duration: "02:30", event_type: { id: tipo, name: "x" }, schedule: { "1": { event_dates: ["22/10/2026", "29/10/2026"], event_hours: ["00:00"] } }, costs: {}, venue_name: "FARO de Oriente" })};`,
    )!;
  it("vale la hora de la descripción («12 horas», «a las 17:30», «de 10 a 18 horas»); si no la dice, no hay filas", () => {
    expect(filasDeFicha(ficha("<p>Faro de Oriente | Jueves | 16 horas</p>"), { hoy: HOY }).map((f) => [f.fecha, f.hora, f.hora_fin])).toEqual([
      ["2026-10-22", "16:00", "18:30"],
      ["2026-10-29", "16:00", "18:30"],
    ]);
    expect(filasDeFicha(ficha("Martes a domingo de 10 a 18 horas."), { hoy: HOY })[0]).toMatchObject({ hora: "10:00", hora_fin: "18:00" });
    expect(filasDeFicha(ficha("Te esperamos a las 17:30 en el patio."), { hoy: HOY })[0]).toMatchObject({ hora: "17:30" });
    // Sin hora: ni «2 horas de duración», ni «475 años», ni el código postal.
    expect(filasDeFicha(ficha("Se utilizará hojas de color. Cartelera CdMx Red de Faros. 8 horas de duración. C.P. 09000, 475 años."), { hoy: HOY })).toEqual([]);
    expect(textoDeDescripcion("Se utilizará pintura&nbsp; Cartelera CdMx Red de Faros")).toBe("Se utilizará pintura Red de Faros");
  });
  it("la clase por el tipo de la lista o el de la ficha, el primero que diga una («Festivales y Ferias» en la lista, «Al Aire Libre» en la ficha)", () => {
    const pachanga = ficha("17 sedes | Del 3 al 22 de octubre, 2026 | a las 12 horas", "AL_AIRE_LIBRE");
    expect(filasDeFicha(pachanga, { hoy: HOY, tipoDeLista: "Festivales y Ferias" })[0].clase).toBe("festival");
    expect(filasDeFicha(pachanga, { hoy: HOY, tipoDeLista: "Al Aire Libre" })[0].clase).toBe("puntual");
  });
});

describe("los recintos", () => {
  const lugares = [
    { id: "l-arte", nombre: "Museo de Arte Popular", lat: 19.4337, lng: -99.1462 },
    { id: "l-panteon", nombre: "Panteón de San Fernando", lat: 19.43912, lng: -99.14805 },
    { id: "l-foro", nombre: "Foro Lindbergh", lat: 19.4118, lng: -99.1716 },
  ];
  it("se cruzan con el directorio por nombre, o por cercanía (150 m) con un nombre parecido; si no, no se adivina", () => {
    expect(cruzarRecinto({ nombre: "Museo de Arte Popular", punto: null }, lugares)?.id).toBe("l-arte");
    // «Foro Lindbergh» de la cartelera como «Foro Lindbergh Parque México»: el mismo, a 40 m.
    expect(cruzarRecinto({ nombre: "Foro Lindbergh Parque México", punto: { lat: 19.4121, lng: -99.1714 } }, lugares, new Set(["mexico"]))?.id).toBe("l-foro");
    // Cerca (40 m) pero otra clase de sitio con el mismo nombre propio: no se adivina.
    expect(cruzarRecinto({ nombre: "Teatro Lindbergh", punto: { lat: 19.4121, lng: -99.1714 } }, lugares)).toBeNull();
    // Cerca, con otro nombre: no.
    expect(cruzarRecinto({ nombre: "Colegio de San Ildefonso", punto: { lat: 19.4337, lng: -99.1462 } }, lugares)).toBeNull();
    expect(cruzarRecinto({ nombre: "Museo Panteón de San Fernando", punto: { lat: 19.439105, lng: -99.148069 } }, lugares)?.id).toBe("l-panteon");
  });
  it("el tipo de lugar sale del nombre del recinto", () => {
    expect(["Museo de Arte Popular", "FARO de Oriente", "Teatro Metropólitan", "Lunario del Auditorio Nacional", "Biblioteca Vasconcelos", "Zoológico de Chapultepec", "Colegio de San Ildefonso", "Radio UNAM"].map(tipoDeRecinto)).toEqual([
      "museo",
      "casa_de_cultura",
      "foro",
      "foro",
      "biblioteca",
      "plaza",
      "escuela",
      "otro",
    ]);
  });
});

describe("la calma (con un reloj falso)", () => {
  function reloj() {
    let t = 1_000_000;
    const esperas: number[] = [];
    return { ahora: () => t, dormir: async (ms: number) => void (esperas.push(ms), (t += ms)), avanzar: (ms: number) => void (t += ms), esperas };
  }
  const respuesta = (estado: number, cuerpo = "{}", headers: Record<string, string> = {}) => new Response(estado === 204 ? null : cuerpo, { status: estado, headers });

  it("nunca dos peticiones con menos de 1,5 s entre una y otra, una sola a la vez, siempre con el User-Agent de somosnosotrxs.org", async () => {
    const r = reloj();
    const pedidas: { t: number; ua: string | null }[] = [];
    let enCurso = 0;
    let maximo = 0;
    const pedir = (async (_url: string, init?: RequestInit) => {
      enCurso++;
      maximo = Math.max(maximo, enCurso);
      pedidas.push({ t: r.ahora(), ua: new Headers(init?.headers).get("user-agent") });
      await Promise.resolve();
      r.avanzar(300); // lo que tarda en responder
      enCurso--;
      return respuesta(200, LISTA_1);
    }) as typeof fetch;
    const c = clienteCartelera({ pedir, dormir: r.dormir, reloj: r.ahora });
    // Tres a la vez sin esperar: el cliente las forma una tras otra.
    await Promise.all([c.lista(1, true), c.lista(2, true), c.ficha("40293", "2026-10-23", "x")]);
    expect(maximo).toBe(1);
    expect(pedidas).toHaveLength(3);
    for (let i = 1; i < pedidas.length; i++) expect(pedidas[i].t - (pedidas[i - 1].t + 300)).toBeGreaterThanOrEqual(ESPERA_MINIMA_MS);
    expect(pedidas.every((p) => p.ua === USER_AGENT_CARTELERA)).toBe(true);
    expect(USER_AGENT_CARTELERA).toBe("somosnosotrxs.org (lector de cartelera; contacto en el sitio)");
    expect(ESPERA_MINIMA_MS).toBe(1500);
    // La calma vale entre pasos: con la última del paso anterior, la primera espera lo que falte.
    const r2 = reloj();
    const otra = clienteCartelera({ pedir: (async () => respuesta(200, LISTA_1)) as typeof fetch, dormir: r2.dormir, reloj: r2.ahora, ultima: r2.ahora() - 500 });
    await otra.lista(1, false);
    expect(r2.esperas).toEqual([1000]);
  });

  it("un 429 o un 5xx se reintenta con espera creciente (o la que pide Retry-After); un 404 no; tras 3 reintentos, se rinde", async () => {
    const r = reloj();
    const estados = [429, 503, 200];
    const pedir = (async () => {
      const e = estados.shift()!;
      return e === 429 ? respuesta(429, "", { "retry-after": "10" }) : respuesta(e, LISTA_1);
    }) as typeof fetch;
    const c = clienteCartelera({ pedir, dormir: r.dormir, reloj: r.ahora });
    expect(await c.lista(1, true)).not.toBeNull();
    // 10 s que pidió el 429; luego 6 s (3 s × 2) tras el 503; y la calma de 1,5 s antes de cada reintento ya está cubierta.
    expect(r.esperas).toEqual([10_000, ESPERA_REINTENTO_MS * 2]);
    expect(c.peticiones()).toBe(3);

    const r404 = reloj();
    let n404 = 0;
    const c404 = clienteCartelera({ pedir: (async () => (n404++, respuesta(404))) as typeof fetch, dormir: r404.dormir, reloj: r404.ahora });
    expect(await c404.ficha("1", "2026-10-23", "x")).toBeNull();
    expect(n404).toBe(1);

    const r5 = reloj();
    let n5 = 0;
    const c5 = clienteCartelera({ pedir: (async () => (n5++, respuesta(502))) as typeof fetch, dormir: r5.dormir, reloj: r5.ahora });
    expect(await c5.traer("https://cartelera.cdmx.gob.mx/1/23-10-2026/x")).toEqual({ ok: false, estado: 502 });
    expect(n5).toBe(REINTENTOS_CARTELERA + 1);
    expect(r5.esperas).toEqual([3_000, 6_000, 12_000]);

    const rRed = reloj();
    const cRed = clienteCartelera({ pedir: (async () => { throw new TypeError("sin red"); }) as typeof fetch, dormir: rRed.dormir, reloj: rRed.ahora });
    expect(await cRed.traer("https://cartelera.cdmx.gob.mx/")).toEqual({ ok: false, estado: null });
    // Un 429 que no se resuelve: el cliente lo dice (`limitada`) para que el paso se detenga.
    const r429 = reloj();
    const c429 = clienteCartelera({ pedir: (async () => respuesta(429)) as typeof fetch, dormir: r429.dormir, reloj: r429.ahora });
    expect(await c429.lista(1, false)).toBeNull();
    expect(c429.limitada()).toBe(true);
  });

  it("cuántas peticiones caben en un paso de agendas: 60, dejando 45 s para proponer y escribir", () => {
    expect(peticionesPorPaso(PLAZO_PASO_AGENDAS_MS - 5_000)).toBe(60);
    expect(peticionesPorPaso(10_000)).toBe(1);
  });
});

// ---------- de punta a punta con el motor y una base falsa ----------
const AHORA = new Date("2026-10-22T15:00:00Z"); // 9:00 en Ciudad de México
const ADMIN = "00000000-0000-4000-8000-0000000000ad";
const CDMX = {
  slug: "ciudad-de-mexico",
  nombre: "Ciudad de México",
  lat: 19.432,
  lng: -99.14,
  zoom: 13,
  zona: ZONA,
  alias: ["CDMX"],
  estado: "abierta",
  parametros: { alcaldias: ["Cuauhtémoc", "Miguel Hidalgo"], radio_km: 12, guias: [{ nombre: "Cartelera de la Secretaría de Cultura de la Ciudad de México", url: "https://cartelera.cdmx.gob.mx/" }] },
};
const LUGARES = [
  { id: "00000000-0000-4000-8000-00000000a001", nombre: "Museo de Arte Popular", ciudad: "Ciudad de México", zona: ZONA, direccion: "Revillagigedo 11, Centro", lat: 19.4337, lng: -99.1462 },
  { id: "00000000-0000-4000-8000-00000000a002", nombre: "Panteón de San Fernando", ciudad: "Ciudad de México", zona: ZONA, direccion: "Plaza de San Fernando 17", lat: 19.43912, lng: -99.14805 },
];
const corrida = (id: string, cambios: Partial<Fila> = {}): Fila => ({
  id,
  tipo: "agendas",
  ciudad: "ciudad-de-mexico",
  parametros: { fuentes: ["agenda-cultura"] },
  tope_usd: 3,
  gasto_usd: 0,
  estado: "pendiente",
  resumen: {},
  creado_en: "2026-10-22T14:59:00Z",
  inicio: null,
  fin: null,
  ...cambios,
});
const FICHAS: Record<string, string> = { "40293": FICHA_TALLER, "35123": FICHA_EXPOSICION, "41628": FICHA_FESTIVAL, "41272": FICHA_SAN_ILDEFONSO, "35394": FICHA_TENIS };

function mundo(corridas: Fila[] = [corrida("c-1")]) {
  return baseFalsa(
    {
      ciudades: [structuredClone(CDMX)],
      lugares: structuredClone(LUGARES),
      eventos: [],
      rutinas_corridas: corridas,
      propuestas: [],
      configuracion: [],
    },
    { eventos_parecidos: () => [] },
  );
}

/** La cartelera falsa (con las respuestas reales recortadas) y un reloj falso que avanza con cada espera. */
function carteleraFalsa() {
  let t = 5_000_000;
  const pedidas: { url: string; pagina: string | null; recintos: string | null; t: number; ua: string | null }[] = [];
  const pedir = (async (url: string, init?: RequestInit) => {
    const cuerpo = init?.body instanceof FormData ? init.body : null;
    pedidas.push({ url, pagina: (cuerpo?.get("by_event_page") as string) ?? null, recintos: (cuerpo?.get("by_venue_page") as string) ?? null, t, ua: new Headers(init?.headers).get("user-agent") });
    t += 200;
    if (url.endsWith("/api/v1/internal/events/search_builder")) {
      const pagina = cuerpo?.get("by_event_page");
      return new Response(pagina === "1" ? LISTA_1 : pagina === "2" ? LISTA_2 : "{}", { headers: { "content-type": "application/json" } });
    }
    const id = url.match(/^https:\/\/cartelera\.cdmx\.gob\.mx\/(\d+)\//)?.[1];
    return id && FICHAS[id] ? new Response(FICHAS[id], { headers: { "content-type": "text/html" } }) : new Response("no", { status: 404 });
  }) as typeof fetch;
  return { pedir, pedidas, dormir: async (ms: number) => void (t += ms), reloj: () => t };
}

function dependencias(base: ReturnType<typeof mundo>, cartelera = carteleraFalsa(), cambios: Partial<Dependencias> = {}) {
  const dep: Dependencias = { db: base.db, api: null, mapbox: null, pedir: cartelera.pedir, dormir: cartelera.dormir, ahora: () => AHORA, plazoMs: 45_000, ...cambios };
  return { dep, cartelera };
}
async function hastaTerminar(dep: Dependencias, maximo = 60) {
  const pasos = [];
  for (let i = 0; i < maximo; i++) {
    const r = await correrUnPaso(dep);
    pasos.push(r);
    if (r.estado !== "corriendo") break;
  }
  return pasos;
}
const laCorrida = (base: ReturnType<typeof mundo>, id = "c-1") => base.tablas.rutinas_corridas.find((c) => c.id === id)! as Fila & { resumen: Record<string, unknown> };
const deLaCorrida = (base: ReturnType<typeof mundo>, id = "c-1") => base.tablas.propuestas.filter((p) => p.corrida_id === id) as (Fila & { datos: Record<string, unknown> })[];

describe("«Buscar agendas y eventos» en Ciudad de México con la cartelera (OL-448)", () => {
  it("lee la lista y las fichas sin la API, con calma, y lo propone todo con su fuente: talleres con sus sesiones, exposiciones abiertas, festivales; recintos nuevos como lugares", async () => {
    const base = mundo();
    const { dep, cartelera } = dependencias(base);
    const pasos = await hastaTerminar(dep);
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    expect(pasos.reduce((s, p) => s + p.usd, 0)).toBe(0);
    expect(c.gasto_usd).toBe(0);
    // La lista (cada página con su página de recintos) y una ficha por evento; nada a la vez y nunca con menos de 1,5 s.
    expect(cartelera.pedidas.map((p) => p.pagina ?? p.url.split("/")[3])).toEqual(["1", "2", "41272", "40293", "41628", "35123", "35394"]);
    expect(cartelera.pedidas.slice(0, 2).map((p) => p.recintos)).toEqual(["1", "2"]);
    for (let i = 1; i < cartelera.pedidas.length; i++) expect(cartelera.pedidas[i].t - cartelera.pedidas[i - 1].t).toBeGreaterThanOrEqual(ESPERA_MINIMA_MS);
    expect(new Set(cartelera.pedidas.map((p) => p.ua))).toEqual(new Set([USER_AGENT_CARTELERA]));

    const ps = deLaCorrida(base);
    expect(new Set(ps.map((p) => p.fuente))).toEqual(new Set([NOMBRE_FUENTE_CARTELERA]));
    const eventos = ps.filter((p) => p.tipo === "evento");
    const lugares = ps.filter((p) => p.tipo === "lugar");
    expect(eventos.map((p) => p.datos.titulo).sort()).toEqual(
      ["4° Festival de Xantolo de la Ciudad de México: Movimiento Sonoro", "Esencia del Arte Popular Mexicano", "Taller. Teatro popular y máscaras", "Tenis de Mesa", "Universidad de México +475 Años de concebir futuros"].sort(),
    );
    // El taller: una propuesta con sus siete sesiones, en el lugar del directorio (cruzado por cercanía), con su ficha y su imagen.
    const taller = eventos.find((p) => p.datos.cartelera_id === "40293")!.datos;
    expect(taller).toMatchObject({
      clase: "taller",
      lugar: "Panteón de San Fernando",
      precio: "Gratis",
      inicio: local("2026-10-23T12:00"),
      url: "https://cartelera.cdmx.gob.mx/40293/23-10-2026/taller-teatro-popular-y-mascaras",
      imagen: "https://cartelera.cdmx.gob.mx/wp-content/uploads/ae_usercontent/usercontent/6a95d99979a71-panteon-san-fernando.jpg",
      ciudad: "Ciudad de México",
    });
    expect((taller.sesiones as unknown[]).length).toBe(7);
    expect(taller.lugar_propuesto).toBeUndefined();
    // La exposición abierta, en el lugar del directorio por su nombre.
    expect(eventos.find((p) => p.datos.cartelera_id === "35123")!.datos).toMatchObject({ clase: "exposicion", visita: true, lugar: "Museo de Arte Popular", termina: local("2026-11-29T23:59"), precio: "$60" });
    // Los recintos que no están: propuestos como lugares (nombre, tipo, dirección, punto, imagen si la lista la trajo) y sus eventos los nombran.
    expect(lugares.map((p) => [p.datos.nombre, p.datos.tipo, p.datos.direccion]).sort()).toEqual([
      ["Colegio de San Ildefonso", "escuela", "Justo Sierra 16, Centro (Área 3), Cuauhtémoc, C.P. 06020, Ciudad de México"],
      ["Museo de la Ciudad de México", "museo", "Pino Suárez 30, Centro (Área 6), Cuauhtémoc, C.P. 06060, Ciudad de México"],
      ["Talleres Tonatiuh", "otro", "Calle 10, Tolteca, Álvaro Obregón, C.P. 01150, Ciudad de México"],
    ]);
    const museo = lugares.find((p) => p.datos.nombre === "Museo de la Ciudad de México")!;
    expect(museo.datos).toMatchObject({ lat: 19.429329, lng: -99.132441, ciudad: "Ciudad de México", cartelera_recinto: "64" });
    const xantolo = eventos.find((p) => p.datos.cartelera_id === "41628")!.datos;
    expect(xantolo).toMatchObject({ clase: "festival", lugar: "Museo de la Ciudad de México", lugar_propuesto: museo.id, lat: 19.429329, lng: -99.132441, fin: local("2026-10-25T17:00") });
    // OL-451: lo guardado es la hora de la ciudad (las 11:00 en Ciudad de México son las 17:00 UTC).
    expect(xantolo.inicio).toBe(local("2026-10-25T11:00"));
    expect(xantolo.inicio).toBe("2026-10-25T17:00:00.000Z");
    // OL-450: el de Álvaro Obregón no es de las alcaldías turísticas, pero la cartelera entra completa: se propone, con su recinto.
    expect(c.resumen.descartados).toMatchObject({ fuera_de_la_ciudad: 0 });
    expect(c.resumen.cartelera).toEqual({
      eventos: 5,
      leidas: 5,
      fallidas: 0,
      propuestos: 5,
      recintos_nuevos: 3,
      ya_propuestos: 0,
      motivos: {},
      por_tipo: {
        "Museos y Exposiciones": { leidos: 2, propuestos: 2 },
        "Cursos y Talleres": { leidos: 2, propuestos: 2 },
        "Festivales y Ferias": { leidos: 1, propuestos: 1 },
      },
    });
    expect(c.resumen).toMatchObject({ propuestos: 8, agendas_leidas: 1, paso: "1 de 1 fuente", avance: 1 });
    expect(JSON.stringify(c.resumen)).not.toMatch(/Xantolo|Arte Popular|Ildefonso/);
  });

  it("la segunda corrida no pide fichas ya propuestas ni propone nada nuevo", async () => {
    const base = mundo();
    await hastaTerminar(dependencias(base).dep);
    const antes = base.tablas.propuestas.length;
    base.tablas.rutinas_corridas.push(corrida("c-2", { creado_en: "2026-10-22T15:30:00Z" }));
    const { dep, cartelera } = dependencias(base);
    await hastaTerminar(dep);
    expect(laCorrida(base, "c-2").estado).toBe("terminada");
    expect(base.tablas.propuestas.length).toBe(antes);
    expect(deLaCorrida(base, "c-2")).toEqual([]);
    // Solo la lista: todas sus fichas ya se propusieron.
    expect(cartelera.pedidas.map((p) => p.pagina ?? p.url.split("/")[3])).toEqual(["1", "2"]);
    expect(laCorrida(base, "c-2").resumen.descartados).toMatchObject({ ya_propuesto: 5, fuera_de_la_ciudad: 0 });
    expect(laCorrida(base, "c-2").resumen.propuestos).toBe(0);
  });

  it("por pasos: con un plazo corto cada paso hace pocas peticiones y deja el cursor; al final, lo mismo que de una vez", async () => {
    const base = mundo();
    // 5 s de margen del motor + 45 s de reserva + 3 peticiones de 2,5 s: tres peticiones por paso.
    const { dep, cartelera } = dependencias(base, carteleraFalsa(), { plazoAgendasMs: 5_000 + 45_000 + 3 * 2_500 + 100 });
    await correrUnPaso(dep); // el plan
    await correrUnPaso(dep); // la lista (2 páginas) y una ficha
    const c = laCorrida(base);
    expect(cartelera.pedidas).toHaveLength(3);
    const cursor = c.resumen.cursor as { tareas: unknown[]; cartelera: { pagina: number; paginas: number; pendientes: unknown[]; ultima: number } };
    expect(cursor.tareas).toEqual([{ paso: "cartelera" }]);
    expect(cursor.cartelera).toMatchObject({ pagina: 3, paginas: 2 });
    expect(cursor.cartelera.pendientes).toHaveLength(4);
    // Cuándo terminó la última petición (la calma sigue en el paso siguiente).
    expect(Math.abs(cursor.cartelera.ultima - Date.now())).toBeLessThan(10_000);
    expect(c.resumen.avance).toBeGreaterThan(0.2);
    expect(c.resumen.avance).toBeLessThan(1);
    const pasos = await hastaTerminar(dep);
    expect(pasos.length).toBe(2);
    expect(laCorrida(base).estado).toBe("terminada");
    expect(cartelera.pedidas).toHaveLength(7);
    expect(deLaCorrida(base).filter((p) => p.tipo === "evento")).toHaveLength(5);
    expect(deLaCorrida(base).filter((p) => p.tipo === "lugar")).toHaveLength(3);
  });

  it("si la cartelera pide esperar (429 sin fin), el paso se detiene y la ficha se lee en el siguiente", async () => {
    const base = mundo();
    const falsa = carteleraFalsa();
    let limitar = true;
    const pedir = (async (url: string, init?: RequestInit) => (limitar && /\/41272\//.test(url) ? new Response("", { status: 429 }) : falsa.pedir(url, init))) as typeof fetch;
    const { dep } = dependencias(base, { ...falsa, pedir });
    await correrUnPaso(dep);
    await correrUnPaso(dep);
    const c = laCorrida(base);
    expect(c.estado).toBe("corriendo");
    expect(c.resumen.avisos).toContain("La cartelera pidió esperar: se sigue en el siguiente paso");
    expect((c.resumen.cursor as { cartelera: { pendientes: string[][] } }).cartelera.pendientes[0][0]).toBe("41272");
    limitar = false;
    await hastaTerminar(dep);
    expect(laCorrida(base).estado).toBe("terminada");
    expect(deLaCorrida(base).filter((p) => p.tipo === "evento")).toHaveLength(5);
  });

  it("con `solo_cartelera` (el guion de la Mac) solo lee la cartelera: no publica lo aceptado ni toca las agendas guardadas", async () => {
    const base = mundo([corrida("c-1", { parametros: { fuentes: ["agenda-cultura"], solo_cartelera: true } })]);
    await hastaTerminar(dependencias(base).dep);
    expect(laCorrida(base).estado).toBe("terminada");
    expect(base.tablas.configuracion).toEqual([]);
    expect(base.operaciones.filter((o) => o.tabla === "eventos" && o.op !== "select")).toEqual([]);
    expect(deLaCorrida(base).filter((p) => p.tipo === "evento")).toHaveLength(5);
  });
});

describe("publicar una exposición abierta de la cartelera", () => {
  it("se publica como exposición, de hoy (si ya abrió) al último día, sin inauguración; si ya está esa exposición, no", async () => {
    const base = mundo();
    const ciudad = { slug: "ciudad-de-mexico", nombre: "Ciudad de México", alias: [], lat: 19.432, lng: -99.14, zona: ZONA, radioKm: 12, parametros: { alcaldias: [], guias: [], radio_km: 12 } };
    const datos = { titulo: "Esencia del Arte Popular Mexicano", inicio: local("2026-10-22T10:00"), lugar: "Museo de Arte Popular", clase: "exposicion", visita: true, termina: local("2026-11-29T23:59"), precio: "$60", url: "https://cartelera.cdmx.gob.mx/35123/22-10-2026/x" };
    const tarde = new Date("2026-10-22T22:00:00Z"); // 16:00: ya abrió hoy, no «ya pasó»
    const p = await prepararEvento({ db: base.db, mapbox: null, ahora: tarde }, datos, ciudad, LUGARES, ADMIN);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.fila).toMatchObject({ clase: "exposicion", inicio: local("2026-10-22T00:00"), fin: local("2026-11-29T23:59"), lugar_id: LUGARES[0].id, precio: "$60", enlace: datos.url, fuente_url: datos.url });
    expect(p.fila.sugerencias).toBeUndefined();
    base.tablas.eventos.push({ id: "e-expo", titulo: "Esencia del Arte Popular Mexicano", clase: "exposicion", ciudad: "Ciudad de México", inicio: local("2026-10-01T00:00"), termina: local("2026-12-31T23:59"), lugar_id: LUGARES[0].id, sitio_texto: null });
    const otra = await prepararEvento({ db: base.db, mapbox: null, ahora: tarde }, datos, ciudad, LUGARES, ADMIN);
    expect(otra).toMatchObject({ ok: false, motivo: "parecido" });
  });
});

describe("la cartelera entra completa (OL-450)", () => {
  it("lo suyo es de la ciudad salvo que su dirección diga otro estado", () => {
    expect(fueraDeLaCiudadDeMexico("Av. Insurgentes Norte s/n, Gustavo A. Madero, C.P. 07300, Ciudad de México")).toBe(false);
    expect(fueraDeLaCiudadDeMexico("Calle 2 de abril, Xochimilco, C.P. 16000, Ciudad de México")).toBe(false);
    // Calles y colonias con nombre de estado no la sacan.
    expect(fueraDeLaCiudadDeMexico("Av. Puebla 120, Guerrero, Cuauhtémoc, C.P. 06300, Ciudad de México")).toBe(false);
    expect(fueraDeLaCiudadDeMexico("Calle Morelos 5, Morelos, Venustiano Carranza, Ciudad de México")).toBe(false);
    expect(fueraDeLaCiudadDeMexico(null)).toBe(false);
    // Otro estado: el código postal, «Edo. Méx.», un municipio mexiquense o el estado al final.
    expect(fueraDeLaCiudadDeMexico("Av. Gustavo Baz 2160, La Loma, Naucalpan, Edo. Méx.")).toBe(true);
    expect(fueraDeLaCiudadDeMexico("Periférico 100, Satélite, C.P. 53100, Ciudad de México")).toBe(true);
    expect(fueraDeLaCiudadDeMexico("Av. Central 10, Ecatepec, Ciudad de México")).toBe(true);
    expect(fueraDeLaCiudadDeMexico("Plaza de Armas 1, Centro, Cuernavaca, Morelos")).toBe(true);
  });

  it("un FARO de Indios Verdes (Gustavo A. Madero) y uno de Xochimilco entran, lejos y fuera de las alcaldías turísticas, con su recinto como lugar; uno en Naucalpan, no", async () => {
    const ficha = (id: number, titulo: string, recinto: string, venue: string, lat: string, lng: string, address: string) =>
      `<script>var cdmx_billboard_event_info = ${JSON.stringify({
        event_id: id,
        event_location: { lat, lng, address },
        event_name: titulo,
        event_description: "<p>Taller abierto | 17 horas</p>",
        event_duration: "02:00",
        event_type: { id: "CURSOS_Y_TALLERES", name: "Cursos Y Talleres" },
        schedule: { "1": { event_dates: ["24/10/2026"], event_hours: ["17:00"] } },
        costs: { "1": { cost_name: "General", cost_price: "Gratuito" } },
        venue_id_id: venue,
        venue_name: recinto,
        event_image: "https://cartelera.cdmx.gob.mx/wp-content/uploads/x.jpg",
      })};</script>`;
    const fichas: Record<string, string> = {
      "1": ficha(1, "Grabado en linóleo", "FARO Indios Verdes", "36", "19.500719", "-99.112930", "Av. Insurgentes Norte s/n, Gustavo A. Madero, C.P. 07300, Ciudad de México"),
      "2": ficha(2, "Cartonería", "FARO Xochimilco", "90", "19.258", "-99.105", "Calle 2 de abril, Xochimilco, C.P. 16000, Ciudad de México"),
      "3": ficha(3, "Danza urbana", "Centro Cultural Naucalpan", "91", "19.478", "-99.238", "Av. Gustavo Baz 2160, La Loma, Naucalpan, Edo. Méx."),
    };
    const item = (id: string, lat: string, lng: string) => ({ event_id: id, event_type: "Cursos y Talleres", event_name: `Evento ${id}`, event_venue: "x", event_date_located: "24/10/2026", event_lat: lat, event_lon: lng });
    const lista = JSON.stringify({
      status: "OK",
      data: {
        event_data: { event_pages_total: 1, event_pages_current: 1, event_items_total: 3, event_items_list: [item("1", "19.500719", "-99.112930"), item("2", "19.258", "-99.105"), item("3", "19.478", "-99.238")] },
        venue_data: { venue_pages_total: 1, venue_items_list: [{ venue_id: "36", venue_name: "FARO Indios Verdes", venue_image: "https://cartelera.cdmx.gob.mx/wp-content/uploads/usercontent/indiosp.jpg", venue_lat: "19.500719", venue_lon: "-99.112930" }] },
      },
    });
    const pedidas: string[] = [];
    const pedir = (async (url: string) => {
      pedidas.push(url);
      if (url.endsWith("/search_builder")) return new Response(lista);
      const id = url.match(/^https:\/\/cartelera\.cdmx\.gob\.mx\/(\d+)\//)?.[1];
      return id && fichas[id] ? new Response(fichas[id]) : new Response("no", { status: 404 });
    }) as typeof fetch;
    const base = mundo();
    const { dep } = dependencias(base, { ...carteleraFalsa(), pedir });
    await hastaTerminar(dep);
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    // Las tres fichas se piden (lo lejano ya no se salta) y solo la de Naucalpan queda fuera.
    expect(pedidas.filter((u) => !u.endsWith("/search_builder")).map((u) => u.split("/")[3])).toEqual(["1", "2", "3"]);
    expect(c.resumen.descartados).toMatchObject({ fuera_de_la_ciudad: 1 });
    const ps = deLaCorrida(base);
    expect(ps.filter((p) => p.tipo === "evento").map((p) => [p.datos.titulo, p.datos.lugar]).sort()).toEqual([
      ["Cartonería", "FARO Xochimilco"],
      ["Grabado en linóleo", "FARO Indios Verdes"],
    ]);
    expect(ps.filter((p) => p.tipo === "lugar").map((p) => [p.datos.nombre, p.datos.tipo]).sort()).toEqual([
      ["FARO Indios Verdes", "casa_de_cultura"],
      ["FARO Xochimilco", "casa_de_cultura"],
    ]);
    expect(ps.find((p) => p.datos.nombre === "FARO Indios Verdes")!.datos.imagen).toBe("https://cartelera.cdmx.gob.mx/wp-content/uploads/usercontent/indiosp.jpg");

    // Al publicar, el punto de la cartelera vale aunque quede fuera del radio de la ciudad (12 km): el FARO de Xochimilco está a ~20 km.
    const xochimilco = ps.find((p) => p.datos.titulo === "Cartonería")!.datos;
    const ciudad = { slug: "ciudad-de-mexico", nombre: "Ciudad de México", alias: [], lat: 19.432, lng: -99.14, zona: ZONA, radioKm: 12, parametros: { alcaldias: ["Cuauhtémoc"], guias: [], radio_km: 12 } };
    const listo = await prepararEvento({ db: base.db, mapbox: null, ahora: AHORA }, xochimilco, ciudad, LUGARES, ADMIN);
    expect(listo).toMatchObject({ ok: true, fila: { sitio_texto: "FARO Xochimilco", sitio_lat: 19.258, sitio_lng: -99.105, lugar_id: null } });
  });
});

describe("una ficha de la cartelera = una propuesta (OL-451)", () => {
  const fichaDe = (o: { id: number; titulo: string; tipo: string; recinto: string; venue: string; dias: string[]; hora: string; lat?: string; lng?: string; descripcion?: string }) =>
    `<script>var cdmx_billboard_event_info = ${JSON.stringify({
      event_id: o.id,
      event_location: { lat: o.lat ?? "19.4352", lng: o.lng ?? "-99.1412", address: "Av. Juárez 1, Centro, Cuauhtémoc, C.P. 06050, Ciudad de México" },
      event_name: o.titulo,
      event_description: o.descripcion ?? "<p>Una temporada.</p>",
      event_duration: "02:00",
      event_type: { id: o.tipo, name: o.tipo },
      schedule: { "1": { event_dates: o.dias, event_hours: [o.hora] } },
      costs: { "1": { cost_name: "General", cost_price: "$ 150" } },
      venue_id_id: o.venue,
      venue_name: o.recinto,
      event_image: "https://cartelera.cdmx.gob.mx/wp-content/uploads/x.jpg",
    })};</script>`;
  // Una temporada de jueves a domingo, un recorrido diario salvo los lunes, otra obra en el mismo teatro (mismo recinto, otro nombre escrito)
  // y una sin hora.
  const jueADom = ["22/10/2026", "23/10/2026", "24/10/2026", "25/10/2026", "29/10/2026", "30/10/2026", "31/10/2026", "01/11/2026"];
  const diario = Array.from({ length: 40 }, (_, i) => new Date(Date.UTC(2026, 9, 23 + i))).filter((d) => d.getUTCDay() !== 1).map((d) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/2026`);
  const fichas: Record<string, string> = {
    "11": fichaDe({ id: 11, titulo: "Temporada: La vida es sueño", tipo: "ARTES_ESCENICAS", recinto: "Teatro Julio Jiménez Rueda", venue: "700", dias: jueADom, hora: "19:00" }),
    "12": fichaDe({ id: 12, titulo: "ZooAventuras Chapultepec", tipo: "RECORRIDOS", recinto: "Zoológico de Chapultepec", venue: "701", dias: diario, hora: "09:00", lat: "19.4234", lng: "-99.1885" }),
    "13": fichaDe({ id: 13, titulo: "Temporada: Hamlet", tipo: "ARTES_ESCENICAS", recinto: "Teatro Julio Jiménez Rueda ", venue: "700", dias: ["24/10/2026", "31/10/2026"], hora: "18:00" }),
    "14": fichaDe({ id: 14, titulo: "Fantasmitas", tipo: "CURSOS_Y_TALLERES", recinto: "Teatro Julio Jiménez Rueda", venue: "700", dias: ["29/10/2026"], hora: "00:00", descripcion: "Se utilizará pintura." }),
  };
  const item = (id: string) => ({ event_id: id, event_type: id === "12" ? "Recorridos" : "Artes Escénicas", event_name: `Evento ${id}`, event_venue: "x", event_date_located: "22/10/2026", event_lat: "19.4352", event_lon: "-99.1412" });
  const lista = JSON.stringify({ status: "OK", data: { event_data: { event_pages_total: 1, event_items_total: 4, event_items_list: ["11", "12", "13", "14"].map(item) }, venue_data: { venue_pages_total: 0, venue_items_list: [] } } });
  const pedir = (async (url: string) => {
    if (url.endsWith("/search_builder")) return new Response(lista);
    const id = url.match(/^https:\/\/cartelera\.cdmx\.gob\.mx\/(\d+)\//)?.[1];
    return id && fichas[id] ? new Response(fichas[id]) : new Response("no", { status: 404 });
  }) as typeof fetch;

  it("una temporada y un recorrido diario son UNA propuesta cada uno, con sus funciones como sesiones; el recinto, una sola vez; las cuentas cuadran", async () => {
    const base = mundo();
    const notas: NotaCartelera[] = [];
    // Un paso por ficha (plazo corto): el recinto repetido se reconoce también entre pasos.
    const { dep } = dependencias(base, { ...carteleraFalsa(), pedir }, { plazoAgendasMs: 5_000 + 45_000 + 2 * 2_500 + 100, anotarCartelera: (n) => notas.push(n) });
    await hastaTerminar(dep);
    const c = laCorrida(base);
    expect(c.estado).toBe("terminada");
    const ps = deLaCorrida(base);
    const eventos = ps.filter((p) => p.tipo === "evento");
    expect(eventos.map((p) => p.datos.titulo).sort()).toEqual(["Temporada: Hamlet", "Temporada: La vida es sueño", "ZooAventuras Chapultepec"]);
    const temporada = eventos.find((p) => p.datos.cartelera_id === "11")!.datos;
    expect((temporada.sesiones as { inicio: string }[]).map((x) => x.inicio)).toEqual(
      ["2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"].map((d) => local(`${d}T19:00`)),
    );
    expect(temporada.serie).toBeUndefined();
    const zoo = eventos.find((p) => p.datos.cartelera_id === "12")!.datos;
    // Las funciones de los próximos 60 días, hasta 31 (el tope de sesiones de un evento).
    expect((zoo.sesiones as unknown[]).length).toBe(31);
    // El teatro, una sola propuesta de lugar aunque tres fichas lo nombran (una con un espacio de más).
    expect(ps.filter((p) => p.tipo === "lugar").map((p) => [p.datos.nombre, p.datos.cartelera_recinto])).toEqual([
      ["Teatro Julio Jiménez Rueda", "700"],
      ["Zoológico de Chapultepec", "701"],
    ]);
    const cc = c.resumen.cartelera as { leidas: number; propuestos: number; motivos: Record<string, number>; recintos_nuevos: number };
    expect(cc).toMatchObject({ leidas: 4, propuestos: 3, recintos_nuevos: 2, motivos: { sin_hora: 1 } });
    expect(cc.leidas).toBe(cc.propuestos + Object.values(cc.motivos).reduce((a, b) => a + b, 0));
    // Lo que se le cuenta al guion: la ficha sin hora (para revisarla) y cómo cruzó cada recinto.
    expect(notas.filter((n) => n.tipo === "sin_hora")).toEqual([{ tipo: "sin_hora", url: "https://cartelera.cdmx.gob.mx/14/22-10-2026/fantasmitas", titulo: "Fantasmitas", descripcion: "Se utilizará pintura." }]);
    expect(notas.filter((n) => n.tipo === "recinto").map((n) => n.tipo === "recinto" && n.nombre)).toEqual(["Teatro Julio Jiménez Rueda", "Zoológico de Chapultepec", "Teatro Julio Jiménez Rueda"]);

    // Al publicar, una temporada que no va en días seguidos lleva sus sesiones (si no, diría que es todos los días).
    const ciudad = { slug: "ciudad-de-mexico", nombre: "Ciudad de México", alias: [], lat: 19.432, lng: -99.14, zona: ZONA, radioKm: 12, parametros: { alcaldias: [], guias: [], radio_km: 12 } };
    const listo = await prepararEvento({ db: base.db, mapbox: null, ahora: AHORA }, temporada, ciudad, LUGARES, ADMIN);
    expect(listo.ok).toBe(true);
    if (!listo.ok) return;
    expect(listo.fila).toMatchObject({ inicio: local("2026-10-22T19:00"), fin: local("2026-11-01T21:00"), clase: "puntual" });
    const creado = await insertarEvento(base.db, listo.fila);
    expect(base.tablas.eventos_sesiones.filter((x) => x.evento_id === creado!.id)).toHaveLength(8);
  });
});

describe("el cruce de recintos con el directorio (OL-451)", () => {
  it("los que debían cruzar cruzan: Bellas Artes, el Teatro de la Ciudad, el Museo de la Ciudad de México, San Ildefonso", () => {
    const directorio = [
      { id: "l-ba", nombre: "Museo del Palacio de Bellas Artes", lat: 19.43524, lng: -99.14121 },
      { id: "l-tc", nombre: "Teatro de la Ciudad", lat: 19.43625, lng: -99.13773 },
      { id: "l-mc", nombre: "Museo de la Ciudad", lat: 19.42935, lng: -99.13248 },
      { id: "l-si", nombre: "Antiguo Colegio de San Ildefonso", lat: 19.43605, lng: -99.13068 },
      { id: "l-mn", nombre: "Museo Nacional de Arte", lat: 19.43598, lng: -99.13926 },
    ];
    const ciudad = new Set(["ciudad", "mexico"]);
    expect(cruzarRecinto({ nombre: "Palacio de Bellas Artes", punto: { lat: 19.43521, lng: -99.14125 } }, directorio, ciudad)?.id).toBe("l-ba");
    expect(cruzarRecinto({ nombre: "Teatro de la Ciudad Esperanza Iris", punto: { lat: 19.43628, lng: -99.13776 } }, directorio, ciudad)?.id).toBe("l-tc");
    expect(cruzarRecinto({ nombre: "Museo de la Ciudad de México", punto: { lat: 19.429329, lng: -99.132441 } }, directorio, ciudad)?.id).toBe("l-mc");
    expect(cruzarRecinto({ nombre: "Colegio de San Ildefonso", punto: { lat: 19.436122, lng: -99.130752 } }, directorio, ciudad)?.id).toBe("l-si");
    // Cerca, pero otro sitio: no.
    expect(cruzarRecinto({ nombre: "Teatro de la Ciudad Esperanza Iris", punto: { lat: 19.43598, lng: -99.13926 } }, [directorio[4]], ciudad)).toBeNull();
    expect(mismoRecinto("Museo de la Ciudad", "Teatro de la Ciudad", 10)).toBe(false);
    // Con una sola palabra propia, solo muy cerca (60 m).
    expect(mismoRecinto("Teatro de la Ciudad Esperanza Iris", "Teatro de la Ciudad", 59)).toBe(true);
    expect(mismoRecinto("Teatro de la Ciudad Esperanza Iris", "Teatro de la Ciudad", 120)).toBe(false);
  });
});
