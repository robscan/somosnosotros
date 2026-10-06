import { describe, expect, it } from "vitest";
import { altoTeclado, combinarResultados, modoDePantalla, type LugarSugerido } from "@/lib/buscarLugares";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import type { LugarResumen } from "@/lib/lugares";
import { coincidenciaClara, contextoDondeEsta, decidirGuardado, direccionAGuardar, lugarCercano, necesitaConfirmarDireccion, puedeGuardarLugar, puedeListo, resultadosDondeEsta, textoInicialBusqueda, textoListo } from "./hojaDonde";

function lugar(id: string, nombre: string, lat = 22.15, lng = -100.97): LugarResumen {
  return { id, nombre, tipo: "museo", direccion: "Calle 1", lat, lng, portada: null };
}
function sugerido(id: string, nombre: string): LugarSugerido {
  return { mapboxId: id, nombre, direccion: "Otra calle", categorias: [], esDireccion: false, ciudad: "San Luis Potosí", distanciaM: 100 };
}

describe("combinarResultados", () => {
  it("los lugares registrados van primero, en su propio orden", () => {
    const lugares = [lugar("a", "Museo A"), lugar("b", "Museo B")];
    const mapbox = [sugerido("x", "Plaza X")];
    const r = combinarResultados(lugares, mapbox);
    expect(r.map((x) => x.tipo)).toEqual(["lugar", "lugar", "mapbox"]);
    expect(r[0]).toMatchObject({ tipo: "lugar", lugar: { id: "a" } });
    expect(r[2]).toMatchObject({ tipo: "mapbox", item: { mapboxId: "x" } });
  });
  it("sin lugares registrados, solo lo de Mapbox", () => {
    const r = combinarResultados([], [sugerido("x", "Plaza X")]);
    expect(r).toEqual([{ tipo: "mapbox", item: sugerido("x", "Plaza X") }]);
  });
  it("sin nada de ningún lado, lista vacía", () => {
    expect(combinarResultados([], [])).toEqual([]);
  });
});

describe("modoDePantalla", () => {
  it("sin texto y sin panel: inicial", () => {
    expect(modoDePantalla("", false, false)).toBe("inicial");
    expect(modoDePantalla("   ", false, true)).toBe("inicial");
  });
  it("con texto y resultados: resultados", () => {
    expect(modoDePantalla("casa", false, true)).toBe("resultados");
  });
  it("con texto y sin resultados: no-encontrado", () => {
    expect(modoDePantalla("casa", false, false)).toBe("no-encontrado");
  });
  it("con el panel abierto, gana siempre a lo demás", () => {
    expect(modoDePantalla("casa", true, true)).toBe("agregar");
    expect(modoDePantalla("", true, false)).toBe("agregar");
  });
});

describe("decidirGuardado", () => {
  it("sin privado: registra, con el texto recortado", () => {
    expect(decidirGuardado(false, "  Casa de Cultura  ", " Calle 1 ")).toEqual({ modo: "registrar", nombre: "Casa de Cultura", direccion: "Calle 1" });
  });
  it("con privado: solo queda en el evento", () => {
    expect(decidirGuardado(true, "Cochera de Lupe", "")).toEqual({ modo: "privado", nombre: "Cochera de Lupe", direccion: "" });
  });
});

describe("altoTeclado", () => {
  it("sin visualViewport, 0 (la barra se queda al pie)", () => {
    expect(altoTeclado(844, null)).toBe(0);
  });
  it("visualViewport igual a la ventana: sin teclado, 0", () => {
    expect(altoTeclado(844, { height: 844, offsetTop: 0 })).toBe(0);
  });
  it("con el teclado abierto: la diferencia, redondeada", () => {
    expect(altoTeclado(844, { height: 544.4, offsetTop: 0 })).toBe(300);
  });
  it("con offsetTop (la página se movió) también cuenta", () => {
    expect(altoTeclado(844, { height: 544, offsetTop: 10 })).toBe(290);
  });
  it("una diferencia de un pixel (redondeo) no cuenta como teclado", () => {
    expect(altoTeclado(844, { height: 843.5, offsetTop: 0 })).toBe(0);
  });
});

