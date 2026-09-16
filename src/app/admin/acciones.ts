"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

async function soloAdmin() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin");
  if (actual.perfil.rol !== "admin") redirect("/");
  return (await clienteServidor())!;
}

export async function atenderReporte(id: string) {
  const supabase = await soloAdmin();
  await supabase.from("reportes").update({ atendido: true }).eq("id", id);
  revalidatePath("/admin");
}

const TABLA = { lugar: "lugares", evento: "eventos", artista: "artistas" } as const;
const RUTA = { lugar: "/lugares", evento: "/eventos", artista: "/artistas" } as const;

/** Ocultar o mostrar un lugar, evento o artista desde el panel. La política de la base exige admin. */
export async function cambiarVisibleDesdeAdmin(tipo: keyof typeof TABLA, id: string, visible: boolean) {
  const supabase = await soloAdmin();
  await supabase.from(TABLA[tipo]).update({ visible }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(RUTA[tipo]);
  revalidatePath(`${RUTA[tipo]}/${id}`);
}

/** Dónde se guarda cada liga y con qué nombre de columna. */
const LIGA = {
  artista: { tabla: "artistas_cuentas", columna: "artista_id" },
  lugar: { tabla: "lugares_cuentas", columna: "lugar_id" },
} as const;

/**
 * "Quiero llevar yo la ficha" ("Soy yo / es mi grupo" en Artistas, "¿Es tu espacio?" en Lugares):
 * la ficha pasa a la cuenta que la pidió. Queda ligada (la edita) y pasa a ser su autora: quien la
 * registró deja de poder editarla, y el pie de la ficha cambia. El reporte queda atendido.
 */
export async function ligarFichaDesdeAdmin(tipo: keyof typeof LIGA, objetoId: string, perfilId: string | null, reporteId: string) {
  const supabase = await soloAdmin();
  const { tabla, columna } = LIGA[tipo];
  if (perfilId) {
    await supabase.from(tabla).upsert({ [columna]: objetoId, perfil_id: perfilId }, { onConflict: `${columna},perfil_id`, ignoreDuplicates: true });
    await supabase.from(TABLA[tipo]).update({ creado_por: perfilId }).eq("id", objetoId);
  }
  await supabase.from("reportes").update({ atendido: true }).eq("id", reporteId);
  revalidatePath("/admin");
  revalidatePath(RUTA[tipo]);
  revalidatePath(`${RUTA[tipo]}/${objetoId}`);
}
