import { describe, expect, it } from "vitest";
import { operacionEvento } from "./operacionEvento";

describe("operacion del formulario", () => {
  it("reintentar conserva la clave aunque FormData ya la contenga", () => {
    const fd = new FormData();
    fd.set("titulo", "Concierto");
    const a = operacionEvento(fd, null);
    fd.set("operacion", a.id);
    expect(operacionEvento(fd, a)).toBe(a);
  });
  it("cambiar datos despues de un fallo usa otra clave", () => {
    const fd = new FormData();
    const a = operacionEvento(fd, null);
    fd.set("titulo", "Otro concierto");
    expect(operacionEvento(fd, a).id).not.toBe(a.id);
  });
});
