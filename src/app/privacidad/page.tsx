import type { Metadata } from "next";
import Barra from "@/components/ui/Barra";
import styles from "./legal.module.css";

export const metadata: Metadata = { title: "Aviso de privacidad · Somos Nosotros" };

/** Quién responde por los datos y por dónde se le escribe (correo personal del founder, decidido el 2026-09-14: el dominio no recibe correo). */
export const RESPONSABLE = { nombre: "Somos Nosotros", contacto: "oscar@agenciaparadigma.com" };

/**
 * Aviso de privacidad (Ley Federal de Protección de Datos Personales en Posesión de los Particulares).
 * En llano y corto: qué datos, para qué, con quién se comparten y cómo pedir que se corrijan o se borren.
 * Borrador de la revisión del 2026-09-14; conviene que lo revise alguien de derecho antes de invitar por correo.
 */
export default function Privacidad() {
  return (
    <main className="pagina">
      <Barra volver={{ href: "/", texto: "Volver" }} />
      <div className={styles.texto}>
        <h1 className="titulo">Aviso de privacidad</h1>
        <p className="subtitulo">Última actualización: 16 de septiembre de 2026.</p>

        <h2>Quién responde por tus datos</h2>
        <p>
          {RESPONSABLE.nombre}, responsable del sitio somosnosotros.org, una plataforma sin fines de lucro para que la gente de San Luis Potosí conozca sus lugares culturales, sus artistas y su agenda. Puedes escribirnos a {RESPONSABLE.contacto}.
        </p>

        <h2>Qué datos guardamos</h2>
        <ul>
          <li>Al entrar: tu correo. Con él te mandamos el código de acceso y, si lo pides, los avisos. Si entras con Apple o con Google, ellos nos dan tu correo y tu nombre (Google, también tu foto de perfil); los cambias en «Mi perfil». Si en Apple eliges ocultar tu correo, guardamos la dirección que Apple te da y los avisos te llegan a través de Apple.</li>
          <li>Tu perfil, si lo llenas: nombre, foto, colonia y una línea sobre ti. El nombre y la foto son públicos: aparecen en «quién va» a un evento.</li>
          <li>Lo que haces en la app: a qué eventos dices «Voy» o «Me interesa», y qué lugares y artistas sigues. Quien abre tu perfil puede ver los eventos próximos a los que vas.</li>
          <li>Si activas avisos en el teléfono: la suscripción que nos da tu navegador para mandarte notificaciones. No es tu número.</li>
          <li>Tu ubicación, solo cuando tocas «Cerca de mí» o «Mi ubicación»: sirve para ordenar la lista o centrar el mapa y no se guarda.</li>
          <li>Lo que publicas: lugares, eventos, artistas, fotos y enlaces. Es público por definición.</li>
        </ul>

        <h2>Para qué</h2>
        <ul>
          <li>Para que entres sin contraseña y para que lo que publicas lleve tu nombre.</li>
          <li>Para avisarte, si lo pediste, de eventos nuevos en los lugares que sigues y para recordarte el día de un evento al que vas. Cada aviso trae un enlace para dejar de recibirlos, sin entrar.</li>
          <li>Para que el administrador pueda revisar reportes y contactarte si reclamas una ficha.</li>
        </ul>

        <h2>Fichas tomadas de catálogos públicos</h2>
        <p>
          Parte de los artistas y lugares se trajeron del Catálogo de Artistas Potosinos de la Dirección de Cultura Municipal: nombre, disciplina, descripción y redes públicas. No copiamos fotos. Los correos de contacto de ese catálogo se guardan aparte, nadie los ve en el sitio, y se usan una sola vez para invitar a cada artista a reclamar su ficha. Si es tu ficha y quieres cambiarla o que se quite, tócala y elige «Reclamar esta ficha», o escríbenos.
        </p>

        <h2>Con quién se comparten</h2>
        <p>
          Con las empresas que hacen funcionar el sitio, y solo para eso: Supabase (base de datos y acceso), Vercel (servidor), Resend (correos), Mapbox (mapa y direcciones) y Anthropic (lectura automática del cartel de un evento, solo la imagen que subes). Si eliges entrar con Apple o con Google, ellos confirman quién eres y saben que entraste a Somos Nosotros; no les mandamos nada más. No vendemos ni cedemos tus datos a nadie más.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes ver y cambiar tus datos en «Mi perfil», apagar los avisos ahí mismo o desde cualquier correo, y borrar tu cuenta con un toque: se borra tu correo, tu perfil, lo que sigues y a qué vas. Lo que publicaste (lugares, eventos) se queda para la comunidad, sin tu nombre. Para acceder, rectificar, cancelar u oponerte al uso de tus datos (derechos ARCO), escríbenos a {RESPONSABLE.contacto} y te respondemos en un máximo de 20 días hábiles.
        </p>

        <h2>Cookies</h2>
        <p>Usamos solo la cookie de sesión que te mantiene dentro y, mientras entras con Apple o con Google, otra que dura 10 minutos y comprueba que la vuelta es tuya. Sin rastreo ni publicidad.</p>

        <h2>Cambios</h2>
        <p>Si este aviso cambia, lo verás aquí con la fecha nueva. Si el cambio afecta a cómo usamos tus datos, te lo diremos por correo.</p>

        <small>Reglas de uso: <a href="/reglas">somosnosotros.org/reglas</a></small>
      </div>
    </main>
  );
}
