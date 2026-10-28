"use client";

import { Fragment, useEffect, useState } from "react";
import { aniosDeFilas, MINIMO_VER_LOS, notaPresencias, TANDA_HISTORIAL, tandaDelAnio, textoVeces, TOPE_CARRIL, type FilaPasada, type Presencia } from "@/lib/historialFichas";
import { TiraCarril } from "./Destacados";
import TarjetaAvatar from "./inicio/TarjetaAvatar";
import { useMemoriaPantalla } from "./MemoriaPantalla";
import RenglonArtista from "./RenglonArtista";
import RenglonLugar from "./RenglonLugar";
import CargarMas from "./ui/CargarMas";
import { Chip, Chips, Cuenta } from "./ui/Chip";
import Hoja from "./ui/Hoja";
import { IconoCalendario, IconoChevronDerecha, IconoEtiqueta, IconoPersonas, IconoPin } from "./ui/Iconos";
import Renglon from "./ui/Renglon";
import SeCancelo from "./ui/SeCancelo";
import { useSeguirEnLista, type AvisosLista } from "./useSeguirEnLista";
import destacados from "./Destacados.module.css";
import hoja from "./ui/Hoja.module.css";
import styles from "./Historial.module.css";

type Props = {
  /** La ficha: el historial de un lugar (sus artistas) o la trayectoria de un artista (sus lugares). */
  de: "lugar" | "artista";
  /** El `id` del plegado que la lleva (`historial` o `trayectoria`): la memoria de pantalla lo vuelve a abrir al volver de un evento. */
  plegado: string;
  /** «Han pasado por aquí» o «Se ha presentado en». */
  titulo: string;
  /** Quiénes pasaron (o dónde se presentó), con cuántas veces: el carril lleva los primeros `TOPE_CARRIL`, la hoja todos. */
  presencias: Presencia[];
  /** Lo pasado en renglones, lo más reciente primero (`filasPasadas`). */
  filas: FilaPasada[];
  /** Lo que sigue quien mira, entre las presencias (el «Seguir» de la hoja); null sin sesión (Seguir lleva a entrar). */
  seguidos: string[] | null;
  avisos: AvisosLista | null;
};

/** Lo que se recuerda al volver de un evento: si el plegado estaba abierto, el año elegido y cuántos renglones se veían. */
type Estado = { abierto: boolean; anio: string; cuantos: number };

/**
 * Lo de dentro del «Historial» de un lugar y la «Trayectoria» de un artista, escalable (OL-473; prototipo firmado `historial-escalable.html`,
 * bitácora 501, «F1 · L1 · A1»), todo hijo directo del plegado (maquetación plana):
 * - F1: quiénes pasaron en el carril de avatares de Inicio (`TiraCarril` y `inicio/TarjetaAvatar`, hasta 12, con «9 veces» en gris), que se
 *   desliza con el dedo y asoma el siguiente; desde 4, «Ver los 9 ›» abre una hoja (`ui/Hoja`) con todos en el renglón de Artistas o de Lugares,
 *   con sus veces donde va lo próximo y su «Seguir» (firmado: «Sí»).
 * - L1: un chip por año con su cuenta («2026 48»; con un solo año, sin chips), el más reciente elegido, y ese año por mes de 20 en 20 con
 *   «Ver más» (`ui/CargarMas`). Elegir un año o ver más no navega (filtrar no es navegar): no apila nada en Atrás.
 * - Memoria de pantalla: al volver de la ficha de un evento, el plegado se abre otra vez con el año y los renglones que se veían, y
 *   `MemoriaScroll` repone el lugar de la página.
 * Lo de arriba («Tu año» y el PDF, A1) lo pone `Historial`, en el servidor.
 */
