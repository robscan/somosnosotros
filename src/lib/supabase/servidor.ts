import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { configPublica } from "@/lib/config";

/**
 * Cliente de Supabase para componentes y acciones del servidor.
 * La sesión viaja en cookies (@supabase/ssr). Devuelve null si faltan las variables.
 */
export async function clienteServidor() {
  const { supabaseUrl, supabaseAnonKey } = configPublica();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const almacen = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (todas) => {
        try {
          todas.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // Desde un componente de servidor no se pueden escribir cookies; proxy.ts las refresca.
        }
      },
    },
  });
}

export type ClienteServidor = NonNullable<Awaited<ReturnType<typeof clienteServidor>>>;

/**
 * Confirma un enlace mágico (token_hash) con el cliente que escribe cookies: si sale bien, la sesión queda puesta
 * en el navegador que hizo la petición. La usan /auth/callback (el enlace que manda el correo) y /auth/app-vuelta
 * (el enlace de un solo uso que arma OL-194 para que el envoltorio de iPhone recupere la sesión en su WKWebView).
 */
export async function confirmarEnlaceMagico(supabase: ClienteServidor | null, tokenHash: string, tipo: "magiclink" | "email" = "magiclink"): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
  return !error;
}

/**
 * ¿La cuenta con sesión es administración? Se comprueba siempre en el servidor con esta consulta — nunca se
 * confía en un campo que mande el formulario (S-01, docs/rediseno/46): la pantalla puede esconder un campo a
 * quien no es admin, pero eso es solo la pantalla.
 */
export async function esAdminDeSesion(supabase: ClienteServidor, usuarioId: string): Promise<boolean> {
  const { data } = await supabase.from("perfiles").select("rol").eq("id", usuarioId).maybeSingle();
  return data?.rol === "admin";
}

export type Perfil = {
  id: string;
  nombre: string;
  foto: string | null;
  colonia: string | null;
  bio: string | null;
  rol: "admin" | "usuario";
  avisos_correo?: boolean;
  avisos_push?: boolean;
  avisos_preguntado?: boolean;
  /** Ficha reservada: a qué va y qué sigue solo lo ve ella (migración 0020). */
  reservado?: boolean;
  /** Cuándo abrió Novedades por última vez (migración 0021). */
  novedades_vistas_en?: string | null;
};

/** Usuario con sesión y su perfil, o null si no hay sesión. */
export async function usuarioActual(): Promise<{ correo: string | null; perfil: Perfil } | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  // El token se verifica localmente (sin ir a Supabase Auth): una sola consulta de red, la del perfil.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, foto, colonia, bio, rol, avisos_correo, avisos_push, avisos_preguntado, reservado, novedades_vistas_en")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!perfil) return null;
  return { correo: (claims.email as string | undefined) ?? null, perfil: perfil as Perfil };
}
