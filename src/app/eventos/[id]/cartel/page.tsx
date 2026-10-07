import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cargarParaCartel } from "@/lib/carteles/cargar";
import { cuantasTandas, elegir } from "@/lib/carteles/elegir";
import { ofrecer } from "@/lib/carteles/ofrecer";
import { hrefCreador, origenCreador } from "@/lib/carteles/origen";
import { CATALOGO } from "@/lib/carteles/plantillas";
import { hrefEvento } from "@/lib/eventos";
import { clienteServidor } from "@/lib/supabase/servidor";
import CreadorCartel, { type Opcion } from "./CreadorCartel";

export const metadata: Metadata = { title: "Crear cartel · Somos Nosotros", robots: { index: false, follow: false } };

/** Una versión corta de lo que cambia el cartel: si el evento cambia, las imágenes en la caché del teléfono dejan de valer. */
function version(texto: string): string {
  let n = 0;
  for (const letra of texto) n = (n * 33 + letra.charCodeAt(0)) | 0;
  return Math.abs(n).toString(36);
}

/**
 * Crear el cartel de un evento (OL-324, doc 52 §3.5): para quien lo gestiona. Elige cuatro plantillas por reglas (`ofrecer`: lugar,
 * disciplina, memoria del lugar, si hay imagen y si cabe el título) y las tandas de «Ver otras»; las imágenes las dibuja `/api/cartel-nuevo`.
 * `?origen=` dice desde dónde se abrió (el menú de la ficha, su acción o «Publicado»), solo para medirlo (OL-336).
 */
export default async function CrearCartel({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ origen?: string | string[] }> }) {
  const [{ id }, consulta] = await Promise.all([params, searchParams]);
  const origen = origenCreador(consulta.origen);
  const supabase = await clienteServidor();
  if (!supabase) notFound();
  const { data: sesion } = await supabase.auth.getClaims();
  if (!sesion?.claims?.sub) redirect(`/entrar?siguiente=${encodeURIComponent(`/eventos/${id}/cartel`)}`);
  const datos = await cargarParaCartel(supabase, id);
  if (!datos?.gestiona) notFound();
  if (id !== datos.evento.slug) permanentRedirect(origen === "otro" ? `${hrefEvento(datos.evento)}/cartel` : hrefCreador(hrefEvento(datos.evento), origen));
  const { recortan } = ofrecer(datos.evento, datos.datosEleccion);
  const conRecortes = { ...datos.datosEleccion, recortan };
  const tandas = Array.from({ length: cuantasTandas(CATALOGO, conRecortes) }, (_, i) => elegir(CATALOGO, conRecortes, i).map((p): Opcion => ({ id: p.id, nombre: p.nombre, cortaTitulo: recortan.has(p.id) })));
  return (
    <CreadorCartel
      evento={{ slug: datos.evento.slug, titulo: datos.evento.titulo, href: hrefEvento(datos.evento) }}
      tandas={tandas}
      v={version(JSON.stringify([datos.evento, datos.imagenes]))}
      origen={origen}
    />
  );
}
