import { Fragment } from "react";
import { IconoDisciplina } from "@/components/RenglonArtista";
import Boton from "@/components/ui/Boton";
import { Chip } from "@/components/ui/Chip";
import { IconoCalendario, IconoPin } from "@/components/ui/Iconos";
import Renglon from "@/components/ui/Renglon";
import type { Disciplina } from "@/lib/artistas";
import { hrefArtista } from "@/lib/artistas";
import { hrefEvento } from "@/lib/eventos";
import { hrefLugar } from "@/lib/lugares";
import {
  cuandoPublicado,
  disciplinaArtista,
  dondePublicado,
  estadoArtista,
  estadoEvento,
  estadoLugar,
  faltanPublicado,
  fotoEventoPublicado,
  hrefVerMasPublicado,
  TIPOS_PUBLICADO,
  TITULO_PUBLICADO,
  tipoLugar,
  type EstadoPublicado,
  type Publicado,
  type TipoPublicado,
} from "@/lib/panelPublicado";
import styles from "../../admin.module.css";

/** El `id` de la sección: el renglón «Publicó» de Actividad baja aquí con `ui/Salto`. */
export const ANCLA_PUBLICADO = "publicado";

/** La etiqueta de lo que el público no ve (lo ve la administración): el rótulo de estado de los renglones de la app. */
function Estado({ estado }: { estado: EstadoPublicado | null }) {
  return estado && <Chip variante="estado">{estado}</Chip>;
}

/**
 * «Lo que publicó» (OL-414): cada cosa que la persona dio de alta, por tipo (Eventos, Lugares, Artistas) y de la más reciente a la más antigua, con el
 * renglón de lista de la app (`ui/Renglon`): foto, nombre y una meta corta (un evento, su día y su lugar; un lugar, su tipo; un artista, su
 * disciplina) y, si el público no lo ve, «Oculto», «Borrador», «Cancelado» o «Privado». Cada renglón abre su ficha pública: Administración no tiene
 * ficha propia de un lugar, un evento o un artista, y las listas del panel (decisión 10 del doc 19) también abren la pública, donde quien administra
 * ve lo oculto y su menú. 20 de cada tipo y «Ver más» (no apila historial: filtrar no es navegar). Maquetación plana: hijos directos de `main`.
 */
export default function LoPublicado({ perfilId, publicado, paginas, ahora }: { perfilId: string; publicado: Publicado; paginas: Record<TipoPublicado, number>; ahora: Date }) {
  return (
    <>
      <h2 id={ANCLA_PUBLICADO} className={`${styles.grupo} ${styles.ancla}`}>
        Lo que publicó
      </h2>
      {TIPOS_PUBLICADO.filter((t) => publicado[t].total > 0).map((t) => {
        const faltan = faltanPublicado(publicado[t]);
        return (
          <Fragment key={t}>
            <h3 className={styles.tipoPublicado}>
              {TITULO_PUBLICADO[t]}
              <small>{publicado[t].total}</small>
            </h3>
            <ul className={styles.publicado} aria-label={TITULO_PUBLICADO[t]}>
              {t === "eventos" &&
                publicado.eventos.filas.map((e) => (
                  <Renglon key={e.id} href={hrefEvento(e)} foto={fotoEventoPublicado(e)} perezosa titulo={e.titulo}>
                    <Estado estado={estadoEvento(e)} />
                    <span>
                      <IconoCalendario width={15} height={15} />
                      <span>{cuandoPublicado(e, e.evento_padre_id ? (publicado.festivales[e.evento_padre_id] ?? "un festival") : null, ahora)}</span>
                    </span>
                    <span>
                      <IconoPin width={15} height={15} />
                      <span>{dondePublicado(e)}</span>
                    </span>
                  </Renglon>
                ))}
              {t === "lugares" &&
                publicado.lugares.filas.map((l) => (
                  <Renglon key={l.id} href={hrefLugar(l)} foto={l.portada} perezosa titulo={l.nombre}>
                    <Estado estado={estadoLugar(l)} />
                    <span>
                      <IconoPin width={15} height={15} />
                      <span>{tipoLugar(l)}</span>
                    </span>
                  </Renglon>
                ))}
              {t === "artistas" &&
                publicado.artistas.filas.map((a) => (
                  <Renglon key={a.id} href={hrefArtista(a)} foto={a.foto} redonda perezosa titulo={a.nombre}>
                    <Estado estado={estadoArtista(a)} />
                    <span>
                      <IconoDisciplina disciplina={a.disciplina as Disciplina} />
                      <span>{disciplinaArtista(a)}</span>
                    </span>
                  </Renglon>
                ))}
            </ul>
            {faltan > 0 && (
              <Boton href={hrefVerMasPublicado(perfilId, paginas, t)} variante="secundario" className={styles.verMas} scroll={false} replace>
                Ver más ({faltan} más)
              </Boton>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
