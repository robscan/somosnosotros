import Mapa from "@/components/Mapa";
import Panel from "@/components/Panel";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor } from "@/lib/supabase/servidor";

async function cargarLugares(): Promise<LugarResumen[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const { data } = await supabase
    .from("lugares")
    .select("id, nombre, tipo, direccion, lat, lng, portada")
    .eq("visible", true)
    .order("nombre");
  return (data ?? []) as LugarResumen[];
}

export default async function Inicio({ searchParams }: { searchParams: Promise<{ cuenta?: string; lugar?: string }> }) {
  const { cuenta, lugar } = await searchParams;
  const lugares = await cargarLugares();
  const centrarEn = lugar ? (lugares.find((l) => l.id === lugar) ?? null) : null;
  return (
    <main>
      <Mapa lugares={lugares} centrarEn={centrarEn} />
      <Panel lugares={lugares} cuentaBorrada={cuenta === "borrada"} />
    </main>
  );
}
