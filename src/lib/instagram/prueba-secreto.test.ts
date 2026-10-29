import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { conPrueba, pruebaDeSecreto, secretoDeApp } from "./prueba-secreto";

// OL-484 (bitácora 516): `appsecret_proof`. Todo inventado: nunca un token ni un secreto de verdad.
const TOKEN = "TOKEN-SECRETO-DE-PRUEBA";
const SECRETO = "secreto-de-app-inventado-484";
/** HMAC-SHA256(llave = SECRETO, mensaje = TOKEN) en hexadecimal, calculado una vez con `crypto` y fijado aquí. */
const VECTOR = "4cd70800af6d0e6a3189def5a8ca3cbde5bf3b352824f5334a284ba87b53045d";

describe("appsecret_proof", () => {
  it("es el HMAC-SHA256 del token con el secreto, en hexadecimal (vector conocido)", () => {
    expect(pruebaDeSecreto(TOKEN, SECRETO)).toBe(VECTOR);
    expect(createHmac("sha256", SECRETO).update(TOKEN).digest("hex")).toBe(VECTOR);
    expect(pruebaDeSecreto(`${TOKEN}x`, SECRETO)).not.toBe(VECTOR);
    expect(pruebaDeSecreto(TOKEN, `${SECRETO}x`)).not.toBe(VECTOR);
  });
  it("el secreto sale de META_APP_SECRET; vacío o ausente, null", () => {
    expect(secretoDeApp({ META_APP_SECRET: SECRETO })).toBe(SECRETO);
    expect(secretoDeApp({ META_APP_SECRET: "  " })).toBeNull();
    expect(secretoDeApp({ CRON_SECRET: SECRETO })).toBeNull();
  });
  it("con secreto: token y prueba; sin secreto: solo el token, sinPrueba y una línea en el registro sin valores", () => {
    expect(conPrueba({ fields: "id" }, TOKEN, SECRETO)).toEqual({ params: { fields: "id", access_token: TOKEN, appsecret_proof: VECTOR }, sinPrueba: false });
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(conPrueba({ fields: "id" }, TOKEN, null)).toEqual({ params: { fields: "id", access_token: TOKEN }, sinPrueba: true });
    conPrueba({}, TOKEN, null);
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(String(aviso.mock.calls[0][0])).not.toContain(TOKEN);
    aviso.mockRestore();
  });
  it("nunca lleva appsecret_time", () => {
    expect(conPrueba({}, TOKEN, SECRETO).params).not.toHaveProperty("appsecret_time");
  });
});
