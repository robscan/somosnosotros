import { describe, expect, it } from "vitest";
import {
  accionDe,
  textoDejar,
  cuandoPaso,
  datosPersona,
  embudoComunidad,
  detalleArtista,
  detalleEvento,
  detalleLugar,
  detallePersona,
  estadoRol,
  haceUnaSemana,
  hrefLista,
  indicadores,
  leerLista,
  nombradoPor,
  notaSemana,
  PAGINA_PANEL,
  quePide,
  renglonesGestionar,
  serieSemanal,
  textoAvisos,
  textoCambio,
  textoCodigoRol,
  textoHecho,
  textoOcultar,
  textoPendientes,
  trazoTendencia,
  ultimaVez,
  vacioDe,
  type Ahora,
  type Foto,
  type Gestionar,
  type Pendiente,
  type PersonaFicha,
  type PersonaFila,
} from "./panel";

// "ahora": miércoles 16 sep 2026, 20:00 hora de la ciudad (17 sep 02:00Z)
const AHORA = new Date("2026-09-17T02:00:00Z");
const HOY = "2026-09-16";
const YO = "yo";

const ahora = (cambios: Partial<Ahora> = {}): Ahora => ({
  activas: 3,
  cuentas: 4,
  coincidencias: 0,
  eventos_semana: 36,
  lugares_con_fecha: 17,
  lugares: 58,
  comunidad: 0,
  proximos: 85,
  comunidad_nuevos: 0,
  desglose: { abrieron: 3, voy: 0, siguieron: 1, publicaron: 0, nuevas: 4, con_2: 0, con_3_a_5: 0, con_6_o_mas: 0, mayor: null, personas_que_publican: 0 },
  ...cambios,
});
const gestionar: Gestionar = { personas: 5, personas_nuevas: 4, nunca_entraron: 1, correo_con_problema: 0, lugares: 58, lugares_sin_fecha: 41, lugares_ocultos: 1, lugares_privados: 0, eventos: 85, eventos_sin_imagen: 70, artistas: 522, artistas_ocultos: 0, artistas_llevados: 1, invitaciones: 15 };
const foto = (dia: string, activas: number): Foto => ({ dia, activas, coincidencias: 0, eventos_semana: 30, comunidad: 0 });

const pendiente = (cambios: Partial<Pendiente> = {}): Pendiente => ({ id: "r", tipo: "lugar", objeto_id: "l", motivo: "no_cultural", detalle: "Es un bar", creado_en: "2026-09-15T22:36:00Z", creado_por: "ana", autor: "Ana Pérez", objeto: "Foro Escénico La Lonja", objeto_visible: true, lecturas: null, publicados: null, ...cambios });

const fila = (cambios: Partial<PersonaFila> = {}): PersonaFila => ({ id: "p", nombre: "Luis Rangel", foto: null, rol: "usuario", reservado: false, creado_en: "2026-09-13T20:00:00Z", confirmado: true, ultima_entrada: "2026-09-14T18:00:00Z", visto: HOY, correo_oculto: "lu…@gmail.com", va_a: 3, sigue: 4, publico: 0, lleva: "Colectivo Barro", lleva_n: 1, total: 1, ...cambios });

const ficha = (cambios: Partial<PersonaFicha> = {}): PersonaFicha => ({
  id: "luis",
  nombre: "Luis Rangel",
  foto: null,
  colonia: "Tequisquiapan",
  reservado: false,
  rol: "usuario",
  creado_en: "2026-09-13T20:00:00Z",
  correo_oculto: "lu…@gmail.com",
  confirmado: true,
  ultima_entrada: "2026-09-14T18:00:00Z",
  visto: HOY,
  avisos_correo: false,
  avisos_correo_motivo: null,
  telefonos: 2,
  va_a: 3,
  le_interesa: 1,
  sigue_lugares: 4,
  sigue_artistas: 2,
  publico_lugares: 0,
  publico_eventos: 0,
  publico_artistas: 0,
  lleva: [{ tipo: "artista", id: "barro", nombre: "Colectivo Barro" }],
  reclamos: 1,
  reportes: 0,
  pendientes: 0,
  de_origen: false,
  es_yo: false,
  puedo_cambiar_rol: true,
  administradores: 1,
  cambio_rol: null,
  ...cambios,
});

