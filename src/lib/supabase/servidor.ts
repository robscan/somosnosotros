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

export type Perfil = {
  id: string;
  nombre: string;
  foto: string | null;
  colonia: string | null;
  bio: string | null;
  rol: "admin" | "usuario";
};

/** Usuario con sesión y su perfil, o null si no hay sesión. */
export async function usuarioActual(): Promise<{ correo: string | null; perfil: Perfil } | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, foto, colonia, bio, rol")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { correo: user.email ?? null, perfil: data as Perfil };
}
