"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import ChipCiudad from "@/components/Ciudad";
import Buscador from "@/components/ui/Buscador";
import { ChipEnlace, Chips, Cuenta } from "@/components/ui/Chip";
import { etiquetaDisciplina, hrefArtistas, UMBRAL_BUSCAR_ARTISTAS, type ArtistaLista, type FiltroLeido } from "@/lib/artistas";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConArtistas } from "@/lib/ciudad";
import { tarjetaArtista, type Tarjeta } from "@/lib/destacados";
import { conGrupos, idGrupo } from "@/lib/indice";
import Destacados from "./Destacados";
import RenglonArtista from "./RenglonArtista";
import TiraLetras, { irAlGrupo, useLetraActiva, usePegajosos } from "./TiraLetras";
import { useSeguirEnLista, type AvisosLista } from "./useSeguirEnLista";
import Boton from "@/components/ui/Boton";
import comun from "./Lista.module.css";
import styles from "./ListaArtistas.module.css";

type Opcion = { valor: string; etiqueta: string; n?: number };
type Props = {
  artistas: ArtistaLista[];
  /** La tira de destacados (docs/rediseno/20); llega vacía con filtro o búsqueda. */
  destacados?: ArtistaLista[];
  eventosSemana?: Tarjeta[];
  /** Cuántos cumplen el filtro (disciplina, detalle o búsqueda), se vean o no (la página trae `n`). */
  total: number;
  /** Cuántos faltan por ver tras los que trae la página. */
  quedan: number;
  totalCiudad: number;
  disciplinas: Opcion[];
  detalles: Opcion[];
  /** Las letras de la tira, en el orden real de la lista, y en qué posición (0-based) empieza cada una. */
  letras: string[];
  posiciones: Record<string, number>;
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

/**
 * Lista de artistas: renglones como los de Lugares (foto redonda, nombre, qué hace, próxima fecha y dónde), con
 * encabezados de letra; búsqueda por nombre a partir de 8 y chips de disciplina a partir de 12 (decisiones 1 y 2);
 * dentro de una disciplina con muchos artistas, un segundo nivel de chips por detalle (género, técnica). Una tira
 * de letras lleva a cada grupo, sin filtrar ni seleccionar nada (corrección del founder, 2026-09-19): si la letra
 * no está cargada, pide con `n` lo justo para que lo esté. El resto del filtro vive en la URL y lo aplica el
 * servidor: la página trae `pagina` artistas y "Ver más" pide otros tantos.
 */
export default function ListaArtistas({ artistas, destacados = [], eventosSemana = [], total, quedan, totalCiudad, disciplinas, detalles, letras, posiciones, filtro, conChips, pagina, conSesion, ciudad, ciudades, seguidos = null, avisos = null }: Props) {
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
  const filas = filtro.q ? artistas.map((x) => ({ x, grupo: null })) : conGrupos(artistas, (a) => a.nombre);
  // La letra no filtra ni navega la URL: es un acceso directo. Si ya está cargada, salta a su grupo; si no, pide con
  // `n` lo justo para que quepa (múltiplo de la página, sin apilar historial) y salta en cuanto llegue.
  const router = useRouter();
  const pendiente = useRef<string | null>(null);
  const tiraRef = useRef<HTMLDivElement>(null);
  const conTira = !filtro.q && letras.length > 0;
  usePegajosos(tiraRef, conTira);
  const letraActiva = useLetraActiva(letras, tiraRef, conTira);
  useEffect(() => {
    const letra = pendiente.current;
    if (letra && irAlGrupo(letra)) pendiente.current = null;
  });
  function alTocarLetra(letra: string) {
    const posicion = posiciones[letra];
    if (posicion == null) return;
    if (posicion < artistas.length) {
      irAlGrupo(letra);
      return;
    }
    pendiente.current = letra;
    const nNecesario = Math.ceil((posicion + 1) / pagina) * pagina;
    router.replace(hrefArtistas({ ...filtro, ciudad: cSlug, n: Math.max(nNecesario, filtro.n) }), { scroll: false });
  }

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
      {/* Los carriles no dependen de la tira (corrección del founder, 2026-09-19): solo se van con disciplina,
          detalle o búsqueda. Destacados no pinta nada si no le llegan tarjetas (con ese filtro, o con búsqueda). */}
      <Destacados tarjetas={destacados.map((a) => tarjetaArtista(a))} grande />
      {!filtro.hace && !filtro.que && !filtro.q && <Destacados tarjetas={eventosSemana} redondas encabezado="Con eventos esta semana" memoria="eventos-semana" detalleCompleto />}
      {!filtro.q && (
        <div ref={tiraRef} className={comun.tira}>
          <TiraLetras letras={letras} activa={letraActiva} alTocar={alTocarLetra} />
        </div>
      )}
      {artistas.length === 0 && !filtro.q ? (
        <div className={comun.vacio}>
          <p>{queHacen ? `Todavía no hay artistas de ${queHacen.toLowerCase()} registrados.` : "Todavía no hay artistas registrados."}</p>
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
            {filas.map(({ x: a, grupo }) => [
              grupo && (
                <li key={grupo} id={idGrupo(grupo)} className={comun.grupo} aria-hidden>
                  {grupo}
                </li>
              ),
              <RenglonArtista key={a.id} artista={a} sigo={seguir.sigo(a.id)} acciones={seguir.acciones(a.id, a.nombre)} />,
            ])}
          </ul>
          {seguir.extras}
          {quedan > 0 && (
            <Boton href={hrefArtistas({ ...filtro, ciudad: cSlug, n: filtro.n + pagina })} variante="secundario" className={styles.verMas} scroll={false} replace>
              Ver más ({quedan} más)
            </Boton>
          )}
        </>
      )}
    </section>
  );
}