describe("puedeGuardarLugar (OL-182, bitácora 217: nunca guardar un punto inventado)", () => {
  it("con nombre y punto: sí", () => {
    expect(puedeGuardarLugar({ nombre: "Cochera de Lupe", punto: { lat: 22.15, lng: -100.97 } })).toBe(true);
  });
  it("sin punto (el defecto reportado: guardaba un punto que nadie eligió): no, aunque haya nombre", () => {
    expect(puedeGuardarLugar({ nombre: "Cochera de Lupe", punto: null })).toBe(false);
  });
  it("sin nombre (solo espacios): no, aunque haya punto", () => {
    expect(puedeGuardarLugar({ nombre: "   ", punto: { lat: 22.15, lng: -100.97 } })).toBe(false);
  });
  it("sin nombre y sin punto: no", () => {
    expect(puedeGuardarLugar({ nombre: "", punto: null })).toBe(false);
  });
});

describe("direccionAGuardar (OL-182, corrección del gestor: lo escrito a mano no se pierde al guardar)", () => {
  it("con texto escrito a mano (corrigiendo lo que trajo la sugerencia), gana lo escrito", () => {
    expect(direccionAGuardar("Av. Industrias 101-A, Zona Industrial", "Av. Industrias 101, Zona Industrial")).toBe("Av. Industrias 101-A, Zona Industrial");
  });
  it("recorta el texto escrito", () => {
    expect(direccionAGuardar("  Villerías 2, Centro  ", "")).toBe("Villerías 2, Centro");
  });
  it("con el campo vacío, usa la dirección ya resuelta", () => {
    expect(direccionAGuardar("", "Villerías 2, Centro")).toBe("Villerías 2, Centro");
    expect(direccionAGuardar("   ", "Villerías 2, Centro")).toBe("Villerías 2, Centro");
  });
  it('con "Ubicando…" (el reverse geocoding no terminó todavía), usa la resuelta, nunca el texto de espera', () => {
    expect(direccionAGuardar("Ubicando…", "Villerías 2, Centro")).toBe("Villerías 2, Centro");
  });
  it("sin nada en ningún lado, cadena vacía", () => {
    expect(direccionAGuardar("", "")).toBe("");
  });
});

describe("necesitaConfirmarDireccion (OL-187: bug del founder — leído del cartel, «Listo» bloqueado y sin pin)", () => {
  it("dirección leída (del cartel) sin punto: hace falta confirmarla sola", () => {
    expect(necesitaConfirmarDireccion({ origen: "manual", punto: null, direccion: "Calle Prueba 123, Ciudad de prueba" })).toBe(true);
  });
  it("ya con punto (se movió el pin, o se eligió una sugerencia): no hace falta nada", () => {
    expect(necesitaConfirmarDireccion({ origen: "manual", punto: { lat: 22.15, lng: -100.97 }, direccion: "Calle Prueba 123" })).toBe(false);
  });
  it("sin dirección (hoja recién abierta, vacía): no hay nada que buscar", () => {
    expect(necesitaConfirmarDireccion({ origen: "manual", punto: null, direccion: "" })).toBe(false);
    expect(necesitaConfirmarDireccion({ origen: "manual", punto: null, direccion: "   " })).toBe(false);
  });
  it("un lugar YA REGISTRADO siempre trae su punto al elegirlo: nunca hace falta confirmar", () => {
    expect(necesitaConfirmarDireccion({ origen: "lugar", punto: null, direccion: "Calle 1" })).toBe(false);
  });
  it("sin draft (hoja vacía de entrada): no", () => {
    expect(necesitaConfirmarDireccion(null)).toBe(false);
  });
});

