import { notFound, redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import plantilla from "@/components/ui/Plantilla.module.css";
import { armarBandejas } from "@/lib/bandejaFormas";
import { juntarAlias, notaBandeja, verboDe } from "@/lib/ciudadesAdmin";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../../../Reintentar";
import { BandejasDeCiudad } from "../../Bandeja";
import { cargarBandejasDeCiudad, cargarContextoFormas, cargarExtras, cargarPanelCiudades } from "../../consultas";
import styles from "../../../admin.module.css";
import { tituloDePagina } from "@/lib/marca";

export const metadata = { title: tituloDePagina("Propuestas", "Administración"), robots: { index: false, follow: false } };

/**
 * La bandeja de una ciudad (OL-432, respuesta 7): todas sus búsquedas juntas, cada una con su nombre y lo que trajo y, debajo, sus propuestas
 * por fuente como hasta ahora («Ver ficha», «Deshacer» y «Aceptar las N de esta fuente» se conservan). Nada se publica hasta que se acepta. Se
 * entra desde «Por revisar» del panel de la ciudad, desde «Pendiente» de la portada o desde Corridas; Atrás vuelve al panel. Desde OL-434, cada
 * propuesta de evento dice su forma (acto, festival con actos, taller, serie, exposición) y un festival propuesto va antes que sus actos, con
 * ellos debajo aunque lleguen de otra búsqueda (`armarBandejas`). Desde OL-438, el nombre de cada búsqueda y lo que trajo los pinta su bandeja
 * (`cabecera`), con «Aceptar las N» debajo: así el botón cuenta lo que queda y, al terminar, la cabecera dice cuántas se aceptaron. Las
 * búsquedas se toman al entrar (`BandejasDeCiudad`): la que se queda sin nada por revisar sigue en pantalla, con lo que trajo al día (`notas`).
 */
export default async function PropuestasDeCiudad({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/admin/ciudades/${slug}/propuestas`)}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  const [panel, extras] = await Promise.all([cargarPanelCiudades(), cargarExtras()]);
  if (!panel)
    return (
      <main className={plantilla.paginaContenido}>
        <Barra volver={{ href: `/admin/ciudades/${slug}`, texto: "Ciudad" }} titulo="Propuestas" />
        <Reintentar texto="No pudimos leer las propuestas." />
      </main>
    );
  const nombres = new Map(panel.ciudades.map((c) => [c.slug, { nombre: c.nombre, alias: extras?.get(c.slug)?.alias ?? [] }]));
  const junta = juntarAlias(panel.ciudades, nombres).juntadas.get(slug);
  if (junta) redirect(`/admin/ciudades/${junta}/propuestas`);
  const ciudad = panel.ciudades.find((c) => c.slug === slug);
  if (!ciudad) notFound();
  const { bandejas, error } = await cargarBandejasDeCiudad(panel.corridas, slug);
  const contexto = await cargarContextoFormas(bandejas.flatMap((b) => b.propuestas));
  const ahora = new Date();
  const armadas = armarBandejas(bandejas, contexto, { nombre: ciudad.nombre, zona: ciudad.zona }, ahora);
  const n = bandejas.reduce((t, b) => t + b.propuestas.length, 0);
  // Lo que trajo cada búsqueda de la ciudad, también la que ya no tiene nada por revisar (la bandeja la conserva hasta salir).
  const notas = Object.fromEntries(panel.corridas.filter((c) => c.ciudad === slug).map((c) => [c.id, notaBandeja(c, ahora)]));
  return (
    <main className={plantilla.paginaContenido}>
      <Barra volver={{ href: `/admin/ciudades/${slug}`, texto: ciudad.nombre }} titulo={`Propuestas de ${ciudad.nombre}`} />
      <p className={styles.nota}>{n ? `${n} por revisar${armadas.length > 1 ? ` · de ${armadas.length} búsquedas` : ""}. Nada se publica hasta que lo aceptas.` : "Nada se publica hasta que lo aceptas."}</p>
      {error && <Reintentar texto="No pudimos leer una de sus búsquedas." />}
      <BandejasDeCiudad
        busquedas={armadas.map((b) => ({
          id: b.corrida.id,
          titulo: b.corrida.tipo === "showcase" ? "Showcase" : verboDe(b.corrida.tipo),
          nota: notaBandeja(b.corrida, ahora),
          propuestas: b.propuestas,
          fuentesConTanda: b.fuentes_con_tanda,
        }))}
        notas={notas}
        ciudad={ciudad.nombre}
        vacio={error ? null : `Nada por revisar en ${ciudad.nombre}: las propuestas llegan al correr una búsqueda.`}
      />
    </main>
  );
}
