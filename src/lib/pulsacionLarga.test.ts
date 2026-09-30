import { describe, expect, it } from "vitest";
import { ANILLO_DESDE_MS, avanzar, DOBLE_TOQUE_MS, EN_REPOSO, type Entrada, RETENCION_MS, TOLERANCIA_PX } from "./pulsacionLarga";

/** Cuenta la historia de un gesto y devuelve cada vez que la máquina dijo «pulsación larga», con su punto. */
function disparos(...historia: Entrada[]) {
  let estado = EN_REPOSO;
  const larga = [];
  for (const entrada of historia) {
    const r = avanzar(estado, entrada);
    estado = r.estado;
    if (r.larga) larga.push(r.larga);
  }
  return larga;
}

const baja = (t: number, x = 100, y = 200, dedos = 1): Entrada => ({ tipo: "bajar", t, x, y, dedos });
const mueve = (x: number, y: number, dedos = 1): Entrada => ({ tipo: "mover", x, y, dedos });
const sube = (t: number, dedos = 0): Entrada => ({ tipo: "subir", t, dedos });
const cancela: Entrada = { tipo: "cancelar" };
const pasaElTiempo: Entrada = { tipo: "retencion" };

describe("pulsación larga del mapa (ajuste 9 del founder)", () => {
  it("las medidas son las pedidas: 500 ms, 10 px, doble toque a 300 ms, anillo desde los 150", () => {
    expect([RETENCION_MS, TOLERANCIA_PX, DOBLE_TOQUE_MS, ANILLO_DESDE_MS]).toEqual([500, 10, 300, 150]);
  });

  it("un dedo quieto los 500 ms dispara, una sola vez, en el punto donde bajó", () => {
    expect(disparos(baja(0), pasaElTiempo)).toEqual([{ x: 100, y: 200 }]);
    expect(disparos(baja(0), pasaElTiempo, pasaElTiempo, mueve(100, 200), sube(700))).toHaveLength(1);
  });

  it("con 5 px de deriva y sostenido dispara, donde quedó el dedo", () => {
    expect(disparos(baja(0), mueve(103, 204), pasaElTiempo)).toEqual([{ x: 103, y: 204 }]);
  });

  it("moverse 12 px a los 200 ms no dispara (es un arrastre)", () => {
    expect(disparos(baja(0), mueve(100, 212), pasaElTiempo)).toEqual([]);
    // Ni aunque el dedo vuelva al punto: el arrastre ya empezó.
    expect(disparos(baja(0), mueve(100, 212), mueve(100, 200), pasaElTiempo)).toEqual([]);
  });

  it("el segundo dedo no dispara, ni siquiera el que ya estaba, y no se arma otra vez hasta que levantan los dos", () => {
    expect(disparos(baja(0), baja(300, 200, 200, 2), pasaElTiempo)).toEqual([]);
    expect(disparos(baja(0), baja(300, 200, 200, 2), sube(350, 1), pasaElTiempo)).toEqual([]);
    expect(disparos(baja(0), baja(300, 200, 200, 2), sube(350, 1), mueve(100, 200), pasaElTiempo)).toEqual([]);
    // Con los dos dedos arriba, un gesto nuevo vuelve a valer.
    expect(disparos(baja(0), baja(300, 200, 200, 2), sube(350, 1), sube(380), baja(1000), pasaElTiempo)).toHaveLength(1);
  });

  it("levantar a los 400 ms no dispara, y un aviso de tiempo tardío tampoco", () => {
    expect(disparos(baja(0), sube(400), pasaElTiempo)).toEqual([]);
  });

  it("el segundo toque de un doble toque no dispara, sostenido o no", () => {
    expect(disparos(baja(0), sube(80), baja(200), pasaElTiempo)).toEqual([]);
    expect(disparos(baja(0), sube(80), baja(200), mueve(100, 230), pasaElTiempo)).toEqual([]);
    // A 300 ms del anterior ya no es un doble toque.
    expect(disparos(baja(0), sube(80), baja(80 + DOBLE_TOQUE_MS), pasaElTiempo)).toHaveLength(1);
    expect(disparos(baja(0), sube(80), baja(80 + DOBLE_TOQUE_MS - 1), pasaElTiempo)).toEqual([]);
  });

  it("touchcancel, o el mapa que empieza a moverse (dragstart, zoomstart, rotatestart, pitchstart), cancelan aunque el dedo siga puesto", () => {
    expect(disparos(baja(0), cancela, pasaElTiempo)).toEqual([]);
    expect(disparos(baja(0), cancela, mueve(100, 200), pasaElTiempo)).toEqual([]);
  });

  it("tras un disparo, mover o soltar no vuelve a disparar, y el gesto siguiente sí", () => {
    expect(disparos(baja(0), pasaElTiempo, mueve(100, 260), pasaElTiempo, sube(900))).toHaveLength(1);
    expect(disparos(baja(0), pasaElTiempo, sube(900), baja(2000), pasaElTiempo)).toHaveLength(2);
  });

  it("el aviso de tiempo sin ningún dedo no hace nada", () => {
    expect(disparos(pasaElTiempo)).toEqual([]);
    expect(disparos(baja(0), sube(50), pasaElTiempo, pasaElTiempo)).toEqual([]);
  });
});
