import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import { ciudadPorSlug } from "@/lib/ciudad";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import VistaLugares from "./VistaLugares";

export const metadata = { title: "Lugares · Somos Nosotros" };

/** Los lugares de la ciudad: lista, y el mapa como segunda vista. */
export default async function Lugares({ searchParams }: { searchParams: Promise<{ lugar?: string; vista?: string; ciudad?: string }> }) {
  const { lugar, vista, ciudad: slug } = await searchParams;
  const ciudad = ciudadPorSlug(slug);
  const [supabase, actual] = await Promise.all([clienteServidor(), usuarioActual()]);
  const { data } = (await supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada").eq("visible", true).eq("ciudad", ciudad.nombre).order("nombre")) ?? { data: [] };
  const lugares = (data ?? []) as LugarResumen[];
  const centrarEn = lugar ? (lugares.find((l) => l.id === lugar) ?? null) : null;
  return (
    <main className="raiz">
      <Barra derecha={<Sesion />} />
      <VistaLugares lugares={lugares} ciudad={ciudad} conSesion={!!actual} centrarEn={centrarEn} vistaInicial={vista === "mapa" || !!centrarEn ? "mapa" : "lista"} />
      <Publicar hayLugares={lugares.length > 0} />
      <NavInferior />
    </main>
  );
}
