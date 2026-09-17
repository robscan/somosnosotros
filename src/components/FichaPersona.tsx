import Link from "next/link";
import type { EventoAgenda } from "@/lib/agenda";
import { textoCompartirPersona } from "@/lib/perfil";
import type { ArtistaSeguido, LugarSeguido } from "@/app/personas/consultas";
import type { Perfil } from "@/lib/supabase/servidor";
import ActividadPersona, { type Gestos } from "./ActividadPersona";
import BotonCompartir from "./BotonCompartir";
import { IconoCompartir, IconoEngrane, IconoPersona } from "./ui/Iconos";
import styles from "./FichaPersona.module.css";

type Props = {
  perfil: Perfil;
  /** Mi perfil: con el engrane de Ajustes bajo la colonia y el aviso de completar. */
  mia: boolean;
  eventos: EventoAgenda[];
  /** Solo en Mi perfil. */
  interesan?: EventoAgenda[];
  lugares: LugarSeguido[];
  artistas: ArtistaSeguido[];
  /** Los gestos de quien mira sobre los renglones (ActividadPersona); null en la propia ficha vista como la ven los demás. */
  gestos: Gestos | null;
  /** Origen público del sitio, para los enlaces que se comparten. */
  origen: string;
};

/**
 * Una sola ficha de persona para Mi perfil y para la ficha ajena (docs/rediseno/13, decisiones 5 y 7): foto redonda,
 * nombre con Compartir a la derecha, colonia, sobre mí; luego el resumen en números que hace de pestañas
 * (Voy a · Sigo · Van a lo mismo) y la lista de la pestaña, con los renglones y gestos de las listas (ActividadPersona,
 * OL-057). Lo que se configura vive en Ajustes. Un perfil reservado no pinta ni manda sus listas.
 */
export default function FichaPersona({ perfil, mia, eventos, interesan = [], lugares, artistas, gestos, origen }: Props) {
  const reservada = !mia && !!perfil.reservado;
  const incompleto = mia && (!perfil.colonia || !perfil.bio);

  return (
    <>
      <div className={styles.cabecera}>
        {perfil.foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
          <img src={perfil.foto} alt="" className={styles.avatar} />
        ) : (
          <span
            className={`${styles.avatar} ${styles.avatarVacio}`}
            aria-hidden="true"
          >
            {(perfil.nombre || "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <h1 className={styles.nombre}>{perfil.nombre}</h1>
        {/* Las dos acciones de la ficha juntas, arriba a la derecha (corrección del founder, 2026-09-15). */}
        <div className={styles.acciones}>
          {mia && (
            <Link
              href="/ajustes"
              className={styles.accion}
              aria-label="Ajustes"
            >
              <IconoEngrane width={22} height={22} />
            </Link>
          )}
          <BotonCompartir
            titulo={perfil.nombre}
            texto={textoCompartirPersona(perfil.nombre, eventos.length, mia)}
            url={`${origen}/personas/${perfil.id}`}
            className={styles.accion}
            ariaLabel="Compartir"
          >
            <IconoCompartir width={22} height={22} />
          </BotonCompartir>
        </div>
        {perfil.colonia && <p className={styles.colonia}>{perfil.colonia}</p>}
      </div>
      {perfil.bio && <p className={styles.sobreMi}>{perfil.bio}</p>}
      {incompleto && (
        <p className={styles.completa}>
          <IconoPersona width={20} height={20} />
          <span>
            Falta{" "}
            {!perfil.colonia && !perfil.bio
              ? "tu colonia y una línea sobre ti"
              : !perfil.colonia
                ? "tu colonia"
                : "una línea sobre ti"}
            : así te reconocen en “quién va”.
          </span>
          <Link href="/ajustes/editar">Completar</Link>
        </p>
      )}
      {reservada ? (
        <p className={styles.reservada}>
          Perfil reservado: solo se ve el nombre.
        </p>
      ) : (
        <ActividadPersona mia={mia} eventos={eventos} interesan={mia ? interesan : []} lugares={lugares} artistas={artistas} gestos={gestos} />
      )}
    </>
  );
}
