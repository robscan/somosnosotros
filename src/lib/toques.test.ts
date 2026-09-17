import { describe, expect, it } from "vitest";
import { alRecibir, elegir, esElUltimo, siSigueSiendoElUltimo, tocar, trasGuardar, type Elegidas, type Toques } from "./toques";

type Asistencia = "voy" | "me_interesa" | null;

/** Un renglón de prueba: lo que haría el hook con cada toque y con cada guardado que termina. */
function renglon() {
  const toques: Toques = {};
  let elegidas: Elegidas<Asistencia> = {};
  const preguntas: number[] = [];
  const reintentos: (() => void)[] = [];
  return {
    tocar(valor: Asistencia) {
      const vez = tocar(toques, "e");
      elegidas = elegir(elegidas, "e", valor, vez);
      return vez;
    },
    /** Termina el guardado del toque `vez`, como en useAsistenciaEnLista. */
    terminar(vez: number, valor: Asistencia, guardado: boolean) {
      if (!esElUltimo(toques, "e", vez)) return;
      elegidas = trasGuardar(elegidas, "e", vez, guardado);
      if (!guardado) reintentos.push(siSigueSiendoElUltimo(toques, "e", vez, () => this.tocar(valor)));
      else if (valor === "voy") preguntas.push(vez);
    },
    recibir() {
      elegidas = alRecibir(elegidas);
    },
    get muestra() {
      return elegidas.e?.valor;
    },
    toques,
    preguntas,
    reintentos,
  };
}

describe("toques en un renglón", () => {
  it("la pregunta de avisos no sale para un Voy que ya se deshizo", () => {
    const r = renglon();
    const voy = r.tocar("voy");
    const deshacer = r.tocar(null);
    r.terminar(voy, "voy", true); // llega el Voy guardado, pero ya se tocó Deshacer
    expect(r.preguntas).toEqual([]);
    expect(r.muestra).toBeNull();
    r.terminar(deshacer, null, true);
    expect(r.preguntas).toEqual([]);
  });

  it("un Voy que sigue siendo el último pregunta una vez guardado", () => {
    const r = renglon();
    const voy = r.tocar("voy");
    r.terminar(voy, "voy", true);
    expect(r.preguntas).toEqual([voy]);
  });

  it("si falla un toque viejo no se ofrece Reintentar ni se quita lo nuevo", () => {
    const r = renglon();
    const voy = r.tocar("voy");
    const interesa = r.tocar("me_interesa");
    r.terminar(voy, "voy", false); // T1 falla con T2 ya tocado
    expect(r.reintentos).toHaveLength(0);
    expect(r.muestra).toBe("me_interesa");
    r.terminar(interesa, "me_interesa", true);
    expect(r.muestra).toBe("me_interesa");
  });

  it("Reintentar de un toque viejo no pisa uno nuevo", () => {
    const r = renglon();
    const voy = r.tocar("voy");
    r.terminar(voy, "voy", false); // T1 falla: se ofrece Reintentar
    expect(r.reintentos).toHaveLength(1);
    expect(r.muestra).toBeUndefined();
    const interesa = r.tocar("me_interesa"); // T2 se toca y se guarda
    r.terminar(interesa, "me_interesa", true);
    r.reintentos[0](); // Reintentar de T1, ya viejo
    expect(r.muestra).toBe("me_interesa");
    expect(r.toques.e).toBe(interesa);
  });

  it("Reintentar del último toque vuelve a aplicar su decisión", () => {
    const r = renglon();
    const voy = r.tocar("voy");
    r.terminar(voy, "voy", false);
    r.reintentos[0]();
    expect(r.muestra).toBe("voy");
    expect(r.toques.e).toBe(voy + 1);
  });

  it("Voy · No voy · Voy: que falle o llegue el primero no borra el Vas del tercero", () => {
    const r = renglon();
    const a1 = r.tocar("voy");
    const b = r.tocar(null);
    const a2 = r.tocar("voy");
    r.terminar(a1, "voy", false);
    expect(r.muestra).toBe("voy");
    r.terminar(b, null, true);
    r.recibir(); // llegan los datos del No voy: lo del tercer toque sigue encima
    expect(r.muestra).toBe("voy");
    r.terminar(a2, "voy", true);
    expect(r.preguntas).toEqual([a2]);
    r.recibir(); // ya guardado: se toma del servidor
    expect(r.muestra).toBeUndefined();
  });

  it("los toques de un renglón no afectan a otro", () => {
    const toques: Toques = {};
    const x = tocar(toques, "x");
    tocar(toques, "y");
    expect(esElUltimo(toques, "x", x)).toBe(true);
  });
});

/** La barra de una ficha (Asistencia, Seguir): lo que hace `cambiar` con cada toque, guardando al momento. */
function ficha<V>(inicial: V) {
  const toques: Toques = {};
  const f = {
    servidor: inicial,
    aviso: null as { vez: number; reintentar: () => void } | null,
    cambiar(valor: V, seGuarda: boolean) {
      const vez = tocar(toques, "ficha");
      f.aviso = null; // cada toque nuevo cierra el aviso de un fallo anterior
      if (seGuarda) f.servidor = valor;
      if (!esElUltimo(toques, "ficha", vez)) return;
      if (!seGuarda) f.aviso = { vez, reintentar: siSigueSiendoElUltimo(toques, "ficha", vez, () => f.cambiar(valor, true)) };
    },
  };
  return f;
}

describe("toques en la barra de una ficha", () => {
  it("evento: Me interesa falla y Voy se guarda; el aviso se cierra y su Reintentar ya no pisa el Voy", () => {
    const f = ficha<Asistencia>(null);
    f.cambiar("me_interesa", false);
    const viejo = f.aviso;
    expect(viejo).not.toBeNull();
    f.cambiar("voy", true);
    expect(f.aviso).toBeNull();
    viejo?.reintentar();
    expect(f.servidor).toBe("voy");
  });

  it("lugar: Seguir falla, Seguir se guarda y Dejar de seguir se guarda; el Reintentar viejo no vuelve a seguir", () => {
    const f = ficha(false);
    f.cambiar(true, false);
    const viejo = f.aviso;
    f.cambiar(true, true);
    f.cambiar(false, true);
    viejo?.reintentar();
    expect(f.servidor).toBe(false);
    expect(f.aviso).toBeNull();
  });

  it("el Reintentar del último fallo sí guarda", () => {
    const f = ficha(false);
    f.cambiar(true, false);
    f.aviso?.reintentar();
    expect(f.servidor).toBe(true);
    expect(f.aviso).toBeNull();
  });
});
