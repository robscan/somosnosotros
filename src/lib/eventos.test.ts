import { describe, expect, it } from "vitest";
import { COOPERACION_SOLIDARIA, cartelAFormulario, esCooperacion, direccionPublicaSitio, enlaceComoLlegar, enlaceDesdeCartel, extraerNumero, hrefEvento, jsonLdEvento, nombreSitio, puntoComoLlegar, queCambio, textoCompartir, validarEvento } from "./eventos";

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
  it("vacio es NULL, legacy intacto no exige pin, pendiente editado si bloquea", () => {
    expect(validarEvento({...publico, sitio_direccion: "  ", sitio_lat: "", sitio_lng: ""}).datos.sitio_direccion).toBeNull();
    expect(validarEvento({...publico, sitio_direccion: "", sitio_lat: "", sitio_lng: ""}).errores).toEqual({});
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
