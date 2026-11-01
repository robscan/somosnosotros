import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import { IconoBuscar, IconoChevronDerecha, IconoOk } from "@/components/ui/Iconos";
import plantilla from "@/components/ui/Plantilla.module.css";
import EnCamino from "@/components/ui/EnCamino";
import renglon from "@/components/ui/Renglon.module.css";
import { etiquetaDisciplina } from "@/lib/artistas";
import { diaLocal } from "@/lib/fechas";
import { tituloDePagina } from "@/lib/marca";
import { cuandoFue, detallePropuesta, etiquetaEstado, hrefFicha, RUTA_POR_APROBAR, RUTA_SHOWCASE } from "@/lib/showcase";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../../Reintentar";
import { cargarCandidatos, cargarPorAprobar } from "../consultas";
import Hallazgos, { type GrupoHallazgos } from "../Hallazgos";
import admin from "../../admin.module.css";
import s from "../showcase.module.css";

export const metadata = { title: tituloDePagina("Por aprobar", "Administración"), robots: { index: false, follow: false } };

const dominio = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/**
 * Administración › Showcase › Por aprobar (OL-446; lo firmado en OL-443, bitácora 475): todo lo que trajo la rutina de investigar, de todos los
 * artistas, sin entrar a ninguna ficha. Un grupo por artista, del que tiene más puntaje al que menos (lo más cerca del consejo, primero; el orden se
 * toma al abrir y no cambia mientras se trabaja). Se llega desde el renglón de la lista, la línea violeta de cada tarjeta (baja al artista) y
 * «Pendiente» de la portada. Solo administración.
 */
export default async function PorAprobar() {
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${RUTA_POR_APROBAR}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  const ahora = new Date();
  const hoy = diaLocal(ahora);
  const [todos, pa] = await Promise.all([cargarCandidatos(ahora), cargarPorAprobar()]);
  const barra = <Barra volver={{ href: RUTA_SHOWCASE, texto: "Showcase" }} titulo="Por aprobar" />;
  if (!todos || !pa) {
    return (
      <main className={`${plantilla.paginaContenido} ${admin.lista}`}>
        {barra}
        <Reintentar texto="No pudimos leer lo que hay por aprobar." />
      </main>
    );
  }
  const candidatos = new Map(todos.map((c) => [c.id, c]));
  const porArtista = new Map<string, typeof pa.hallazgos>();
  for (const h of pa.hallazgos) if (candidatos.has(h.artista_id)) porArtista.set(h.artista_id, [...(porArtista.get(h.artista_id) ?? []), h]);
  const grupos: GrupoHallazgos[] = [...porArtista]
    .map(([id, lista]) => {
      const c = candidatos.get(id)!;
      return {
        artista: { id, slug: c.slug, nombre: c.nombre, foto: c.foto, href: hrefFicha(c), disciplina: etiquetaDisciplina(c.disciplina), estado: etiquetaEstado(c.estado) },
        valores: c.valores,
        obraAceptada: pa.obraAceptada[id] ?? [],
        hallazgos: lista.map((h) => ({ ...h, fuenteTexto: h.fuente || dominio(h.url), detalle: detallePropuesta(h, hoy) })),
      };
    })
    .sort((a, b) => candidatos.get(b.artista.id)!.suma - candidatos.get(a.artista.id)!.suma || b.hallazgos.length - a.hallazgos.length || a.artista.nombre.localeCompare(b.artista.nombre, "es"));
  const ultima = grupos.flatMap((g) => g.hallazgos).reduce<string | null>((m, h) => (!m || h.creado_en > m ? h.creado_en : m), null);
  return (
    <main className={`${plantilla.paginaContenido} ${admin.lista}`}>
      {barra}
      {grupos.length ? (
        <Hallazgos grupos={grupos} hoy={hoy} modo="pantalla" cuando={ultima ? cuandoFue(diaLocal(new Date(ultima)), hoy) : null} />
      ) : (
        <>
          <p className={`${admin.nada} ${s.nadaPorAprobar}`}>
            <IconoOk width={20} height={20} />
            <b>Nada por aprobar</b>
            <small>Cuando investigues a alguien, lo que encuentre llega aquí.</small>
          </p>
          <ul className={renglon.tarjeta}>
            <li>
              <Link href={RUTA_SHOWCASE} className={renglon.ajuste}>
                <IconoBuscar width={20} height={20} />
                <b>Investigar desde la lista</b>
                <small>Filtra, selecciona y manda a investigar</small>
                <span>
                  <IconoChevronDerecha />
                </span>
                <EnCamino className={renglon.enCamino} />
              </Link>
            </li>
          </ul>
        </>
      )}
    </main>
  );
}