describe("indicadores", () => {
  it("la primera semana no inventa comparación ni tendencia", () => {
    const lista = indicadores({ ahora: ahora(), historia: [], gestionar }, HOY);
    expect(lista.map((i) => [i.nombre, i.valor, i.base])).toEqual([
      ["Personas activas", 3, "de 4 cuentas, sin administradores"],
      ["Coincidencias", 0, "eventos con 2 o más que van, de 36"],
      ["Agenda de la semana", 36, "eventos · 17 de 58 lugares con fecha"],
      ["Publica la comunidad", 0, "de 85 eventos próximos"],
    ]);
    expect(lista.slice(0, 3).every((i) => i.cambio === null && i.serie === null)).toBe(true);
    expect(lista[3].cambio).toBe("Ninguno nuevo esta semana");
    expect(notaSemana(lista)).toBe("Primera semana: aún sin comparación");
    expect(lista[1].partes).toEqual(["Aún en ningún evento de la semana van 2 o más"]);
    expect(lista[3].partes).toEqual(["Aún todo lo publica la administración"]);
  });
  it("compara con la foto de hace 7 días, o la más cercana de hasta 3 días antes", () => {
    expect(haceUnaSemana([foto("2026-09-09", 2)], "activas", HOY)).toBe(2);
    expect(haceUnaSemana([foto("2026-09-06", 1), foto("2026-09-08", 2)], "activas", HOY)).toBe(2);
    expect(haceUnaSemana([foto("2026-09-05", 2)], "activas", HOY)).toBeNull(); // 11 días: muy lejos
    expect(haceUnaSemana([foto("2026-09-12", 2)], "activas", HOY)).toBeNull(); // 4 días: no es hace una semana
    const lista = indicadores({ ahora: ahora({ activas: 38 }), historia: [foto("2026-09-09", 32)], gestionar }, HOY);
    expect(lista[0].cambio).toBe("▲ 6 más");
    expect(notaSemana(lista)).toBe("Comparado con hace una semana");
  });
  it("escribe el cambio con flecha y signo", () => {
    expect(textoCambio(38, 32)).toBe("▲ 6 más");
    expect(textoCambio(41, 45)).toBe("▼ 4 menos");
    expect(textoCambio(9, 9)).toBe("Igual que hace una semana");
  });
  it("la tendencia aparece con 4 semanas seguidas y se corta donde falta una", () => {
    const historia = [foto("2026-08-26", 5), foto("2026-09-02", 8), foto("2026-09-09", 12)];
    expect(serieSemanal(historia, "activas", 15, HOY)).toEqual([5, 8, 12, 15]);
    expect(serieSemanal(historia.slice(1), "activas", 15, HOY)).toBeNull();
    expect(serieSemanal([foto("2026-08-19", 1), foto("2026-09-02", 8), foto("2026-09-09", 12)], "activas", 15, HOY)).toBeNull();
  });
  it("el trazo de la tendencia cabe en su caja y resalta el último punto", () => {
    const t = trazoTendencia([0, 5, 10], 88, 28, 3);
    expect(t.puntos).toBe("3,25 44,14 85,3");
    expect(t.ultimo).toEqual({ x: 85, y: 3 });
    expect(trazoTendencia([4, 4, 4, 4]).puntos.split(" ").every((p) => p.endsWith(",25"))).toBe(true);
  });
  it("desglosa coincidencias y comunidad", () => {
    const lista = indicadores({ ahora: ahora({ coincidencias: 9, comunidad: 23, proximos: 97, comunidad_nuevos: 7, desglose: { ...ahora().desglose, con_2: 5, con_3_a_5: 3, con_6_o_mas: 1, mayor: { id: "e", titulo: "Jam de jazz", n: 7 }, personas_que_publican: 11 } }), historia: [], gestionar }, HOY);
    expect(lista[1].partes).toEqual(["5 con 2 personas", "3 con 3 a 5", "1 con 6 o más", "La más grande: Jam de jazz, 7 van"]);
    expect(lista[3].cambio).toBe("▲ 7 esta semana");
    expect(lista[3].partes).toEqual(["23 de 97 eventos próximos", "11 personas los publican", "7 publicados esta semana"]);
    expect(lista[1].enlace.href).toBe("/admin/eventos?filtro=semana");
  });
});

