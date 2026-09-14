"use server";

import { redirect } from "next/navigation";
import { validarReporte } from "@/lib/reportes";
import { clienteServidor } from "@/lib/supabase/servidor";

export type ResultadoReporte = { ok: true } | { ok: false; error: string };

/** Reportar un lugar, evento o perfil. Solo con sesión; el admin lo ve en /admin. */
export async function reportar(_previo: ResultadoReporte | null, formData: FormData): Promise<ResultadoReporte> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  const volver = String(formData.get("volver") ?? "/");
  if (!supabase || !user) redirect(`/entrar?siguiente=${encodeURIComponent(volver)}`);
  const v = validarReporte({ tipo: String(formData.get("tipo") ?? ""), objeto_id: String(formData.get("objeto_id") ?? ""), motivo: String(formData.get("motivo") ?? ""), detalle: String(formData.get("detalle") ?? "") });
  if (!v.ok) return v;
  const { error } = await supabase.from("reportes").insert({ ...v.datos, creado_por: user.id });
  if (error) return { ok: false, error: "No se pudo enviar. Intenta de nuevo." };
  return { ok: true };
}
