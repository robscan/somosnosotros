import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { clienteServidor } from "@/lib/supabase/servidor";

vi.mock("@/lib/supabase/servidor", async () => {
  const real = await vi.importActual<typeof import("@/lib/supabase/servidor")>("@/lib/supabase/servidor");
  return { ...real, clienteServidor: vi.fn() };
});
const cliente = vi.mocked(clienteServidor);
beforeEach(() => vi.resetAllMocks());

/**
 * Ruta puente para la vuelta del envoltorio de iPhone (OL-194, corrección del gestor): confirma el enlace mágico de
 * un solo uso que arma /auth/[proveedor]/fin (urlAppTrasEntrar) y solo entonces deja pasar a `siguiente`; ver el
 * comentario en route.ts.
 */
it("con un token_hash válido, confirma el enlace (deja la sesión en cookies) y sigue a siguiente", async () => {
  const verifyOtp = vi.fn().mockResolvedValue({ error: null });
  cliente.mockResolvedValue({ auth: { verifyOtp } } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  const respuesta = await GET(new NextRequest("https://somosnosotros.org/auth/app-vuelta?token_hash=el-token&siguiente=%2Fperfil"));
  expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "el-token", type: "magiclink" });
  expect(respuesta.status).toBe(303);
  expect(respuesta.headers.get("location")).toBe("https://somosnosotros.org/perfil");
});

it("con un token_hash inválido o vencido, vuelve a Entrar con un aviso, no deja a la persona varada", async () => {
  const verifyOtp = vi.fn().mockResolvedValue({ error: { message: "token expirado" } });
  cliente.mockResolvedValue({ auth: { verifyOtp } } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  const respuesta = await GET(new NextRequest("https://somosnosotros.org/auth/app-vuelta?token_hash=vencido&siguiente=%2Fperfil"));
  expect(respuesta.headers.get("location")).toBe("https://somosnosotros.org/entrar?error=enlace");
});

it("sin token_hash no llama a Supabase: vuelve a Entrar con un aviso directo", async () => {
  expect((await GET(new NextRequest("https://somosnosotros.org/auth/app-vuelta"))).headers.get("location")).toBe("https://somosnosotros.org/entrar?error=enlace");
  expect(cliente).not.toHaveBeenCalled();
});

it("con un token_hash válido pero un siguiente externo, cae a /perfil (rutaSegura)", async () => {
  cliente.mockResolvedValue({ auth: { verifyOtp: vi.fn().mockResolvedValue({ error: null }) } } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  const respuesta = await GET(new NextRequest("https://somosnosotros.org/auth/app-vuelta?token_hash=el-token&siguiente=https%3A%2F%2Fmalo.com"));
  expect(respuesta.headers.get("location")).toBe("https://somosnosotros.org/perfil");
});
