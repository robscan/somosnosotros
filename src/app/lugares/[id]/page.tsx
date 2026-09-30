import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import BotonCompartir from "@/components/BotonCompartir";
import Cartel from "@/components/Cartel";
import Barra from "@/components/ui/Barra";
import Boton, { claseBoton } from "@/components/ui/Boton";
import MenuAcciones from "@/components/ui/MenuAcciones";
import ficha from "@/components/ui/Ficha.module.css";
import styles from "@/components/ui/FichaLista.module.css";
import { normalizarRedes } from "@/lib/enlaces";
import { jsonLdLugar, jsonLdMigajas } from "@/lib/estructurados";
import { etiquetaLugar, etiquetaTipo, hrefLugar } from "@/lib/lugares";
import { clienteServidor } from "@/lib/supabase/servidor";
import CuerpoLugar, { cargarFicha, cargarLugar, OpcionesLugar, ORIGEN, SeguirLugar } from "./CuerpoLugar";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ nuevo?: string; accion?: string; error?: string }> };

/** El botón compartir de la tarjeta «Publicado» (ui/Boton, en su celda). */
const BOTON_PUBLICADO = `${claseBoton({ variante: "secundario", alto: "control", ancho: "contenido" })} ${ficha.publicadoBoton}`;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const lugar = await cargarLugar(id);
  if (!lugar) return { title: "Lugar · Somos Nosotros" };
  const descripcion = `${etiquetaTipo(lugar.tipo)}${lugar.direccion ? ` · ${lugar.direccion}` : ""}`;
  // Sin portada, la imagen por defecto del sitio: el enlace compartido nunca sale sin imagen (OL-143, doc 36).
  const imagen = lugar.portada ?? "/portada.png";
  return {
    title: `${lugar.nombre} · Somos Nosotros`,
    description: descripcion,
    // Un lugar privado no lo indexa Google (OL-179): en la práctica ya es inalcanzable sin sesión (la política de
    // lectura lo esconde de cualquiera que no sea su autor o la administración), pero se lo decimos igual.
    ...(lugar.privado ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical: `${ORIGEN}${hrefLugar(lugar)}` },
    openGraph: { title: lugar.nombre, description: descripcion, url: `${ORIGEN}${hrefLugar(lugar)}`, type: "website", images: [{ url: imagen }], locale: "es_MX", siteName: "Somos Nosotros" },
    twitter: { card: "summary_large_image", title: lugar.nombre, description: descripcion, images: [imagen] },
  };
}

export default async function FichaLugar({ params, searchParams }: Params) {
  const { id } = await params;
  const { nuevo, accion, error } = (await searchParams) ?? {};
  const f = await cargarFicha(id);
  if (!f) notFound();
  const { lugar, actual, puedeEditar } = f;
  // La dirección vieja (/lugares/<uuid>) sigue resolviendo, pero se redirige a la de hoy (el slug); permanente
  // porque es el mismo lugar para siempre (OL-119, mismo criterio que artistas). Se preservan los parámetros.
  if (id !== lugar.slug) {
    const p = new URLSearchParams();
    if (nuevo) p.set("nuevo", nuevo);
    if (accion) p.set("accion", accion);
    if (error) p.set("error", error);
    const q = p.toString();
    permanentRedirect(`${hrefLugar(lugar)}${q ? `?${q}` : ""}`);
  }
  // Venía de entrar con la intención de seguir: se aplica sola.
  if (actual && accion === "seguir") {
    const supabase = await clienteServidor();
    await supabase?.from("seguimientos").upsert({ usuario_id: actual.perfil.id, lugar_id: lugar.id }, { onConflict: "usuario_id,lugar_id", ignoreDuplicates: true });
    redirect(hrefLugar(lugar));
  }
  const faltanDetalles = !lugar.descripcion && !lugar.portada && normalizarRedes(lugar.redes).length === 0;
  const url = `${ORIGEN}${hrefLugar(lugar)}`;
  // JSON-LD (OL-143, doc 36): un lugar oculto o privado no lo vería un visitante sin sesión; sin datos de personas.
  const jsonLdVisible = lugar.visible && !lugar.privado;
  const jsonLd = jsonLdVisible ? jsonLdLugar({ nombre: lugar.nombre, descripcion: lugar.descripcion, direccion: lugar.direccion, ciudad: lugar.ciudad, lat: lugar.lat, lng: lugar.lng, imagen: lugar.portada, url: hrefLugar(lugar) }) : null;
  const migajas = jsonLdVisible ? jsonLdMigajas([{ nombre: "Inicio", url: "/" }, { nombre: "Lugares", url: "/lugares" }, { nombre: lugar.nombre, url: hrefLugar(lugar) }]) : null;

  return (
    <main className={ficha.pagina}>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      {migajas && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(migajas).replace(/</g, "\\u003c") }} />}
      <Barra
        volver={{ href: "/lugares", texto: "Lugares" }}
        derecha={
          <MenuAcciones>
            <OpcionesLugar f={f} />
          </MenuAcciones>
        }
      />
      {nuevo === "1" && (
        <div className={ficha.publicado} role="status">
          <b>Publicado.</b>
          Ya está en Lugares.
          {puedeEditar && faltanDetalles ? (
            <Boton href={`${hrefLugar(lugar)}/editar`} variante="secundario" alto="control" ancho="contenido" className={ficha.publicadoBoton}>
              Completar
            </Boton>
          ) : (
            <BotonCompartir titulo={lugar.nombre} texto={`${lugar.nombre} · ${etiquetaTipo(lugar.tipo)}`} url={url} className={BOTON_PUBLICADO}>
              Compartir
            </BotonCompartir>
          )}
        </div>
      )}
      {nuevo !== "1" && puedeEditar && faltanDetalles && (
        <p className={styles.nota}>
          Aún sin descripción, redes ni foto. <Link href={`${hrefLugar(lugar)}/editar`}>Completar</Link>
        </p>
      )}
      {error === "tiene-eventos" && (
        <p className="aviso-error" role="alert">
          Este lugar tiene eventos publicados por otras personas; no se puede borrar. Si ya no existe, ocúltalo o avisa al administrador.
        </p>
      )}
      {error === "borrar" && (
        <p className="aviso-error" role="alert">
          No se pudo borrar. ¿Sigues con sesión y es tu lugar?
        </p>
      )}
      {lugar.privado ? (
        <p className={`aviso-ok ${ficha.oculto}`} role="status">
          Lugar privado: solo lo ves tú. No sale en el mapa ni en la lista para nadie más.
        </p>
      ) : (
        !lugar.visible && (
          <p className={`aviso-error ${ficha.oculto}`} role="status">
            Este lugar está oculto: solo lo ven su autor, su cuenta ligada y el administrador.
          </p>
        )
      )}

      <Cartel src={lugar.portada} alt={`Portada de ${lugar.nombre}`} />
      <h1 className={`${ficha.titulo} ${ficha.tituloConEtiqueta}`}>{lugar.nombre}</h1>
      <p className={ficha.etiqueta}>{etiquetaLugar(lugar)}</p>

      <CuerpoLugar f={f} />
      <SeguirLugar f={f} />
    </main>
  );
}
