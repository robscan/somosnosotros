import { NextResponse, type NextRequest } from "next/server";
import { rutaSegura } from "@/lib/rutas";

/**
 * El punto donde el envoltorio de iPhone (apps/ios, OL-194) recupera el control tras entrar con Apple o Google tocado
 * dentro de la app: ver el comentario de `destinoTrasEntrar` en src/lib/entrarCon.ts. `/auth/[proveedor]/fin` manda
 * aquí en vez de a `siguiente` directo porque esta es una ruta de `/auth/*`, la única que la app reclama como enlace
 * universal (apple-app-site-association); AppDelegate.swift, al recibir ese enlace desde el navegador del sistema,
 * carga esta misma dirección en el WKWebView de la app, que ya tiene la sesión (Capacitor usa el almacenamiento
 * compartido de WKWebView, el mismo que el navegador del sistema) y de aquí sigue sola a `siguiente`.
 *
 * Fuera de la app esta ruta nunca se visita (nadie construye ese enlace sin pasar por `?app=1`), pero si alguien
 * la abre a mano no hace nada raro: solo redirige a una ruta interna seguida (`rutaSegura`).
 */
export async function GET(request: NextRequest) {
  const siguiente = rutaSegura(request.nextUrl.searchParams.get("siguiente"), "/perfil");
  return NextResponse.redirect(new URL(siguiente, request.nextUrl.origin), 303);
}
