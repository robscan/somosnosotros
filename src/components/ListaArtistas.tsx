"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import ChipCiudad from "@/components/Ciudad";
import { Chip, Chips, Cuenta } from "@/components/ui/Chip";
import { etiquetaDisciplina, hrefArtistas, type ArtistaLista, type FiltroLeido } from "@/lib/artistas";
import { enlaceDeAlta } from "@/lib/armazon";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConArtistas } from "@/lib/ciudad";
import { agruparPorLetra, idGrupo } from "@/lib/indice";
import RenglonArtista from "./RenglonArtista";
import TiraLetras, { irAlGrupo, useLetraActiva } from "./TiraLetras";
import Cabecera from "./ui/Cabecera";
import { EsqueletoRenglones } from "./ui/Esqueleto";
import Grupo from "./ui/Grupo";
import HojaFiltros, { BloqueFiltro } from "./ui/HojaFiltros";
import { IconoFiltros } from "./ui/Iconos";
import { useCentinela } from "./useCentinela";
import { useSeguirEnLista, type AvisosLista } from "./useSeguirEnLista";
import Boton from "@/components/ui/Boton";
import comun from "./Lista.module.css";
import styles from "./ListaArtistas.module.css";

type Opcion = { valor: string; etiqueta: string; n?: number };
type Props = {
  artistas: ArtistaLista[];
  /** Cuántos cumplen el filtro (disciplina o detalle), se vean o no (la página trae `n`). */
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
  /** «Mis artistas» y el letrero de correo enlazado (OL-177): contenido normal de la página, debajo de la
   * cabecera (chips) y antes de la tira de letras y el conteo — nunca antes de `cabecera`, que junto con la
   * Barra de arriba forma la cabecera única y pegajosa de OL-087 (`docs/rediseno/prototipos/cabeceras.html`). */
  arriba?: React.ReactNode;
};

/**
 * Lista de artistas: renglones como los de Lugares (foto redonda, nombre, qué hace, próxima fecha y dónde), en un grupo por
 * letra con su título pegado (`ui/Grupo`). En ui/Cabecera: la fila de contexto —ciudad, Filtros y, después, lo que hay
 * puesto con su ✕— y la tira de letras. Filtros aparece a partir de 12 artistas (decisión 2, OL-087); buscar por nombre es
 * la lupa de la barra de la app (`app/buscar`); la hoja de Filtros trae las disciplinas y, dentro de una con muchos artistas, un
 * segundo bloque por detalle (género, técnica). Una tira de letras lleva a cada grupo, sin filtrar ni seleccionar nada (corrección del founder,
 * 2026-09-19): si la letra no está cargada, pide con `n` lo justo para que lo esté. El filtro vive en la URL y lo aplica el
 * servidor: la página trae `pagina` artistas y "Ver más" pide otros tantos.
 *
 * Sin carriles propios (OL-165, pedido del founder): va directo a la lista, como Agenda. La tira de destacados y
 * "Con eventos esta semana" ya viven en Inicio (`CarrilEntidad`/`CarrilEntidadCliente`), que reutiliza la misma
 * tarjeta grande (`tarjetaArtista` + `Destacados` con `tamano="grande"`) que tenía esta pantalla.
 */
