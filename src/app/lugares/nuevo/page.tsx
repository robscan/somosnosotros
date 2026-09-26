import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { rutaSegura } from "@/lib/rutas";
import { ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import FormularioLugar from "../FormularioLugar";
import { crearLugar } from "../acciones";

export const metadata = { title: "Registrar un lugar · Somos Nosotros", robots: { index: false, follow: false } };

export default async function NuevoLugar({ searchParams }: { searchParams: Promise<{ siguiente?: string; ciudad?: string }> }) {
  const { siguiente: siguienteCrudo, ciudad: ciudadSlug } = await searchParams;
  // Desde el alta de evento ("¿No está en la lista? Regístralo"): se vuelve ahí con el lugar ya elegido.
  const siguiente = rutaSegura(siguienteCrudo, "");
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/lugares/nuevo${siguiente ? `?siguiente=${encodeURIComponent(siguiente)}` : ""}`)}`);
  const supabase = await clienteServidor();
  // Pines de "¿Dónde está?" (OL-211): los lugares visibles (con los privados propios entre ellos, que la política
  // de lectura ya deja pasar), solo para avisar "ya existe" -nunca para elegirlos, aquí se está creando uno nuevo.
  const { data: lugares } = (await supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada, zona, privado").eq("visible", true).order("nombre")) ?? { data: [] };
  // La ciudad elegida (chip), misma cascada que el alta de evento (OL-100): sin `?ciudad=` cae en San Luis Potosí
  // -mismo respaldo silencioso que ya usa el listado de Lugares (`ciudadPorSlug`, a diferencia de la más estricta
  // `ciudadDesdeSlug` del evento), porque hoy no hay otra forma de llegar a "Agregar lugar" con una ciudad distinta
  // (corrección del gestor, revisión sobre el PR #249: sin esto, Mapbox buscaba en todo el país).
  const ciudadContexto = ciudadPorSlug(ciudadSlug, await cargarCiudades());
  return (
    <main className="pagina">
      <Barra cerrar={siguiente ? { href: siguiente, texto: "Volver" } : { href: "/lugares", texto: "Lugares" }} />
      <h1 className="titulo">Registrar un lugar</h1>
      <p className="subtitulo">Con el nombre y dónde está basta. Lo demás se puede agregar después.</p>
      <FormularioLugar accion={crearLugar} usuarioId={actual.perfil.id} siguiente={siguiente || undefined} esAdmin={actual.perfil.rol === "admin"} lugares={(lugares ?? []) as LugarResumen[]} ciudadContexto={ciudadContexto} />
    </main>
  );
}
