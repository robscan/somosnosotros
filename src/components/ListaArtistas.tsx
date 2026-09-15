import Link from "next/link";
import Buscador from "@/components/ui/Buscador";
import { ChipEnlace, Chips, Cuenta } from "@/components/ui/Chip";
import { etiquetaArtista, etiquetaDisciplina, hrefArtistas, textoProximaFecha, UMBRAL_BUSCAR_ARTISTAS, type ArtistaLista, type Disciplina, type FiltroLeido } from "@/lib/artistas";
import { IconoCalendario, IconoEstrella, IconoMascara, IconoNota, IconoPincel, IconoPluma } from "./ui/Iconos";
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
export default function ListaArtistas({ artistas, total, totalCiudad, disciplinas, detalles, filtro, conChips, pagina, conSesion }: Props) {
  const hrefNuevo = (nombre?: string) => {
    const destino = `/artistas/nuevo${nombre ? `?nombre=${encodeURIComponent(nombre)}` : ""}`;
    return conSesion ? destino : `/entrar?siguiente=${encodeURIComponent(destino)}`;
  };
  const queHacen = filtro.que ? (detalles.find((x) => x.valor === filtro.que)?.etiqueta ?? filtro.que) : filtro.hace ? etiquetaDisciplina(filtro.hace) : null;

  if (totalCiudad === 0) {
    return (
      <section className={styles.vacio}>
        <h2>Artistas</h2>
        <p>Aún no hay artistas registrados en San Luis Potosí. ¿Eres artista o grupo, o conoces a alguien? Regístralo.</p>
        <Link href={hrefNuevo()} className={styles.registrar}>
          Registrar un artista
        </Link>
      </section>
    );
  }
  return (
    <section aria-label="Artistas">
      {totalCiudad >= UMBRAL_BUSCAR_ARTISTAS && (
        <div className={styles.fija}>
          <Buscador valor={filtro.q ?? ""} placeholder="Buscar por nombre" ariaLabel="Buscar artista por nombre" />
          {conChips && disciplinas.length > 1 && (
            <Chips ariaLabel="Qué hacen">
              <ChipEnlace activo={!filtro.hace} href={hrefArtistas({ q: filtro.q })}>
                Todos
                <Cuenta n={totalCiudad} />
              </ChipEnlace>
              {disciplinas.map((d) => (
                <ChipEnlace key={d.valor} activo={filtro.hace === d.valor} href={hrefArtistas({ hace: filtro.hace === d.valor ? null : d.valor, q: filtro.q })}>
                  {d.etiqueta}
                  {d.n != null && <Cuenta n={d.n} />}
                </ChipEnlace>
              ))}
            </Chips>
          )}
          {conChips && detalles.length > 0 && (
            <Chips ariaLabel={`Qué ${etiquetaDisciplina(filtro.hace!).toLowerCase()}`}>
              <ChipEnlace activo={!filtro.que} href={hrefArtistas({ hace: filtro.hace, q: filtro.q })}>
                Todo
                {disciplinas.find((d) => d.valor === filtro.hace)?.n != null && <Cuenta n={disciplinas.find((d) => d.valor === filtro.hace)!.n!} />}
              </ChipEnlace>
              {detalles.map((d) => (
                <ChipEnlace key={d.valor} activo={filtro.que === d.valor} href={hrefArtistas({ hace: filtro.hace, que: filtro.que === d.valor ? null : d.valor, q: filtro.q })}>
                  {d.etiqueta}
                  {d.n != null && <Cuenta n={d.n} />}
                </ChipEnlace>
              ))}
            </Chips>
          )}
        </div>
      )}
      {artistas.length === 0 && !filtro.q ? (
        <section className={styles.vacio}>
          <p>Todavía no hay artistas de {queHacen?.toLowerCase()} registrados.</p>
        </section>
      ) : artistas.length === 0 ? (
        <section className={styles.vacio}>
          <p>
            Nadie {queHacen ? `de ${queHacen.toLowerCase()} ` : ""}se llama «{filtro.q}». ¿Lo registras?
          </p>
          <Link href={hrefNuevo(filtro.q!)} className={styles.registrar}>
            Registrar a «{filtro.q}»
          </Link>
        </section>
      ) : (
        <>
          <p className={styles.conteo}>{total === 1 ? "1 artista" : `${total} artistas`}</p>
          <ul className={styles.lista}>
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
                  <span className={`${renglon.meta} ${renglon.metaColumna}`}>
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
                </Link>
              </li>
            ))}
          </ul>
          {total > artistas.length && (
            <Link href={hrefArtistas({ ...filtro, n: filtro.n + pagina })} className={styles.verMas} scroll={false}>
              Ver más ({total - artistas.length} más)
            </Link>
          )}
        </>
      )}
    </section>
  );
}