describe("coincidenciaClara (OL-187: la búsqueda automática solo fija sola una coincidencia sin ambigüedad)", () => {
  it("un solo resultado: ese mismo se fija (no es un punto inventado, es la única coincidencia real)", () => {
    const unico = combinarResultados([lugar("a", "Museo A")], []);
    expect(coincidenciaClara(unico)).toEqual({ tipo: "lugar", lugar: lugar("a", "Museo A") });
  });
  it("sin resultados: nada que fijar (regla de OL-182, nunca inventar un punto)", () => {
    expect(coincidenciaClara([])).toBeNull();
  });
  // Revisión del gestor sobre el primer arreglo: Mapbox casi siempre trae varias sugerencias para una dirección
  // con número (la exacta y otras parecidas, de otra colonia o con otro número cerca) -exigir "exactamente una"
  // dejaba sin fijarse solo el caso real del founder. Con varias, se acepta la PRIMERA cuya dirección empiece por
  // la calle y el número de la dirección leída (antes de la primera coma), normalizada igual que `lugaresPorTexto`.
  it("varios resultados y el primero coincide por calle y número: ese se fija", () => {
    const cerca = { ...sugerido("x", "Calle Prueba 123"), direccion: "Calle Prueba 123, Ciudad de prueba" };
    const varios = combinarResultados([], [cerca, sugerido("y", "Otra dirección")]);
    expect(coincidenciaClara(varios, "Calle Prueba 123, Ciudad de prueba")).toBe(varios[0]);
  });
  it("acentos, mayúsculas y puntuación no impiden la coincidencia (misma normalización que lugaresPorTexto)", () => {
    const conAcento = { ...lugar("a", "Museo Á"), direccion: "AV. INDUSTRIAS 101-A, Zona Industrial" };
    const varios = combinarResultados([conAcento], [sugerido("x", "Otra")]);
    expect(coincidenciaClara(varios, "av industrias 101-a, zona industrial")).toBe(varios[0]);
  });
  it("varios resultados y ninguno coincide con la dirección leída: no se fija nada", () => {
    const varios = combinarResultados([], [sugerido("x", "Calle Distinta 9"), sugerido("y", "Otra calle 5")]);
    expect(coincidenciaClara(varios, "Calle Prueba 123, Ciudad de prueba")).toBeNull();
  });
  it("dirección leída sin número (o sin dirección) y varios resultados: no se fija nada", () => {
    const varios = combinarResultados([lugar("a", "Museo A"), lugar("b", "Museo B")], []);
    expect(coincidenciaClara(varios, "Andador sin número")).toBeNull();
    expect(coincidenciaClara(varios)).toBeNull();
  });
});

// OL-187: reproduce el estado exacto del bug del founder y el que deja el arreglo, sin depender de React ni de
// Mapbox -las mismas piezas puras que usa `HojaDonde` para decidir si "Listo" se habilita.
describe("el bug de OL-187, de punta a punta con las funciones puras", () => {
  it("recién abierta con la dirección leída: sin arreglo, «Listo» se queda apagado para siempre", () => {
    const draft = { origen: "manual" as const, punto: null, direccion: "Calle Prueba 123, Ciudad de prueba" };
    // El defecto real: nada, en ninguna parte, vuelve a buscar esta dirección sola -puedeGuardarLugar se queda
    // en falso hasta que la persona borre el campo y escriba de nuevo (lo que reportó el founder).
    expect(puedeGuardarLugar({ nombre: "Foro ficticio", punto: draft.punto })).toBe(false);
    expect(necesitaConfirmarDireccion(draft)).toBe(true);
  });
  it("con el arreglo: la búsqueda automática de esa dirección trae una sola coincidencia y fija el punto -«Listo» queda habilitado", () => {
    const draft = { origen: "manual" as const, punto: null as { lat: number; lng: number } | null, direccion: "Calle Prueba 123, Ciudad de prueba" };
    expect(necesitaConfirmarDireccion(draft)).toBe(true);
    const resultados = combinarResultados([], [sugerido("x", "Calle Prueba 123")]);
    const claro = coincidenciaClara(resultados);
    expect(claro).not.toBeNull();
    // `elegirMapbox`/`elegirLugarLista` (en HojaDonde.tsx) hacen justo esto con el resultado claro: ponen el
    // punto que trajo la búsqueda -nunca inventado, es el que resolvió esa misma dirección.
    const puntoFijado = { lat: 22.15, lng: -100.98 };
    expect(puedeGuardarLugar({ nombre: "Foro ficticio", punto: puntoFijado })).toBe(true);
  });
  it("con el arreglo pero direcciones ambiguas (dos coincidencias): no se inventa ninguna, la lista queda para elegir", () => {
    const resultados = combinarResultados([lugar("a", "Foro uno"), lugar("b", "Foro dos")], []);
    expect(coincidenciaClara(resultados)).toBeNull();
    // Sin coincidencia clara el punto sigue sin ponerse: «Listo» se queda apagado hasta que la persona toque una
    // opción de la lista (que ya está abierta) -nunca un pin adivinado entre varias direcciones.
    expect(puedeGuardarLugar({ nombre: "Foro", punto: null })).toBe(false);
  });
});

