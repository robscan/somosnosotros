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

/** Ocultar o mostrar un lugar o evento desde el panel. La política de la base exige admin. */
export async function cambiarVisibleDesdeAdmin(tipo: "lugar" | "evento", id: string, visible: boolean) {
  const supabase = await soloAdmin();
  await supabase.from(tipo === "lugar" ? "lugares" : "eventos").update({ visible }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(tipo === "lugar" ? `/lugares/${id}` : `/eventos/${id}`);
}
