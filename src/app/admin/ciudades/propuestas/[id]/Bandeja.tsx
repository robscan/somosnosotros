"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoCalendario, IconoDocumento, IconoEstrella, IconoMascara, IconoOk, IconoPin, IconoPuntos } from "@/components/ui/Iconos";
import { agruparPorFuente, MOTIVOS_RECHAZO, ofrecerTodas, textoDecidida, type MotivoRechazo, type TipoPropuesta, type VistaPropuesta } from "@/lib/propuestas";
import { aceptarPropuesta, deshacerRechazo, rechazarPropuesta } from "../../acciones";
import styles from "../../../admin.module.css";
import css from "../../ciudades.module.css";

export type PropuestaEnBandeja = { id: string; tipo: TipoPropuesta; fuente: string; nombre: string; vista: VistaPropuesta };
type Decidida = { texto: string; href: string | null; rechazo: boolean };
type Estado = { decidida?: Decidida; error?: string; enCamino?: "aceptar" | "rechazar" | "deshacer" };

const ICONO: Record<TipoPropuesta, typeof IconoPin> = { lugar: IconoPin, evento: IconoCalendario, artista: IconoEstrella };
const ICONO_MOTIVO: Record<MotivoRechazo, typeof IconoPin> = { duplicado: IconoDocumento, no_cultural: IconoMascara, fuera_de_la_ciudad: IconoPin, otro: IconoPuntos };

/**
 * La bandeja de una corrida (prototipo firmado OL-425, pantalla B «Propuestas»): por fuente, una tarjeta de «Pendiente» por propuesta con
 * Rechazar a la izquierda y Aceptar a la derecha. Rechazar pide el motivo en una hoja. «Aceptar las N de esta fuente» solo donde la fuente ya
 * tuvo una tanda aprobada antes (la primera va una por una). Al decidir, la tarjeta se vuelve la línea de lo hecho y se queda hasta salir.
 */
export default function Bandeja({ propuestas, fuentesConTanda }: { propuestas: PropuestaEnBandeja[]; fuentesConTanda: string[] }) {
  // La lista se toma al entrar, como en Pendiente: lo decidido se queda como línea aunque el servidor ya no lo traiga.
  const [lista] = useState(propuestas);
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const [rechazando, setRechazando] = useState<PropuestaEnBandeja | null>(null);
  const poner = (id: string, e: Estado) => setEstados((todos) => ({ ...todos, [id]: e }));

  async function aceptar(p: PropuestaEnBandeja) {
    poner(p.id, { enCamino: "aceptar" });
    const r = await aceptarPropuesta(p.id);
    poner(p.id, r.ok ? { decidida: { texto: textoDecidida(p.nombre, { aceptada: true, tipo: p.tipo }), href: r.href, rechazo: false } } : { error: r.error });
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
  async function aceptarTodas(fuente: string) {
    for (const p of lista.filter((x) => x.fuente === fuente && !estados[x.id]?.decidida)) await aceptar(p);
  }

  if (!lista.length) return <p className={styles.vacio}>Nada por revisar en esta corrida.</p>;
  return (
    <>
      {agruparPorFuente(lista, fuentesConTanda).map(({ fuente, propuestas: grupo }) => {
        const quedan = grupo.filter((p) => !estados[p.id]?.decidida).length;
        const ocupado = grupo.some((p) => estados[p.id]?.enCamino);
        return (
          <Fragment key={fuente}>
            <h2 className={styles.grupo}>
              {fuente}
              {quedan > 0 && <b>{quedan}</b>}
            </h2>
            {ofrecerTodas(fuente, quedan, fuentesConTanda) && (
              <Boton variante="secundario" className={css.todas} disabled={ocupado} aria-busy={ocupado} onClick={() => void aceptarTodas(fuente)}>
                {`Aceptar las ${quedan} de esta fuente`}
              </Boton>
            )}
            <ul className={styles.pendientes}>
              {grupo.map((p) => {
                const e = estados[p.id] ?? {};
                if (e.decidida)
                  return (
                    <li key={p.id} className={styles.hecho} role="status">
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
                const { vista } = p;
                return (
                  <li key={p.id} className={styles.pendiente}>
                    <Icono width={20} height={20} />
                    <b>{vista.que}</b>
                    <span className={styles.ficha}>{vista.titulo}</span>
                    <small>
                      {vista.linea && `${vista.linea} · `}
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
                    {e.error && <p role="alert">{e.error}</p>}
                    <button type="button" className={styles.dejar} disabled={!!e.enCamino} aria-haspopup="dialog" onClick={() => setRechazando(p)}>
                      {e.enCamino === "rechazar" ? "Rechazando…" : "Rechazar"}
                    </button>
                    <button type="button" className={`${styles.actuar} ${styles.principal}`} disabled={!!e.enCamino} onClick={() => void aceptar(p)}>
                      {e.enCamino === "aceptar" ? "Aceptando…" : "Aceptar"}
                    </button>
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
                  <button type="button" className={`${styles.menuItem} ${css.motivo}`} onClick={() => void rechazar(rechazando, m.valor)}>
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
