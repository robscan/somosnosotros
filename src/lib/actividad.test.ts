import { describe, expect, it } from "vitest";
import { masVistas, pestanasDePersona, recordar, unirVistos, type Memoria } from "./actividad";
import type { Asistencia } from "./deslizar";

const ev = (id: string) => ({ id });
const eventos = [ev("e1"), ev("e2"), ev("e3"), ev("e4")];
const lugares = [ev("l1"), ev("l2")];
const artistas = [ev("a1")];

/** Lo que quien mira decidió, como lo da el hook: un mapa que el test cambia entre toques. */
function mirada(estados: Record<string, Asistencia>, seguidos: string[]) {
  return { estado: (id: string) => estados[id] ?? null, sigo: (id: string) => seguidos.includes(id) };
}
const resumen = (ps: ReturnType<typeof pestanasDePersona>) => ps.map((p) => `${p.etiqueta} ${p.n}: ${[...p.eventos, ...p.lugares, ...p.artistas].map((x) => x.id).join(",")}`);

describe("pestañas de Mi perfil", () => {
  const estados: Record<string, Asistencia> = { e1: "voy", e2: "me_interesa", e3: "voy", e4: "me_interesa" };
  const vistas0 = { juntos: 0, interesa: 2 };

  it("cada evento va en la pestaña de lo que decidí, en orden", () => {
    const ps = pestanasDePersona({ mia: true, eventos, lugares, artistas, ...mirada(estados, ["l1", "l2", "a1"]), vistas: vistas0 });
    expect(resumen(ps)).toEqual(["Voy a 2: e1,e3", "Sigo 3: l1,l2,a1", "Me interesa 2: e2,e4"]);
  });

  it("No voy lo quita al instante y Deshacer lo devuelve a su sitio", () => {
    const quitado = pestanasDePersona({ mia: true, eventos, lugares, artistas, ...mirada({ ...estados, e1: null }, ["l1", "l2", "a1"]), vistas: vistas0 });
    expect(resumen(quitado)[0]).toBe("Voy a 1: e3");
    const deshecho = pestanasDePersona({ mia: true, eventos, lugares, artistas, ...mirada(estados, ["l1", "l2", "a1"]), vistas: vistas0 });
    expect(resumen(deshecho)[0]).toBe("Voy a 2: e1,e3");
  });

  it("Voy desde Me interesa lo pasa a Voy a y los números cambian", () => {
    const ps = pestanasDePersona({ mia: true, eventos, lugares, artistas, ...mirada({ ...estados, e2: "voy" }, []), vistas: vistas0 });
    expect(resumen(ps)).toEqual(["Voy a 3: e1,e2,e3", "Sigo 0: ", "Me interesa 1: e4"]);
  });

  it("Me interesa se queda aunque se vacíe, y aparece al llenarse si no había", () => {
    const vacia = pestanasDePersona({ mia: true, eventos, lugares, artistas, ...mirada({ e1: "voy", e2: null, e3: "voy", e4: null }, []), vistas: vistas0 });
    expect(resumen(vacia)[2]).toBe("Me interesa 0: ");
    const sinHaber = { e1: "voy", e2: "voy", e3: "voy", e4: "voy" } as Record<string, Asistencia>;
    expect(pestanasDePersona({ mia: true, eventos, lugares, artistas, ...mirada(sinHaber, []), vistas: { juntos: 0, interesa: 0 } })).toHaveLength(2);
    const llena = pestanasDePersona({ mia: true, eventos, lugares, artistas, ...mirada({ ...sinHaber, e4: "me_interesa" }, []), vistas: { juntos: 0, interesa: 0 } });
    expect(resumen(llena)[2]).toBe("Me interesa 1: e4");
  });

  it("dejar de seguir lo saca de Sigo", () => {
    const ps = pestanasDePersona({ mia: true, eventos, lugares, artistas, ...mirada(estados, ["l2"]), vistas: vistas0 });
    expect(resumen(ps)[1]).toBe("Sigo 1: l2");
  });
});

