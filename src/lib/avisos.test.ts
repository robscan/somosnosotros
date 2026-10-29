import { describe, expect, it } from "vitest";
import { contenidoPush, contenidoPushAdmin, cuerpoPush, LARGO_CUERPO, LARGO_TITULO, lotes, recortar, pendientesDeAviso, superoTopeAvisos, TOPE_AVISOS_POR_AUTOR_DIA, ventanaRecordatorio, type Canales, type EventoParaAviso } from "./avisos";

// "ahora" fijo para que los textos con fecha no dependan del día en que corre la prueba.
const AHORA = new Date("2026-09-19T16:00:00Z"); // sábado 19 sep 2026, 10:00 hora de la ciudad

const evento = (extra: Partial<EventoParaAviso> = {}): EventoParaAviso => ({
  id: "evt-1",
  titulo: "Noche de jazz",
  inicio: "2026-09-27T01:00:00Z",
  fin: null,
  zona: "America/Mexico_City",
  sitio_texto: null,
  sitio_reservado: false,
  lugar: { nombre: "Casa 1100", portada: null },
  ...extra,
});

describe("lotes", () => {
  it("parte la lista en trozos del tamaño pedido", () => {
    expect(lotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("un solo lote cuando la lista cabe entera", () => {
    expect(lotes([1, 2], 10)).toEqual([[1, 2]]);
  });
  it("lista vacía: sin lotes", () => {
    expect(lotes([], 10)).toEqual([]);
  });
});

describe("superoTopeAvisos", () => {
  it("no pasa el tope con 0, 1, 2 o 3 eventos en 24 h", () => {
    expect(superoTopeAvisos(0)).toBe(false);
    expect(superoTopeAvisos(TOPE_AVISOS_POR_AUTOR_DIA)).toBe(false);
  });
  it("pasa el tope a partir del cuarto evento (con el tope por defecto, 3)", () => {
    expect(superoTopeAvisos(TOPE_AVISOS_POR_AUTOR_DIA + 1)).toBe(true);
  });
  it("admite un tope distinto al por defecto", () => {
    expect(superoTopeAvisos(5, 10)).toBe(false);
    expect(superoTopeAvisos(11, 10)).toBe(true);
  });
});

describe("ventanaRecordatorio", () => {
  it("va de ahora a dentro de `horas`, en ISO", () => {
    expect(ventanaRecordatorio(24, AHORA)).toEqual({ desde: "2026-09-19T16:00:00.000Z", hasta: "2026-09-20T16:00:00.000Z" });
  });
  it("con 1 hora, la ventana es corta", () => {
    expect(ventanaRecordatorio(1, AHORA)).toEqual({ desde: "2026-09-19T16:00:00.000Z", hasta: "2026-09-19T17:00:00.000Z" });
  });
});

describe("pendientesDeAviso", () => {
  const perfil = (id: string, extra: Partial<Canales> = {}): Canales => ({ id, avisos_correo: true, avisos_push: false, ...extra });

  it("deja fuera a quien no tiene ningún canal activo", () => {
    const perfiles = [perfil("a"), perfil("b", { avisos_correo: false, avisos_push: false })];
    expect(pendientesDeAviso(perfiles, new Set())).toEqual([perfil("a")]);
  });
  it("cuenta con que el push solo también basta", () => {
    const perfiles = [perfil("a", { avisos_correo: false, avisos_push: true })];
    expect(pendientesDeAviso(perfiles, new Set())).toEqual(perfiles);
  });
  it("deja fuera a quien ya está en avisos_enviados, aunque tenga canal activo", () => {
    const perfiles = [perfil("a"), perfil("b")];
    expect(pendientesDeAviso(perfiles, new Set(["a"]))).toEqual([perfil("b")]);
  });
  it("sin nadie pendiente, lista vacía", () => {
    expect(pendientesDeAviso([perfil("a")], new Set(["a"]))).toEqual([]);
  });
});

describe("contenidoPush (OL-480: la forma firmada en OL-478)", () => {
  it("evento nuevo por el lugar: título = el evento, «Nuevo en …» debajo, la fecha corta primero y la descripción", () => {
    const c = contenidoPush("nuevo_evento", evento(), "ambos", AHORA, { motivo: "lugar", descripcion: "Trío con invitados" });
    expect(c).toEqual({ titulo: "Noche de jazz", subtitulo: "Nuevo en Casa 1100", cuerpo: "sáb 26 · 7 pm · Trío con invitados",
      url: "https://somosnosotros.org/eventos/evt-1?desde=aviso&tipo=nuevo", hilo: "evento-evt-1" });
  });
  it("evento nuevo por el artista: el artista va antes que el lugar y nunca dice quién publicó", () => {
    const c = contenidoPush("nuevo_evento", evento(), "ambos", AHORA, { motivo: "artista:Luna Hermoso" });
    expect([c.subtitulo, c.cuerpo]).toEqual(["De Luna Hermoso, a quien sigues", "sáb 26 · 7 pm · Casa 1100"]);
    expect(JSON.stringify(c)).not.toMatch(/publicó/);
  });
  it("sin motivo guardado (entregas de antes): como si fuera por el lugar, con el sitio escrito a mano o reservado", () => {
    expect(contenidoPush("nuevo_evento", evento({ lugar: null, sitio_texto: "Plaza de armas" }), "ambos", AHORA).subtitulo).toBe("Nuevo en Plaza de armas");
    const reservado = contenidoPush("nuevo_evento", evento({ lugar: null, sitio_texto: "Plaza", sitio_reservado: true }), "ambos", AHORA);
    expect(reservado.subtitulo).toBe("Nuevo en Plaza · sitio reservado");
    expect(reservado.cuerpo).toBe("sáb 26 · 7 pm");
  });
  it("lo de última hora (empieza en menos de 24 horas) dice «Hoy a las…», con mayúscula al abrir el cuerpo", () => {
    expect(contenidoPush("nuevo_evento", evento({ inicio: "2026-09-20T03:00:00Z" }), "ambos", AHORA, { motivo: "lugar" }).cuerpo).toBe("Hoy a las 9 pm");
  });
  it("recordatorio: «Hoy a las 7 pm» o «Mañana a las 8 am» de subtítulo, en la zona del evento; el lugar y su dirección en el cuerpo", () => {
    const hoy = contenidoPush("recordatorio", evento({ inicio: "2026-09-20T01:00:00Z" }), "ambos", AHORA, { direccion: "Villerías 2, Centro" });
    expect([hoy.titulo, hoy.subtitulo, hoy.cuerpo]).toEqual(["Noche de jazz", "Hoy a las 7 pm", "Casa 1100 · Villerías 2, Centro"]);
    expect(hoy.url).toBe("https://somosnosotros.org/eventos/evt-1?desde=aviso&tipo=recordatorio");
    expect(contenidoPush("recordatorio", evento({ inicio: "2026-09-20T14:00:00Z" }), "ambos", AHORA).subtitulo).toBe("Mañana a las 8 am");
    expect(contenidoPush("recordatorio", evento({ inicio: "2026-09-19T19:00:00Z" }), "ambos", AHORA).subtitulo).toBe("Hoy a la 1 pm");
    // El mismo instante en Madrid es la 1:00 del domingo: mañana allá.
    expect(contenidoPush("recordatorio", evento({ inicio: "2026-09-19T23:00:00Z", zona: "Europe/Madrid" }), "ambos", AHORA).subtitulo).toBe("Mañana a la 1 am");
    // Con sitio reservado, solo el nombre: la dirección nunca viaja en el aviso.
    const reservado = contenidoPush("recordatorio", evento({ inicio: "2026-09-20T01:00:00Z", lugar: null, sitio_texto: "Casa de Ana", sitio_reservado: true }), "ambos", AHORA, { direccion: "Calle secreta 1" });
    expect(reservado.cuerpo).toBe("Casa de Ana · sitio reservado");
  });
  it("cambio: «Nueva fecha: …», «Nuevo lugar: …» o «Nueva fecha y lugar», y el «mañana» en minúscula a media frase (adiós «Ahora es Mañana»)", () => {
    expect([contenidoPush("cambio", evento(), "cuando", AHORA).subtitulo, contenidoPush("cambio", evento(), "cuando", AHORA).cuerpo]).toEqual(["Nueva fecha: sáb 26 · 7 pm", "Casa 1100"]);
    expect([contenidoPush("cambio", evento(), "donde", AHORA).subtitulo, contenidoPush("cambio", evento(), "donde", AHORA).cuerpo]).toEqual(["Nuevo lugar: Casa 1100", "sáb 26 · 7 pm"]);
    expect([contenidoPush("cambio", evento(), "ambos", AHORA).subtitulo, contenidoPush("cambio", evento(), "ambos", AHORA).cuerpo]).toEqual(["Nueva fecha y lugar", "sáb 26 · 7 pm · Casa 1100"]);
    const pronto = contenidoPush("cambio", evento({ inicio: "2026-09-20T14:00:00Z" }), "cuando", AHORA);
    expect(pronto.subtitulo).toBe("Nueva fecha: mañana a las 8 am");
    expect(JSON.stringify(pronto)).not.toMatch(/ Mañana/);
    expect(pronto.url.endsWith("tipo=cambio")).toBe(true);
  });
  it("cancelación (su texto queda listo para la fase 4): «Se canceló» y cuándo era", () => {
    const c = contenidoPush("cancelado", evento(), "ambos", AHORA);
    expect([c.subtitulo, c.cuerpo, c.url.endsWith("tipo=cancelado")]).toEqual(["Se canceló", "Era el sáb 26 · 7 pm en Casa 1100.", true]);
  });
  it("lejos (dos semanas o más), con el mes; lo que dura varios días, sus días", () => {
    expect(contenidoPush("nuevo_evento", evento({ inicio: "2026-11-14T02:00:00Z" }), "ambos", AHORA).cuerpo).toBe("vie 13 de nov · 8 pm");
    expect(contenidoPush("nuevo_evento", evento({ inicio: "2026-09-25T17:00:00Z", fin: "2026-09-28T05:59:00Z" }), "ambos", AHORA).cuerpo).toBe("del vie 25 al dom 27");
  });
  it("nombres largos: título ≤ 40 y cuerpo ≤ 110, cortados por palabra con «…»; la razón se queda entera y se corta el nombre", () => {
    const largo = evento({ titulo: "Festival Internacional de Danza Contemporánea Lila López: función de clausura",
      lugar: { nombre: "Centro de las Artes de San Luis Potosí Centenario", portada: null } });
    const descripcion = "Gala de clausura con compañías de México, Argentina y España en el foro principal del Centro de las Artes, con entrada libre hasta llenar";
    const c = contenidoPush("nuevo_evento", largo, "ambos", AHORA, { motivo: "lugar", descripcion });
    expect(c.titulo).toBe("Festival Internacional de Danza…");
    expect(c.subtitulo).toBe("Nuevo en Centro de las Artes de San…");
    expect(c.cuerpo.startsWith("sáb 26 · 7 pm · Gala de clausura")).toBe(true);
    expect(c.cuerpo.endsWith("…")).toBe(true);
    for (const t of [c.titulo, c.subtitulo]) expect(t.length).toBeLessThanOrEqual(LARGO_TITULO);
    expect(c.cuerpo.length).toBeLessThanOrEqual(LARGO_CUERPO);
    // Corte limpio: nunca a media palabra (lo de antes del «…» es una palabra entera de la descripción).
    expect(descripcion.includes(`${c.cuerpo.slice("sáb 26 · 7 pm · ".length, -1)} `)).toBe(true);
    const artista = contenidoPush("nuevo_evento", largo, "ambos", AHORA, { motivo: "artista:Orquesta Sinfónica del Estado de San Luis Potosí" });
    expect(artista.subtitulo).toBe("De Orquesta Sinfónica…, a quien sigues");
    const web = cuerpoPush(c, "web", "job-1");
    expect(web.cuerpo.length).toBeLessThanOrEqual(LARGO_CUERPO);
    expect(web.cuerpo.startsWith("Nuevo en Centro de las Artes de San… · sáb 26 · 7 pm · ")).toBe(true);
  });
});

describe("recortar", () => {
  it("lo que cabe, tal cual; lo que no, por la última palabra entera, sin «·» colgando", () => {
    expect(recortar("Noche de jazz", 40)).toBe("Noche de jazz");
    expect(recortar("uno dos tres cuatro", 12)).toBe("uno dos…");
    expect(recortar("Casa 1100 · Villerías", 12)).toBe("Casa 1100…");
    expect(recortar("Supercalifragilístico", 10)).toBe("Supercali…");
    expect(recortar("  dos   espacios  ", 40)).toBe("dos espacios");
  });
});

describe("cuerpoPush (OL-480): un cuerpo para la app y otro para la web", () => {
  const forma = contenidoPush("nuevo_evento", evento(), "ambos", AHORA, { motivo: "artista:Luna Hermoso" });
  it("app: subtítulo aparte, hilo del evento y el tag del trabajo (un reintento no sale dos veces)", () => {
    expect(cuerpoPush(forma, "app", "job-1")).toEqual({ titulo: "Noche de jazz", subtitulo: "De Luna Hermoso, a quien sigues", cuerpo: "sáb 26 · 7 pm · Casa 1100",
      url: "https://somosnosotros.org/eventos/evt-1?desde=aviso&tipo=nuevo", tag: "aviso-job-1", hilo: "evento-evt-1" });
  });
  it("web: sin subtítulo, la razón abre el cuerpo, el mismo título y el tag es el hilo del evento", () => {
    expect(cuerpoPush(forma, "web", "job-1")).toEqual({ titulo: "Noche de jazz", cuerpo: "De Luna Hermoso, a quien sigues · sáb 26 · 7 pm · Casa 1100",
      url: "https://somosnosotros.org/eventos/evt-1?desde=aviso&tipo=nuevo", tag: "evento-evt-1", aviso: "job-1" });
  });
});

describe("contenidoPushAdmin (OL-115)", () => {
  it("un solo motivo: dice cuál, sin numero", () => {
    expect(contenidoPushAdmin({ reclamo_ficha: 1 })).toEqual({ titulo: "Administración", cuerpo: "Alguien reclamó una ficha", url: "/admin" });
    expect(contenidoPushAdmin({ registro: 1 })).toEqual({ titulo: "Administración", cuerpo: "Alguien se registró", url: "/admin" });
    expect(contenidoPushAdmin({ nuevo_evento: 1 }).cuerpo).toBe("Se publicó un evento nuevo");
    expect(contenidoPushAdmin({ nuevo_lugar: 1 }).cuerpo).toBe("Se publicó un lugar nuevo");
    expect(contenidoPushAdmin({ nuevo_artista: 1 }).cuerpo).toBe("Se publicó una ficha de artista nueva");
    expect(contenidoPushAdmin({ reporte: 1 }).cuerpo).toBe("Alguien envió un reporte");
    // OL-467: tu cartel a un evento que ya estaba.
    expect(contenidoPushAdmin({ cartel_puesto: 1 }).cuerpo).toBe("Alguien le puso cartel a un evento");
  });
  it("agrupado: dice cuántas cosas, nunca un nombre ni un motivo suelto", () => {
    expect(contenidoPushAdmin({ registro: 3, reclamo_ficha: 2 }).cuerpo).toBe("5 cosas por revisar");
    expect(contenidoPushAdmin({ nuevo_evento: 2 }).cuerpo).toBe("2 cosas por revisar");
  });
  it("siempre abre /admin, sin ids ni datos personales en el cuerpo", () => {
    const c = contenidoPushAdmin({ registro: 1 });
    expect(c.url).toBe("/admin");
    expect(c.cuerpo).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/); // sin uuid colado
  });
});
