import Barra from "@/components/ui/Barra";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { ciudadPorNombre } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { esUuid } from "@/lib/formulario";
import { hrefLugar, type Lugar, type LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import FormularioLugar from "../../FormularioLugar";
import { actualizarLugar } from "../../acciones";

export const metadata = { title: "Editar lugar · Somos Nosotros", robots: { index: false, follow: false } };

/** Igual que la ficha: se busca por slug y, si no aparece, por UUID (la dirección vieja). */
async function cargarLugar(idOSlug: string) {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const porSlug = await supabase.from("lugares").select("*").eq("slug", idOSlug).maybeSingle();
  const data = porSlug.data ?? (esUuid(idOSlug) ? (await supabase.from("lugares").select("*").eq("id", idOSlug).maybeSingle()).data : null);
  return data as Lugar | null;
}

export default async function EditarLugar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/lugares/${id}/editar`)}`);
  const lugar = await cargarLugar(id);
  if (!lugar) notFound();
  // Dirección vieja (/lugares/<uuid>/editar): redirige a la de hoy, con el mismo id real por debajo.
  if (id !== lugar.slug) permanentRedirect(`${hrefLugar(lugar)}/editar`);
  const supabase = await clienteServidor();
  const { data: liga } = (await supabase?.from("lugares_cuentas").select("perfil_id").eq("lugar_id", lugar.id).eq("perfil_id", actual.perfil.id).maybeSingle()) ?? { data: null };
  // Edita el autor, la cuenta ligada ("¿Es tu espacio?") o el administrador.
  if (actual.perfil.rol !== "admin" && lugar.creado_por !== actual.perfil.id && !liga) redirect(hrefLugar(lugar));
  // Pines de "¿Dónde está?" (OL-211): FormularioLugar quita el propio lugar de esta lista antes de avisar "ya existe".
  const { data: lugares } = (await supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada, zona, privado").eq("visible", true).order("nombre")) ?? { data: [] };
  // La ciudad del propio lugar (no un chip de entrada: aquí no se llega desde ningún filtro de ciudad) — en la
  // práctica no cambia nada (el pin ya puesto siempre manda en la cascada de "¿Dónde está?"), pero mantiene el
  // mismo contrato que el alta (corrección del gestor, revisión sobre el PR #249).
  const ciudadContexto = ciudadPorNombre(lugar.ciudad, await cargarCiudades());
  return (
    <main className="pagina">
      <Barra volver={{ href: hrefLugar(lugar), texto: "Volver al lugar" }} />
      <h1 className="titulo">Editar lugar</h1>
      <FormularioLugar accion={actualizarLugar.bind(null, lugar.id)} lugar={lugar} usuarioId={actual.perfil.id} esAdmin={actual.perfil.rol === "admin"} lugares={(lugares ?? []) as LugarResumen[]} ciudadContexto={ciudadContexto} />
    </main>
  );
}