describe("gestionar", () => {
  it("cada renglón dice su total y lo que pide atención", () => {
    expect(renglonesGestionar(gestionar).map((r) => [r.titulo, r.total, r.detalle])).toEqual([
      ["Personas", 5, "4 nuevas · 1 nunca entró"],
      ["Lugares", 58, "41 sin fecha próxima · 1 oculto"],
      ["Eventos", 85, "70 sin imagen"],
      ["Artistas", 522, "1 llevado por su gente · 15 invitaciones"],
    ]);
    const nada = renglonesGestionar({ ...gestionar, personas_nuevas: 0, nunca_entraron: 0, lugares_sin_fecha: 0, lugares_ocultos: 0, eventos_sin_imagen: 0, artistas_llevados: 0, invitaciones: 0 });
    expect(nada.map((r) => r.detalle)).toEqual(["Nada que atender", "Todos con fecha próxima", "Todos con imagen", "Ninguno llevado por su gente"]);
  });
  it("el renglón de Ajustes dice lo pendiente", () => {
    expect([0, 1, 2].map(textoPendientes)).toEqual(["Nada pendiente", "1 pendiente", "2 pendientes"]);
  });
});

describe("pendientes", () => {
  it("un reclamo no se lee como reporte", () => {
    expect(quePide({ motivo: "es_mio" })).toBe("Pide llevar la ficha");
    expect(quePide({ motivo: "retirar" })).toBe("Pide que se quite la ficha");
    expect(quePide({ motivo: "no_cultural" })).toBe("Reporte: no es cultural");
    expect(quePide({ motivo: "raro" })).toBe("Reporte: otra cosa");
    expect(quePide({ motivo: "mas_lecturas" })).toBe("Pide más lecturas de cartel");
  });
  it("cada tarjeta ofrece solo su acción", () => {
    expect(accionDe(pendiente())).toEqual({ decision: "ocultar", texto: "Ocultar la ficha", apagada: null });
    expect(accionDe(pendiente({ tipo: "artista", motivo: "es_mio" }))).toEqual({ decision: "pasar", texto: "Pasarle la ficha", apagada: null });
    expect(accionDe(pendiente({ tipo: "artista", motivo: "es_mio", creado_por: null }))?.apagada).toBe("La cuenta que la pidió ya no existe");
    expect(accionDe(pendiente({ tipo: "artista", motivo: "retirar" }))?.decision).toBe("ocultar");
    expect(accionDe(pendiente({ objeto: null }))).toBeNull(); // la ficha ya no existe: solo cerrar
    expect(accionDe(pendiente({ objeto_visible: false }))).toBeNull(); // ya está oculta
    expect(accionDe(pendiente({ tipo: "perfil", objeto: "Ana" }))).toBeNull();
    // Una petición de lecturas es de tipo perfil y sí tiene qué hacer: su caso va antes de esa salida.
    const peticion = pendiente({ tipo: "perfil", motivo: "mas_lecturas", objeto: "Ana", lecturas: 20, publicados: 18 });
    expect(accionDe(peticion)).toEqual({ decision: "dar_mas", texto: "Dar más", apagada: null });
    expect(accionDe({ ...peticion, creado_por: null })?.apagada).toBe("La cuenta que las pidió ya no existe");
    expect(textoDejar(peticion)).toBe("Dejarlo así");
  });
  it("lo hecho queda escrito, sin género", () => {
    expect(textoHecho(pendiente(), "ocultar")).toBe("Foro Escénico La Lonja ya no se ve");
    expect(textoHecho(pendiente({ tipo: "artista", motivo: "es_mio", objeto: "Colectivo Barro", autor: "Luis Rangel" }), "pasar")).toBe("Luis Rangel ya lleva Colectivo Barro");
    expect(textoHecho(pendiente({ tipo: "perfil", motivo: "mas_lecturas", autor: "Casa de la Cultura" }), "dar_mas")).toBe("Casa de la Cultura ya tiene 100 lecturas al mes");
    expect(textoHecho(pendiente(), "dejar")).toBe("Reporte cerrado; la ficha sigue igual");
    expect(textoHecho(pendiente({ motivo: "es_mio" }), "dejar")).toBe("Reclamo cerrado; la ficha sigue igual");
    expect(textoHecho(pendiente({ objeto: null }), "dejar")).toBe("Reporte cerrado");
  });
  it("dice cuándo llegó", () => {
    expect(cuandoPaso("2026-09-17T01:30:00Z", AHORA)).toBe("hace un momento");
    expect(cuandoPaso("2026-09-16T21:00:00Z", AHORA)).toBe("hace 5 h");
    expect(cuandoPaso("2026-09-15T22:36:00Z", AHORA)).toBe("ayer");
    expect(cuandoPaso("2026-09-13T22:36:00Z", AHORA)).toBe("dom 13 de sep");
  });
});

