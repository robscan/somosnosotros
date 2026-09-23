import Link from "next/link";
import type { ResultadoBusqueda } from "@/lib/buscarUnificado";
import type { Tarjeta } from "@/lib/destacados";
import { SIN_FOTO } from "@/lib/imagen";
import { limiteBusqueda, ordenBusqueda, type SeccionBuscador } from "@/lib/inicio";
import styles from "./BuscadorUnificado.module.css";

const NOMBRE: Record<"eventos" | "lugares" | "artistas", { titulo: string; href: string }> = {
  eventos: { titulo: "Eventos", href: "/" },
  lugares: { titulo: "Lugares", href: "/lugares" },
  artistas: { titulo: "Artistas", href: "/artistas" },
};

function conCiudad(href: string, ciudad: string | null, q: string): string {
  const p = new URLSearchParams();
  if (ciudad) p.set("ciudad", ciudad);
  p.set("q", q);
  return `${href}?${p.toString()}`;
}

/**
 * Los resultados del buscador único, ya agrupados por tipo (docs/rediseno/41, OL-153, bitácora 188): pieza
 * puramente de presentación, sin estado ni consulta propia, para que `BuscadorUnificado` (la de verdad, que pide a
 * `accionesBuscar`) y cualquier arnés de capturas la reutilicen con datos ya en mano.
 */
export default function ResultadosBusqueda({ seccion, resultado, texto, ciudadSlug }: { seccion: SeccionBuscador; resultado: ResultadoBusqueda; texto: string; ciudadSlug: string | null }) {
  const grupos = ordenBusqueda(seccion);
  const total = resultado.eventos.length + resultado.lugares.length + resultado.artistas.length;
  if (total === 0) return <p className={styles.aviso}>Nada se llama «{texto}».</p>;
  return (
    <div className={styles.lista}>
      {grupos.map((grupo) => {
        const tarjetas: Tarjeta[] = resultado[grupo];
        if (tarjetas.length === 0) return null;
        const limite = limiteBusqueda(seccion, grupo);
        const { titulo, href } = NOMBRE[grupo];
        return (
          <section key={grupo} className={styles.grupo}>
            <h3>
              {titulo} <span className={styles.n}>· {tarjetas.length}</span>
              {tarjetas.length > limite && (
                <Link href={conCiudad(href, ciudadSlug, texto)} className={styles.ver}>
                  Ver todos
                </Link>
              )}
            </h3>
            <ul>
              {tarjetas.slice(0, limite).map((t) => (
                <li key={t.id}>
                  <Link href={t.href} className={styles.fila}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
                    <img src={t.foto || SIN_FOTO} alt="" className={`${styles.mini} ${grupo !== "eventos" ? styles.redonda : ""}`} loading="lazy" />
                    <span>
                      <b>{t.titulo}</b>
                      <small>{t.detalle}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
