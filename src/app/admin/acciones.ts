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

/**
 * "Quiero editarlo yo" (Artistas, decisión 11): la ficha pasa a la cuenta que lo pidió. Queda ligada
 * (edita y publica sus fechas sin teclear el nombre) y pasa a ser su autora: quien la registró deja de
 * poder editarla, y "Registrado por" cambia. El reporte queda atendido.
 */
export async function ligarArtistaDesdeAdmin(artistaId: string, perfilId: string | null, reporteId: string) {
  const supabase = await soloAdmin();
  if (perfilId) {
    await supabase.from("artistas_cuentas").upsert({ artista_id: artistaId, perfil_id: perfilId }, { onConflict: "artista_id,perfil_id", ignoreDuplicates: true });
    await supabase.from("artistas").update({ creado_por: perfilId }).eq("id", artistaId);
  }
  await supabase.from("reportes").update({ atendido: true }).eq("id", reporteId);
  revalidatePath("/admin");
  revalidatePath(`/artistas/${artistaId}`);
}
