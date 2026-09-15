import { describe, expect, it } from "vitest";
import { enmascararCorreo, limpiarCodigo, motivoEntrar, tituloSeguir } from "./entrar";

const ID = "2a63c4d0-6a3e-4d75-bc67-8c3226d4401b";

describe("motivoEntrar", () => {
  it("dice para qué entra la persona y a dónde vuelve, sin la intención colgada", () => {
    expect(motivoEntrar(`/eventos/${ID}?accion=voy`)).toEqual({ tipo: "voy", titulo: "Entra para decir que vas", origen: `/eventos/${ID}` });
    expect(motivoEntrar(`/eventos/${ID}?accion=me_interesa`).tipo).toBe("interesa");
    expect(motivoEntrar(`/artistas/${ID}?accion=seguir`)).toEqual({ tipo: "seguir", titulo: "Entra para seguir", origen: `/artistas/${ID}`, tabla: "artistas", id: ID });
    expect(motivoEntrar(`/lugares/${ID}?accion=seguir`).tipo).toBe("seguir");
    expect(motivoEntrar(`/artistas/${ID}?accion=mio`).titulo).toBe("Entra para decir que eres tú");
  });
  it("publicar y registrar vuelven a su sección; perfil y sin destino, a Entrar a secas", () => {
    expect(motivoEntrar("/eventos/nuevo?lugar=abc")).toEqual({ tipo: "publicar", titulo: "Entra para publicar", origen: "/" });
    expect(motivoEntrar("/artistas/nuevo")).toEqual({ tipo: "registrar", titulo: "Entra para registrar un artista", origen: "/artistas" });
    expect(motivoEntrar("/lugares/nuevo").titulo).toBe("Entra para registrar un lugar");
    expect(motivoEntrar("/perfil")).toEqual({ tipo: "ninguno", titulo: "Entrar", origen: "/" });
    expect(motivoEntrar(`/eventos/${ID}`)).toEqual({ tipo: "ninguno", titulo: "Entrar", origen: `/eventos/${ID}` });
  });
  it("no se fía de un id que no es id", () => {
    expect(motivoEntrar("/artistas/x?accion=seguir").tipo).toBe("ninguno");
  });
});

describe("tituloSeguir, enmascararCorreo y limpiarCodigo", () => {
  it("arma los textos y limpia el código", () => {
    expect(tituloSeguir("Los Vecinos")).toBe("Entra para seguir a Los Vecinos");
    expect(tituloSeguir(null)).toBe("Entra para seguir");
    expect(enmascararCorreo("rosa@gmail.com")).toBe("ro…@gmail.com");
    expect(limpiarCodigo(" 12 34-56 78 9")).toBe("12345678");
    expect(limpiarCodigo("1234567", 6)).toBe("123456");
  });
});
