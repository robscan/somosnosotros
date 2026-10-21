import { notFound, redirect } from "next/navigation";
import { Fragment } from "react";
import Barra from "@/components/ui/Barra";
import plantilla from "@/components/ui/Plantilla.module.css";
import { juntarAlias, notaBandeja, verboDe } from "@/lib/ciudadesAdmin";
import { nombreDe, vistaPropuesta } from "@/lib/propuestas";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../../../Reintentar";
import Bandeja from "../../Bandeja";
import { cargarBandejasDeCiudad, cargarExtras, cargarPanelCiudades } from "../../consultas";
import styles from "../../../admin.module.css";
import css from "../../ciudades.module.css";

export const metadata = { title: "Propuestas · Administración · Somos Nosotros", robots: { index: false, follow: false } };

/**
 * La bandeja de una ciudad (OL-432, respuesta 7): todas sus búsquedas juntas, cada una con su nombre y lo que trajo y, debajo, sus propuestas
 * por fuente como hasta ahora («Ver ficha», «Deshacer» y «Aceptar las N de esta fuente» se conservan). Nada se publica hasta que se acepta. Se
 * entra desde «Por revisar» del panel de la ciudad, desde «Pendiente» de la portada o desde Corridas; Atrás vuelve al panel.
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
        <Barra volver={{ href: `/admin/ciudades/${slug}`, texto: "Ciudad" }} />
        <h1 className={styles.titulo}>Propuestas</h1>
        <Reintentar texto="No pudimos leer las propuestas." />
      </main>
    );
  const nombres = new Map(panel.ciudades.map((c) => [c.slug, { nombre: c.nombre, alias: extras?.get(c.slug)?.alias ?? [] }]));
  const junta = juntarAlias(panel.ciudades, nombres).juntadas.get(slug);
  if (junta) redirect(`/admin/ciudades/${junta}/propuestas`);
  const ciudad = panel.ciudades.find((c) => c.slug === slug);
  if (!ciudad) notFound();
  const { bandejas, error } = await cargarBandejasDeCiudad(panel.corridas, slug);
  const ahora = new Date();
  const n = bandejas.reduce((t, b) => t + b.propuestas.length, 0);
  return (
    <main className={plantilla.paginaContenido}>
      <Barra volver={{ href: `/admin/ciudades/${slug}`, texto: ciudad.nombre }} />
      <h1 className={styles.titulo}>Propuestas de {ciudad.nombre}</h1>
      <p className={styles.nota}>{n ? `${n} por revisar${bandejas.length > 1 ? ` · de ${bandejas.length} búsquedas` : ""}. Nada se publica hasta que lo aceptas.` : "Nada se publica hasta que lo aceptas."}</p>
      {error && <Reintentar texto="No pudimos leer una de sus búsquedas." />}
      {bandejas.length ? (
        bandejas.map((b) => (
          <Fragment key={b.corrida.id}>
            <h2 className={css.busqueda}>{b.corrida.tipo === "showcase" ? "Showcase" : verboDe(b.corrida.tipo)}</h2>
            <p className={styles.nota}>{notaBandeja(b.corrida, ahora)}</p>
            <Bandeja
              propuestas={b.propuestas.map((p) => ({ id: p.id, tipo: p.tipo, fuente: p.fuente, nombre: nombreDe(p), vista: vistaPropuesta(p, ciudad.nombre, ahora) }))}
              fuentesConTanda={b.fuentes_con_tanda}
              nivel={3}
            />
          </Fragment>
        ))
      ) : (
        !error && <p className={styles.vacio}>Nada por revisar en {ciudad.nombre}: las propuestas llegan al correr una búsqueda.</p>
      )}
    </main>
  );
}
