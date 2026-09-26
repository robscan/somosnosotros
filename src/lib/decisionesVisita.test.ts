import { describe, expect, it } from "vitest";
import {
  borrarDecisionesVisita,
  corregirAsistencias,
  corregirSeguidos,
  crudoDecisionesVisita,
  guardarDecisionAsistencia,
  guardarDecisionSeguir,
  limpiarAsistenciasResueltas,
  limpiarSeguidosResueltos,
  limpiarTarjetasTusPlanesResueltas,
  suscribirseDecisionesVisita,
  tarjetasTusPlanes,
  type Almacen,
} from "./decisionesVisita";
import type { TarjetaConFecha } from "./destacados";

function almacen(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return { datos, getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => void datos.set(k, v), removeItem: (k) => void datos.delete(k) };
}

/** Un almacén que revienta en cualquier acceso: modo privado o storage bloqueado. */
function almacenRoto(): Almacen {
  return {
    getItem: () => {
      throw new Error("bloqueado");
    },
    setItem: () => {
      throw new Error("bloqueado");
    },
    removeItem: () => {
      throw new Error("bloqueado");
    },
  };
}

// Miércoles 30 de septiembre de 2026, mediodía UTC.
const AHORA = new Date("2026-09-30T12:00:00Z");
function tarjeta(id: string, inicio: string, cambios: Partial<TarjetaConFecha> = {}): TarjetaConFecha {
  return { id, href: `/eventos/${id}`, foto: "/foto.jpg", titulo: `Evento ${id}`, detalle: "detalle", van: 0, inicio, fin: null, zona: "America/Mexico_City", ...cambios };
}

describe("decisiones de visita — fusión servidor + decisiones", () => {
  it("sin decisiones guardadas, devuelve el servidor tal cual (misma referencia)", () => {
    const a = almacen();
    const servidor = { e1: "voy" as const };
    expect(corregirAsistencias("cuenta-1", servidor, a)).toBe(servidor);
  });

  it("una decisión que el servidor no refleja todavía manda sobre lo que trajo", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a);
    // El servidor (página vieja) todavía no tiene e1.
    expect(corregirAsistencias("cuenta-1", {}, a)).toEqual({ e1: "voy" });
  });

  it("quitar (Voy → nada) también manda: el evento sale del mapa con null", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", null, a);
    expect(corregirAsistencias("cuenta-1", { e1: "voy" }, a)).toEqual({ e1: null });
  });

  it("Voy → Me interesa: la corrección trae el estado nuevo, no el primero", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a);
    guardarDecisionAsistencia("cuenta-1", "e1", "me_interesa", a);
    expect(corregirAsistencias("cuenta-1", {}, a)).toEqual({ e1: "me_interesa" });
  });

  it("cuando el servidor ya refleja la decisión (página fresca), no toca nada y la limpia", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a);
    // Una página fresca que ya trae e1: voy — la decisión ya no hace falta.
    expect(corregirAsistencias("cuenta-1", { e1: "voy" }, a)).toEqual({ e1: "voy" });
    limpiarAsistenciasResueltas("cuenta-1", { e1: "voy" }, a);
    // Tras limpiar, una página vieja que ya no trajera e1 no lo revive: no queda decisión que aplicar.
    expect(corregirAsistencias("cuenta-1", {}, a)).toEqual({});
  });

  it("Seguir: una decisión no reflejada todavía añade o quita el id de la lista", () => {
    const a = almacen();
    guardarDecisionSeguir("cuenta-1", "lugar", "l1", true, a);
    expect(corregirSeguidos("cuenta-1", "lugar", [], a)).toEqual(["l1"]);
    guardarDecisionSeguir("cuenta-1", "lugar", "l2", false, a);
    expect(corregirSeguidos("cuenta-1", "lugar", ["l2"], a)).toEqual(["l1"]);
  });

  it("Seguir ya reflejado por el servidor no cambia la lista (misma referencia) y se limpia", () => {
    const a = almacen();
    guardarDecisionSeguir("cuenta-1", "lugar", "l1", true, a);
    const servidor = ["l1"];
    expect(corregirSeguidos("cuenta-1", "lugar", servidor, a)).toBe(servidor);
    limpiarSeguidosResueltos("cuenta-1", "lugar", servidor, a);
    expect(corregirSeguidos("cuenta-1", "lugar", [], a)).toEqual([]);
  });

  it("lugar y artista no se pisan entre sí aunque compartan id", () => {
    const a = almacen();
    guardarDecisionSeguir("cuenta-1", "lugar", "x1", true, a);
    expect(corregirSeguidos("cuenta-1", "artista", [], a)).toEqual([]);
    expect(corregirSeguidos("cuenta-1", "lugar", [], a)).toEqual(["x1"]);
  });
});

