import { describe, expect, it } from "vitest";
import {
  borrarDecisionesVisita,
  corregirAsistencias,
  corregirSeguidos,
  guardarDecisionAsistencia,
  guardarDecisionSeguir,
  limpiarAsistenciasResueltas,
  limpiarSeguidosResueltos,
  type Almacen,
} from "./decisionesVisita";

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
