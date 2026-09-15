import Link from "next/link";
import type { ReactNode } from "react";
import { agruparPorDia, type EventoAgenda } from "@/lib/agenda";
import { etiquetaArtista } from "@/lib/artistas";
import { calleCorta, etiquetaTipo } from "@/lib/lugares";
import { TEXTO_INVITAR, textoCompartirPersona } from "@/lib/perfil";
import BotonCompartir from "./BotonCompartir";
import type { ArtistaSeguido, LugarSeguido } from "@/app/personas/consultas";
import type { Perfil } from "@/lib/supabase/servidor";
import { IconoDisciplina } from "./ListaArtistas";
import RenglonEvento from "./RenglonEvento";
import { IconoCompartir, IconoPin } from "./ui/Iconos";
import renglon from "./Renglon.module.css";
import styles from "./FichaPersona.module.css";

type Props = {
  perfil: Perfil;
  /** Mi perfil: con Editar (botón) y el renglón de Avisos, que llegan ya armados desde la página. */
  mia: boolean;
  editar?: ReactNode;
  avisos?: ReactNode;
  eventos: EventoAgenda[];
  interesan?: EventoAgenda[];
  lugares: LugarSeguido[];
  artistas: ArtistaSeguido[];
  /** Origen público del sitio, para los enlaces que se comparten. */
  origen: string;
};

/**
 * Una sola ficha de persona para Mi perfil y para la ficha ajena (decisión 5 de docs/rediseno/11): foto redonda,
 * nombre, colonia y sobre mí; luego a qué va (por día, como la agenda) y qué sigue (lugares cuadrados, artistas redondos).
 * La mía trae Editar y Avisos; la ajena, nada que tocar salvo los renglones.
 */
export default function FichaPersona({ perfil, mia, editar, avisos, eventos, interesan = [], lugares, artistas, origen }: Props) {
  const incompleto = mia && (!perfil.colonia || !perfil.bio);
  const grupos = agruparPorDia(eventos);
  const gruposInteres = agruparPorDia(interesan);
  const sigue = lugares.length + artistas.length;
  return (
    <>
      <div className={styles.cabecera}>
        {perfil.foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
          <img src={perfil.foto} alt="" className={styles.avatar} />
        ) : (
          <span className={`${styles.avatar} ${styles.avatarVacio}`} aria-hidden="true">
            {(perfil.nombre || "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <h1 className={styles.nombre}>{perfil.nombre}</h1>
        {perfil.colonia && <p className={styles.colonia}>{perfil.colonia}</p>}
        <div className={styles.editar}>
          {editar}
          <BotonCompartir titulo={perfil.nombre} texto={textoCompartirPersona(perfil.nombre, eventos.length, mia)} url={`${origen}/personas/${perfil.id}`} className={styles.compartir}>
            <IconoCompartir width={18} height={18} />
            Compartir
          </BotonCompartir>
        </div>
      </div>
      {perfil.bio && <p className={styles.sobreMi}>{perfil.bio}</p>}
      {mia && (
        <ul className={styles.datos}>
          {incompleto && (
            <li className={styles.dato}>
              <b>Completa tu perfil: {!perfil.colonia && !perfil.bio ? "colonia y una línea sobre ti" : !perfil.colonia ? "tu colonia" : "una línea sobre ti"}</b>
              <small>Así la gente te reconoce en “quién va”.</small>
            </li>
          )}
          {avisos}
        </ul>
      )}

      <section className={styles.grupo} aria-label={mia ? "Eventos a los que voy" : "Eventos a los que va"}>
        <h2>
          {mia ? "Voy a" : "Va a"}
          {eventos.length > 0 && <span> · {eventos.length}</span>}
        </h2>
        {eventos.length === 0 ? (
          <p className={styles.vacio}>
            {mia ? (
              <>
                Todavía no vas a nada. <Link href="/">Ver la agenda</Link>
              </>
            ) : (
              "Todavía no ha dicho que va a ningún evento."
            )}
          </p>
        ) : (
          grupos.map((g) => (
            <div key={g.clave}>
              <h3>{g.titulo}</h3>
              <ul className={styles.lista}>
                {g.eventos.map((e) => (
                  <RenglonEvento key={e.id} evento={e} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {mia && interesan.length > 0 && (
        <section className={styles.grupo} aria-label="Eventos que me interesan">
          <h2>
            Me interesa<span> · {interesan.length}</span>
          </h2>
          {gruposInteres.map((g) => (
            <div key={g.clave}>
              <h3>{g.titulo}</h3>
              <ul className={styles.lista}>
                {g.eventos.map((e) => (
                  <RenglonEvento key={e.id} evento={e} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <section className={styles.grupo} aria-label={mia ? "Lo que sigo" : "Lo que sigue"}>
        <h2>
          {mia ? "Sigo" : "Sigue"}
          {sigue > 0 && <span> · {sigue}</span>}
        </h2>
        {sigue === 0 ? (
          <p className={styles.vacio}>
            {mia ? (
              <>
                Todavía no sigues nada. <Link href="/lugares">Ver lugares</Link> · <Link href="/artistas">Ver artistas</Link>
              </>
            ) : (
              "Todavía no sigue ningún lugar ni artista."
            )}
          </p>
        ) : (
          <ul className={styles.lista}>
            {lugares.map((l) => (
              <li key={l.id}>
                <Link href={`/lugares/${l.id}`} className={renglon.renglon}>
                  {l.portada ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                    <img src={l.portada} alt="" className={renglon.foto} loading="lazy" decoding="async" />
                  ) : (
                    <span className={`${renglon.foto} ${renglon.fotoVacia}`} aria-hidden="true">
                      <IconoPin width={26} height={26} />
                    </span>
                  )}
                  <span className={renglon.titulo}>{l.nombre}</span>
                  <span className={renglon.meta}>
                    <span className={renglon.envuelve}>
                      <IconoPin width={15} height={15} />
                      {etiquetaTipo(l.tipo)}
                      {calleCorta(l.direccion) ? ` · ${calleCorta(l.direccion)}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {artistas.map((a) => (
              <li key={a.id}>
                <Link href={`/artistas/${a.id}`} className={renglon.renglon}>
                  {a.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                    <img src={a.foto} alt="" className={`${renglon.foto} ${renglon.fotoRedonda}`} loading="lazy" decoding="async" />
                  ) : (
                    <span className={`${renglon.foto} ${renglon.fotoVacia} ${renglon.fotoRedonda}`} aria-hidden="true">
                      <IconoDisciplina disciplina={a.disciplina} size={26} />
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
        )}
      </section>

      {/* Invitar al sitio: donde la persona ya recibió valor, no en la barra (decisión del founder, 2026-09-15). */}
      {mia && (
        <BotonCompartir titulo="Somos Nosotros" texto={TEXTO_INVITAR} url={origen} className={styles.invitar}>
          <IconoCompartir width={20} height={20} />
          <span>
            <b>Invita a tus amigos a Somos Nosotros</b>
            <small>Se comparte el enlace del sitio</small>
          </span>
        </BotonCompartir>
      )}
    </>
  );
}