describe("personas", () => {
  it("la última vez, con el dato más reciente", () => {
    expect(ultimaVez({ visto: HOY, ultima_entrada: "2026-09-14T18:00:00Z" }, AHORA)).toBe("Abrió la app hoy");
    expect(ultimaVez({ visto: "2026-09-15", ultima_entrada: null }, AHORA)).toBe("Abrió la app ayer");
    expect(ultimaVez({ visto: "2026-09-11", ultima_entrada: null }, AHORA)).toBe("Abrió la app hace 5 días");
    expect(ultimaVez({ visto: "2026-08-26", ultima_entrada: null }, AHORA)).toBe("Abrió la app hace 3 semanas");
    expect(ultimaVez({ visto: null, ultima_entrada: "2026-09-13T18:00:00Z" }, AHORA)).toBe("Entró el dom 13 de sep");
    expect(ultimaVez({ visto: "2026-09-10", ultima_entrada: "2026-09-16T18:00:00Z" }, AHORA)).toBe("Entró hoy");
    expect(ultimaVez({ visto: null, ultima_entrada: null }, AHORA)).toBe("Nunca entró");
    expect(ultimaVez({ visto: HOY, ultima_entrada: null }, AHORA, true)).toBe("Abriste la app hoy");
  });
  it("el renglón dice lo más significativo", () => {
    expect(detallePersona(fila(), AHORA)).toBe("Abrió la app hoy · 3 voy · lleva Colectivo Barro");
    expect(detallePersona(fila({ visto: null, ultima_entrada: null, confirmado: false, creado_en: "2026-09-14T20:00:00Z", va_a: 0, lleva: null, lleva_n: 0 }), AHORA)).toBe("Nunca entró · alta hace 2 días · sin confirmar su correo");
    expect(detallePersona(fila({ reservado: true, va_a: 0, lleva: null }), AHORA)).toBe("Perfil reservado · abrió la app hoy");
    expect(detallePersona(fila({ lleva_n: 3, va_a: 0 }), AHORA)).toBe("Abrió la app hoy · lleva Colectivo Barro y 2 más");
    // Si se encontró por el correo, el correo oculto explica por qué salió.
    expect(detallePersona(fila({ va_a: 0, lleva: null }), AHORA, "gmail")).toBe("lu…@gmail.com · abrió la app hoy");
    expect(detallePersona(fila({ va_a: 0, lleva: null }), AHORA, "rangel")).toBe("Abrió la app hoy");
  });
  it("los avisos en palabras, con el motivo si el correo se apagó", () => {
    expect(textoAvisos({ telefonos: 2, avisos_correo: false, avisos_correo_motivo: null })).toBe("En 2 teléfonos");
    expect(textoAvisos({ telefonos: 1, avisos_correo: true, avisos_correo_motivo: null })).toBe("En el teléfono · por correo");
    expect(textoAvisos({ telefonos: 0, avisos_correo: false, avisos_correo_motivo: "rebote" })).toBe("El correo rebota");
    expect(textoAvisos({ telefonos: 0, avisos_correo: false, avisos_correo_motivo: null })).toBe("Sin avisos");
  });
  it("los datos de su ficha", () => {
    const d = datosPersona(ficha(), AHORA);
    expect(d.alta).toBe("dom 13 de sep · hace 3 días");
    expect(d.vaA).toBe("3 eventos próximos · 1 le interesa");
    expect(d.sigue).toBe("4 lugares · 2 artistas");
    expect(d.publico).toBe("Nada aún");
    expect(d.reportes).toBe("1 reclamo");
    expect(datosPersona(ficha({ visto: null, ultima_entrada: null, confirmado: false }), AHORA).ultimaVez).toBe("Nunca entró: no confirmó su correo");
  });
});