export default function HistorialCuerpo({ de, plegado, titulo, presencias, filas, seguidos, avisos }: Props) {
  const anios = aniosDeFilas(filas);
  const [estado, setEstado] = useState<Estado>(() => ({ abierto: false, anio: anios[0]?.anio ?? "", cuantos: TANDA_HISTORIAL }));
  const [enHoja, setEnHoja] = useState(false);
  useMemoriaPantalla<Estado>(
    null,
    estado,
    (guardado) => {
      setEstado({ abierto: guardado.abierto === true, anio: String(guardado.anio ?? ""), cuantos: Math.max(TANDA_HISTORIAL, Number(guardado.cuantos) || TANDA_HISTORIAL) });
      const d = document.getElementById(plegado);
      if (guardado.abierto && d instanceof HTMLDetailsElement) d.open = true;
    },
    plegado,
  );
  // Abrir y cerrar el plegado es del `<details>` (sin JavaScript también): aquí solo se anota, para la memoria.
  useEffect(() => {
    const d = document.getElementById(plegado);
    if (!(d instanceof HTMLDetailsElement)) return;
    const alCambiar = () => setEstado((e) => (e.abierto === d.open ? e : { ...e, abierto: d.open }));
    d.addEventListener("toggle", alCambiar);
    return () => d.removeEventListener("toggle", alCambiar);
  }, [plegado]);
  const seguir = useSeguirEnLista(de === "lugar" ? "artista" : "lugar", seguidos, avisos);

  const anio = anios.some((a) => a.anio === estado.anio) ? estado.anio : (anios[0]?.anio ?? "");
  const { meses, quedan } = tandaDelAnio(filas, anio, estado.cuantos);
  const verLos = presencias.length >= MINIMO_VER_LOS;

  return (
    <>
      {presencias.length > 0 && (
        <>
          <p className={styles.cabeza}>
            {titulo}
            {verLos && (
              <button type="button" className={`${destacados.verTodo} ${styles.verLos}`} aria-haspopup="dialog" onClick={() => setEnHoja(true)}>
                Ver los {presencias.length}
                <IconoChevronDerecha width={20} height={20} />
              </button>
            )}
          </p>
          <TiraCarril memoria={plegado} className={`${destacados.carril} ${destacados.avatar} ${styles.carril}`} ariaLabel={titulo}>
            {presencias.slice(0, TOPE_CARRIL).map((p) => (
              <li key={p.id}>
                <TarjetaAvatar t={{ id: p.id, href: p.href, foto: p.foto, titulo: p.nombre, detalle: "", van: null }} nota={textoVeces(p.veces)} />
              </li>
            ))}
          </TiraCarril>
        </>
      )}
      {anios.length > 1 && (
        <Chips ariaLabel="Año" className={styles.anios}>
          {anios.map((a) => (
            <Chip key={a.anio} activo={a.anio === anio} onClick={() => setEstado((e) => ({ ...e, anio: a.anio, cuantos: TANDA_HISTORIAL }))}>
              {a.anio}
              <Cuenta n={a.n} />
            </Chip>
          ))}
        </Chips>
      )}
      {meses.map((m) => (
        <Fragment key={m.mes}>
          <h3>{m.titulo}</h3>
          <ul aria-label={m.titulo}>
            {m.filas.map((f) => (
              <RenglonPasado key={f.id} f={f} />
            ))}
          </ul>
        </Fragment>
      ))}
      <CargarMas hayMas={quedan > 0} esqueleto={false} onVerMas={() => setEstado((e) => ({ ...e, cuantos: e.cuantos + TANDA_HISTORIAL }))} />
      {enHoja && (
        <Hoja etiqueta={titulo} titulo={titulo} onCerrar={() => setEnHoja(false)}>
          <p className={hoja.nota}>{notaPresencias(de, presencias.length)}</p>
          <ul className={styles.lista}>
            {presencias.map((p) =>
              p.artista ? (
                <RenglonArtista key={p.id} artista={{ id: p.id, slug: p.artista.slug ?? "", nombre: p.nombre, foto: p.foto, disciplina: p.artista.disciplina, detalle: p.artista.detalle, tipo: p.artista.tipo }} veces={textoVeces(p.veces)} boton={seguir.boton(p.id, p.nombre)} />
              ) : (
                <RenglonLugar key={p.id} lugar={{ id: p.id, slug: p.lugar?.slug ?? undefined, nombre: p.nombre, portada: p.foto, direccion: p.lugar?.direccion ?? null, privado: p.lugar?.privado ?? false, tipo: p.lugar?.tipo ?? "otro" }} veces={textoVeces(p.veces)} boton={seguir.boton(p.id, p.nombre)} />
              ),
            )}
          </ul>
        </Hoja>
      )}
      {seguir.extras}
    </>
  );
}

/**
 * Un renglón pasado (`ui/Renglon`, como «Próximas fechas»; OL-390, sin cambios): el título, cuándo fue, dónde (en el artista; en el lugar es
 * obvio) con su festival en gris, y con quién o quiénes. La miniatura es su cartel o el símbolo SN, nunca la foto del lugar. Si se canceló
 * (OL-391), «Se canceló» delante de cuándo era, el título tachado y, a la derecha, el chevrón: nadie fue a lo que no ocurrió.
 */
function RenglonPasado({ f }: { f: FilaPasada }) {
  return (
    <Renglon
      href={f.href}
      foto={f.foto}
      titulo={f.titulo}
      accion={
        f.van > 0 && !f.cancelado ? (
          <span className={styles.fueron}>
            <b>{f.van}</b>
            {f.van === 1 ? "fue" : "fueron"}
          </span>
        ) : (
          <IconoChevronDerecha width={20} height={20} className={styles.chevron} />
        )
      }
    >
      <span>
        <IconoCalendario width={15} height={15} />
        {f.cancelado && <SeCancelo />}
        <b>{f.cancelado ? `· ${f.cuando}` : f.cuando}</b>
      </span>
      {f.sitio !== null ? (
        <span>
          <IconoPin width={15} height={15} />
          <span className={styles.sitio}>{f.sitio}</span>
          {f.festival && <span className={styles.festival}>· {f.festival}</span>}
        </span>
      ) : (
        f.festival && (
          <span>
            <IconoEtiqueta width={15} height={15} />
            <span>{f.festival}</span>
          </span>
        )
      )}
      {f.gente && (
        <span>
          <IconoPersonas width={15} height={15} />
          <span>{f.gente}</span>
        </span>
      )}
    </Renglon>
  );
}
