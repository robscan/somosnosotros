"use client";

import Link from "next/link";
import { Fragment, useRef, useState } from "react";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoCalendario, IconoCartel, IconoDocumento, IconoEstrella, IconoEtiqueta, IconoMascara, IconoOk, IconoPin, IconoPuntos } from "@/components/ui/Iconos";
import type { IconoForma, PropuestaEnBandeja } from "@/lib/bandejaFormas";
import { pegado } from "@/lib/ciudadesAdmin";
import {
  agruparConActos,
  enOrdenDeAceptar,
  MOTIVOS_RECHAZO,
  ofrecerTodas,
  pasoDeTanda,
  textoAceptarTodas,
  textoActoPublicado,
  textoAceptarFestival,
  textoAvanceTodas,
  textoConfirmarTodas,
  textoDecidida,
  textoTandaHecha,
  type MotivoRechazo,
  type TipoPropuesta,
} from "@/lib/propuestas";
import { aceptarPropuesta, deshacerRechazo, rechazarPropuesta } from "./acciones";
import styles from "../admin.module.css";
import css from "./ciudades.module.css";

export type { PropuestaEnBandeja };
/** `espera`: un acto aceptado que espera a su festival (cuenta en «Aceptar el festival y sus N actos aceptados»). */
type Decidida = { texto: string; href: string | null; rechazo: boolean; espera?: boolean };
type Estado = { decidida?: Decidida; error?: string; enCamino?: "aceptar" | "rechazar" | "deshacer" };
/** Una tanda de «Aceptar las N» en curso: de toda la búsqueda (`TODA`) o de una fuente; `va`, cuántas ya pasaron. */
type Tanda = { alcance: string; total: number; va: number };
/** El alcance de la búsqueda entera (ninguna fuente se llama así). */
const TODA = "\u0000búsqueda";

const ICONO: Record<TipoPropuesta, typeof IconoPin> = { lugar: IconoPin, evento: IconoCalendario, artista: IconoEstrella, cartel: IconoCartel, ficha: IconoDocumento };
const ICONO_MOTIVO: Record<MotivoRechazo, typeof IconoPin> = { duplicado: IconoDocumento, no_cultural: IconoMascara, fuera_de_la_ciudad: IconoPin, otro: IconoPuntos };
/** Los de la ficha de un evento: la etiqueta de «Parte de…» (festival y acto) y el calendario de «Sesiones», «Horarios» y «Hasta». */
const ICONO_FORMA: Record<IconoForma, typeof IconoPin> = { festival: IconoEtiqueta, fechas: IconoCalendario };

/** Una búsqueda de la bandeja de una ciudad, como la arma la página: su nombre, lo que trajo al entrar y sus propuestas por revisar. */
export type BusquedaEnBandeja = { id: string; titulo: string; nota: string; propuestas: PropuestaEnBandeja[]; fuentesConTanda: string[] };

/**
 * Las bandejas de una ciudad, una por búsqueda (OL-432). La lista de búsquedas se toma al entrar, como la de cada bandeja (OL-438): cada acción
 * refresca la página y el servidor deja de traer una búsqueda en cuanto no le queda nada por revisar (al decidir la última o al terminar
 * «Aceptar todas» sin ninguna que falle); aquí se queda, con sus líneas de lo hecho y la cuenta de la tanda, hasta salir. Lo que trajo cada una
 * sí llega al día (`notas`: las de todas las búsquedas de la ciudad, por id; sin la suya, la de al entrar).
 */
export function BandejasDeCiudad({ busquedas, notas, ciudad, vacio }: { busquedas: BusquedaEnBandeja[]; notas: Record<string, string>; ciudad: string; vacio: string | null }) {
  const [alEntrar] = useState(busquedas);
  if (!alEntrar.length) return vacio ? <p className={styles.vacio}>{vacio}</p> : null;
  return (
    <>
      {alEntrar.map((b) => (
        <Bandeja key={b.id} propuestas={b.propuestas} fuentesConTanda={b.fuentesConTanda} nivel={3} cabecera={{ titulo: b.titulo, nota: notas[b.id] ?? b.nota, ciudad }} />
      ))}
    </>
  );
}

