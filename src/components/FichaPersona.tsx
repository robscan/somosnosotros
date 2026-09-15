import Link from "next/link";
import { agruparPorDia, type EventoAgenda } from "@/lib/agenda";
import { etiquetaArtista } from "@/lib/artistas";
import { calleCorta, etiquetaTipo } from "@/lib/lugares";
import { textoCompartirPersona } from "@/lib/perfil";
import type { ArtistaSeguido, LugarSeguido } from "@/app/personas/consultas";
import type { Perfil } from "@/lib/supabase/servidor";
import BotonCompartir from "./BotonCompartir";
import { IconoDisciplina } from "./ListaArtistas";
import PestanasPersona, { type Pestana } from "./PestanasPersona";
import RenglonEvento from "./RenglonEvento";
import {
  IconoCompartir,
  IconoEngrane,
  IconoPersona,
  IconoPin,
} from "./ui/Iconos";
import renglon from "./Renglon.module.css";
import styles from "./FichaPersona.module.css";

type Props = {
  perfil: Perfil;
  /** Mi perfil: con el engrane de Ajustes bajo la colonia y el aviso de completar. */
  mia: boolean;
  eventos: EventoAgenda[];
  interesan?: EventoAgenda[];
  /** Eventos a los que vamos los dos (ficha ajena con sesión). */
  juntos?: EventoAgenda[];
  lugares: LugarSeguido[];
  artistas: ArtistaSeguido[];
  /** Origen público del sitio, para los enlaces que se comparten. */
  origen: string;
};

/**
 * Una sola ficha de persona para Mi perfil y para la ficha ajena (docs/rediseno/13, decisiones 5 y 7): foto redonda,
 * nombre con Compartir a la derecha, colonia, sobre mí; luego el resumen en números que hace de pestañas
 * (Voy a · Sigo · Van a lo mismo) y la lista de la pestaña. Lo que se configura vive en Ajustes.
 */
export default function FichaPersona({
  perfil,
  mia,
  eventos,
  interesan = [],
  juntos = [],
  lugares,
  artistas,
  origen,
}: Props) {
  const reservada = !mia && !!perfil.reservado;
  const incompleto = mia && (!perfil.colonia || !perfil.bio);
  const listaEventos = (lista: EventoAgenda[], vacio: React.ReactNode) =>
    lista.length === 0 ? (
      <p className={styles.vacio}>{vacio}</p>
    ) : (
      agruparPorDia(lista).map((g) => (
        <div key={g.clave} className={styles.dia}>
          <h3>{g.titulo}</h3>
          <ul className={styles.lista}>
            {g.eventos.map((e) => (
              <RenglonEvento key={e.id} evento={e} />
            ))}
          </ul>
        </div>
      ))
    );
  const pestanas: Pestana[] = [
    {
      clave: "va",
      n: eventos.length,
      etiqueta: mia ? "Voy a" : "Va a",
      contenido: listaEventos(
        eventos,
        mia ? (
          <>
            Todavía no vas a nada. <Link href="/">Ver la agenda</Link>
          </>
        ) : (
          "Todavía no ha dicho que va a ningún evento."
        ),
      ),
    },
    {
      clave: "sigue",
      n: lugares.length + artistas.length,
      etiqueta: mia ? "Sigo" : "Sigue",
      contenido:
        lugares.length + artistas.length === 0 ? (
          <p className={styles.vacio}>
            {mia ? (
              <>
                Todavía no sigues nada. <Link href="/lugares">Ver lugares</Link>{" "}
                · <Link href="/artistas">Ver artistas</Link>
              </>
            ) : (
              "Todavía no sigue ningún lugar ni artista."
            )}
          </p>
        ) : (
          // Lugares y artistas en grupos con subtítulo, como los días de "Voy a" (misma jerarquía, sin control extra).
          <>
            {lugares.length > 0 && (
              <div className={styles.dia}>
                <h3>Lugares · {lugares.length}</h3>
                <ul className={styles.lista}>
                  {lugares.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/lugares/${l.id}`}
                        className={renglon.renglon}
                      >
                        {l.portada ? (
                          // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                          <img
                            src={l.portada}
                            alt=""
                            className={renglon.foto}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span
                            className={`${renglon.foto} ${renglon.fotoVacia}`}
                            aria-hidden="true"
                          >
                            <IconoPin width={26} height={26} />
                          </span>
                        )}
                        <span className={renglon.titulo}>{l.nombre}</span>
                        <span className={renglon.meta}>
                          <span className={renglon.envuelve}>
                            <IconoPin width={15} height={15} />
                            {etiquetaTipo(l.tipo)}
                            {calleCorta(l.direccion)
                              ? ` · ${calleCorta(l.direccion)}`
                              : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {artistas.length > 0 && (
              <div className={styles.dia}>
                <h3>Artistas · {artistas.length}</h3>
                <ul className={styles.lista}>
                  {artistas.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/artistas/${a.id}`}
                        className={renglon.renglon}
                      >
                        {a.foto ? (
                          // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                          <img
                            src={a.foto}
                            alt=""
                            className={`${renglon.foto} ${renglon.fotoRedonda}`}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span
                            className={`${renglon.foto} ${renglon.fotoVacia} ${renglon.fotoRedonda}`}
                            aria-hidden="true"
                          >
                            <IconoDisciplina
                              disciplina={a.disciplina}
                              size={26}
                            />
                          </span>
                        )}
                        <span className={renglon.titulo}>{a.nombre}</span>
                        <span className={renglon.meta}>
                          <span className={renglon.envuelve}>
                            <IconoDisciplina disciplina={a.disciplina} />
                            {etiquetaArtista(a)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ),
    },
  ];
  if (juntos.length > 0)
    pestanas.push({
      clave: "juntos",
      n: juntos.length,
      etiqueta: "Van a lo mismo",
      contenido: listaEventos(juntos, ""),
    });
  if (mia && interesan.length > 0)
    pestanas.push({
      clave: "interesa",
      n: interesan.length,
      etiqueta: "Me interesa",
      contenido: listaEventos(interesan, ""),
    });

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
          <Link href="/ajustes?editar=1">Completar</Link>
        </p>
      )}
      {reservada ? (
        <p className={styles.reservada}>
          Perfil reservado: solo se ve el nombre.
        </p>
      ) : (
        <PestanasPersona pestanas={pestanas} />
      )}
    </>
  );
}
