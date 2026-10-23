import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import { Chips } from "@/components/ui/Chip";
import chip from "@/components/ui/Chip.module.css";
import Salto from "@/components/ui/Salto";
import legal from "@/app/privacidad/legal.module.css";
import plantilla from "@/components/ui/Plantilla.module.css";
import { usuarioActual } from "@/lib/supabase/servidor";
import { AYUDA, seccionesManual } from "../ayuda";
import styles from "./Manual.module.css";
import { tituloDePagina } from "@/lib/marca";

/** El índice: chips del front (`ui/Chip`) que bajan a su bloque. */
const claseChip = `${chip.chip} ${chip.toque}`;

export const metadata = { title: tituloDePagina("Manual del grafo", "Administración"), robots: { index: false, follow: false } };

/**
 * El manual del grafo cultural (OL-402, bitácora 433): una página con cada entrada del diccionario del panel de ayuda (`../ayuda.ts`), agrupadas por
 * bloque, con su `detalle` si lo tiene. Es la misma fuente que el panel: lo que aquí dice un control es lo que el panel dice al señalarlo. Cada
 * sección lleva por `id` su ancla, a la que apunta «Más en el manual ›». Misma guardia que la pantalla: sin sesión pide entrar y quien no es admin
 * vuelve al inicio.
 */
export default async function ManualGrafo() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/grafo/manual");
  if (actual.perfil.rol !== "admin") redirect("/");
  const secciones = seccionesManual();
  return (
    <main className={plantilla.pagina}>
      <Barra volver={{ href: "/admin/grafo", texto: "Grafo cultural" }} titulo="Manual del grafo cultural" />
      {/* La página de Ayuda del front (OL-457): texto corrido con sus títulos; el índice, chips que bajan sin apilar historial (ui/Salto). */}
      <article className={legal.texto}>
        <p>{AYUDA.pantalla.texto}</p>
        <Chips ariaLabel="Bloques del manual" envuelve>
          {secciones.map((b) => (
            <Salto key={b.id} destino={b.id} className={claseChip}>
              {b.titulo}
            </Salto>
          ))}
        </Chips>
        {secciones.map((b) => (
          <section key={b.id} id={b.id} className={styles.bloque}>
            <h2>{b.titulo}</h2>
            {b.entradas.map((e) => (
              <section key={e.id} id={e.id} className={styles.entrada}>
                <h3>{e.titulo}</h3>
                <p>{e.texto}</p>
                {e.detalle && <p>{e.detalle}</p>}
              </section>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
