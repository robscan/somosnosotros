import { describe, expect, it } from "vitest";
import { COOPERACION_SOLIDARIA, cartelAFormulario, ciudadDelSitio, claseDeCosto, compartirEvento, esCooperacion, direccionPublicaSitio, enlaceComoLlegar, enlaceDesdeCartel, extraerNumero, hrefEvento, jsonLdEvento, nombreSitio, puntoComoLlegar, sitioEnLista, queCambio, textoCompartir, validarEvento } from "./eventos";

const LUGAR = "2a63c4d0-6a3e-4d75-bc67-8c3226d4401b";
const base = { modo_sitio: "lugar", lugar_id: LUGAR, titulo: "Noche de jazz", inicio: "2026-09-20T19:00", fin: "", descripcion: "", imagen: "", gratis: "si", precio: "", enlace: "" };

describe("validarEvento", () => {
  it("acepta un evento mínimo en un lugar registrado; gratis por defecto", () => {
    const { datos, errores } = validarEvento(base);
    expect(errores).toEqual({});
    expect(datos.inicio).toBe("2026-09-21T01:00:00.000Z");
    expect(datos.precio).toBeNull();
    expect(datos.lugar_id).toBe(LUGAR);
    expect(datos.sitio_reservado).toBe(false);
    expect(datos.privado).toBeNull();
  });
  it("lee las horas en la zona del sitio y la guarda con el evento", () => {
    expect(validarEvento(base).datos.zona).toBe("America/Mexico_City");
    const { datos, errores } = validarEvento({ ...base, fin: "2026-09-20T21:00" }, "Europe/Madrid");
    expect(errores).toEqual({});
    expect(datos.zona).toBe("Europe/Madrid");
    expect(datos.inicio).toBe("2026-09-20T17:00:00.000Z");
    expect(datos.fin).toBe("2026-09-20T19:00:00.000Z");
    // Un sitio reservado se revela contando desde la hora de allá.
    const reservado = validarEvento({ ...base, modo_sitio: "reservado", sitio_texto: "Casa", direccion_privada: "Calle 1", revelar_horas: "3" }, "Europe/Madrid");
    expect(reservado.datos.sitio_revelar_desde).toBe("2026-09-20T14:00:00.000Z");
    // Una zona que no es se lee como la de la ciudad inicial.
    expect(validarEvento(base, "Marte/Olimpo").datos).toMatchObject({ zona: "America/Mexico_City", inicio: "2026-09-21T01:00:00.000Z" });
  });
  it("sin fecha no se publica; el fin va después del inicio", () => {
    expect(validarEvento({ ...base, inicio: "" }).errores.inicio).toBeTruthy();
    expect(validarEvento({ ...base, fin: "2026-09-20T18:00" }).errores.fin).toBeTruthy();
    expect(validarEvento({ ...base, fin: "2026-09-20T21:00" }).errores).toEqual({});
  });
  it("con precio hay que decir cuánto; el enlace se completa con https", () => {
    expect(validarEvento({ ...base, gratis: "no", precio: "" }).errores.precio).toBeTruthy();
    const { datos, errores } = validarEvento({ ...base, gratis: "no", precio: "$150", enlace: "boletos.mx/jazz" });
    expect(datos.precio).toBe("$150");
    expect(datos.enlace).toBe("https://boletos.mx/jazz");
    expect(errores.enlace).toBeUndefined();
  });
  describe("S-04 (docs/rediseno/46): el enlace de boletos tiene que ser una URL bien formada", () => {
    it("con espacios, se rechaza", () => {
      const { errores } = validarEvento({ ...base, enlace: "boletos mx/jazz" });
      expect(errores.enlace).toBe("Ese enlace no se ve bien. Revisa que empiece con https://");
    });
    it("http:// (no https) se rechaza: se exige el protocolo https", () => {
      const { errores } = validarEvento({ ...base, enlace: "http://boletos.mx/jazz" });
      expect(errores.enlace).toBe("Ese enlace no se ve bien. Revisa que empiece con https://");
    });
    it("un hostname sin punto se rechaza", () => {
      const { errores } = validarEvento({ ...base, enlace: "https://localhost/jazz" });
      expect(errores.enlace).toBe("Ese enlace no se ve bien. Revisa que empiece con https://");
    });
    it("javascript: no forma una URL válida aunque el https:// se anteponga; queda rechazado, no solo inerte", () => {
      const { errores } = validarEvento({ ...base, enlace: "javascript:alert(1)" });
      expect(errores.enlace).toBeTruthy();
    });
    it("un enlace bien formado no da error", () => {
      expect(validarEvento({ ...base, enlace: "https://boletos.mx/jazz" }).errores.enlace).toBeUndefined();
    });
  });
  describe("S-01 (docs/rediseno/46): la imagen solo acepta cualquier dominio cuando esAdmin viene de la sesión", () => {
    it("sin esAdmin (por defecto), una imagen de otro dominio se rechaza", () => {
      const { errores } = validarEvento({ ...base, imagen: "https://evil.example/x.png" });
      expect(errores.imagen).toBe("La imagen no se subió bien. Intenta de nuevo.");
    });
    it("con esAdmin: true, la misma imagen de otro dominio se acepta", () => {
      const { errores } = validarEvento({ ...base, imagen: "https://evil.example/x.png" }, undefined, { esAdmin: true });
      expect(errores.imagen).toBeUndefined();
    });
    it("igual a imagenActual, se acepta aunque no sea admin", () => {
      const imagen = "https://catalogo-externo.example/foto.jpg";
      const { errores } = validarEvento({ ...base, imagen }, undefined, { esAdmin: false, imagenActual: imagen });
      expect(errores.imagen).toBeUndefined();
    });
  });
  it("cooperación solidaria: sin cifra, se guarda como texto en precio y no pide precio", () => {
    const { datos, errores } = validarEvento({ ...base, gratis: "no", cooperacion: "si", precio: "" });
    expect(errores.precio).toBeUndefined();
    expect(datos.precio).toBe(COOPERACION_SOLIDARIA);
    expect(esCooperacion(datos.precio)).toBe(true);
    // Gratis sigue siendo null y un precio numérico no se confunde con ella.
    expect(validarEvento(base).datos.precio).toBeNull();
    expect(esCooperacion(validarEvento({ ...base, gratis: "no", precio: "150" }).datos.precio)).toBe(false);
    // Aunque el formulario mande gratis="si", la cooperación manda.
    expect(validarEvento({ ...base, gratis: "si", cooperacion: "si" }).datos.precio).toBe(COOPERACION_SOLIDARIA);
  });
  it("otro sitio: texto obligatorio, pin opcional, sin lugar", () => {
    expect(validarEvento({ ...base, modo_sitio: "otro", sitio_texto: "" }).errores.sitio_texto).toBeTruthy();
    const { datos, errores } = validarEvento({ ...base, modo_sitio: "otro", sitio_texto: "Plaza de Armas", sitio_lat: "22.15", sitio_lng: "-100.97" });
    expect(errores).toEqual({});
    expect(datos.lugar_id).toBeNull();
    expect(datos.sitio_texto).toBe("Plaza de Armas");
    expect(datos.sitio_lat).toBeCloseTo(22.15);
  });
  it("sitio reservado: texto público, dirección privada y hora de revelar", () => {
    expect(validarEvento({ ...base, modo_sitio: "reservado", sitio_texto: "Casa en Tequis" }).errores.direccion_privada).toBeTruthy();
    const { datos, errores } = validarEvento({ ...base, modo_sitio: "reservado", sitio_texto: "Casa en Tequis", direccion_privada: "Calle X 12", indicaciones: "Tocar el timbre azul", revelar_horas: "24" });
    expect(errores).toEqual({});
    expect(datos.sitio_reservado).toBe(true);
    expect(datos.sitio_texto).toBe("Casa en Tequis");
    expect(datos.sitio_revelar_desde).toBe("2026-09-20T01:00:00.000Z"); // 24 h antes de las 19:00 del 20
    expect(datos.privado).toEqual({ direccion: "Calle X 12", lat: null, lng: null, indicaciones: "Tocar el timbre azul", revelar_desde: "2026-09-20T01:00:00.000Z" });
  });
  it("lugar registrado inválido", () => {
    expect(validarEvento({ ...base, lugar_id: "x" }).errores.lugar_id).toBeTruthy();
  });
});

