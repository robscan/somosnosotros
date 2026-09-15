import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { motivoEntrar, tituloSeguir } from "@/lib/entrar";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { rutaSegura } from "@/lib/rutas";
import FormularioEntrar from "./FormularioEntrar";

export const metadata = { title: "Entrar · Somos Nosotros" };

/** Dígitos del código: lo fija Supabase (Authentication → Providers → Email → OTP length); aquí, 8. */
function largoCodigo(): number {
  const n = Number(process.env.NEXT_PUBLIC_LARGO_CODIGO ?? 8);
  return Number.isInteger(n) && n >= 6 && n <= 10 ? n : 8;
}

/**
 * Entrar con motivo y código de varios dígitos (docs/rediseno/11-restantes-flujo-y-estados.md, decisiones 1 a 4).
 * El título dice para qué entra la persona; el regreso vuelve a donde estaba; Google solo si está configurado.
 */
export default async function Entrar({ searchParams }: { searchParams: Promise<{ siguiente?: string; error?: string }> }) {
  const { siguiente, error } = await searchParams;
  const destino = rutaSegura(siguiente, "/perfil");
  if (await usuarioActual()) redirect(destino);
  const motivo = motivoEntrar(destino);
  let titulo = motivo.titulo;
  if (motivo.tipo === "seguir") {
    const supabase = await clienteServidor();
    const { data } = (await supabase?.from(motivo.tabla).select("nombre").eq("id", motivo.id).maybeSingle()) ?? { data: null };
    titulo = tituloSeguir((data?.nombre as string | undefined) ?? null);
  }
  return (
    <main className="pagina">
      <Barra volver={{ href: motivo.origen, texto: "Volver" }} />
      <h1 className="titulo">{titulo}</h1>
      {error === "enlace" && (
        <p className="aviso-error" role="alert">
          Ese enlace ya no sirve. Pide un código nuevo.
        </p>
      )}
      <FormularioEntrar siguiente={destino} google={process.env.NEXT_PUBLIC_GOOGLE_ACTIVO === "1"} largo={largoCodigo()} />
    </main>
  );
}
