import { NextRequest } from "next/server";
import { expect, it } from "vitest";
import { GET } from "./route";

/**
 * Ruta puente para la vuelta del envoltorio de iPhone (OL-194): ver el comentario en route.ts y en
 * `destinoTrasEntrar` (src/lib/entrarCon.ts). Aquí solo se prueba que redirige bien y con una ruta segura.
 */
it("redirige a siguiente", async () => {
  const respuesta = await GET(new NextRequest("https://somosnosotros.org/auth/app-vuelta?siguiente=%2Fperfil"));
  expect(respuesta.status).toBe(303);
  expect(respuesta.headers.get("location")).toBe("https://somosnosotros.org/perfil");
});

it("sin siguiente, o con uno externo, cae a /perfil (rutaSegura)", async () => {
  expect((await GET(new NextRequest("https://somosnosotros.org/auth/app-vuelta"))).headers.get("location")).toBe("https://somosnosotros.org/perfil");
  expect((await GET(new NextRequest("https://somosnosotros.org/auth/app-vuelta?siguiente=https%3A%2F%2Fmalo.com"))).headers.get("location")).toBe("https://somosnosotros.org/perfil");
});
