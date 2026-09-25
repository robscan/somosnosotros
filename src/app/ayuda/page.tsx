import type { Metadata } from "next";
import Barra from "@/components/ui/Barra";
import styles from "../privacidad/legal.module.css";

const DESCRIPCION = "Cómo usar Somos Nosotros: publicar un evento, seguir lugares y artistas, avisos, borrar tu cuenta y cómo escribirnos.";

export const metadata: Metadata = { title: "Ayuda · Somos Nosotros", description: DESCRIPCION };

/**
 * Página de ayuda: la URL de soporte que pide Apple para la ficha de la app en la tienda (App Store Connect,
 * OL-201). Contacto arriba (lo que Apple busca primero) y, debajo, las preguntas que de verdad hace la gente,
 * con respuestas que describen lo que la app hace hoy (comprobado en el código, no supuesto). Textos para
 * firma del founder — quedan también en la bitácora 230.
 */
export default function Ayuda() {
  return (
    <main className="pagina">
      <Barra volver={{ href: "/", texto: "Volver" }} />
      <div className={styles.texto}>
        <h1 className="titulo">Ayuda</h1>
        <p className="subtitulo">Cómo escribirnos y las preguntas más comunes sobre Somos Nosotros.</p>

        <h2>Cómo escribirnos</h2>
        <p>
          Manda un correo a <a href="mailto:hola@somosnosotros.org">hola@somosnosotros.org</a> y te respondemos.
        </p>

        <h2>¿Qué es Somos Nosotros?</h2>
        <p>Un directorio de los lugares culturales de San Luis Potosí y su agenda de eventos, para que la gente de la ciudad se entere de qué hay y se conozca. Sin fines de lucro; lo publican el administrador y quienes se registran.</p>

        <h2>¿Cómo publico un evento?</h2>
        <p>Con tu cuenta, toca «Publicar evento», elige el lugar y pon fecha y hora. Si subes una foto del cartel, la app intenta leer el título, la fecha, el lugar y los artistas por ti; tú revisas y ajustas antes de publicar.</p>

        <h2>¿Cómo reclamo mi ficha de artista?</h2>
        <p>Si ya existe una ficha con tu nombre, ábrela y toca «Soy yo / es mi grupo»: puedes pedir llevarla tú o pedir que se quite. El administrador la revisa y, si hace falta, te escribe a tu correo.</p>

        <h2>¿Cómo sigo artistas y lugares, y activo avisos?</h2>
        <p>En la ficha de un lugar o un artista, toca «Seguir». Te preguntamos si quieres avisos de sus eventos nuevos, por correo o con notificaciones del teléfono; lo cambias cuando quieras en Ajustes.</p>

        <h2>¿Cómo borro mi cuenta?</h2>
        <p>Entra a Ajustes y, al final, toca «Borrar mi cuenta». Se borran tu correo, tu perfil, lo que sigues y a qué eventos vas; lo que publicaste se queda para la comunidad, sin tu nombre.</p>

        <h2>¿Cómo reporto algo incorrecto?</h2>
        <p>En la ficha del lugar, evento, artista o perfil, abre el menú «···» y toca «Reportar»: eliges el motivo y, si quieres, agregas un detalle. El administrador lo revisa.</p>

        <small>Aviso de privacidad: <a href="/privacidad">somosnosotros.org/privacidad</a></small>
      </div>
    </main>
  );
}