export default function ListaArtistas({ artistas, total, quedan, totalCiudad, disciplinas, detalles, letras, posiciones, filtro, conChips, pagina, conSesion, ciudad, ciudades, seguidos = null, avisos = null, arriba = null }: Props) {
  // Al deslizar un artista: Seguir (decisión del founder, 2026-09-16; bitácora 071).
  const seguir = useSeguirEnLista("artista", seguidos, avisos);
  // La ciudad viaja en la URL como en la agenda y Lugares (ausente = la inicial, para que el enlace sea limpio).
  const cSlug = ciudad.slug === CIUDAD_INICIAL.slug ? null : ciudad.slug;
  const hrefNuevo = () => {
    const destino = enlaceDeAlta("artista", cSlug).href;
    return conSesion ? destino : `/entrar?siguiente=${encodeURIComponent(destino)}`;
  };
  const queHacen = filtro.que ? (detalles.find((x) => x.valor === filtro.que)?.etiqueta ?? filtro.que) : filtro.hace ? etiquetaDisciplina(filtro.hace) : null;
  // Filtrar no es navegar: quitar o cambiar lo que hay puesto reemplaza la entrada del historial y no mueve la página.
  const router = useRouter();
  const irA = (href: string) => router.replace(href, { scroll: false });
  // La letra no filtra ni navega la URL: es un acceso directo. Si ya está cargada, salta a su grupo; si no, pide con
  // `n` lo justo para que quepa (múltiplo de la página, sin apilar historial) y salta en cuanto llegue.
  const pendiente = useRef<string | null>(null);
  const tiraRef = useRef<HTMLDivElement>(null);
  const letraActiva = useLetraActiva(letras, tiraRef, letras.length > 0);
  const [filtrando, setFiltrando] = useState(false);
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
    irA(hrefArtistas({ ...filtro, ciudad: cSlug, n: Math.max(nNecesario, filtro.n) }));
  }

  // Carga progresiva (OL-158): la página siguiente ya se pide al servidor con "Ver más" (`n` en la URL); el
  // centinela la pide sola al acercarse al final del scroll, con un esqueleto de la tanda que viene mientras
  // llega. "Ver más" queda siempre en el árbol como respaldo accesible (sin observador, o para quien no dispara
  // el scroll al final).
  const hrefSiguiente = quedan > 0 ? hrefArtistas({ ...filtro, ciudad: cSlug, n: filtro.n + pagina }) : null;
  const [cargandoMas, iniciarCargaMas] = useTransition();
  const centinelaRef = useCentinela(!!hrefSiguiente && !cargandoMas, () => {
    if (hrefSiguiente) iniciarCargaMas(() => irA(hrefSiguiente));
  });

  const hrefSin = (quitar: "hace" | "que") => hrefArtistas({ ciudad: cSlug, hace: quitar === "que" ? filtro.hace : null });
  const cabecera = (
    <Cabecera
      contexto={
        <>
          <ChipCiudad ciudad={ciudad} ciudades={ciudades} seccion="artistas" hrefDe={(c) => hrefArtistas({ ciudad: c.slug === CIUDAD_INICIAL.slug ? null : c.slug })} />
          {conChips && disciplinas.length > 1 && (
            <Chip variante="contexto" icono={<IconoFiltros width={16} height={16} />} cuenta={(filtro.hace ? 1 : 0) + (filtro.que ? 1 : 0)} onClick={() => setFiltrando(true)}>
              Filtros
            </Chip>
          )}
          {filtro.hace && (
            <Chip variante="quitar" onClick={() => irA(hrefSin("hace"))}>
              {etiquetaDisciplina(filtro.hace)}
            </Chip>
          )}
          {filtro.que && queHacen && (
            <Chip variante="quitar" onClick={() => irA(hrefSin("que"))}>
              {queHacen}
            </Chip>
          )}
        </>
      }
    >
      <TiraLetras ref={tiraRef} letras={letras} activa={letraActiva} alTocar={alTocarLetra} />
    </Cabecera>
  );
  /** La hoja Filtros: cada chip cambia la URL (el servidor filtra) y la hoja queda abierta, con el número al día. */
  const hoja = filtrando && (
    <HojaFiltros
      titulo="Filtros"
      resultado={total === 1 ? "Ver 1 artista" : `Ver ${total} artistas`}
      sinResultados={total === 0}
      onLimpiar={() => irA(hrefArtistas({ ciudad: cSlug }))}
      onVer={() => setFiltrando(false)}
      onCerrar={() => setFiltrando(false)}
    >
      <BloqueFiltro rotulo="Disciplina">
        <Chips ariaLabel="Qué hacen" envuelve>
          <Chip activo={!filtro.hace} href={hrefArtistas({ ciudad: cSlug })}>
            Todos
            <Cuenta n={totalCiudad} />
          </Chip>
          {disciplinas.map((d) => (
            <Chip key={d.valor} activo={filtro.hace === d.valor} href={hrefArtistas({ ciudad: cSlug, hace: d.valor })}>
              {d.etiqueta}
              {d.n != null && <Cuenta n={d.n} />}
            </Chip>
          ))}
        </Chips>
      </BloqueFiltro>
      {conChips && detalles.length > 0 && filtro.hace && (
        <BloqueFiltro rotulo={`Qué ${etiquetaDisciplina(filtro.hace).toLowerCase()}`}>
          <Chips ariaLabel={`Qué ${etiquetaDisciplina(filtro.hace).toLowerCase()}`} envuelve>
            <Chip activo={!filtro.que} href={hrefArtistas({ ciudad: cSlug, hace: filtro.hace })}>
              Todo
              {disciplinas.find((d) => d.valor === filtro.hace)?.n != null && <Cuenta n={disciplinas.find((d) => d.valor === filtro.hace)!.n!} />}
            </Chip>
            {detalles.map((d) => (
              <Chip key={d.valor} activo={filtro.que === d.valor} href={hrefArtistas({ ciudad: cSlug, hace: filtro.hace, que: filtro.que === d.valor ? null : d.valor })}>
                {d.etiqueta}
                {d.n != null && <Cuenta n={d.n} />}
              </Chip>
            ))}
          </Chips>
        </BloqueFiltro>
      )}
    </HojaFiltros>
  );
  const renglon = (a: ArtistaLista) => <RenglonArtista key={a.id} artista={a} boton={seguir.boton(a.id, a.nombre)} />;

  if (totalCiudad === 0) {
    return (
      <>
        {cabecera}
        {arriba}
        <div className={comun.vacio}>
          <h2>Artistas</h2>
          <p>Aún no hay fichas de artista registradas en {ciudad.nombre}. ¿Eres artista o grupo, o conoces a alguien? Registra la ficha.</p>
          <Boton href={hrefNuevo()} variante="secundario">
            Registrar artista
          </Boton>
        </div>
      </>
    );
  }
  return (
    <>
      {cabecera}
      {arriba}
      {artistas.length === 0 ? (
        <div className={comun.vacio}>
          <p>{queHacen ? `Todavía no hay fichas de artista registradas en ${queHacen.toLowerCase()}.` : "Todavía no hay fichas de artista registradas."}</p>
        </div>
      ) : (
        <>
          <p className={comun.conteo}>{total === 1 ? "1 artista" : `${total} artistas`}</p>
          {agruparPorLetra(artistas, (a) => a.nombre).map((g) => (
            <Grupo key={g.letra} id={idGrupo(g.letra)} titulo={g.letra}>
              {g.items.map(renglon)}
            </Grupo>
          ))}
          {seguir.extras}
          {hrefSiguiente && (
            <div ref={centinelaRef}>
              {cargandoMas && <EsqueletoRenglones cantidad={3} redonda />}
              <Boton href={hrefSiguiente} variante="secundario" className={styles.verMas} scroll={false} replace>
                Ver más ({quedan} más)
              </Boton>
            </div>
          )}
        </>
      )}
      {hoja}
    </>
  );
}
