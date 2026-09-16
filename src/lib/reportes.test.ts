import { describe, expect, it } from "vitest";
import { etiquetaMotivo, pideLlevarLaFicha, validarReporte } from "./reportes";

describe("validarReporte", () => {
  const id = "2a63c4d0-6a3e-4d75-bc67-8c3226d4401b";
  it("acepta un reporte con motivo y limpia el detalle", () => {
    const r = validarReporte({ tipo: "evento", objeto_id: id, motivo: "duplicado", detalle: "  ya está   en la agenda " });
    expect(r.ok && r.datos).toEqual({ tipo: "evento", objeto_id: id, motivo: "duplicado", detalle: "ya está en la agenda" });
  });
  it("rechaza tipo, id o motivo inválidos", () => {
    expect(validarReporte({ tipo: "x", objeto_id: id, motivo: "otro" }).ok).toBe(false);
    expect(validarReporte({ tipo: "lugar", objeto_id: "nope", motivo: "otro" }).ok).toBe(false);
    expect(validarReporte({ tipo: "lugar", objeto_id: id, motivo: "porque sí" }).ok).toBe(false);
  });
  it("no acepta por el formulario los motivos de reclamo (los escribe su propia acción)", () => {
    expect(validarReporte({ tipo: "lugar", objeto_id: id, motivo: "es_mio" }).ok).toBe(false);
  });
});

describe("etiquetaMotivo", () => {
  it("lee el reclamo según la ficha de la que viene", () => {
    expect(etiquetaMotivo("es_mio", "lugar")).toBe("Dice que es su espacio y quiere llevar la ficha");
    expect(etiquetaMotivo("retirar", "lugar")).toBe("Dice que es su espacio y pide que se quite");
    expect(etiquetaMotivo("es_mio", "artista")).toBe("Dice que es él o su grupo y quiere llevar la ficha");
  });
  it("sin tipo, o con uno que no se reclama, se lee como el de artista", () => {
    expect(etiquetaMotivo("es_mio")).toBe("Dice que es él o su grupo y quiere llevar la ficha");
    expect(etiquetaMotivo("retirar", "evento")).toBe("Dice que es él o su grupo y pide que se quite");
  });
  it("los motivos de reportar no cambian con la ficha, y lo desconocido se dice tal cual", () => {
    expect(etiquetaMotivo("duplicado", "lugar")).toBe("Está repetido");
    expect(etiquetaMotivo("vaya usted a saber")).toBe("vaya usted a saber");
  });
});

describe("pideLlevarLaFicha", () => {
  it("solo con 'es_mio' y en las fichas que se reclaman: artista y lugar", () => {
    expect(pideLlevarLaFicha("lugar", "es_mio")).toBe(true);
    expect(pideLlevarLaFicha("artista", "es_mio")).toBe(true);
    expect(pideLlevarLaFicha("lugar", "retirar")).toBe(false);
    expect(pideLlevarLaFicha("evento", "es_mio")).toBe(false);
    expect(pideLlevarLaFicha("perfil", "es_mio")).toBe(false);
  });
});
