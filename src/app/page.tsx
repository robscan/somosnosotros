import Mapa from "@/components/Mapa";
import Panel from "@/components/Panel";

export default async function Inicio({ searchParams }: { searchParams: Promise<{ cuenta?: string }> }) {
  const { cuenta } = await searchParams;
  return (
    <main>
      <Mapa />
      <Panel cuentaBorrada={cuenta === "borrada"} />
    </main>
  );
}
