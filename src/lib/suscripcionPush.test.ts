import { describe, expect, it } from "vitest";
import { endpointPushPermitido, validarSuscripcionPush } from "./suscripcionPush";

const keys = { p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"), auth: Buffer.alloc(16).toString("base64url") };

describe("suscripciones push", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc-_:123",
    "https://fcm.googleapis.com/wp/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/Qabc",
    "https://wns2-abc.notify.windows.com/w/?token=ab%2Bcd%3D",
  ])("acepta un proveedor permitido: %s", (endpoint) => {
    expect(endpointPushPermitido(endpoint)).toBe(true);
    expect(validarSuscripcionPush({ endpoint, keys })).toEqual({ endpoint, keys });
  });

  it.each([
    "https://example.invalid/push", "https://127.0.0.1/push", "https://[::1]/push",
    "http://fcm.googleapis.com/push", "https://fcm.googleapis.com.ejemplo.invalid/push",
    "https://fcm.googleapis.com@ejemplo.invalid/push", "https://usuario@fcm.googleapis.com/push",
    "https://fcm.googleapis.com:443/push", "https://fcm.googleapis.com:8080/push",
    "https://fcm.googleapis.com./push", "https://fcm.googleapis.com/push#fragmento",
    "https://fcm.googleapis.com/push\\otra", "https://fcm.googleapis.com/push\n",
    "https://fcm.googleapis.com/push\u0000", "https://fcm.googleapis.com/", "https://fcm.googleapis.com",
    "https://fcm.googleapis.com/ñ", "https://fcm.googleapis.com/push con espacios",
    `https://fcm.googleapis.com/${"a".repeat(4096)}`,
  ])("rechaza un destino no permitido: %s", (endpoint) => {
    expect(endpointPushPermitido(endpoint)).toBe(false);
    expect(validarSuscripcionPush({ endpoint, keys })).toBeNull();
  });

  it.each([null, {}, { keys }, { endpoint: "https://fcm.googleapis.com/a" }, { endpoint: 12, keys },
    { endpoint: "https://fcm.googleapis.com/a", keys: { ...keys, auth: "a" } },
    { endpoint: "https://fcm.googleapis.com/a", keys: { ...keys, p256dh: "a".repeat(87) } },
  ])("rechaza entrada o llaves incompletas sin lanzar", (entrada) => {
    expect(validarSuscripcionPush(entrada)).toBeNull();
  });
});
