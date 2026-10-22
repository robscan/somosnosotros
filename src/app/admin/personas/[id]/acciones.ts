"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esTipoAsignable, MINIMO_BUSQUEDA, textoCodigoAsignar, textoCodigoQuitar, type FichaHallada, type TipoAsignable } from "@/lib/asignarFichas";
import { esUuid } from "@/lib/formulario";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

/**
 * OL-447: buscar, asignar y quitar las fichas que una persona administra, desde su ficha en Administración. Cada acción comprueba aquí el rol y
 * la base lo vuelve a exigir (`admin_buscar_fichas`, `admin_asignar_ficha`, `admin_quitar_ficha`, todas con `es_admin()`), y deja el registro
 * de quién y cuándo (`fichas_asignaciones`). Ninguna falla en silencio: devuelve la causa en palabras.
 */
type Resultado = { ok: true } | { ok: false; error: string };

async function soloAdmin(perfilId: string) {
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=/admin/personas/${perfilId}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  return (await clienteServidor())!;
}

const RUTA = { lugar: "/lugares", artista: "/artistas" } as const;

function revalidar(perfilId: string, tipo: TipoAsignable, fichaId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/personas");
  revalidatePath(`/admin/personas/${perfilId}`);
  revalidatePath(`/admin${RUTA[tipo]}`);
  revalidatePath(`${RUTA[tipo]}/${fichaId}`);
}

/** Lugares y artistas a la vez, por nombre: lo que la hoja ofrece para asignar. */
export async function buscarFichas(perfilId: string, texto: string): Promise<{ ok: true; fichas: FichaHallada[] } | { ok: false; error: string }> {
  if (!esUuid(perfilId)) return { ok: false, error: "Esta cuenta ya no existe." };
  const q = typeof texto === "string" ? texto.trim().slice(0, 80) : "";
  if (q.length < MINIMO_BUSQUEDA) return { ok: true, fichas: [] };
  const supabase = await soloAdmin(perfilId);
  const { data, error } = await supabase.rpc("admin_buscar_fichas", { p_buscar: q, p_perfil: perfilId, p_limite: 20 });
  if (error) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  return { ok: true, fichas: ((data ?? []) as FichaHallada[]).filter((f) => esTipoAsignable(f.tipo)) };
}

/** Asignar: la misma liga que un reclamo aprobado. Si otra persona ya la administra, la sigue administrando. */
export async function asignarFicha(perfilId: string, tipo: TipoAsignable, fichaId: string): Promise<Resultado> {
  if (!esUuid(perfilId)) return { ok: false, error: "Esta cuenta ya no existe." };
  if (!esTipoAsignable(tipo) || !esUuid(fichaId)) return { ok: false, error: "Esa ficha ya no existe o no se puede asignar." };
  const supabase = await soloAdmin(perfilId);
  const { data, error } = await supabase.rpc("admin_asignar_ficha", { p_tipo: tipo, p_ficha: fichaId, p_perfil: perfilId });
  if (error) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  const texto = textoCodigoAsignar(String(data));
  if (texto) return { ok: false, error: texto };
  revalidar(perfilId, tipo, fichaId);
  return { ok: true };
}

/** Quitar: solo deshace la liga; la ficha y lo que la persona publicó se quedan. */
export async function quitarFicha(perfilId: string, tipo: TipoAsignable, fichaId: string): Promise<Resultado> {
  if (!esUuid(perfilId) || !esTipoAsignable(tipo) || !esUuid(fichaId)) return { ok: false, error: "No encontramos esa ficha. Recarga la página." };
  const supabase = await soloAdmin(perfilId);
  const { data, error } = await supabase.rpc("admin_quitar_ficha", { p_tipo: tipo, p_ficha: fichaId, p_perfil: perfilId });
  if (error) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  const texto = textoCodigoQuitar(String(data));
  if (texto) return { ok: false, error: texto };
  revalidar(perfilId, tipo, fichaId);
  return { ok: true };
}