describe("ciudadDelSitio (OL-299)", () => {
  const publico = { ciudad: null, sitio_lat: 22.15, sitio_lng: -100.98, privado: null };
  const reservado = { ciudad: null, sitio_lat: null, sitio_lng: null, privado: { direccion: "x", lat: 20.6, lng: -100.4, indicaciones: null, revelar_desde: "" } };
  it("la del pin que mandó el formulario manda", () => {
    expect(ciudadDelSitio({ ...publico, ciudad: "Querétaro" })).toBe("Querétaro");
    expect(ciudadDelSitio({ ...reservado, ciudad: "Querétaro" }, { ciudad: "San Luis Potosí", sitio_lat: null, sitio_lng: null })).toBe("Querétaro");
  });
  it("un pin nuevo sin ciudad no se publica: null", () => {
    expect(ciudadDelSitio(publico)).toBeNull();
    expect(ciudadDelSitio(reservado)).toBeNull();
    expect(ciudadDelSitio(publico, { ciudad: "Querétaro", sitio_lat: 20.6, sitio_lng: -100.4 })).toBeNull();
  });
  it("al editar con el mismo pin y sin ciudad en el formulario, conserva la del evento", () => {
    expect(ciudadDelSitio(publico, { ciudad: "Querétaro", sitio_lat: 22.15, sitio_lng: -100.98 })).toBe("Querétaro");
  });
  it("un sitio sin punto (escrito sin coordenadas) no tiene de dónde deducirla: sigue en la inicial, como siempre", () => {
    expect(ciudadDelSitio({ ciudad: null, sitio_lat: null, sitio_lng: null, privado: null })).toBe("San Luis Potosí");
    expect(ciudadDelSitio({ ciudad: null, sitio_lat: null, sitio_lng: null, privado: { direccion: "x", lat: null, lng: null, indicaciones: null, revelar_desde: "" } })).toBe("San Luis Potosí");
  });
});