describe("pestañas de la ficha de otra persona", () => {
  it("Va a y Sigue son suyos: mis gestos no los cambian", () => {
    const ps = pestanasDePersona({ mia: false, eventos, lugares, artistas, ...mirada({ e1: null, e2: "me_interesa" }, []), vistas: { juntos: 0, interesa: 0 } });
    expect(resumen(ps)).toEqual(["Va a 4: e1,e2,e3,e4", "Sigue 3: l1,l2,a1"]);
  });

  it("Van a lo mismo sigue a mi Voy: sale con No voy, se queda la pestaña y entra al decir Voy", () => {
    const vistas0 = { juntos: 2, interesa: 0 };
    expect(resumen(pestanasDePersona({ mia: false, eventos, lugares, artistas, ...mirada({ e1: "voy", e3: "voy" }, []), vistas: vistas0 }))[2]).toBe("Van a lo mismo 2: e1,e3");
    expect(resumen(pestanasDePersona({ mia: false, eventos, lugares, artistas, ...mirada({ e3: "voy" }, []), vistas: vistas0 }))[2]).toBe("Van a lo mismo 1: e3");
    expect(resumen(pestanasDePersona({ mia: false, eventos, lugares, artistas, ...mirada({}, []), vistas: vistas0 }))[2]).toBe("Van a lo mismo 0: ");
    expect(resumen(pestanasDePersona({ mia: false, eventos, lugares, artistas, ...mirada({ e4: "voy" }, []), vistas: { juntos: 0, interesa: 0 } }))[2]).toBe("Van a lo mismo 1: e4");
  });

  it("una pestaña que nace en la visita se queda aunque se vacíe, y Deshacer la vuelve a llenar", () => {
    const entrada = (estados: Record<string, Asistencia>, vistas: { juntos: number; interesa: number }) => ({ mia: false, eventos, lugares, artistas, ...mirada(estados, []), vistas });
    // Sin coincidencias no hay pestaña; al decir Voy, nace y queda vista.
    let vistas = { juntos: 0, interesa: 0 };
    expect(pestanasDePersona(entrada({}, vistas))).toHaveLength(2);
    const conVoy = pestanasDePersona(entrada({ e1: "voy" }, vistas));
    vistas = masVistas(vistas, conVoy);
    expect(vistas.juntos).toBe(1);
    // No voy la vacía, pero sigue ahí; Deshacer la vuelve a llenar.
    const vacia = pestanasDePersona(entrada({}, vistas));
    expect(resumen(vacia)[2]).toBe("Van a lo mismo 0: ");
    expect(masVistas(vistas, vacia)).toEqual({ juntos: 1, interesa: 0 });
    expect(resumen(pestanasDePersona(entrada({ e1: "voy" }, vistas)))[2]).toBe("Van a lo mismo 1: e1");
  });

  it("una pestaña que nace de un gesto que no se guardó no se queda; una guardada sí", () => {
    const cero = { juntos: 0, interesa: 0 };
    const entrada = (estados: Record<string, Asistencia>, vistas: { juntos: number; interesa: number }) => ({ mia: false, eventos, lugares, artistas, ...mirada(estados, []), vistas });
    let memoria: Memoria = { guardadas: cero, todas: cero, fallos: 0 };
    const paso = (ahora: Record<string, Asistencia>, guardado: Record<string, Asistencia>, fallos: number) => {
      const pintadas = pestanasDePersona(entrada(ahora, memoria.todas));
      memoria = recordar(memoria, pestanasDePersona(entrada(guardado, memoria.todas)), pintadas, fallos);
      return resumen(pintadas);
    };
    // Toqué Voy: la pestaña nace mientras se guarda (el servidor todavía no lo tiene).
    expect(paso({ e1: "voy" }, {}, 0)[2]).toBe("Van a lo mismo 1: e1");
    // No se pudo guardar: el fallo devuelve lo que había añadido ese toque (React vuelve a pintar con la memoria nueva),
    // así que la pestaña se va en vez de quedarse vacía y mentirosa.
    paso({}, {}, 1);
    expect(memoria.todas).toEqual(cero);
    expect(paso({}, {}, 1)).toHaveLength(2);
    // Con el mismo toque guardado, la pestaña se queda aunque después se vacíe, y Deshacer la vuelve a llenar.
    expect(paso({ e1: "voy" }, { e1: "voy" }, 1)[2]).toBe("Van a lo mismo 1: e1");
    expect(paso({}, {}, 1)[2]).toBe("Van a lo mismo 0: ");
    expect(paso({ e1: "voy" }, { e1: "voy" }, 1)[2]).toBe("Van a lo mismo 1: e1");
    // Y un fallo de otro renglón no se lleva por delante la pestaña que ya se ganó guardando.
    expect(paso({ e1: "voy" }, { e1: "voy" }, 2)[2]).toBe("Van a lo mismo 1: e1");
  });

  it("un fallo no se lleva por delante una pestaña que sigue llena", () => {
    const cero = { juntos: 0, interesa: 0 };
    const entrada = (estados: Record<string, Asistencia>, vistas: { juntos: number; interesa: number }) => ({ mia: false, eventos, lugares, artistas, ...mirada(estados, []), vistas });
    let memoria: Memoria = { guardadas: cero, todas: cero, fallos: 0 };
    const paso = (ahora: Record<string, Asistencia>, guardado: Record<string, Asistencia>, fallos: number) => {
      const pintadas = pestanasDePersona(entrada(ahora, memoria.todas));
      memoria = recordar(memoria, pestanasDePersona(entrada(guardado, memoria.todas)), pintadas, fallos);
      return resumen(pintadas);
    };
    // Dos Voy en vuelo; falla uno solo: el otro sigue en la pestaña, así que la pestaña no puede irse bajo el dedo.
    expect(paso({ e1: "voy", e3: "voy" }, {}, 0)[2]).toBe("Van a lo mismo 2: e1,e3");
    expect(paso({ e3: "voy" }, {}, 1)[2]).toBe("Van a lo mismo 1: e3");
    expect(memoria.todas.juntos).toBe(1);
    // Y cuando ya no queda ninguno, la pestaña se va: no se queda vacía y mentirosa.
    paso({}, {}, 2);
    expect(memoria.todas).toEqual(cero);
    expect(paso({}, {}, 2)).toHaveLength(2);
  });

  it("sin sesión (nada decidido) no hay Van a lo mismo", () => {
    expect(pestanasDePersona({ mia: false, eventos, lugares, artistas, ...mirada({}, []), vistas: { juntos: 0, interesa: 0 } })).toHaveLength(2);
  });
});

