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

type Componente = { "/": string; exclude?: boolean };

/** Como lo lee iOS: gana el primer componente que coincide; `*` es cualquier tramo y `?` un carácter. */
function abreLaApp(componentes: Componente[], ruta: string): boolean {
  for (const c of componentes) {
    const patron = c["/"].replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    if (new RegExp(`^${patron}$`).test(ruta)) return !c.exclude;
  }
  return false;
}

it("reclama todo el sitio con el Team ID y el identificador de la app (OL-223: el QR de Pincel abría Safari)", async () => {
  const datos = await (await GET()).json();
  const [detalle] = datos.applinks.details;
  expect(detalle.appIDs).toEqual(["AT53235M7U.org.somosnosotros.app"]);
  expect(datos.webcredentials.apps).toEqual(["AT53235M7U.org.somosnosotros.app"]);
  for (const ruta of ["/", "/obra/9f1c/mando", "/eventos/concierto-en-el-jardin", "/lugares/museo-leonora-carrington", "/artistas/ana", "/agenda", "/ajustes"]) {
    expect(abreLaApp(detalle.components, ruta), ruta).toBe(true);
  }
});

it("deja en el navegador entrar, la API, la baja de avisos y el .ics del calendario", async () => {
  const [detalle] = (await (await GET()).json()).applinks.details;
  for (const ruta of ["/auth/callback", "/auth/app-regreso", "/auth/google/fin", "/api/estado", "/avisos/baja", "/eventos/concierto-en-el-jardin/calendario"]) {
    expect(abreLaApp(detalle.components, ruta), ruta).toBe(false);
  }
});
