import { expect, it } from "vitest";
import { GET } from "./route";

/**
 * apple-app-site-association (OL-194, §9 de docs/rediseno/47-app-ios.md): sin esto, o servido mal, ningún enlace
 * compartido (SMS, WhatsApp) abre la app instalada — Apple exige HTTPS, sin redirección y Content-Type exacto.
 */
it("responde JSON sin redirección, con el Content-Type exacto que pide Apple", async () => {
  const respuesta = await GET();
  expect(respuesta.status).toBe(200);
  expect(respuesta.headers.get("content-type")).toBe("application/json");
  expect(respuesta.headers.get("location")).toBeNull();
});

it("reclama fichas (eventos, lugares, artistas) con el Team ID y el identificador de la app, y no /auth/* (corrección del gestor: entrar ya no depende de un enlace universal)", async () => {
  const datos = await (await GET()).json();
  const [detalle] = datos.applinks.details;
  expect(detalle.appIDs).toEqual(["AT53235M7U.org.somosnosotros.app"]);
  const rutas = detalle.components.map((c: { "/": string }) => c["/"]);
  expect(rutas).toEqual(["/eventos/*", "/lugares/*", "/artistas/*"]);
  expect(datos.webcredentials.apps).toEqual(["AT53235M7U.org.somosnosotros.app"]);
});