describe("claseDeCosto", () => {
  it("sin precio o con «Gratis» escrito a mano es gratis", () => {
    for (const precio of [null, undefined, "", "  ", "Gratis", "gratis ", "Entrada libre", "Sin costo"]) expect(claseDeCosto(precio)).toBe("gratis");
  });
  it("lo que empieza por «Cooperación» es cooperación", () => {
    for (const precio of [COOPERACION_SOLIDARIA, "Cooperación voluntaria", "cooperacion"]) expect(claseDeCosto(precio)).toBe("cooperacion");
  });
  it("cualquier otro texto es con costo, con cifra o sin ella", () => {
    for (const precio of ["$150", "$120 a $250", "taquilla", "Con costo", "$100 estudiantes", "Gratis con boleto de entrada al museo", "Costo por confirmar"]) expect(claseDeCosto(precio)).toBe("costo");
  });
});

describe("nombreSitio", () => {
  it("compone solo al mostrar y nunca muestra direccion estructurada reservada", () => {
    const e = { lugar: null, sitio_texto: "Foro · Patio", sitio_direccion: "Calle 2", sitio_reservado: false };
    expect(nombreSitio(e)).toBe("Foro · Patio · Calle 2");
    expect(nombreSitio({ ...e, sitio_reservado: true })).toBe("Foro · Patio · sitio reservado");
    expect(nombreSitio({ ...e, sitio_direccion: null })).toBe("Foro · Patio");
  });
  it("prefiere el lugar; marca el sitio reservado", () => {
    expect(nombreSitio({ lugar: { nombre: "Teatro", portada: null }, sitio_texto: null, sitio_reservado: false })).toBe("Teatro");
    expect(nombreSitio({ lugar: null, sitio_texto: "Casa en Tequis", sitio_reservado: true })).toBe("Casa en Tequis · sitio reservado");
    expect(nombreSitio({ lugar: null, sitio_texto: null, sitio_reservado: false })).toBe("Sitio por confirmar");
  });
});