describe("lo visto en la visita", () => {
  it("lo quitado y guardado se queda (Deshacer lo devuelve al instante); lo que llega reemplaza y lo nuevo se suma", () => {
    const vistos = [{ id: "e1", v: 1 }, { id: "e2", v: 1 }, { id: "e3", v: 1 }];
    // Llega la página tras quitar e2: ya no lo trae, e3 viene al día y aparece e4.
    const unidos = unirVistos(vistos, [{ id: "e1", v: 1 }, { id: "e3", v: 2 }, { id: "e4", v: 1 }]);
    expect(unidos).toEqual([{ id: "e1", v: 1 }, { id: "e2", v: 1 }, { id: "e3", v: 2 }, { id: "e4", v: 1 }]);
  });

  it("con lo quitado en la lista, la pestaña no lo muestra hasta deshacerlo", () => {
    const eventosVistos = unirVistos(eventos, [ev("e1"), ev("e3"), ev("e4")]);
    const quitado = pestanasDePersona({ mia: true, eventos: eventosVistos, lugares: [], artistas: [], ...mirada({ e1: "voy", e3: "voy" }, []), vistas: { juntos: 0, interesa: 0 } });
    expect(quitado[0].eventos.map((e) => e.id)).toEqual(["e1", "e3"]);
    const deshecho = pestanasDePersona({ mia: true, eventos: eventosVistos, lugares: [], artistas: [], ...mirada({ e1: "voy", e2: "voy", e3: "voy" }, []), vistas: { juntos: 0, interesa: 0 } });
    expect(deshecho[0].eventos.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });
});