describe("decisiones de visita — filtro de Tus planes", () => {
  it("un evento quitado (null) no queda entre los visibles; los demás siguen", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", null, a);
    const servidor = { e1: "voy" as const, e2: "me_interesa" as const };
    const corregido = corregirAsistencias("cuenta-1", servidor, a)!;
    const visibles = Object.keys(corregido).filter((id) => corregido[id] !== null);
    expect(visibles).toEqual(["e2"]);
  });

  it("deshacer el quitar repone el evento entre los visibles (no es una tarjeta nueva, es la misma que ya traía el servidor)", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", null, a); // quitar
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a); // Deshacer
    const servidor = { e1: "voy" as const };
    const corregido = corregirAsistencias("cuenta-1", servidor, a)!;
    expect(Object.keys(corregido).filter((id) => corregido[id] !== null)).toEqual(["e1"]);
  });

  it("no inventa tarjetas: el filtro recorre las tarjetas que ya trajo el servidor, nunca las claves del mapa corregido", () => {
    const a = almacen();
    // Decidido en otra lista (Agenda, por ejemplo) para un evento ajeno a este carril de Tus planes.
    guardarDecisionAsistencia("cuenta-1", "e-nuevo", "voy", a);
    const servidor = { e1: "voy" as const };
    const idsDeTarjetas = ["e1"]; // lo único que este carril recibió del servidor en este montaje
    const corregido = corregirAsistencias("cuenta-1", servidor, a)!;
    // `corregido` sí trae a "e-nuevo" (hace falta para que OTRA lista, con esa tarjeta, pinte su check) — pero el
    // filtro de "Tus planes" nunca recorre las claves de `corregido`, solo las tarjetas que ya tenía: no lo agrega.
    expect(corregido["e-nuevo"]).toBe("voy");
    const visibles = idsDeTarjetas.filter((id) => corregido[id] !== null);
    expect(visibles).toEqual(["e1"]);
  });
});

describe("decisiones de visita — cuentas distintas", () => {
  it("lo decidido por una cuenta no aplica a otra en la misma pestaña", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a);
    expect(corregirAsistencias("cuenta-2", {}, a)).toEqual({});
  });

  it("entrar con otra cuenta en la misma pestaña no revive lo de la anterior al guardar de nuevo", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a);
    guardarDecisionSeguir("cuenta-2", "lugar", "l1", true, a); // otra cuenta decide algo distinto
    expect(corregirAsistencias("cuenta-1", {}, a)).toEqual({}); // la de cuenta-1 no sobrevivió al escribirse por cuenta-2
    expect(corregirSeguidos("cuenta-2", "lugar", [], a)).toEqual(["l1"]);
  });

  it("sin cuenta (sin sesión) no corrige nada: devuelve el servidor tal cual", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a);
    const servidor = { e1: null };
    expect(corregirAsistencias(null, servidor, a)).toBe(servidor);
  });
});

