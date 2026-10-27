import { describe, expect, it } from "vitest";
import { estadosFacebook } from "./datos";

/** OL-461 (bitácora 493): cómo va en Facebook cada evento ya publicado en Instagram, de sus intentos del más nuevo al más viejo. */
describe("estadosFacebook", () => {
  it("con uno publicado, publicado (aunque después fallara un reintento); si no, el último error", () => {
    const m = estadosFacebook([
      { evento_id: "a", estado: "error", error: "otro" },
      { evento_id: "a", estado: "publicada", error: null },
      { evento_id: "b", estado: "error", error: "permiso" },
      { evento_id: "b", estado: "error", error: "imagen" },
    ]);
    expect(m.get("a")).toEqual({ estado: "publicada" });
    expect(m.get("b")).toEqual({ estado: "error", error: "permiso" });
    expect(m.get("c")).toBeUndefined();
  });
  it("una clave desconocida no se toma por error", () => {
    expect(estadosFacebook([{ evento_id: "a", estado: "error", error: "cupo" }]).get("a")).toBeUndefined();
  });
});
