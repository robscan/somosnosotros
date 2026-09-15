import type { Metadata } from "next";
import Barra from "@/components/ui/Barra";
import styles from "../privacidad/legal.module.css";

export const metadata: Metadata = { title: "Reglas de uso · Somos Nosotros" };

/**
 * Reglas de uso, en llano. No son "términos y condiciones" de abogado: un directorio sin cobro no los necesita,
 * pero sí hace falta decir qué se puede publicar y qué hace el administrador. Borrador de la revisión del 2026-09-14.
 */
export default function Reglas() {
  return (
    <main className="pagina">
      <Barra volver={{ href: "/", texto: "Volver" }} />
      <div className={styles.texto}>
        <h1 className="titulo">Reglas de uso</h1>
        <p className="subtitulo">Somos Nosotros es de la gente de San Luis Potosí. Estas son las reglas para que siga sirviendo.</p>

        <h2>Qué se publica aquí</h2>
        <ul>
          <li>Lugares culturales, artistas y grupos de la ciudad, y sus eventos: conciertos, obras, talleres, exposiciones, lecturas, encuentros.</li>
          <li>Cosas reales: un evento con fecha, hora y sitio; un lugar con dirección; un artista con nombre. Nada inventado ni duplicado.</li>
          <li>Con tu nombre: lo que publicas se ve con el nombre de tu perfil. Puedes editarlo o borrarlo cuando quieras.</li>
        </ul>

        <h2>Qué no</h2>
        <ul>
          <li>Publicidad de productos, promociones o sorteos que no sean un evento cultural.</li>
          <li>Contenido que ataque, acose o discrimine a alguien, o que use fotos de otras personas sin permiso.</li>
          <li>Hacerte pasar por un lugar, un artista o una persona que no eres.</li>
        </ul>

        <h2>Qué hace el administrador</h2>
        <ul>
          <li>Puede editar, ocultar o borrar cualquier ficha o evento que no cumpla estas reglas, o corregir datos evidentemente mal puestos.</li>
          <li>Revisa los reportes que manda la gente y responde a quien reclama una ficha.</li>
          <li>Las fichas tomadas del Catálogo de Artistas Potosinos se retiran a petición del artista o del lugar, sin preguntas.</li>
        </ul>

        <h2>Tu cuenta</h2>
        <p>
          Es tuya y es una sola. Puedes borrarla desde «Mi perfil»: desaparece tu correo, tu perfil, lo que sigues y a qué vas; lo que publicaste se queda para la comunidad, sin tu nombre.
        </p>

        <small>Aviso de privacidad: <a href="/privacidad">somosnosotros.org/privacidad</a></small>
      </div>
    </main>
  );
}