describe("rol", () => {
  it("hacer administrador solo a quien confirmó su correo y solo desde una cuenta de origen", () => {
    expect(estadoRol(ficha(), YO, AHORA)).toEqual({ etiqueta: "Usuario", detalle: "Publica, dice Voy y sigue", accion: "hacer" });
    expect(estadoRol(ficha({ confirmado: false }), YO, AHORA).accion).toBeNull();
    expect(estadoRol(ficha({ puedo_cambiar_rol: false }), YO, AHORA)).toEqual({ etiqueta: "Usuario", detalle: "Solo quien fundó Somos Nosotros cambia el rol", accion: null });
  });
  it("quitar, con sus guardas a la vista", () => {
    const nombrado = { rol: "admin" as const, creado_en: "2026-09-17T01:00:00Z", por: YO, por_nombre: "Oscar" };
    expect(estadoRol(ficha({ rol: "admin", administradores: 2, cambio_rol: nombrado }), YO, AHORA)).toEqual({ etiqueta: "Administrador", detalle: "Desde hoy, lo nombraste tú", accion: "quitar" });
    expect(estadoRol(ficha({ rol: "admin", administradores: 2, de_origen: true }), YO, AHORA)).toEqual({ etiqueta: "Administrador", detalle: "Desde el inicio: no se quita desde la app", accion: null });
    expect(estadoRol(ficha({ rol: "admin", administradores: 1, cambio_rol: nombrado }), YO, AHORA).detalle).toBe("Es el único administrador");
    expect(estadoRol(ficha({ rol: "admin", administradores: 2, es_yo: true, puedo_cambiar_rol: true }), YO, AHORA).accion).toBeNull();
    expect(nombradoPor({ cambio_rol: { ...nombrado, por: "otra", por_nombre: "Valeria" } }, YO, AHORA)).toBe("Desde hoy, lo nombró Valeria");
    expect(nombradoPor({ cambio_rol: { ...nombrado, por: null, por_nombre: null, creado_en: "2026-09-10T18:00:00Z" } }, YO, AHORA)).toBe("Desde hace 6 días, lo nombró una cuenta borrada");
  });
  it("la causa en palabras cuando la base no hizo el cambio", () => {
    expect(textoCodigoRol("ok")).toBeNull();
    expect(textoCodigoRol("sin_cambio")).toBeNull();
    expect(textoCodigoRol("sin_confirmar")).toBe("Aún no confirma su correo: podrás hacerlo administrador cuando entre.");
    expect(textoCodigoRol("ultimo")).toBe("Es el único administrador.");
    expect(textoCodigoRol("lo que sea")).toBe("No se pudo cambiar el rol. Intenta de nuevo.");
  });
});

