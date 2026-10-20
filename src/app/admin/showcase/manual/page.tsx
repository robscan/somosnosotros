import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import plantilla from "@/components/ui/Plantilla.module.css";
import { usuarioActual } from "@/lib/supabase/servidor";
import { AYUDA_SHOWCASE, REGLAS_GOBIERNO, RUTA_MANUAL_SHOWCASE, SECCIONES_MANUAL } from "../ayuda";
import styles from "../../grafo/manual/Manual.module.css";

export const metadata = { title: "Manual del showcase · Administración · Somos Nosotros", robots: { index: false, follow: false } };

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
    <main className={plantilla.paginaContenido}>
      <Barra volver={{ href: "/admin/showcase", texto: "Showcase" }} />
      <article className={styles.manual}>
        <h1>Manual del showcase</h1>
        <p className={styles.intro}>La lista de candidatos para el showcase, con una rúbrica de cuatro señales, las evidencias que la sostienen y las notas del consejo. Solo para administración.</p>
        <nav className={styles.indice} aria-label="Bloques del manual">
          {SECCIONES_MANUAL.map((b) => (
            <a key={b.id} href={`#${b.id}`}>
              {b.titulo}
            </a>
          ))}
          <a href="#gobierno">Gobierno</a>
        </nav>
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
            <section key={r} className={styles.entrada}>
              <p>{r}</p>
            </section>
          ))}
        </section>
        <Link href="/admin/showcase" className={styles.volver}>
          Volver al showcase
        </Link>
      </article>
    </main>
  );
}
