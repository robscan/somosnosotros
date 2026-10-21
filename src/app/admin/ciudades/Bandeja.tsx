"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoCalendario, IconoDocumento, IconoEstrella, IconoEtiqueta, IconoMascara, IconoOk, IconoPin, IconoPuntos } from "@/components/ui/Iconos";
import type { IconoForma, PropuestaEnBandeja } from "@/lib/bandejaFormas";
import { pegado } from "@/lib/ciudadesAdmin";
import { agruparConActos, MOTIVOS_RECHAZO, ofrecerTodas, textoActoPublicado, textoAceptarFestival, textoDecidida, type MotivoRechazo, type TipoPropuesta } from "@/lib/propuestas";
import { aceptarPropuesta, deshacerRechazo, rechazarPropuesta } from "./acciones";
import styles from "../admin.module.css";
import css from "./ciudades.module.css";

export type { PropuestaEnBandeja };
/** `espera`: un acto aceptado que espera a su festival (cuenta en «Aceptar el festival y sus N actos aceptados»). */
type Decidida = { texto: string; href: string | null; rechazo: boolean; espera?: boolean };
type Estado = { decidida?: Decidida; error?: string; enCamino?: "aceptar" | "rechazar" | "deshacer" };

const ICONO: Record<TipoPropuesta, typeof IconoPin> = { lugar: IconoPin, evento: IconoCalendario, artista: IconoEstrella };
const ICONO_MOTIVO: Record<MotivoRechazo, typeof IconoPin> = { duplicado: IconoDocumento, no_cultural: IconoMascara, fuera_de_la_ciudad: IconoPin, otro: IconoPuntos };
/** Los de la ficha de un evento: la etiqueta de «Parte de…» (festival y acto) y el calendario de «Sesiones», «Horarios» y «Hasta». */
const ICONO_FORMA: Record<IconoForma, typeof IconoPin> = { festival: IconoEtiqueta, fechas: IconoCalendario };

/**
 * La bandeja de una búsqueda (prototipo firmado OL-425, pantalla B «Propuestas»; en OL-432 la de una ciudad pinta una por búsqueda): por fuente, una tarjeta de «Pendiente» por propuesta con
 * Rechazar a la izquierda y Aceptar a la derecha. Rechazar pide el motivo en una hoja. «Aceptar las N de esta fuente» solo donde la fuente ya
 * tuvo una tanda aprobada antes (la primera va una por una). Al decidir, la tarjeta se vuelve la línea de lo hecho y se queda hasta salir.
 * OL-434: bajo el título, la forma de un evento con su icono (`forma`, armada en el servidor) y otros títulos con que llegó (`variantes`); un
 * festival propuesto va antes que sus actos, que van debajo con sangría (hermanos en la misma lista, sin anidar). Su «Aceptar» dice cuántos
 * actos suyos aceptados se publican con él; al aceptarlo, la línea dice cuántos se publicaron y las de esos actos dejan de decir que esperan.
 */
export default function Bandeja({ propuestas, fuentesConTanda, nivel = 2 }: { propuestas: PropuestaEnBandeja[]; fuentesConTanda: string[]; /** El nivel del rótulo de cada fuente: 3 bajo el nombre de su búsqueda (la bandeja de una ciudad). */ nivel?: 2 | 3 }) {
  const Rotulo = nivel === 3 ? "h3" : "h2";
  // La lista se toma al entrar, como en Pendiente: lo decidido se queda como línea aunque el servidor ya no lo traiga.
  const [lista] = useState(propuestas);
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const [rechazando, setRechazando] = useState<PropuestaEnBandeja | null>(null);
  const poner = (id: string, e: Estado) => setEstados((todos) => ({ ...todos, [id]: e }));

  async function aceptar(p: PropuestaEnBandeja) {
    poner(p.id, { enCamino: "aceptar" });
    const r = await aceptarPropuesta(p.id);
    if (!r.ok) return poner(p.id, { error: r.error });
    poner(p.id, { decidida: { texto: textoDecidida(p.nombre, { aceptada: true, tipo: p.tipo }, r.nota), href: r.href, rechazo: false, espera: r.espera } });
    // Los actos que esperaban a este festival se publicaron con él: su línea ya no dice que esperan.
    for (const acto of lista.filter((x) => r.actos?.includes(x.id)))
      setEstados((todos) => (todos[acto.id]?.decidida ? { ...todos, [acto.id]: { decidida: { texto: textoActoPublicado(acto.nombre), href: null, rechazo: false } } } : todos));
  }
  async function rechazar(p: PropuestaEnBandeja, motivo: MotivoRechazo) {
    setRechazando(null);
    poner(p.id, { enCamino: "rechazar" });
    const r = await rechazarPropuesta(p.id, motivo);
    poner(p.id, r.ok ? { decidida: { texto: textoDecidida(p.nombre, { aceptada: false, motivo }), href: null, rechazo: true } } : { error: r.error });
  }
  async function deshacer(p: PropuestaEnBandeja) {
    const antes = estados[p.id]?.decidida;
    poner(p.id, { decidida: antes, enCamino: "deshacer" });
    const r = await deshacerRechazo(p.id);
    poner(p.id, r.ok ? {} : { decidida: antes, error: r.error });
  }
  /** Las de un grupo, en su orden: un festival antes que sus actos (aceptados después, cuelgan de él directamente). */
  async function aceptarTodas(grupo: readonly PropuestaEnBandeja[]) {
    for (const p of grupo.filter((x) => !estados[x.id]?.decidida)) await aceptar(p);
  }
  /** Los actos aceptados que esperan a este festival: los que ya esperaban al entrar y los aceptados aquí. */
  const aceptadosDe = (p: PropuestaEnBandeja) => (p.aceptados ?? 0) + lista.filter((a) => a.festival === p.id && estados[a.id]?.decidida?.espera).length;

  if (!lista.length) return <p className={styles.vacio}>Nada por revisar en esta corrida.</p>;
  return (
    <>
      {agruparConActos(lista, fuentesConTanda).map(({ fuente, propuestas: grupo }) => {
        const quedan = grupo.filter((p) => !estados[p.id]?.decidida).length;
        const ocupado = grupo.some((p) => estados[p.id]?.enCamino);
        const enGrupo = new Set(grupo.map((p) => p.id));
        return (
          <Fragment key={fuente}>
            <Rotulo className={styles.grupo}>
              {fuente}
              {quedan > 0 && <b>{quedan}</b>}
            </Rotulo>
            {ofrecerTodas(fuente, quedan, fuentesConTanda) && (
              <Boton variante="secundario" className={css.todas} disabled={ocupado} aria-busy={ocupado} onClick={() => void aceptarTodas(grupo)}>
                {`Aceptar las ${quedan} de esta fuente`}
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
                    <small>
                      {vista.linea && `${pegado(vista.linea)} · `}
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
      {rechazando && (
        <Hoja etiqueta={`Rechazar ${rechazando.nombre}`} titulo="¿Por qué la rechazas?" onCerrar={() => setRechazando(null)}>
          <p className={hoja.nota}>{rechazando.nombre}. La rutina aprende a no volver a proponerla.</p>
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
