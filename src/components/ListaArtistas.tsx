"use client";

import ChipCiudad from "@/components/Ciudad";
import Buscador from "@/components/ui/Buscador";
import { ChipEnlace, Chips, Cuenta } from "@/components/ui/Chip";
import { etiquetaArtista, etiquetaDisciplina, hrefArtistas, textoProximaFecha, UMBRAL_BUSCAR_ARTISTAS, type ArtistaLista, type Disciplina, type FiltroLeido } from "@/lib/artistas";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConArtistas } from "@/lib/ciudad";
import Deslizable from "./ui/Deslizable";
import { IconoCalendario, IconoEstrella, IconoMascara, IconoNota, IconoOk, IconoPincel, IconoPluma } from "./ui/Iconos";
import { useSeguirEnLista, type AvisosLista } from "./useSeguirEnLista";
import Boton from "@/components/ui/Boton";
import comun from "./Lista.module.css";
import renglon from "./Renglon.module.css";
import styles from "./ListaArtistas.module.css";

type Opcion = { valor: string; etiqueta: string; n?: number };
type Props = {
  artistas: ArtistaLista[];
  total: number;
  totalCiudad: number;
  disciplinas: Opcion[];
  detalles: Opcion[];
  filtro: FiltroLeido;
  conChips: boolean;
  pagina: number;
  conSesion: boolean;
  ciudad: Ciudad;
  ciudades: CiudadConArtistas[];
  /** Los artistas que la persona sigue (la lista los marca y deja seguir al deslizar); null = sin sesión. */
  seguidos?: string[] | null;
  /** Para la pregunta de avisos tras el primer Seguir; null = sin sesión. */
  avisos?: AvisosLista | null;
};

/** Icono de lo que hace: nota (música), máscara (teatro, danza, circo), pincel (artes visuales, cine), pluma (letras). */
export function IconoDisciplina({ disciplina, size = 15 }: { disciplina: Disciplina; size?: number }) {
  const p = { width: size, height: size };
  switch (disciplina) {
    case "musica":
      return <IconoNota {...p} />;
    case "teatro":
    case "danza":
    case "circo":
      return <IconoMascara {...p} />;
    case "artes_visuales":
    case "cine":
      return <IconoPincel {...p} />;
    case "letras":
      return <IconoPluma {...p} />;
    default:
      return <IconoEstrella {...p} />;
  }
}

/**
 * Lista de artistas: renglones como los de Lugares (foto redonda, nombre, qué hace, próxima fecha y dónde);
 * con fechas primero; búsqueda por nombre a partir de 8 y chips de disciplina a partir de 12 (decisiones 1 y 2);
 * dentro de una disciplina con muchos artistas, un segundo nivel de chips por detalle (género, técnica).
 * Todo el filtro vive en la URL y lo aplica el servidor: la página trae `pagina` artistas y "Ver más" pide otros tantos.
 */
