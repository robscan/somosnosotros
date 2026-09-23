import { Suspense } from "react";
import ActivarAvisos from "@/components/ActivarAvisos";
import AgendaInicio from "@/components/AgendaInicio";
import ListaEsqueleto from "@/components/ListaEsqueleto";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import { cargarAgenda } from "@/lib/cargarAgenda";
import { CIUDAD_INICIAL, ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { enmascararCorreo } from "@/lib/comunidad";
import { diaLocal } from "@/lib/fechas";
import { usuarioActual } from "@/lib/supabase/servidor";
import styles from "./agenda.module.css";
import type { Metadata } from "next";

type SearchParams = { cuenta?: string; ciudad?: string; filtro?: string; q?: string };

/**
 * Agenda (OL-156, segunda vuelta): pasa de la raíz a `/agenda` — la app abre siempre en Inicio, `/` (docs/rediseno/41).
 * Título propio (OL-059, se conserva): sin esto, Google mostraba el genérico del layout raíz para la página más
 * buscada del sitio. El canonical conserva la ciudad, igual que Lugares y Artistas.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ cuenta?: string; ciudad?: string }> }): Promise<Metadata> {
  const { ciudad: slug } = await searchParams;
  const ciudades = await cargarCiudades();
  const resuelta = ciudadPorSlug(slug, ciudades);
  const esInicial = resuelta.slug === CIUDAD_INICIAL.slug;
  const titulo = "Agenda cultural · Somos Nosotros";
  const descripcion = "Qué hay hoy y esta semana en los centros culturales cerca de ti. Gratis, sin cuenta para mirar.";
  const canonical = esInicial ? "/agenda" : `/agenda?ciudad=${resuelta.slug}`;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical },
    // Next reemplaza openGraph y twitter enteros: sin repetirlos aquí, esta página heredaba los del layout raíz.
    openGraph: { title: titulo, description: descripcion, url: canonical, type: "website", images: [{ url: "/portada.png", width: 1200, height: 630 }], locale: "es_MX", siteName: "Somos Nosotros" },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: ["/portada.png"] },
  };
}

/**
 * La agenda misma (OL-158, bitácora 193): todo lo que necesita la consulta de eventos, en un componente de
 * servidor aparte para que su `<Suspense>` sea independiente de `Barra` y `NavInferior`, que no esperan nada.
 */
async function AgendaContenido({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { cuenta, ciudad: slug, filtro, q } = await searchParams;
  // Las ciudades salen de los lugares que hay (crecimiento orgánico, decisión del founder 2026-09-16); junto con la
  // sesión son rápidas y no llevan la consulta pesada de eventos, así que se esperan aquí. `cargarAgenda` (eventos,
  // quién sigue qué, qué decidió la persona) no se espera: se pasa como promesa y se difiere dentro de `AgendaInicio`
  // — la cabecera (fecha, ciudad, pestañas, lupa) pinta con la barra, y solo la lista lleva esqueleto (OL-161,
  // bitácora 196; antes, el gestor observó en la captura 01 de la bitácora 193 que también la cabecera salía como
  // esqueleto).
  const [ciudades, actual] = await Promise.all([cargarCiudades(), usuarioActual()]);
  const ciudad = ciudadPorSlug(slug, ciudades);
  const agenda = cargarAgenda(ciudad, actual?.perfil.id ?? null);
  const aviso = cuenta === "borrada" ? "Tu cuenta quedó borrada. Gracias por haber estado." : null;
  // "Ver todos" de un carril de Inicio llega con la pestaña ya elegida (?filtro=siguiendo, OL-156): cualquier otro
  // valor (un enlace viejo a "cercanos" o "nuevos") cae a Todos, porque esas pestañas ya no existen aquí.
  const filtroInicial = filtro === "siguiendo" ? "siguiendo" : undefined;
  // La pregunta de avisos tras el primer Voy al deslizar, como en la ficha: sale de la sesión, no de `cargarAgenda`.
  const avisos = actual ? { cuenta: actual.perfil.id, preguntado: actual.perfil.avisos_preguntado ?? true, correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo", llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" } : null;

  return (
    <>
      {aviso && (
        <p className={styles.aviso} role="status">
          {aviso}
        </p>
      )}
      <AgendaInicio
        key={ciudad.slug}
        filtroInicial={filtroInicial}
        busquedaInicial={q}
        agenda={agenda}
        ciudad={ciudad}
        ciudades={ciudades}
        hoy={diaLocal(new Date(), ciudad.zona)}
        zona={ciudad.zona}
        avisos={avisos}
        antes={actual?.perfil.avisos_push ? <ActivarAvisos llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} /> : null}
      />
      <Publicar ciudad={ciudad.slug === CIUDAD_INICIAL.slug ? null : ciudad.slug} />
    </>
  );
}

/**
 * `Barra` y `NavInferior` no esperan ninguna consulta: pintan al momento (OL-158, precisión del founder — "que la
 * persona vea la primera línea de contenido ya cargada y el resto llegue después"). Lo que sí espera (la ciudad,
 * la sesión) vive en `AgendaContenido`, dentro de un `<Suspense>` con `ListaEsqueleto` de `fallback` — pero ya no
 * espera los eventos: esa consulta la difiere `AgendaInicio` en su propio `<Suspense>` interno (OL-161).
 */
export default function Agenda({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <main className="raiz">
      <Barra derecha={<Sesion />} />
      <Suspense fallback={<ListaEsqueleto />}>
        <AgendaContenido searchParams={searchParams} />
      </Suspense>
      <NavInferior />
    </main>
  );
}