describe("lugarCercano (OL-211: avisar «ya existe», nunca elegir)", () => {
  const centro = { lat: 22.15, lng: -100.97 };

  it("sin lugares cerca: nada que avisar", () => {
    expect(lugarCercano([lugar("a", "Museo A", 22.2, -101.1)], centro)).toBeNull();
  });

  it("un lugar a menos de 150 m: se avisa", () => {
    // ~0.001° de latitud son ~111 m.
    const cerca = lugar("a", "Museo A", centro.lat + 0.001, centro.lng);
    expect(lugarCercano([cerca], centro)).toEqual(cerca);
  });

  it("justo en el mismo punto: se avisa (0 m)", () => {
    const aqui = lugar("a", "Museo A", centro.lat, centro.lng);
    expect(lugarCercano([aqui], centro)).toEqual(aqui);
  });

  it("a más de 150 m: no se avisa", () => {
    // ~0.002° de latitud son ~222 m.
    const lejos = lugar("a", "Museo A", centro.lat + 0.002, centro.lng);
    expect(lugarCercano([lejos], centro)).toBeNull();
  });

  it("con varios cerca, avisa del más cercano", () => {
    const lejano = lugar("lejano", "Foro lejano", centro.lat + 0.0012, centro.lng);
    const cercano = lugar("cercano", "Foro cercano", centro.lat + 0.0003, centro.lng);
    expect(lugarCercano([lejano, cercano], centro)).toEqual(cercano);
  });

  it("sin lugares: null", () => {
    expect(lugarCercano([], centro)).toBeNull();
  });

  it("admite un radio distinto", () => {
    const aUnos300m = lugar("a", "Museo A", centro.lat + 0.0027, centro.lng);
    expect(lugarCercano([aUnos300m], centro)).toBeNull();
    expect(lugarCercano([aUnos300m], centro, 500)).toEqual(aUnos300m);
  });
});

describe("textoInicialBusqueda (OL-211: el nombre ya escrito adelanta la primera búsqueda)", () => {
  it('entrando por "Buscar" (sin ubicación), arranca con el nombre ya escrito', () => {
    expect(textoInicialBusqueda("Laboratorio de Arte Escénico", false)).toBe("Laboratorio de Arte Escénico");
  });

  it("recorta espacios", () => {
    expect(textoInicialBusqueda("  Casa de Cultura  ", false)).toBe("Casa de Cultura");
  });

  it('entrando por "Cambiar" (ya hay ubicación), arranca vacío aunque haya nombre', () => {
    expect(textoInicialBusqueda("Laboratorio de Arte Escénico", true)).toBe("");
  });

  it("sin nombre todavía, arranca vacío", () => {
    expect(textoInicialBusqueda("", false)).toBe("");
  });
});

const OTRA_CIUDAD: Ciudad = { slug: "otra-ciudad", nombre: "Otra Ciudad", centro: { lat: 20, lng: -99 }, zoom: 13 };

describe("contextoDondeEsta (corrección del gestor, PR #249: sin la ciudad elegida, Mapbox buscaba en todo el país)", () => {
  it("con el pin YA puesto: manda el propio punto, sin importar la ciudad elegida ni el texto", () => {
    const punto = { lat: 1, lng: 2 };
    const r = contextoDondeEsta(punto, "cualquier texto", OTRA_CIUDAD, null, null);
    expect(r).toEqual({ ciudad: CIUDAD_INICIAL, centro: punto, origen: "posicion" });
  });

  it("sin pin y con ciudad elegida (chip): la usa, aunque no haya posición del teléfono", () => {
    const r = contextoDondeEsta(null, "", OTRA_CIUDAD, null, null);
    expect(r).toEqual({ ciudad: OTRA_CIUDAD, centro: OTRA_CIUDAD.centro, origen: "chip" });
  });

  it("sin pin, sin ciudad elegida y sin posición: cae en San Luis Potosí SIN pista real -el defecto que reportó el gestor (Aguascalientes, Pachuca, CDMX)", () => {
    const r = contextoDondeEsta(null, "", null, null, null);
    expect(r).toEqual({ ciudad: CIUDAD_INICIAL, centro: CIUDAD_INICIAL.centro, origen: "inicial" });
  });

  it("sin pin, sin ciudad elegida, con la posición del teléfono: la usa", () => {
    const yo = { lat: 3, lng: 4 };
    const r = contextoDondeEsta(null, "", null, yo, null);
    expect(r).toEqual({ ciudad: CIUDAD_INICIAL, centro: yo, origen: "posicion" });
  });

  it("el texto manda sobre la ciudad elegida (misma cascada que el alta de evento): reconoce San Luis Potosí en el texto aunque el chip diga otra ciudad", () => {
    const r = contextoDondeEsta(null, "un lugar en San Luis Potosí", OTRA_CIUDAD, null, null);
    expect(r.origen).toBe("texto");
    expect(r.ciudad).toEqual(CIUDAD_INICIAL);
  });
});

