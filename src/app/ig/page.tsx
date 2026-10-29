import type { Metadata } from "next";
import Barra from "@/components/ui/Barra";
import Grupo from "@/components/ui/Grupo";
import Renglon from "@/components/ui/Renglon";
import renglonCss from "@/components/ui/Renglon.module.css";
import plantilla from "@/components/ui/Plantilla.module.css";
import lista from "@/components/Lista.module.css";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { diaLocal, ZONA_INICIAL } from "@/lib/fechas";
import { CUENTA_INSTAGRAM } from "@/lib/instagram/texto";
import { cuandoDelDia, enlaceDeLaBio, lunesDe, rangoDeLaSemana, type TipoDia } from "@/lib/instagram/semana";
import { MARCA, tituloDePagina } from "@/lib/marca";
import { clienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = {
  title: tituloDePagina("Esta semana en Instagram"),
  description: `Los artistas, los lugares y los eventos que ${MARCA} presentó esta semana en Instagram (@${CUENTA_INSTAGRAM}).`,
  robots: { index: false, follow: true },
};

type Fila = { fecha: string; tipo: TipoDia; slug: string | null; nombre: string | null; imagen: string | null; eventos: string[] | null };
type Evento = { id: string; slug: string | null; titulo: string; imagen: string | null };

/**
 * «Esta semana en Instagram» (OL-479; firmado en el prototipo de OL-477, pregunta 5): la página del enlace de la bio de @smsnstrsapp. En
 * Instagram el enlace del texto no se puede tocar; aquí están las fichas de lo que salió esta semana, cada una con su marca de origen
 * (`utm_source=instagram&utm_medium=bio&utm_campaign=semana-<lunes>&utm_content=<ficha>`), así cada visita se atribuye a su publicación. Solo lo
 * ya publicado (`instagram_semana_bio`, que lo comprueba la base); lo programado no se adelanta. `?ciudad=`: otra ciudad (por omisión, la inicial).
 */
export default async function EstaSemanaEnInstagram({ searchParams }: { searchParams: Promise<{ ciudad?: string }> }) {
  const p = await searchParams;
  const ciudad = typeof p.ciudad === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.ciudad) ? p.ciudad : CIUDAD_INICIAL.slug;
  const ahora = new Date();
  const hoy = diaLocal(ahora, ZONA_INICIAL);
  const lunes = lunesDe(hoy);
  const supabase = await clienteServidor();
  const { data } = supabase ? await supabase.rpc("instagram_semana_bio", { p_ciudad: ciudad, p_dia: hoy }) : { data: null };
  const filas = (Array.isArray(data) ? data : []) as Fila[];
  const ids = [...new Set(filas.flatMap((f) => f.eventos ?? []))];
  const { data: evs } = ids.length && supabase ? await supabase.from("eventos").select("id, slug, titulo, imagen").in("id", ids) : { data: [] };
  const eventos = new Map(((evs ?? []) as Evento[]).map((e) => [e.id, e]));
  const renglones = filas.flatMap((f, i) => {
    const cuando = cuandoDelDia({ fecha: f.fecha, hora: null, tipo: f.tipo }, ahora, ZONA_INICIAL);
    if (f.tipo === "semana") {
      return (f.eventos ?? [])
        .map((id) => eventos.get(id))
        .filter((e): e is Evento => !!e)
        .map((e) => ({ clave: `${i}-${e.id}`, href: enlaceDeLaBio(`/eventos/${e.slug ?? e.id}`, lunes, e.slug ?? e.id), foto: e.imagen, redonda: false, titulo: e.titulo, cuando }));
    }
    if (!f.slug || !f.nombre) return [];
    const ruta = f.tipo === "artista" ? "artistas" : f.tipo === "lugar" ? "lugares" : "eventos";
    return [{ clave: `${i}`, href: enlaceDeLaBio(`/${ruta}/${f.slug}`, lunes, f.slug), foto: f.imagen, redonda: f.tipo === "artista", titulo: f.nombre, cuando }];
  });
  return (
    <main className={plantilla.paginaContenido}>
      <Barra volver={{ href: "/", texto: "Inicio" }} titulo="Esta semana en Instagram" />
      <p className={lista.conteo}>Lo que presentamos en @{CUENTA_INSTAGRAM}: toca para ver su ficha.</p>
      {renglones.length ? (
        <Grupo titulo={rangoDeLaSemana(lunes)}>
          {renglones.map((r) => (
            <Renglon key={r.clave} href={r.href} foto={r.foto} redonda={r.redonda} titulo={r.titulo}>
              <span className={renglonCss.envuelve}>{r.cuando}</span>
            </Renglon>
          ))}
        </Grupo>
      ) : (
        <p className={lista.vacio}>Esta semana todavía no publicamos nada. Mientras, mira la agenda de la ciudad en Inicio.</p>
      )}
    </main>
  );
}