describe("listas", () => {
  it("lee la URL con valores seguros", () => {
    expect(leerLista("lugares", {})).toEqual({ q: null, filtro: "todos", n: PAGINA_PANEL });
    expect(leerLista("lugares", { filtro: "ocultos", q: "  foro ", n: "60" })).toEqual({ q: "foro", filtro: "ocultos", n: 60 });
    expect(leerLista("eventos", { filtro: "inventado", n: "abc" })).toEqual({ q: null, filtro: "proximos", n: PAGINA_PANEL });
    expect(leerLista("personas", { n: "45" }).n).toBe(60);
    expect(leerLista("personas", { n: "99999" }).n).toBe(600);
  });
  it("la URL no lleva lo que vale por defecto", () => {
    expect(hrefLista("lugares", { filtro: "todos", n: PAGINA_PANEL })).toBe("/admin/lugares");
    expect(hrefLista("lugares", { filtro: "sin_fecha", q: "casa", n: 60 })).toBe("/admin/lugares?q=casa&filtro=sin_fecha&n=60");
  });
  it("el vacío dice su causa", () => {
    expect(vacioDe("lugares", "ocultos", null)).toBe("Ningún lugar oculto.");
    expect(vacioDe("personas", "todas", "rangle")).toBe("Nadie con «rangle».");
    expect(vacioDe("lugares", "todos", "lonja")).toBe("Nada con «lonja».");
  });
  it("cada renglón dice lo que importa para gestionar", () => {
    expect(detalleLugar({ id: "l", nombre: "Casa", foto: null, tipo: "casa_de_cultura", detalle: null, visible: true, privado: false, origen: null, proximas: 3, lleva: null, lleva_n: 0, total: 1 })).toBe("Casa de cultura · 3 fechas próximas");
    expect(detalleLugar({ id: "l", nombre: "Mezquite", foto: null, tipo: "colectivo", detalle: null, visible: true, privado: false, origen: "capo", proximas: 0, lleva: null, lleva_n: 0, total: 1 })).toBe("Colectivo · sin fecha próxima · del catálogo, por reclamar");
    expect(detalleLugar({ id: "l", nombre: "Pozos", foto: null, tipo: "galeria", detalle: null, visible: true, privado: false, origen: null, proximas: 1, lleva: "Andrea Méndez", lleva_n: 1, total: 1 })).toBe("Galería · 1 fecha próxima · la lleva Andrea Méndez");
    expect(detalleEvento({ id: "e", titulo: "Jam", imagen: null, inicio: "2026-09-18T01:00:00Z", fin: null, visible: true, sitio: "Foro Sur", autor: "Jorge Salas", autor_admin: false, van: 3, total: 1 }, AHORA)).toBe("Mañana · 19:00 · Foro Sur · publicó Jorge Salas · 3 van");
    expect(detalleEvento({ id: "e", titulo: "Son", imagen: null, inicio: "2026-09-18T01:00:00Z", fin: null, visible: true, sitio: null, autor: null, autor_admin: false, van: 1, total: 1 }, AHORA)).toBe("Mañana · 19:00 · publicó una cuenta borrada · 1 va");
    // Con la zona del evento, su hora: el mismo instante es las 3:00 en Madrid.
    expect(detalleEvento({ id: "e", titulo: "Jazz", imagen: null, inicio: "2026-09-18T01:00:00Z", fin: null, visible: true, sitio: "Sala", autor: null, autor_admin: true, van: 0, total: 1, zona: "Europe/Madrid" }, AHORA)).toBe("Mañana · 03:00 · Sala");
    expect(detalleArtista({ id: "a", nombre: "Barro", foto: null, disciplina: "musica", detalle: "son huasteco", visible: true, origen: "capo", proximas: 0, lleva: null, lleva_n: 0, total: 1 })).toBe("Música · son huasteco · sin fecha próxima · del catálogo, por reclamar");
  });
  it("el menú usa las palabras de cada ficha", () => {
    expect(textoOcultar("lugares", true)).toBe("Ocultar del mapa");
    expect(textoOcultar("eventos", true)).toBe("Ocultar de la agenda");
    expect(textoOcultar("artistas", true)).toBe("Ocultar de Artistas");
    expect(textoOcultar("artistas", false)).toBe("Volver a mostrar");
  });
});

describe("embudoComunidad", () => {
  it("calcula el porcentaje de cada paso sobre su propia base", () => {
    const e = embudoComunidad({ registradas: 9, hicieron_algo: 6, vuelven_base: 4, vuelven: 3 });
    expect(e).toEqual({ registradas: 9, hicieronAlgo: { valor: 6, porcentaje: 67 }, vuelven: { valor: 3, porcentaje: 75 } });
  });
  it("sin cuentas con 7 días de vida (vuelven_base en 0), el porcentaje de 'vuelven' es null, no 0%", () => {
    const e = embudoComunidad({ registradas: 4, hicieron_algo: 3, vuelven_base: 0, vuelven: 0 });
    expect(e.vuelven).toEqual({ valor: 0, porcentaje: null });
  });
  it("sin cuentas nuevas, no divide entre cero", () => {
    const e = embudoComunidad({ registradas: 0, hicieron_algo: 0, vuelven_base: 0, vuelven: 0 });
    expect(e).toEqual({ registradas: 0, hicieronAlgo: { valor: 0, porcentaje: 0 }, vuelven: { valor: 0, porcentaje: null } });
  });
});