describe("sitioEnLista (H-09: la lista no lleva la dirección postal)", () => {
  const otroSitio = { lugar: null, sitio_texto: "Templo de San Francisco", sitio_direccion: "Calle Jardín Guerrero 7, 78000 San Luis Potosí, México", sitio_reservado: false };
  it("dice solo el nombre del sitio cuando el evento es en otro sitio, aunque traiga dirección", () => {
    expect(sitioEnLista(otroSitio)).toBe("Templo de San Francisco");
    expect(nombreSitio(otroSitio)).toContain("Calle Jardín Guerrero 7");
  });
  it("un lugar registrado, un sitio reservado y un sitio por confirmar dicen lo mismo que en la ficha", () => {
    expect(sitioEnLista({ ...otroSitio, lugar: { nombre: "Teatro de la Paz", portada: null } })).toBe("Teatro de la Paz");
    expect(sitioEnLista({ ...otroSitio, sitio_reservado: true })).toBe("Templo de San Francisco · sitio reservado");
    expect(sitioEnLista({ lugar: null, sitio_texto: null, sitio_direccion: null, sitio_reservado: false })).toBe("Sitio por confirmar");
  });
  it("sin nombre pero con dirección, la dirección es lo único que dice dónde es", () => {
    expect(sitioEnLista({ ...otroSitio, sitio_texto: null })).toBe("Calle Jardín Guerrero 7, 78000 San Luis Potosí, México");
  });
});