/**
 * La bandeja de una búsqueda (prototipo firmado OL-425, pantalla B «Propuestas»; en OL-432 la de una ciudad pinta una por búsqueda): por fuente, una tarjeta de «Pendiente» por propuesta con
 * Rechazar a la izquierda y Aceptar a la derecha. Rechazar pide el motivo en una hoja. Al decidir, la tarjeta se vuelve la línea de lo hecho y se queda hasta salir.
 * OL-434: bajo el título, la forma de un evento con su icono (`forma`, armada en el servidor) y otros títulos con que llegó (`variantes`); un
 * festival propuesto va antes que sus actos, que van debajo con sangría (hermanos en la misma lista, sin anidar). Su «Aceptar» dice cuántos
 * actos suyos aceptados se publican con él; al aceptarlo, la línea dice cuántos se publicaron y las de esos actos dejan de decir que esperan.
 * OL-438 («Aceptar todas»): con `cabecera`, la bandeja pinta el nombre de su búsqueda y lo que trajo y, debajo, «Aceptar las N» (contorno)
 * cuando quedan 2 o más; abre una hoja que dice cuántas y qué pasa con las que no se puedan publicar. Al aceptar, van una por una en el orden
 * de la pantalla (un festival antes que sus actos), con el avance en el mismo botón, y al terminar la cabecera dice cuántas se aceptaron y
 * cuántas quedan por revisar; las que fallaron se quedan con su razón y sus botones. «Aceptar las N de esta fuente» sale siempre que queden 2
 * o más en la fuente (ya no espera a una tanda anterior), salvo si repetiría el de la cabecera. Rechazar sigue una por una, con su motivo.
 */