describe('contextoDondeEsta, el mismo que usa el campo "Nombre del lugar" (corrección del gestor sobre el PR #249, segunda vuelta)', () => {
  // El bug real, reproducido tal cual lo reportó el gestor: escribiendo "Laboratorio de Arte Escénico" en el
  // campo del NOMBRE (todavía sin ubicación -`punto: null`, el caso normal al dar de alta), sin geolocalización
  // del teléfono -las sugerencias de Mapbox no traían ningún `bbox` y proponían Aguascalientes, Pachuca y CDMX; un
  // toque llenaba el nombre Y la dirección con un lugar de otro estado. `FormularioLugar.tsx` ahora arma este
  // mismo contexto (con `ciudadContexto`, el mismo prop que ya recibe "¿Dónde está?") antes de llamar a Mapbox.
  it("sin ubicación todavía (dando de alta) y con la ciudad elegida: hay `bbox` real, San Luis Potosí -no todo el país", () => {
    const r = contextoDondeEsta(null, "Laboratorio de Arte Escénico", CIUDAD_INICIAL, null, null);
    expect(r).toEqual({ ciudad: CIUDAD_INICIAL, centro: CIUDAD_INICIAL.centro, origen: "chip" });
  });

  it("el mismo caso SIN la ciudad elegida (el defecto reportado): sin ninguna pista real, cae en San Luis Potosí de respaldo pero SIN bbox -exactamente el hueco que dejaba buscar en todo el país", () => {
    const r = contextoDondeEsta(null, "Laboratorio de Arte Escénico", null, null, null);
    expect(r.origen).toBe("inicial");
  });

  it("ya con un punto puesto (editando, o ya fijado en esta misma sesión): el nombre no cambia la cascada, manda el pin", () => {
    const punto = { lat: 22.15, lng: -100.97 };
    const r = contextoDondeEsta(punto, "Laboratorio de Arte Escénico", null, null, null);
    expect(r).toEqual({ ciudad: CIUDAD_INICIAL, centro: punto, origen: "posicion" });
  });
});

describe("resultadosDondeEsta (corrección del gestor, PR #249: los registrados salen primero y no desaparecen cuando Mapbox responde)", () => {
  it("un lugar registrado que coincide, antes de que Mapbox responda (resultadosMapbox aún vacío): aparece solo", () => {
    const museoA = lugar("a", "Museo A", 22.15, -100.97);
    const r = resultadosDondeEsta([museoA], "Museo A", []);
    expect(r).toEqual([{ tipo: "lugar", lugar: museoA }]);
  });

  it("el mismo lugar SIGUE apareciendo, PRIMERO, cuando Mapbox ya respondió con varias sugerencias", () => {
    const museoA = lugar("a", "Museo A", 22.15, -100.97);
    const mapbox = [sugerido("x", "Plaza X"), sugerido("y", "Calle Y"), sugerido("z", "Avenida Z")];
    const r = resultadosDondeEsta([museoA], "Museo A", mapbox);
    expect(r[0]).toEqual({ tipo: "lugar", lugar: museoA });
    expect(r).toHaveLength(4);
    expect(r.slice(1)).toEqual(mapbox.map((item) => ({ tipo: "mapbox", item })));
  });

  it("varios lugares registrados coinciden: todos antes que cualquier cosa de Mapbox", () => {
    const a = lugar("a", "Foro A", 22.15, -100.97);
    const b = lugar("b", "Foro B", 22.16, -100.98);
    const r = resultadosDondeEsta([a, b], "Foro", [sugerido("x", "Otro lado")]);
    expect(r.map((x) => x.tipo)).toEqual(["lugar", "lugar", "mapbox"]);
  });

  it("sin ningún lugar que coincida: solo lo de Mapbox", () => {
    const r = resultadosDondeEsta([lugar("a", "Museo A", 22.15, -100.97)], "Otro nombre", [sugerido("x", "Plaza X")]);
    expect(r).toEqual([{ tipo: "mapbox", item: sugerido("x", "Plaza X") }]);
  });

  it("con menos de 3 letras, lo de Mapbox no cuenta (aunque ya hubiera llegado de una búsqueda anterior), pero el lugar registrado si coincide sí", () => {
    const museoA = lugar("a", "Museo A", 22.15, -100.97);
    const r = resultadosDondeEsta([museoA], "Mu", [sugerido("x", "Plaza X")]);
    expect(r).toEqual([{ tipo: "lugar", lugar: museoA }]);
  });

  it("sin texto: nada", () => {
    expect(resultadosDondeEsta([lugar("a", "Museo A", 22.15, -100.97)], "", [sugerido("x", "Plaza X")])).toEqual([]);
  });
});

