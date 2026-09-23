import Link from "next/link";
import Barra from "@/components/ui/Barra";
import { IconoCalendarioMas, IconoCampana, IconoPersonas, IconoReloj } from "@/components/ui/Iconos";
import { hrefEvento } from "@/lib/eventos";
import { agruparNovedades } from "@/lib/novedades";
import { usuarioActual } from "@/lib/supabase/servidor";
import ficha from "@/components/ui/Ficha.module.css";
import { cargarNovedades } from "./consultas";
import MarcarVistas from "./MarcarVistas";
import TelefonoAun from "./TelefonoAun";
import styles from "./novedades.module.css";

export const metadata = { title: "Novedades · Somos Nosotros", robots: { index: false, follow: false } };

/**
 * Novedades: lo nuevo en lo que sigues, los cambios en lo que vas, hoy vas y quién más va; por día, de hoy hacia atrás.
 * Se calcula, no se administra; lo no visto lleva un punto. Decisiones 1 a 4 de docs/rediseno/13.
 */
export default async function Novedades() {
  const actual = await usuarioActual();
  if (!actual) {
    return (
      <main className={ficha.pagina}>
        <Barra volver={{ href: "/", texto: "Agenda" }} />
        <h1 className={styles.titulo}>Novedades</h1>
        <p className={styles.vacio}>
          Aquí verás lo nuevo en los lugares y artistas que sigas, y los cambios en lo que vas. <Link href="/entrar?siguiente=/novedades">Entra</Link> para seguir a los tuyos.
        </p>
      </main>
    );
  }
  const { lista, sigue } = await cargarNovedades(actual.perfil.id, actual.perfil.novedades_vistas_en ?? null);
  const grupos = agruparNovedades(lista);
  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/", texto: "Agenda" }} />
      <MarcarVistas />
      <h1 className={styles.titulo}>Novedades</h1>
      {sigue === 0 && lista.length === 0 ? (
        <p className={styles.vacio}>
          Todavía no sigues nada. En la ficha de un lugar o artista toca Seguir y aquí verás lo que publiquen. <Link href="/lugares">Ver lugares</Link> · <Link href="/artistas">Ver artistas</Link>
        </p>
      ) : lista.length === 0 ? (
        <p className={styles.vacio}>Nada nuevo en las últimas dos semanas. Sigues {sigue === 1 ? "1 lugar o artista" : `${sigue} lugares y artistas`}.</p>
      ) : (
        grupos.map((g) => (
          <section key={g.clave} className={styles.grupo} aria-label={g.titulo}>
            <h2>{g.titulo}</h2>
            <ul className={styles.lista}>
              {g.novedades.map((n) => (
                <li key={n.clave}>
                  <Link href={hrefEvento({ id: n.eventoId, slug: n.eventoSlug })} className={`${styles.novedad} ${n.nueva ? styles.nueva : ""}`}>
                    {n.tipo === "nuevo" ? <IconoCalendarioMas width={22} height={22} /> : n.tipo === "cambio" ? <IconoReloj width={22} height={22} /> : n.tipo === "hoy" ? <IconoCampana width={22} height={22} /> : <IconoPersonas width={22} height={22} />}
                    <span className={styles.que}>{n.que}</span>
                    <span className={styles.evento}>{n.titulo}</span>
                    <span className={styles.cuando}>{n.cuando}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <TelefonoAun correo={actual.perfil.avisos_correo === true} llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
    </main>
  );
}