describe("direccion estructurada", () => {
  it("JSON-LD recibe direccion estructurada publica, nunca alias legacy ni reserva", () => {
    const e = {sitio_direccion: "Calle nueva", sitio_reservado: false, ciudad: "Ciudad"};
    expect(direccionPublicaSitio(e)).toEqual({direccion: "Calle nueva", ciudad: "Ciudad"});
    expect(direccionPublicaSitio({...e,sitio_reservado:true})).toBeNull();
    expect(direccionPublicaSitio({...e,sitio_direccion:null})).toBeNull();
  });
  const publico = { ...base, modo_sitio: "otro", sitio_texto: "Foro · Patio", sitio_direccion: "Calle 1", sitio_lat: "22", sitio_lng: "-100" };
  it("persiste alias y direccion por separado sin interpretar el texto humano", () => {
    const {datos, errores} = validarEvento(publico);
    expect(errores).toEqual({});
    expect(datos).toMatchObject({sitio_texto: "Foro · Patio", sitio_direccion: "Calle 1"});
    const cambiado = validarEvento({...publico, sitio_direccion: "Calle 2"}).datos;
    expect(cambiado.sitio_texto).toBe(datos.sitio_texto);
    expect(queCambio(datos, cambiado)).toBe("donde");
  });
  it("vacio es NULL, todo sitio pide su pin (OL-348), pendiente editado si bloquea", () => {
    expect(validarEvento({...publico, sitio_direccion: "  ", sitio_lat: "", sitio_lng: ""}).datos.sitio_direccion).toBeNull();
    expect(validarEvento({...publico, sitio_direccion: ""}).errores).toEqual({});
    // Un sitio con solo su nombre (como los de antes) ya no se guarda: falta la ubicación.
    expect(validarEvento({...publico, sitio_direccion: "", sitio_lat: "", sitio_lng: ""}).errores.sitio_direccion).toBe("Confirma la ubicación eligiendo una dirección o poniendo el pin.");
    // El marco de un festival no es un sitio (sus sedes salen de sus actos): sin punto se guarda; con medio punto, no.
    expect(validarEvento({...publico, sitio_direccion: "", sitio_lat: "", sitio_lng: ""}, undefined, { marco: true }).errores).toEqual({});
    expect(validarEvento({...publico, sitio_direccion: "", sitio_lat: "22", sitio_lng: ""}, undefined, { marco: true }).errores.sitio_direccion).toBeTruthy();
    // Un sitio reservado no pide punto público: el suyo es privado.
    expect(validarEvento({...publico, modo_sitio: "reservado", sitio_direccion: "", sitio_lat: "", sitio_lng: "", direccion_privada: "Calle 1", privado_lat: "22", privado_lng: "-100"}).errores).toEqual({});
    expect(validarEvento({...publico, sitio_pin_pendiente: "si"}).errores.sitio_direccion).toBeTruthy();
    expect(validarEvento({...publico, sitio_direccion: "x".repeat(201)}).errores.sitio_direccion).toBeTruthy();
  });
  it.each([
    {sitio_lat:"",sitio_lng:""}, {sitio_lat:"22",sitio_lng:""},
    {sitio_lat:"91",sitio_lng:"-100"}, {sitio_lat:"NaN",sitio_lng:"-100"},
  ])("direccion publica estructurada requiere par valido: %j", punto => {
    expect(validarEvento({...publico,...punto,sitio_pin_pendiente:"no"}).errores.sitio_direccion).toBeTruthy();
  });
  it("DTO rechaza punto privado parcial aun sin flag de pendiente", () => {
    expect(validarEvento({...publico,modo_sitio:"reservado",direccion_privada:"Calle privada",privado_lat:"22",privado_lng:""}).errores.direccion_privada).toBeTruthy();
  });
  it("no entrega direccion/punto publicos al reservar o seleccionar lugar", () => {
    const {datos,errores} = validarEvento({...publico, modo_sitio: "reservado", direccion_privada: "Secreta 3"});
    expect(errores).toEqual({});
    expect(datos).toMatchObject({sitio_direccion: null, sitio_lat: null, sitio_lng: null});
    expect(datos.privado?.direccion).toBe("Secreta 3");
    expect(validarEvento({...publico, modo_sitio: "lugar"}).datos.sitio_direccion).toBeNull();
  });
});

describe("Cómo llegar", () => {
  const publico = { lugar: null, sitioReservado: false, sitioLat: 22.16, sitioLng: -100.97, privado: null };
  it("usa el pin público confirmado, incluido el que se eligió manualmente", () => {
    expect(enlaceComoLlegar(publico)).toBe("https://www.google.com/maps/dir/?api=1&destination=22.16,-100.97");
  });
  it("no expone una ruta reservada hasta que la ficha recibe el punto privado autorizado", () => {
    expect(enlaceComoLlegar({ ...publico, sitioReservado: true, privado: null })).toBeNull();
    expect(enlaceComoLlegar({ ...publico, sitioReservado: true, lugar: { lat: 22.18, lng: -100.95 }, privado: null })).toBeNull();
    expect(enlaceComoLlegar({ ...publico, sitioReservado: true, privado: { lat: 22.17, lng: -100.96 } })).toBe("https://www.google.com/maps/dir/?api=1&destination=22.17,-100.96");
  });
  it("prefiere el punto del lugar y no fabrica una ruta sin coordenadas", () => {
    expect(enlaceComoLlegar({ ...publico, lugar: { lat: 22.18, lng: -100.95 } })).toBe("https://www.google.com/maps/dir/?api=1&destination=22.18,-100.95");
    expect(enlaceComoLlegar({ ...publico, sitioLat: null, sitioLng: null })).toBeNull();
  });
  it("el mapa de la ficha usa el mismo punto: un sitio reservado sin revelar no entrega coordenadas", () => {
    expect(puntoComoLlegar({ ...publico, sitioReservado: true, privado: null })).toBeNull();
    expect(puntoComoLlegar({ ...publico, sitioReservado: true, lugar: { lat: 22.18, lng: -100.95 }, privado: null })).toBeNull();
    expect(puntoComoLlegar({ ...publico, sitioReservado: true, privado: { lat: 22.17, lng: -100.96 } })).toEqual({ lat: 22.17, lng: -100.96 });
  });
});

