import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { clienteServidor } from "@/lib/supabase/servidor";
import { clienteAdmin } from "@/lib/supabase/admin";
import { COOKIE_ENTRAR, codificarIntento, nuevoIntento } from "@/lib/entrarCon";

vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: vi.fn() }));
const cliente = vi.mocked(clienteServidor);
const admin = vi.mocked(clienteAdmin);
beforeEach(() => vi.resetAllMocks());

function peticion(intento: ReturnType<typeof nuevoIntento>, campos: Record<string, string>) {
  const body = new URLSearchParams(campos).toString();
  const request = new NextRequest("https://somosnosotros.org/auth/google/fin", { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded", cookie: `${COOKIE_ENTRAR}=${codificarIntento(intento)}` } });
  return POST(request, { params: Promise.resolve({ proveedor: "google" }) });
}

function conSesion(email = "persona@example.com") {
  cliente.mockResolvedValue({ auth: { signInWithIdToken: vi.fn().mockResolvedValue({ data: { user: { id: "u1", email }, session: { access_token: "t" } }, error: null }) } } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
}

/**
 * Cuando el toque salió del envoltorio de iPhone (OL-194: `?app=1` en la ida, `enApp` en el intento), la vuelta con
 * sesión ya puesta no va directo a `siguiente`: la sesión que acaba de poner Supabase queda en las cookies de la
 * `ASWebAuthenticationSession` (comparte las de Safari), no en el WKWebView de la app (corrección del gestor,
 * bitácora 228). En vez de eso se genera, con el cliente de servicio, un enlace mágico de un solo uso (sin
 * enviarlo por correo) y se manda su token por el esquema propio "somosnosotros://" (ver `urlAppTrasEntrar` en
 * src/lib/entrarCon.ts). Fuera de la app, sigue yendo directo a `siguiente`, como siempre.
 */
it("con enApp, genera un enlace de un solo uso y vuelve por el esquema propio, no directo a siguiente", async () => {
  conSesion("persona@example.com");
  const generateLink = vi.fn().mockResolvedValue({ data: { properties: { hashed_token: "el-token" } }, error: null });
  admin.mockReturnValue({ auth: { admin: { generateLink } } } as unknown as NonNullable<ReturnType<typeof clienteAdmin>>);
  const i = nuevoIntento("google", "/eventos/abc?accion=voy", Date.now(), true);
  const respuesta = await peticion(i, { state: i.estado, id_token: "tok" });
  expect(generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "persona@example.com" });
  expect(respuesta.status).toBe(303);
  expect(respuesta.headers.get("location")).toBe("somosnosotros://auth?token_hash=el-token&siguiente=%2Feventos%2Fabc%3Faccion%3Dvoy");
});

it("con enApp, si el enlace de un solo uso no se pudo generar, avisa el fallo por el esquema propio", async () => {
  conSesion();
  admin.mockReturnValue({ auth: { admin: { generateLink: vi.fn().mockResolvedValue({ data: null, error: { message: "no" } }) } } } as unknown as NonNullable<ReturnType<typeof clienteAdmin>>);
  const i = nuevoIntento("google", "/perfil", Date.now(), true);
  const respuesta = await peticion(i, { state: i.estado, id_token: "tok" });
  expect(respuesta.headers.get("location")).toBe("somosnosotros://auth?error=1");
});

it("sin enApp, vuelve directo a siguiente, igual que hoy en la web normal (no toca el cliente de servicio)", async () => {
  conSesion();
  const i = nuevoIntento("google", "/eventos/abc?accion=voy", Date.now(), false);
  const respuesta = await peticion(i, { state: i.estado, id_token: "tok" });
  expect(respuesta.headers.get("location")).toBe("https://somosnosotros.org/eventos/abc?accion=voy");
  expect(admin).not.toHaveBeenCalled();
});

it("si falla entrar, vuelve a /entrar aunque venga de la app (no hay sesión que completar)", async () => {
  cliente.mockResolvedValue({ auth: { signInWithIdToken: vi.fn().mockResolvedValue({ data: null, error: { message: "no" } }) } } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  const i = nuevoIntento("google", "/perfil", Date.now(), true);
  const respuesta = await peticion(i, { state: i.estado, id_token: "tok" });
  expect(respuesta.headers.get("location")).toBe("https://somosnosotros.org/entrar?siguiente=%2Fperfil&error=google");
});
