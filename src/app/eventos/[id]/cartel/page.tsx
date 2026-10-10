import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cargarParaCartel } from "@/lib/carteles/cargar";
import { carpetaFotoPropia } from "@/lib/carteles/fotoPropia";
import { DOMINIO_CARTEL } from "@/lib/carteles/tokens";
import { cortaLaOpcion, ofrecer, type Oferta } from "@/lib/carteles/ofrecer";
import { hrefCreador, origenCreador } from "@/lib/carteles/origen";
import { configPublica } from "@/lib/config";
import { hrefEvento } from "@/lib/eventos";
import { clienteServidor } from "@/lib/supabase/servidor";
import CreadorCartel, { type Opcion } from "./CreadorCartel";

export const metadata: Metadata = { title: "Crear cartel · Somos Nosotros", robots: { index: false, follow: false } };

/** Una versión corta de lo que cambia el cartel: si el evento o el dominio del sello cambian, las imágenes en la caché del teléfono dejan de valer. */
function version(texto: string): string {
  let n = 0;
  for (const letra of texto) n = (n * 33 + letra.charCodeAt(0)) | 0;
  return Math.abs(n).toString(36);
}

/** Las tandas de una oferta como las pinta la pantalla. */
function opciones(oferta: Oferta): Opcion[][] {
  return oferta.tandas.map((tanda) => tanda.map((e): Opcion => ({ id: e.plantilla.id, nombre: e.plantilla.nombre, sinFoto: e.sinFoto, cortaTitulo: cortaLaOpcion(e, oferta) })));
}

/**
 * Crear el cartel de un evento (OL-324, doc 52 §3.5): para quien lo gestiona. Elige cuatro plantillas por reglas (`ofrecer`: lugar,
 * disciplina, memoria del lugar, si hay imagen y si cabe el título) y las tandas de «Ver otras»; las imágenes las dibuja `/api/cartel-nuevo`.
 * `?origen=` dice desde dónde se abrió (el menú de la ficha, su acción o «Publicado»), solo para medirlo (OL-336).
 * Con foto propia (OL-337) las tandas son las de «hay imagen» (`tandasConFoto`): si el evento no tenía ninguna, cambian (entra la que pide foto
 * y una por tanda va sin foto); si ya tenía, son las mismas.
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
  const oferta = ofrecer(datos.evento, datos.datosEleccion);
  const conFoto = datos.datosEleccion.conImagen ? oferta : ofrecer(datos.evento, { ...datos.datosEleccion, conImagen: true });
  return (
    <CreadorCartel
      evento={{ slug: datos.evento.slug, titulo: datos.evento.titulo, href: hrefEvento(datos.evento) }}
      tandas={opciones(oferta)}
      tandasConFoto={opciones(conFoto)}
      conImagen={datos.datosEleccion.conImagen}
      usuarioId={datos.perfilId}
      carpeta={carpetaFotoPropia(datos.perfilId, configPublica().supabaseUrl)}
      v={version(JSON.stringify([datos.evento, datos.imagenes, DOMINIO_CARTEL]))}
      origen={origen}
    />
  );
}