describe("cartelAFormulario", () => {
  it("convierte la lectura en valores del formulario y tolera huecos", () => {
    const v = cartelAFormulario({ titulo: " Noche de jazz ", fecha: "2026-09-20", hora: "20:30", hora_fin: "22:00", lugar: "Casa 1100", direccion: null, gratis: false, precio: "$150", descripcion: "Trío local.", enlace: null, artistas: [" Trío Local ", ""] });
    expect(v.inicio).toBe("2026-09-20T20:30");
    expect(v.fin).toBe("2026-09-20T22:00");
    expect(v.gratis).toBe(false);
    expect(v.titulo).toBe("Noche de jazz");
    expect(v.artistas).toEqual(["Trío Local"]);
    const sinHora = cartelAFormulario({ titulo: null, fecha: "2026-09-20", hora: null, hora_fin: null, lugar: null, direccion: null, gratis: null, precio: null, descripcion: null, enlace: null, artistas: null });
    expect(sinHora.inicio).toBe("2026-09-20T19:00");
    expect(sinHora.gratis).toBe(true);
    expect(cartelAFormulario({ titulo: "x", fecha: "20 sep", hora: "8pm", hora_fin: null, lugar: null, direccion: null, gratis: null, precio: null, descripcion: null, enlace: null, artistas: null }).inicio).toBe("");
  });
});

describe("enlaceDesdeCartel", () => {
  it("convierte @usuario en Instagram, deja enlaces y descarta teléfonos", () => {
    expect(enlaceDesdeCartel("@casa1100slp")).toBe("https://instagram.com/casa1100slp");
    expect(enlaceDesdeCartel("boletos.mx/jazz")).toBe("boletos.mx/jazz");
    expect(enlaceDesdeCartel("https://x.org")).toBe("https://x.org");
    expect(enlaceDesdeCartel("444 123 4567")).toBe("");
    expect(enlaceDesdeCartel(null)).toBe("");
  });
});

describe("textoCompartir", () => {
  it("arma título, cuándo, dónde y enlace", () => {
    expect(textoCompartir("Noche de jazz", "Hoy · 19:00", "Teatro de la Paz", "https://somosnosotros.org/eventos/1")).toBe(
      "Noche de jazz\nHoy · 19:00 · Teatro de la Paz\nhttps://somosnosotros.org/eventos/1",
    );
  });
});

describe("compartirEvento", () => {
  const e = { id: "00000000-0000-4000-8000-0000000000e1", slug: "noche-de-jazz-ab12", titulo: "Noche de jazz", inicio: "2035-12-01T01:00:00Z", fin: null, zona: "America/Mexico_City" };
  it("la dirección pública con el dominio de siempre, y el texto sin el enlace al final (va aparte)", () => {
    const { url, texto } = compartirEvento(e, "Teatro de la Paz");
    expect(url).toBe("https://somosnosotros.org/eventos/noche-de-jazz-ab12");
    expect(texto.split("\n")).toHaveLength(2);
    expect(texto).toMatch(/^Noche de jazz\n.+ · Teatro de la Paz$/);
    expect(texto).not.toContain(url);
  });
  it("un evento de varios días comparte sus días y su horario de cada día, en 24 h y con la cadena limpia (sin espacios no separables ni unidores)", () => {
    // Del 10 al 12 de oct, de 20:00 a 21:00 en la ciudad (UTC-6).
    const { texto } = compartirEvento({ ...e, inicio: "2035-10-11T02:00:00Z", fin: "2035-10-13T03:00:00Z" }, "Teatro de la Paz");
    expect(texto).toBe("Noche de jazz\nDel 10 al 12 de oct de 2035 · 20:00–21:00 · Teatro de la Paz");
    expect(texto).not.toMatch(/[\u00a0\u202f\u2060]/);
  });
  it("con horario por día (OL-311) comparte los días y «horarios por día», no un horario que no es de todos", () => {
    const varios = { ...e, inicio: "2035-10-11T02:00:00Z", fin: "2035-10-13T03:00:00Z" };
    expect(compartirEvento(varios, "Teatro de la Paz", true).texto).toBe("Noche de jazz\nDel 10 al 12 de oct de 2035 · horarios por día · Teatro de la Paz");
    // Sin la bandera, o sin fin, se lee como siempre.
    expect(compartirEvento(varios, "Teatro de la Paz", false).texto).toContain("20:00–21:00");
    expect(compartirEvento(e, "Teatro de la Paz", true).texto).not.toContain("horarios por día");
  });
  it("sin slug todavía, la dirección cae al UUID; sin sitio, el cuándo va solo", () => {
    const { url, texto } = compartirEvento({ ...e, slug: null }, null);
    expect(url).toBe(`https://somosnosotros.org/eventos/${e.id}`);
    expect(texto).not.toContain(" · Teatro");
  });
});