describe("decisiones de visita — almacenamiento roto o ausente", () => {
  it("sin almacén (modo privado) no rompe: ni guardar ni corregir ni limpiar ni borrar", () => {
    expect(() => guardarDecisionAsistencia("cuenta-1", "e1", "voy", null)).not.toThrow();
    expect(corregirAsistencias("cuenta-1", { e1: "voy" }, null)).toEqual({ e1: "voy" });
    expect(() => limpiarAsistenciasResueltas("cuenta-1", { e1: "voy" }, null)).not.toThrow();
    expect(() => borrarDecisionesVisita(null)).not.toThrow();
  });

  it("un almacén que revienta (getItem/setItem/removeItem) no rompe la pantalla", () => {
    const roto = almacenRoto();
    expect(() => guardarDecisionAsistencia("cuenta-1", "e1", "voy", roto)).not.toThrow();
    expect(corregirAsistencias("cuenta-1", { e1: "voy" }, roto)).toEqual({ e1: "voy" });
    expect(() => limpiarAsistenciasResueltas("cuenta-1", { e1: "voy" }, roto)).not.toThrow();
    expect(() => borrarDecisionesVisita(roto)).not.toThrow();
  });

  it("ignora lo guardado que no sea una decisión válida (JSON roto o de otra forma)", () => {
    const a = almacen();
    a.setItem("somosnosotros:visita", "no es json");
    expect(corregirAsistencias("cuenta-1", { e1: "voy" }, a)).toEqual({ e1: "voy" });
    a.setItem("somosnosotros:visita", JSON.stringify({ cuenta: "cuenta-1" })); // sin los mapas
    expect(corregirAsistencias("cuenta-1", { e1: "voy" }, a)).toEqual({ e1: "voy" });
  });

  it("borrar deja la pestaña sin recuerdo para cualquier cuenta", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a);
    borrarDecisionesVisita(a);
    expect(corregirAsistencias("cuenta-1", {}, a)).toEqual({});
  });
});