export default function Bandeja({
  propuestas,
  fuentesConTanda,
  nivel = 2,
  cabecera,
}: {
  propuestas: PropuestaEnBandeja[];
  fuentesConTanda: string[];
  /** El nivel del rótulo de cada fuente: 3 bajo el nombre de su búsqueda (la bandeja de una ciudad). */
  nivel?: 2 | 3;
  /** La cabecera de su búsqueda en la bandeja de una ciudad (OL-438): su nombre, lo que trajo y la ciudad (para la hoja de «Aceptar todas»). */
  cabecera?: { titulo: string; nota: string; ciudad: string | null };
}) {
  const Rotulo = nivel === 3 ? "h3" : "h2";
  // La lista se toma al entrar, como en Pendiente: lo decidido se queda como línea aunque el servidor ya no lo traiga.
  const [lista] = useState(propuestas);
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  // El espejo de `estados` que lee una tanda entre una y otra: lo decidido a mano mientras corre no se vuelve a mandar.
  const vivos = useRef<Record<string, Estado>>({});
  const [rechazando, setRechazando] = useState<PropuestaEnBandeja | null>(null);
  const [confirmando, setConfirmando] = useState<PropuestaEnBandeja[] | null>(null);
  const [tanda, setTanda] = useState<Tanda | null>(null);
  /** Los alcances cuya tanda ya terminó (su botón no vuelve: lo que quedó va una por una, cada una con su razón). */
  const [hechas, setHechas] = useState<string[]>([]);
  /** Cuántas aceptó la tanda de toda la búsqueda, para su línea en la cabecera. */
  const [aceptadasEnTanda, setAceptadasEnTanda] = useState<number | null>(null);
  const cambiar = (f: (todos: Record<string, Estado>) => Record<string, Estado>) => {
    vivos.current = f(vivos.current);
    setEstados(vivos.current);
  };
  const poner = (id: string, e: Estado) => cambiar((todos) => ({ ...todos, [id]: e }));

  /** Acepta una; dice si quedó aceptada (también un acto que espera a su festival). */
  async function aceptar(p: PropuestaEnBandeja): Promise<boolean> {
    poner(p.id, { enCamino: "aceptar" });
    const r = await aceptarPropuesta(p.id);
    if (!r.ok) {
      poner(p.id, { error: r.error });
      return false;
    }
    poner(p.id, { decidida: { texto: textoDecidida(p.nombre, { aceptada: true, tipo: p.tipo }, r.nota), href: r.href, rechazo: false, espera: r.espera } });
    // Los actos que esperaban a este festival se publicaron con él: su línea ya no dice que esperan.
    for (const acto of lista.filter((x) => r.actos?.includes(x.id)))
      cambiar((todos) => (todos[acto.id]?.decidida ? { ...todos, [acto.id]: { decidida: { texto: textoActoPublicado(acto.nombre), href: null, rechazo: false } } } : todos));
    return true;
  }
  async function rechazar(p: PropuestaEnBandeja, motivo: MotivoRechazo) {
    setRechazando(null);
    poner(p.id, { enCamino: "rechazar" });
    const r = await rechazarPropuesta(p.id, motivo);
    poner(p.id, r.ok ? { decidida: { texto: textoDecidida(p.nombre, { aceptada: false, motivo }), href: null, rechazo: true } } : { error: r.error });
  }
  async function deshacer(p: PropuestaEnBandeja) {
    const antes = vivos.current[p.id]?.decidida;
    poner(p.id, { decidida: antes, enCamino: "deshacer" });
    const r = await deshacerRechazo(p.id);
    poner(p.id, r.ok ? {} : { decidida: antes, error: r.error });
  }
  const pendientes = (grupo: readonly PropuestaEnBandeja[]) => grupo.filter((x) => !vivos.current[x.id]?.decidida);
  const festivalAqui = (id: string) => lista.find((x) => x.id === id)?.nombre;
  /**
   * Una tanda, en el orden de la pantalla (un festival antes que sus actos; después, cuelgan de él directamente). Antes de cada una mira lo
   * que hay ahora (`pasoDeTanda`): salta lo decidido a mano mientras corre y deja con su razón un acto cuyo festival no se aceptó.
   */
  async function aceptarTanda(alcance: string, cola: readonly PropuestaEnBandeja[]) {
    if (tanda || cola.length < 2) return;
    let aceptadas = 0;
    for (const [i, p] of cola.entries()) {
      setTanda({ alcance, total: cola.length, va: i });
      const paso = pasoDeTanda(p, (id) => vivos.current[id], festivalAqui);
      if (paso.accion === "aceptar" && (await aceptar(p))) aceptadas++;
      if (paso.accion === "dejar") poner(p.id, { error: paso.razon });
    }
    setTanda(null);
    setHechas((h) => [...h, alcance]);
    if (alcance === TODA) setAceptadasEnTanda(aceptadas);
  }
  /** Los actos aceptados que esperan a este festival: los que ya esperaban al entrar y los aceptados aquí. */
  const aceptadosDe = (p: PropuestaEnBandeja) => (p.aceptados ?? 0) + lista.filter((a) => a.festival === p.id && estados[a.id]?.decidida?.espera).length;

  if (!lista.length) return <p className={styles.vacio}>Nada por revisar en esta corrida.</p>;
  const grupos = agruparConActos(lista, fuentesConTanda);
  // El orden de la tanda es el de la pantalla: un festival antes que sus actos.
  const enOrden = enOrdenDeAceptar(lista, fuentesConTanda);
  const quedanTodas = enOrden.filter((p) => !estados[p.id]?.decidida).length;
  const corre = tanda?.alcance === TODA ? tanda : null;
  // Tras «Aceptar todas», lo que queda en la búsqueda va una por una: tampoco vuelven los de cada fuente.
  const sinFuentes = !!corre || hechas.includes(TODA);
  return (
    <>
      {cabecera && (
        <>
          <h2 className={css.busqueda}>{cabecera.titulo}</h2>
          <p className={styles.nota}>{cabecera.nota}</p>
          {aceptadasEnTanda !== null ? (
            <p className={css.tandaHecha} role="status">
              {textoTandaHecha(aceptadasEnTanda, quedanTodas)}
            </p>
          ) : corre ? (
            <Boton variante="secundario" ancho="contenido" className={css.todasBusqueda} aria-busy onClick={() => {}}>
              {textoAvanceTodas(corre.va + 1, corre.total)}
            </Boton>
          ) : (
            ofrecerTodas(quedanTodas) && (
              <Boton variante="secundario" ancho="contenido" className={css.todasBusqueda} disabled={!!tanda} aria-haspopup="dialog" onClick={() => setConfirmando(pendientes(enOrden))}>
                {textoAceptarTodas(quedanTodas)}
              </Boton>
            )
          )}
        </>
      )}
      {grupos.map(({ fuente, propuestas: grupo }) => {
        const quedan = grupo.filter((p) => !estados[p.id]?.decidida).length;
        const suya = tanda?.alcance === fuente ? tanda : null;
        const conTodas = !sinFuentes && !hechas.includes(fuente) && (!!suya || ofrecerTodas(quedan, cabecera ? quedanTodas : undefined));
        const enGrupo = new Set(grupo.map((p) => p.id));
        return (
          <Fragment key={fuente}>
            <Rotulo className={styles.grupo}>
              {fuente}
              {quedan > 0 && <b>{quedan}</b>}
            </Rotulo>
            {conTodas && (
              <Boton
                variante="secundario"
                className={css.todas}
                disabled={!!tanda && !suya}
                aria-busy={!!suya}
                onClick={() => {
                  if (!suya) void aceptarTanda(fuente, pendientes(grupo));
                }}
              >
                {suya ? textoAvanceTodas(suya.va + 1, suya.total) : `Aceptar las ${quedan} de esta fuente`}
              </Boton>
            )}
            <ul className={styles.pendientes}>
              {grupo.map((p) => {
                const e = estados[p.id] ?? {};
                // Un acto bajo su festival: la sangría lo pone debajo, como hermano en la lista.
                const acto = p.festival && enGrupo.has(p.festival) ? ` ${css.acto}` : "";
                if (e.decidida)
                  return (
                    <li key={p.id} className={`${styles.hecho}${acto}`} role="status">
                      <IconoOk width={20} height={20} />
                      <span>
                        {e.decidida.texto}
                        {e.error && <em role="alert"> · {e.error}</em>}
                      </span>
                      {e.decidida.href && (
                        <Link href={e.decidida.href} className={`${styles.enlace} ${css.salidaHecho}`}>
                          Ver ficha
                        </Link>
                      )}
                      {e.decidida.rechazo && (
                        <button type="button" className={styles.enlace} disabled={!!e.enCamino} onClick={() => void deshacer(p)}>
                          {e.enCamino === "deshacer" ? "Deshaciendo…" : "Deshacer"}
                        </button>
                      )}
                    </li>
                  );
                const Icono = ICONO[p.tipo];
                const { vista, forma } = p;
                const IconoDeForma = forma ? ICONO_FORMA[forma.icono] : null;
                return (
                  <li key={p.id} className={`${styles.pendiente} ${css.propuesta}${acto}`}>
                    <Icono width={20} height={20} />
                    <b>{vista.que}</b>
                    <span className={styles.ficha}>{vista.titulo}</span>
                    {forma && IconoDeForma && <IconoDeForma width={20} height={20} className={css.formaIcono} />}
                    {forma && (
                      <p className={css.forma}>
                        {pegado(forma.texto)}
                        {forma.enlace && <Link href={forma.enlace.href}>{forma.enlace.texto}</Link>}
                      </p>
                    )}
                    {forma?.detalle && <p className={css.formaDetalle}>{pegado(forma.detalle)}</p>}
                    {/* OL-489: lo que propone «Completar fichas»: la imagen ya recortada o la descripción. */}
                    {vista.miniatura && (
                      // eslint-disable-next-line @next/next/no-img-element -- la miniatura ya viene chica y recortada del bucket.
                      <img src={vista.miniatura.url} alt="" loading="lazy" className={[css.propuesto, vista.miniatura.forma === "cuadrada" && css.cuadrada].filter(Boolean).join(" ")} />
                    )}
                    {vista.texto && <p className={css.propuesto}>{vista.texto}</p>}
                    <small>
                      {vista.linea && `${pegado(vista.linea)} · `}
                      {vista.imagen && (
                        <>
                          <a href={vista.imagen} target="_blank" rel="noopener noreferrer">
                            ver el cartel
                          </a>
                          {" · "}
                        </>
                      )}
                      {vista.fuente && (
                        <>
                          fuente:{" "}
                          <a href={vista.fuente.url} target="_blank" rel="noopener noreferrer">
                            {vista.fuente.texto}
                          </a>
                          {" · "}
                        </>
                      )}
                      {vista.leida}
                    </small>
                    {p.variantes && <p className={css.variantes}>{p.variantes}</p>}
                    {e.error && <p role="alert">{e.error}</p>}
                    <div className={css.acciones}>
                      <button type="button" className={styles.dejar} disabled={!!e.enCamino} aria-haspopup="dialog" onClick={() => setRechazando(p)}>
                        {e.enCamino === "rechazar" ? "Rechazando…" : "Rechazar"}
                      </button>
                      <button type="button" className={`${styles.actuar} ${styles.principal} ${css.aceptar}`} disabled={!!e.enCamino} onClick={() => void aceptar(p)}>
                        {e.enCamino === "aceptar" ? "Aceptando…" : textoAceptarFestival(aceptadosDe(p))}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Fragment>
        );
      })}
      {confirmando && (
        <Hoja
          etiqueta="Aceptar todas"
          titulo="Aceptar todas"
          onCerrar={() => setConfirmando(null)}
          pie={
            <>
              <Boton variante="secundario" onClick={() => setConfirmando(null)}>
                Cancelar
              </Boton>
              <Boton
                onClick={() => {
                  setConfirmando(null);
                  void aceptarTanda(TODA, confirmando);
                }}
              >
                {textoAceptarTodas(confirmando.length)}
              </Boton>
            </>
          }
        >
          {Object.values(textoConfirmarTodas(confirmando, cabecera?.ciudad ?? null)).map((t) => (
            <p key={t} className={hoja.nota}>
              {t}
            </p>
          ))}
        </Hoja>
      )}
      {rechazando && (
        <Hoja etiqueta={`Rechazar ${rechazando.nombre}`} titulo="¿Por qué la rechazas?" onCerrar={() => setRechazando(null)}>
          <p className={hoja.nota}>{rechazando.nombre.charAt(0).toUpperCase() + rechazando.nombre.slice(1)}. La rutina aprende a no volver a proponerla.</p>
          <ul className={`${styles.menu} ${css.motivos}`}>
            {MOTIVOS_RECHAZO.map((m) => {
              const Icono = ICONO_MOTIVO[m.valor];
              return (
                <li key={m.valor}>
                  <button type="button" className={`${styles.menuItem} ${styles.menuConDetalle} ${css.motivo}`} onClick={() => void rechazar(rechazando, m.valor)}>
                    <Icono width={20} height={20} />
                    <span>{m.etiqueta}</span>
                    <small>{m.detalle}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </Hoja>
      )}
    </>
  );
}
