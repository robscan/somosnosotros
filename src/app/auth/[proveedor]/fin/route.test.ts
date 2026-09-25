import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { clienteServidor } from "@/lib/supabase/servidor";
import { COOKIE_ENTRAR, codificarIntento, nuevoIntento } from "@/lib/entrarCon";

vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn() }));
const cliente = vi.mocked(clienteServidor);
beforeEach(() => vi.resetAllMocks());

function peticion(intento: ReturnType<typeof nuevoIntento>, campos: Record<string, string>) {
  const body = new URLSearchParams(campos).toString();
  const request = new NextRequest("https://somosnosotros.org/auth/google/fin", { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded", cookie: `${COOKIE_ENTRAR}=${codificarIntento(intento)}` } });
  return POST(request, { params: Promise.resolve({ proveedor: "google" }) });
}

/**
 * Cuando el toque salió del envoltorio de iPhone (OL-194: `?app=1` en la ida, `enApp` en el intento), la vuelta con
 * sesión ya puesta no va directo a `siguiente`: pasa por `/auth/app-vuelta` (destinoTrasEntrar), la única ruta que
 * la app reclama como enlace universal. Fuera de la app, sigue yendo directo, como siempre.
 */
it("con enApp, vuelve por /auth/app-vuelta en vez de directo a siguiente", async () => {
  cliente.mockResolvedValue({ auth: { signInWithIdToken: vi.fn().mockResolvedValue({ data: { user: { id: "u1", email: "a@a.com" }, session: { access_token: "t" } }, error: null }) } } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  const i = nuevoIntento("google", "/eventos/abc?accion=voy", Date.now(), true);
  const respuesta = await peticion(i, { state: i.estado, id_token: "tok" });
  expect(respuesta.status).toBe(303);
  expect(respuesta.headers.get("location")).toBe("https://somosnosotros.org/auth/app-vuelta?siguiente=%2Feventos%2Fabc%3Faccion%3Dvoy");
});

it("sin enApp, vuelve directo a siguiente, igual que hoy en la web normal", async () => {
  cliente.mockResolvedValue({ auth: { signInWithIdToken: vi.fn().mockResolvedValue({ data: { user: { id: "u1", email: "a@a.com" }, session: { access_token: "t" } }, error: null }) } } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  const i = nuevoIntento("google", "/eventos/abc?accion=voy", Date.now(), false);
  const respuesta = await peticion(i, { state: i.estado, id_token: "tok" });
  expect(respuesta.headers.get("location")).toBe("https://somosnosotros.org/eventos/abc?accion=voy");
});

it("si falla entrar, vuelve a /entrar aunque venga de la app (no hay sesión que completar)", async () => {
  cliente.mockResolvedValue({ auth: { signInWithIdToken: vi.fn().mockResolvedValue({ data: null, error: { message: "no" } }) } } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  const i = nuevoIntento("google", "/perfil", Date.now(), true);
  const respuesta = await peticion(i, { state: i.estado, id_token: "tok" });
  expect(respuesta.headers.get("location")).toBe("https://somosnosotros.org/entrar?siguiente=%2Fperfil&error=google");
});