describe("decisiones de visita — Tus planes al instante (OL-224)", () => {
  it("agrega, en su lugar por fecha, la tarjeta de un evento decidido que el servidor todavía no trae", () => {
    const a = almacen();
    const e1 = tarjeta("e1", "2026-10-01T20:00:00Z");
    const e3 = tarjeta("e3", "2026-10-05T20:00:00Z");
    guardarDecisionAsistencia("cuenta-1", "e2", "voy", a, tarjeta("e2", "2026-10-02T20:00:00Z"));
    expect(tarjetasTusPlanes("cuenta-1", [e1, e3], AHORA, a).map((t) => t.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("la fila vacía deja de estarlo: sin nada del servidor, la tarjeta decidida basta", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "me_interesa", a, tarjeta("e1", "2026-10-01T20:00:00Z"));
    expect(tarjetasTusPlanes("cuenta-1", [], AHORA, a).map((t) => t.id)).toEqual(["e1"]);
  });

  it("sin nada decidido, devuelve el servidor tal cual (misma referencia): no arma un arreglo nuevo de más", () => {
    const a = almacen();
    const servidor = [tarjeta("e1", "2026-10-01T20:00:00Z")];
    expect(tarjetasTusPlanes("cuenta-1", servidor, AHORA, a)).toBe(servidor);
  });

  it("sin duplicados: si el servidor ya trae el evento decidido, no se agrega una segunda tarjeta", () => {
    const a = almacen();
    const e1 = tarjeta("e1", "2026-10-01T20:00:00Z");
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, tarjeta("e1", "2026-10-01T20:00:00Z", { van: 1 }));
    expect(tarjetasTusPlanes("cuenta-1", [e1], AHORA, a)).toEqual([e1]);
  });

  it("la página fresca gana: si el servidor ya trae el evento, se usa su tarjeta (foto y «N van» al día), no la guardada", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, tarjeta("e1", "2026-10-01T20:00:00Z", { van: 1, foto: "/vieja.jpg" }));
    const fresca = tarjeta("e1", "2026-10-01T20:00:00Z", { van: 9, foto: "/nueva.jpg" });
    expect(tarjetasTusPlanes("cuenta-1", [fresca], AHORA, a)).toEqual([fresca]);
  });

  it("cambio Voy → Me interesa: la tarjeta guardada con el primer toque se conserva y se sigue agregando", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, tarjeta("e1", "2026-10-01T20:00:00Z"));
    guardarDecisionAsistencia("cuenta-1", "e1", "me_interesa", a); // sin tarjeta nueva: no debe perder la ya guardada
    expect(tarjetasTusPlanes("cuenta-1", [], AHORA, a).map((t) => t.id)).toEqual(["e1"]);
  });

  it("quitar: tras decidir y luego quitar (null), la tarjeta ya no se agrega", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, tarjeta("e1", "2026-10-01T20:00:00Z"));
    guardarDecisionAsistencia("cuenta-1", "e1", null, a);
    expect(tarjetasTusPlanes("cuenta-1", [], AHORA, a)).toEqual([]);
  });

  it("deshacer el quitar (Voy de nuevo, sin tarjeta) repone la misma tarjeta guardada antes", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, tarjeta("e1", "2026-10-01T20:00:00Z"));
    guardarDecisionAsistencia("cuenta-1", "e1", null, a); // quitar
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a); // Deshacer, tal como lo hace useAsistenciaEnLista al repetir guardar()
    expect(tarjetasTusPlanes("cuenta-1", [], AHORA, a).map((t) => t.id)).toEqual(["e1"]);
  });

  it("solo eventos futuros: uno ya terminado no se agrega aunque siga decidido", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, tarjeta("e1", "2026-09-20T20:00:00Z", { fin: "2026-09-20T22:00:00Z" }));
    expect(tarjetasTusPlanes("cuenta-1", [], AHORA, a)).toEqual([]);
  });

  it("un evento que ya empezó pero no ha terminado sigue vigente (mismo criterio que el resto de la app)", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, tarjeta("e1", "2026-09-30T10:00:00Z", { fin: "2026-09-30T23:00:00Z" }));
    expect(tarjetasTusPlanes("cuenta-1", [], AHORA, a).map((t) => t.id)).toEqual(["e1"]);
  });

  it("cuentas distintas: lo decidido por una cuenta no se agrega para otra en la misma pestaña", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, tarjeta("e1", "2026-10-01T20:00:00Z"));
    expect(tarjetasTusPlanes("cuenta-2", [], AHORA, a)).toEqual([]);
  });

  it("sin cuenta (sin sesión) devuelve el servidor tal cual", () => {
    const a = almacen();
    const servidor = [tarjeta("e1", "2026-10-01T20:00:00Z")];
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, servidor[0]);
    expect(tarjetasTusPlanes(null, servidor, AHORA, a)).toBe(servidor);
  });

  it("almacenamiento roto o ausente no rompe: devuelve el servidor tal cual", () => {
    const servidor = [tarjeta("e1", "2026-10-01T20:00:00Z")];
    expect(tarjetasTusPlanes("cuenta-1", servidor, AHORA, null)).toBe(servidor);
    expect(tarjetasTusPlanes("cuenta-1", servidor, AHORA, almacenRoto())).toBe(servidor);
  });
});