describe("queCambio", () => {
  const base = { inicio: "2026-09-20T19:00:00.000Z", fin: null, lugar_id: "l1", sitio_texto: null };
  it("nada si solo cambian título o descripción (los mismos datos con otra escritura de la hora)", () => {
    expect(queCambio(base, { ...base, inicio: "2026-09-20T19:00:00+00:00" })).toBeNull();
  });
  it("cuándo, dónde o ambos", () => {
    expect(queCambio(base, { ...base, inicio: "2026-09-21T19:00:00.000Z" })).toBe("cuando");
    expect(queCambio(base, { ...base, fin: "2026-09-20T21:00:00.000Z" })).toBe("cuando");
    expect(queCambio(base, { ...base, lugar_id: "l2" })).toBe("donde");
    expect(queCambio(base, { ...base, lugar_id: null, sitio_texto: "Plaza de Armas" })).toBe("donde");
    expect(queCambio(base, { ...base, inicio: "2026-09-21T19:00:00.000Z", lugar_id: "l2" })).toBe("ambos");
  });
});

describe("jsonLdEvento", () => {
  const base = { id: "e1", titulo: "Noche de jazz", descripcion: null, inicio: "2026-09-20T19:00:00.000Z", fin: null, imagen: null, gratis: true, sitioNombre: "Teatro de la Paz", direccionPublica: "Av. Venustiano Carranza 1815", ciudadPublica: "San Luis Potosí", sitioLat: null, sitioLng: null };
  it("la URL con slug coincide con la dirección canónica de la ficha; sin slug conserva el respaldo UUID", () => {
    const evento = { ...base, slug: "noche-de-jazz" };
    expect(jsonLdEvento(evento).url).toBe(`https://somosnosotros.org${hrefEvento(evento)}`);
    expect(jsonLdEvento(base).url).toBe(`https://somosnosotros.org${hrefEvento(base)}`);
  });
  it("trae lo mínimo: tipo, nombre, dirección con ciudad, fecha y sitio", () => {
    const d = jsonLdEvento(base);
    expect(d).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Event",
      name: "Noche de jazz",
      startDate: base.inicio,
      location: { "@type": "Place", name: "Teatro de la Paz", address: { "@type": "PostalAddress", streetAddress: "Av. Venustiano Carranza 1815", addressLocality: "San Luis Potosí" } },
      isAccessibleForFree: true,
      url: "https://somosnosotros.org/eventos/e1",
    });
  });
  it("con coordenada pública, suma el geo; sin ella, no", () => {
    expect(jsonLdEvento(base).location).not.toHaveProperty("geo");
    const conPin = jsonLdEvento({ ...base, sitioLat: 22.15, sitioLng: -100.98 });
    expect(conPin.location).toMatchObject({ geo: { "@type": "GeoCoordinates", latitude: 22.15, longitude: -100.98 } });
  });
  it("no inventa precio: sin gratis, no hay isAccessibleForFree ni offers", () => {
    const d = jsonLdEvento({ ...base, gratis: false });
    expect(d).not.toHaveProperty("isAccessibleForFree");
    expect(d).not.toHaveProperty("offers");
  });
  it("descripción e imagen solo si vienen", () => {
    expect(jsonLdEvento(base)).not.toHaveProperty("description");
    expect(jsonLdEvento(base)).not.toHaveProperty("image");
    const lleno = jsonLdEvento({ ...base, descripcion: "Con la Camerata", imagen: "https://x/y.jpg", fin: "2026-09-20T22:00:00.000Z" });
    expect(lleno).toMatchObject({ description: "Con la Camerata", image: ["https://x/y.jpg"], endDate: "2026-09-20T22:00:00.000Z" });
  });
  it("la ciudad de la dirección es la del sitio, no siempre San Luis Potosí ('otro sitio' de otro país)", () => {
    const otraCiudad = jsonLdEvento({ ...base, sitioNombre: "Plaza Mayor", direccionPublica: "Plaza Mayor", ciudadPublica: "Córdoba, España" });
    expect(otraCiudad.location).toMatchObject({ address: { streetAddress: "Plaza Mayor", addressLocality: "Córdoba, España" } });
  });
});