// La misma hoja sirve al alta de evento y al alta de lugar: el mismo pin en construcción, y solo cambia lo que hace falta
// para tocar «Listo» (en un lugar basta el punto; en un evento, además, el nombre del sitio).
describe("puedeListo: una sola hoja para el evento y para el lugar", () => {
  const punto = { lat: 22.15, lng: -100.97 };
  const pinSuelto = { origen: "manual" as const, nombre: "", punto };

  it("sin pin no hay «Listo», para ninguno de los dos", () => {
    expect(puedeListo("evento", null, false)).toBe(false);
    expect(puedeListo("lugar", null, false)).toBe(false);
    expect(puedeListo("evento", { origen: "manual", nombre: "Patio", punto: null }, false)).toBe(false);
    expect(puedeListo("lugar", { origen: "manual", nombre: "", punto: null }, false)).toBe(false);
  });
  it("un lugar solo necesita el punto: su nombre vive en el formulario de fuera", () => {
    expect(puedeListo("lugar", pinSuelto, false)).toBe(true);
  });
  it("un evento con un pin suelto necesita además el nombre del sitio", () => {
    expect(puedeListo("evento", pinSuelto, false)).toBe(false);
    expect(puedeListo("evento", { ...pinSuelto, nombre: "   " }, false)).toBe(false);
    expect(puedeListo("evento", { ...pinSuelto, nombre: "Patio de mi casa" }, false)).toBe(true);
  });
  it("un evento con un lugar registrado ya trae su nombre", () => {
    expect(puedeListo("evento", { origen: "lugar", nombre: "Teatro de la Paz", punto }, false)).toBe(true);
  });
  it("con «Agregar lugar» abierto, el evento espera a su propio botón; el lugar no tiene ese panel", () => {
    expect(puedeListo("evento", { origen: "lugar", nombre: "Teatro de la Paz", punto }, true)).toBe(false);
    expect(puedeListo("evento", { ...pinSuelto, nombre: "Patio" }, true)).toBe(false);
  });
});

// El botón del pie dice «Listo» o qué falta (OL-303); apagado exactamente cuando `puedeListo` no deja confirmar.
describe("textoListo: el botón del pie dice qué falta", () => {
  const punto = { lat: 22.15, lng: -100.97 };
  const pinSuelto = { origen: "manual" as const, nombre: "", punto };

  it("sin pin, un evento dice que falta el lugar y un lugar, que falta la ubicación", () => {
    expect(textoListo("evento", null)).toBe("Falta el lugar");
    expect(textoListo("evento", { origen: "manual", nombre: "Patio", punto: null })).toBe("Falta el lugar");
    expect(textoListo("lugar", null)).toBe("Falta la ubicación");
  });
  it("con el pin pero sin nombre, un evento dice que falta el nombre del lugar", () => {
    expect(textoListo("evento", pinSuelto)).toBe("Falta el nombre del lugar");
    expect(textoListo("evento", { ...pinSuelto, nombre: "   " })).toBe("Falta el nombre del lugar");
  });
  it("con lo necesario dice «Listo»: un lugar basta con el punto; un evento, con el nombre o un lugar registrado", () => {
    expect(textoListo("lugar", pinSuelto)).toBe("Listo");
    expect(textoListo("evento", { ...pinSuelto, nombre: "Patio" })).toBe("Listo");
    expect(textoListo("evento", { origen: "lugar", nombre: "Teatro de la Paz", punto })).toBe("Listo");
  });
});
