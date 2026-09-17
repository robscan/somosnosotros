import Barra from "@/components/ui/Barra";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { motivoEntrar, tituloSeguir } from "@/lib/entrar";
import { NOMBRE_PROVEEDOR, botonesProveedor, esProveedor } from "@/lib/entrarCon";
import { proveedoresEncendidos } from "@/lib/supabase/proveedores";
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
 * El título dice para qué entra la persona; el regreso vuelve a donde estaba. Apple y Google salen primero cuando
 * Supabase los tiene encendidos (bitácora 069); si no, la pantalla es la del correo de siempre.
 */
export default async function Entrar({ searchParams }: { searchParams: Promise<{ siguiente?: string; error?: string }> }) {
  const { siguiente, error } = await searchParams;
  const destino = rutaSegura(siguiente, "/perfil");
  if (await usuarioActual()) redirect(destino);
  const motivo = motivoEntrar(destino);
  const [encendidos, cabeceras] = await Promise.all([proveedoresEncendidos(), headers()]);
  const proveedores = botonesProveedor(cabeceras.get("user-agent") ?? "", encendidos, cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "");
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
      {esProveedor(error) && (
        <p className="aviso-error" role="alert">
          No pudimos entrar con {NOMBRE_PROVEEDOR[error]}. Intenta otra vez o usa tu correo.
        </p>
      )}
      <FormularioEntrar siguiente={destino} proveedores={proveedores} largo={largoCodigo()} />
      <p className="nota-legal">
        Al entrar aceptas las <a href="/reglas">reglas de uso</a> y el <a href="/privacidad">aviso de privacidad</a>.
      </p>
    </main>
  );
}
