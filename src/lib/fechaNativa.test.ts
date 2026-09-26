import { describe, expect, it } from "vitest";
import { ESTADO_INICIAL_FECHA_NATIVA, type EstadoFechaNativa, siguienteEstadoFechaNativa } from "./fechaNativa";

const HOY = "2026-09-25";

/** Aplica una secuencia de eventos desde el estado inicial y regresa cada `aplicar` en orden. */
function correr(eventos: Parameters<typeof siguienteEstadoFechaNativa>[1][]): (string | null)[] {
  let estado: EstadoFechaNativa = ESTADO_INICIAL_FECHA_NATIVA;
  const aplicados: (string | null)[] = [];
  for (const evento of eventos) {
    const r = siguienteEstadoFechaNativa(estado, evento);
    estado = r.estado;
    aplicados.push(r.aplicar);
  }
  return aplicados;
}

describe("fechaNativa (OL-204, regresión de OL-188)", () => {
  it("Safari de iPhone: abrir dispara `change` con hoy, pero no se aplica hasta cerrar (blur)", () => {
    const [, alCambiar, alCerrar] = correr([{ tipo: "focus" }, { tipo: "change", valor: HOY }, { tipo: "blur" }]);
    expect(alCambiar).toBe(null); // el bug era aplicar aquí, al solo abrir
    expect(alCerrar).toBe(HOY);
  });

  it("cancelar sin elegir (blur sin change antes) no filtra", () => {
    const [, alCerrar] = correr([{ tipo: "focus" }, { tipo: "blur" }]);
    expect(alCerrar).toBe(null);
  });

  it("elegir otro día antes de cerrar: se aplica ese, no hoy", () => {
    const eventos = correr([{ tipo: "focus" }, { tipo: "change", valor: HOY }, { tipo: "change", valor: "2026-10-01" }, { tipo: "blur" }]);
    expect(eventos.at(-1)).toBe("2026-10-01");
  });

  it("Chrome de Android: el `blur` del diálogo puede llegar antes que el `change` con lo elegido", () => {
    const [, alCerrar, alCambiarTarde] = correr([{ tipo: "focus" }, { tipo: "blur" }, { tipo: "change", valor: HOY }]);
    expect(alCerrar).toBe(null); // nada pendiente todavía cuando cerró
    expect(alCambiarTarde).toBe(HOY); // se aplica cuando por fin llega el valor
  });

  it("no aplica dos veces aunque lleguen eventos de más tras aplicar", () => {
    const eventos = correr([
      { tipo: "focus" },
      { tipo: "change", valor: HOY },
      { tipo: "blur" }, // aplica aquí
      { tipo: "change", valor: "2026-10-01" }, // tardío, ya aplicado: se ignora
      { tipo: "blur" }, // blur repetido: se ignora
    ]);
    expect(eventos.filter((v) => v !== null)).toEqual([HOY]);
  });

  it("un `focus` de más a mitad de la misma apertura no borra lo pendiente (Chrome de escritorio: fijar por código el valor de un input con foco dispara un `focus` extra)", () => {
    const eventos = correr([
      { tipo: "focus" },
      { tipo: "change", valor: HOY }, // pendiente = hoy
      { tipo: "focus" }, // extra, sin que el foco haya salido de verdad
      { tipo: "blur" },
    ]);
    expect(eventos.at(-1)).toBe(HOY); // si el focus de más borrara lo pendiente, aquí sería null
  });

  it("una nueva apertura (`focus`) olvida lo de la apertura anterior", () => {
    const eventos = correr([
      { tipo: "focus" },
      { tipo: "change", valor: HOY },
      { tipo: "blur" }, // aplica hoy
      { tipo: "focus" }, // reabrir
      { tipo: "blur" }, // cancelar esta vez, sin elegir
    ]);
    expect(eventos).toEqual([null, null, HOY, null, null]);
  });
});
