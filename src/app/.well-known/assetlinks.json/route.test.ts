import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { GET } from "./route";

/**
 * assetlinks.json (OL-192, §9 de docs/rediseno/47-app-ios.md): sin esto, o servido mal, la app de Android abre la
 * web con la barra de direcciones de Chrome y los enlaces compartidos no la abren.
 */
it("responde JSON sin redirección y con el Content-Type que pide Android", async () => {
  const respuesta = await GET();
  expect(respuesta.status).toBe(200);
  expect(respuesta.headers.get("content-type")).toBe("application/json");
  expect(respuesta.headers.get("location")).toBeNull();
});

it("declara el paquete de la app con permiso para todos los enlaces del sitio", async () => {
  const datos = await (await GET()).json();
  expect(datos).toHaveLength(1);
  expect(datos[0].relation).toEqual(["delegate_permission/common.handle_all_urls"]);
  expect(datos[0].target.namespace).toBe("android_app");
  expect(datos[0].target.package_name).toBe("org.somosnosotros.app");
});

it("lleva las dos huellas, la de la llave de subida y la de firma de Google, en formato SHA-256 y sin repetirse", async () => {
  const [{ target }] = await (await GET()).json();
  const huellas: string[] = target.sha256_cert_fingerprints;
  expect(huellas).toEqual([
    "BC:BE:8F:FB:71:A6:B0:B9:0A:07:3A:F4:13:AB:45:64:1F:A4:A5:9E:9F:6F:51:6C:B0:3E:82:5E:D7:6E:40:50",
    "D6:F9:F9:04:10:B8:E0:A1:8E:F2:B9:08:83:22:83:89:72:88:4E:6E:3D:78:12:5C:19:DD:73:71:07:3B:2C:8F",
  ]);
  for (const h of huellas) expect(h).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  expect(new Set(huellas).size).toBe(huellas.length);
});

it("el paquete coincide con el del envoltorio (apps/android/twa-manifest.json)", async () => {
  const twa = JSON.parse(readFileSync("apps/android/twa-manifest.json", "utf8"));
  const [{ target }] = await (await GET()).json();
  expect(target.package_name).toBe(twa.packageId);
  expect(twa.host).toBe("somosnosotros.org");
});