export default function ListaArtistas({ artistas, total, totalCiudad, disciplinas, detalles, filtro, conChips, pagina, conSesion, ciudad, ciudades, seguidos = null, avisos = null }: Props) {
  // Al deslizar un artista: Seguir (decisión del founder, 2026-09-16; bitácora 071).
  const seguir = useSeguirEnLista("artista", seguidos, avisos);
  // La ciudad viaja en la URL como en la agenda y Lugares (ausente = la inicial, para que el enlace sea limpio).
  const cSlug = ciudad.slug === CIUDAD_INICIAL.slug ? null : ciudad.slug;
  const hrefNuevo = (nombre?: string) => {
    const p = new URLSearchParams();
    if (cSlug) p.set("ciudad", cSlug);
    if (nombre) p.set("nombre", nombre);
    const s = p.toString();
    const destino = `/artistas/nuevo${s ? `?${s}` : ""}`;
    return conSesion ? destino : `/entrar?siguiente=${encodeURIComponent(destino)}`;
  };
  // Cambiar de ciudad suelta el filtro (disciplina y detalle son de la ciudad que se deja); como en Lugares.
  const chipCiudad = <ChipCiudad ciudad={ciudad} ciudades={ciudades} hrefDe={(c) => hrefArtistas({ ciudad: c.slug === CIUDAD_INICIAL.slug ? null : c.slug })} />;
  const queHacen = filtro.que ? (detalles.find((x) => x.valor === filtro.que)?.etiqueta ?? filtro.que) : filtro.hace ? etiquetaDisciplina(filtro.hace) : null;

  if (totalCiudad === 0) {
    return (
      <section className={comun.vacio}>
        <h2>Artistas</h2>
        <Chips ariaLabel="Ciudad">{chipCiudad}</Chips>
        <p>Aún no hay artistas registrados en {ciudad.nombre}. ¿Eres artista o grupo, o conoces a alguien? Regístralo.</p>
        <Boton href={hrefNuevo()} variante="secundario">
          Registrar un artista
        </Boton>
      </section>
    );
  }
  return (
    <section aria-label="Artistas">
      {totalCiudad >= UMBRAL_BUSCAR_ARTISTAS && (
        <div className={styles.fija}>
          <Buscador valor={filtro.q ?? ""} placeholder="Buscar por nombre" ariaLabel="Buscar artista por nombre" />
          <Chips ariaLabel="Ciudad y qué hacen">
            {chipCiudad}
            {conChips && disciplinas.length > 1 && (
              <>
                <ChipEnlace activo={!filtro.hace} href={hrefArtistas({ ciudad: cSlug, q: filtro.q })}>
                  Todos
                  <Cuenta n={totalCiudad} />
                </ChipEnlace>
                {disciplinas.map((d) => (
                  <ChipEnlace key={d.valor} activo={filtro.hace === d.valor} href={hrefArtistas({ ciudad: cSlug, hace: filtro.hace === d.valor ? null : d.valor, q: filtro.q })}>
                    {d.etiqueta}
                    {d.n != null && <Cuenta n={d.n} />}
                  </ChipEnlace>
                ))}
              </>
            )}
          </Chips>
          {conChips && detalles.length > 0 && (
            <Chips ariaLabel={`Qué ${etiquetaDisciplina(filtro.hace!).toLowerCase()}`}>
              <ChipEnlace activo={!filtro.que} href={hrefArtistas({ ciudad: cSlug, hace: filtro.hace, q: filtro.q })}>
                Todo
                {disciplinas.find((d) => d.valor === filtro.hace)?.n != null && <Cuenta n={disciplinas.find((d) => d.valor === filtro.hace)!.n!} />}
              </ChipEnlace>
              {detalles.map((d) => (
                <ChipEnlace key={d.valor} activo={filtro.que === d.valor} href={hrefArtistas({ ciudad: cSlug, hace: filtro.hace, que: filtro.que === d.valor ? null : d.valor, q: filtro.q })}>
                  {d.etiqueta}
                  {d.n != null && <Cuenta n={d.n} />}
                </ChipEnlace>
              ))}
            </Chips>
          )}
        </div>
      )}
      {artistas.length === 0 && !filtro.q ? (
        <div className={comun.vacio}>
          <p>Todavía no hay artistas de {queHacen?.toLowerCase()} registrados.</p>
        </div>
      ) : artistas.length === 0 ? (
        <div className={comun.vacio}>
          <p>
            Nadie {queHacen ? `de ${queHacen.toLowerCase()} ` : ""}se llama «{filtro.q}». ¿Lo registras?
          </p>
          <Boton href={hrefNuevo(filtro.q!)} variante="secundario">
            Registrar a «{filtro.q}»
          </Boton>
        </div>
      ) : (
        <>
          <p className={comun.conteo}>{total === 1 ? "1 artista" : `${total} artistas`}</p>
          <ul className={styles.lista}>
            {artistas.map((a) => (
              <Deslizable key={a.id} href={`/artistas/${a.id}`} className={renglon.renglon} acciones={seguir.acciones(a.id, a.nombre)}>
                {a.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                  <img src={a.foto} alt="" className={`${renglon.foto} ${renglon.fotoRedonda}`} loading="lazy" decoding="async" />
                ) : (
                  <span className={`${renglon.foto} ${renglon.fotoVacia} ${renglon.fotoRedonda}`} aria-hidden="true">
                    <IconoDisciplina disciplina={a.disciplina} size={26} />
                  </span>
                )}
                <span className={renglon.titulo}>{a.nombre}</span>
                <span className={`${renglon.meta} ${renglon.metaColumna}`}>
                  {seguir.sigo(a.id) && (
                    <span className={renglon.estado}>
                      <IconoOk width={14} height={14} />
                      Sigues
                    </span>
                  )}
                  <span>
                    <IconoDisciplina disciplina={a.disciplina} />
                    {etiquetaArtista(a)}
                  </span>
                  {a.proxima && (
                    <span className={renglon.envuelve}>
                      <IconoCalendario width={15} height={15} />
                      <b>{textoProximaFecha(a.proxima)}</b>
                    </span>
                  )}
                </span>
              </Deslizable>
            ))}
          </ul>
          {seguir.extras}
          {total > artistas.length && (
            <Boton href={hrefArtistas({ ...filtro, ciudad: cSlug, n: filtro.n + pagina })} variante="secundario" className={styles.verMas} scroll={false} replace>
              Ver más ({total - artistas.length} más)
            </Boton>
          )}
        </>
      )}
    </section>
  );
}
