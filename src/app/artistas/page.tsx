import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import styles from "./artistas.module.css";

export const metadata = { title: "Artistas · Somos Nosotros" };

/** Sección en definición: se dice lo que va a ser, no se rellena. */
export default function Artistas() {
  return (
    <main className="raiz">
      <div className="cabecera-raiz">
        <Barra derecha={<Sesion />} />
      </div>
      <section className={styles.seccion} aria-label="Artistas">
        <h1 className={styles.titulo}>Artistas</h1>
        <p className={styles.texto}>Aquí van las personas y los grupos que hacen la cultura de San Luis Potosí: quiénes son, dónde tocan, exponen o actúan, y cuándo.</p>
        <p className={styles.texto}>Todavía lo estamos armando. Mientras, si eres artista o grupo, publica tus eventos: ya aparecen en la agenda.</p>
      </section>
      <Publicar hayLugares />
      <NavInferior />
    </main>
  );
}