describe("decisiones de visita — aviso de cambios (useSyncExternalStore, OL-224)", () => {
  it("una escritura avisa a quien esté suscrito; al desuscribirse, deja de avisar", () => {
    const a = almacen();
    let avisos = 0;
    const quitar = suscribirseDecisionesVisita(() => {
      avisos++;
    });
    try {
      guardarDecisionAsistencia("cuenta-1", "e1", "voy", a);
      expect(avisos).toBe(1);
      borrarDecisionesVisita(a);
      expect(avisos).toBe(2);
    } finally {
      quitar();
    }
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a);
    expect(avisos).toBe(2); // ya no avisa: se desuscribió
  });

  it("un almacén roto no avisa (no llegó a guardarse nada)", () => {
    let avisos = 0;
    const quitar = suscribirseDecisionesVisita(() => {
      avisos++;
    });
    try {
      guardarDecisionAsistencia("cuenta-1", "e1", "voy", almacenRoto());
      expect(avisos).toBe(0);
    } finally {
      quitar();
    }
  });

  it("crudoDecisionesVisita cambia con cada escritura y vuelve a estar vacío tras borrar", () => {
    const a = almacen();
    expect(crudoDecisionesVisita(a)).toBe("");
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a);
    expect(crudoDecisionesVisita(a)).not.toBe("");
    borrarDecisionesVisita(a);
    expect(crudoDecisionesVisita(a)).toBe("");
  });

  it("sin almacén (servidor), siempre \"\": nunca truena al pintar en el servidor", () => {
    expect(crudoDecisionesVisita(null)).toBe("");
  });
});

describe("decisiones de visita — una decisión con tarjeta sobrevive a OTRA pantalla que confirme el mismo estado (OL-224)", () => {
  it("limpiarAsistenciasResueltas (Agenda, una ficha…) no borra una decisión con tarjeta aunque el estado ya coincida", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, tarjeta("e1", "2026-10-01T20:00:00Z"));
    // Agenda (u otra pantalla) carga fresca y ya trae e1: voy — antes se borraba aquí, perdiendo la tarjeta.
    limpiarAsistenciasResueltas("cuenta-1", { e1: "voy" }, a);
    expect(tarjetasTusPlanes("cuenta-1", [], AHORA, a).map((t) => t.id)).toEqual(["e1"]);
  });

  it("sin tarjeta, limpiarAsistenciasResueltas sigue limpiando igual que antes (sin cambio de comportamiento)", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a); // sin tarjeta: Agenda, Mi perfil…
    limpiarAsistenciasResueltas("cuenta-1", { e1: "voy" }, a);
    expect(corregirAsistencias("cuenta-1", {}, a)).toEqual({});
  });

  it("limpiarTarjetasTusPlanesResueltas sí la borra, cuando la propia fila de Tus planes ya trae el evento", () => {
    const a = almacen();
    const e1 = tarjeta("e1", "2026-10-01T20:00:00Z");
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, e1);
    limpiarTarjetasTusPlanesResueltas("cuenta-1", [e1], a); // la propia fila ya la trae: no hace falta agregarla de nuevo
    expect(tarjetasTusPlanes("cuenta-1", [e1], AHORA, a)).toEqual([e1]); // sin duplicar
    // Y ya no sobrevive a un servidor que la deje de traer (se limpió del todo, no solo la tarjeta):
    expect(tarjetasTusPlanes("cuenta-1", [], AHORA, a)).toEqual([]);
  });

  it("limpiarTarjetasTusPlanesResueltas no toca lo que el servidor de Tus planes todavía no trae", () => {
    const a = almacen();
    guardarDecisionAsistencia("cuenta-1", "e1", "voy", a, tarjeta("e1", "2026-10-01T20:00:00Z"));
    limpiarTarjetasTusPlanesResueltas("cuenta-1", [], a); // Tus planes sigue con su copia vieja, sin e1
    expect(tarjetasTusPlanes("cuenta-1", [], AHORA, a).map((t) => t.id)).toEqual(["e1"]);
  });

  it("limpiarTarjetasTusPlanesResueltas: sin cuenta, sin servidor o con almacén roto no rompe", () => {
    expect(() => limpiarTarjetasTusPlanesResueltas(null, [], almacen())).not.toThrow();
    expect(() => limpiarTarjetasTusPlanesResueltas("cuenta-1", null, almacen())).not.toThrow();
    expect(() => limpiarTarjetasTusPlanesResueltas("cuenta-1", [], almacenRoto())).not.toThrow();
  });
});