describe("extraerNumero", () => {
  it("extrae números simples con y sin signo de peso", () => {
    expect(extraerNumero("150")).toBe("150");
    expect(extraerNumero("$150")).toBe("150");
    expect(extraerNumero("$100")).toBe("100");
  });

  it("elimina separadores de miles (coma, punto, espacio) y devuelve el número joined", () => {
    expect(extraerNumero("$1,500")).toBe("1500");
    expect(extraerNumero("1,500")).toBe("1500");
    expect(extraerNumero("$1.500")).toBe("1500");
    expect(extraerNumero("$ 1 500")).toBe("1500");
  });

  it("descarta decimales (grupos de 1-2 dígitos después del separador final)", () => {
    expect(extraerNumero("$1,500.50")).toBe("1500");
    expect(extraerNumero("150.00")).toBe("150");
    expect(extraerNumero("1.500,99")).toBe("1500");
  });

  it("extrae número de texto con palabras", () => {
    expect(extraerNumero("$100 estudiantes")).toBe("100");
    expect(extraerNumero("Entrada: $250")).toBe("250");
  });

  it("devuelve vacío si no hay número", () => {
    expect(extraerNumero("")).toBe("");
    expect(extraerNumero("abc")).toBe("");
    expect(extraerNumero("www.ticketmaster.com.mx")).toBe("");
  });

  it("limita a 6 dígitos máximo (después de eliminar separadores)", () => {
    expect(extraerNumero("999999")).toBe("999999");
    expect(extraerNumero("1000000")).toBe("");
    expect(extraerNumero("$1,000,000")).toBe("");
  });

  it("reconoce formato con decimales y coma como separador de miles", () => {
    expect(extraerNumero("1,234.56")).toBe("1234");
  });

  it("maneja múltiples instancias de números y devuelve el primero", () => {
    expect(extraerNumero("2x1 $150")).toBe("2");
  });
});

describe("hrefEvento", () => {
  it("usa el slug cuando lo trae; el UUID solo como respaldo (OL-119, mismo criterio que artistas y lugares)", () => {
    expect(hrefEvento({ id: "e1", slug: "concierto-de-otono-2026-10-03" })).toBe("/eventos/concierto-de-otono-2026-10-03");
    expect(hrefEvento({ id: "e1", slug: null })).toBe("/eventos/e1");
    expect(hrefEvento({ id: "e1" })).toBe("/eventos/e1");
    expect(hrefEvento({ id: "e1", slug: "" })).toBe("/eventos/e1");
  });
});
