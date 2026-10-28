import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import { Chips } from "@/components/ui/Chip";
import chip from "@/components/ui/Chip.module.css";
import Salto from "@/components/ui/Salto";
import legal from "@/app/privacidad/legal.module.css";
import plantilla from "@/components/ui/Plantilla.module.css";
import { usuarioActual } from "@/lib/supabase/servidor";
import { AYUDA_SHOWCASE, REGLAS_GOBIERNO, RUTA_MANUAL_SHOWCASE, SECCIONES_MANUAL } from "../ayuda";
import styles from "../../grafo/manual/Manual.module.css";
import { tituloDePagina } from "@/lib/marca";

/** El índice: chips del front (`ui/Chip`) que bajan a su bloque. */
const claseChip = `${chip.chip} ${chip.toque}`;

export const metadata = { title: tituloDePagina("Manual del showcase", "Administración"), robots: { index: false, follow: false } };

/**
 * El manual del showcase (OL-426): cada entrada del panel de ayuda de la ficha (`../ayuda.ts`), con la rúbrica entera (0, 1 y 2 de cada señal) y
 * las tres reglas de gobierno. Misma fuente que el panel; cada entrada lleva su ancla, a la que apunta «Más en el manual ›». Misma guardia que la
 * ficha. Con el estilo del manual del grafo.
 */
export default async function ManualShowcase() {
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${RUTA_MANUAL_SHOWCASE}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  return (
    <main className={plantilla.pagina}>
      <Barra volver={{ href: "/admin/showcase", texto: "Showcase" }} titulo="Manual del showcase" />
      {/* La página de Ayuda del front (OL-457): texto corrido con sus títulos; el índice, chips que bajan sin apilar historial (ui/Salto). */}
      <article className={legal.texto}>
        <p>La lista de candidatos para el showcase, con una rúbrica de cuatro señales, las evidencias que la sostienen y las notas del consejo. Solo para administración.</p>
        <Chips ariaLabel="Bloques del manual" envuelve>
          {SECCIONES_MANUAL.map((b) => (
            <Salto key={b.id} destino={b.id} className={claseChip}>
              {b.titulo}
            </Salto>
          ))}
          <Salto destino="gobierno" className={claseChip}>
            Gobierno
          </Salto>
        </Chips>
        {SECCIONES_MANUAL.map((b) => (
          <section key={b.id} id={b.id} className={styles.bloque}>
            <h2>{b.titulo}</h2>
            {b.entradas.map((clave) => {
              const e = AYUDA_SHOWCASE[clave];
              return (
                <section key={clave} id={clave} className={styles.entrada}>
                  <h3>{e.titulo}</h3>
                  <p>{e.texto}</p>
                  {e.detalle && <p>{e.detalle}</p>}
                </section>
              );
            })}
          </section>
        ))}
        <section id="gobierno" className={styles.bloque}>
          <h2>Gobierno</h2>
          {REGLAS_GOBIERNO.map((r) => (
            <p key={r}>{r}</p>
          ))}
        </section>
      </article>
    </main>
  );
}
