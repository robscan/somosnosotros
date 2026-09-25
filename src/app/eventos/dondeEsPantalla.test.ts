import { describe, expect, it } from "vitest";
import type { LugarSugerido } from "@/lib/buscarLugares";
import type { LugarResumen } from "@/lib/lugares";
import { altoTeclado, coincidenciaClara, combinarResultados, decidirGuardado, direccionAGuardar, modoDePantalla, necesitaConfirmarDireccion, puedeGuardarLugar } from "./dondeEsPantalla";

function lugar(id: string, nombre: string): LugarResumen {
  return { id, nombre, tipo: "museo", direccion: "Calle 1", lat: 22.15, lng: -100.97, portada: null };
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
// Mapbox -las mismas piezas puras que usa `HojaDondeEs` para decidir si "Listo" se habilita.
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
    // `elegirMapbox`/`elegirLugarLista` (en HojaDondeEs.tsx) hacen justo esto con el resultado claro: ponen el
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
