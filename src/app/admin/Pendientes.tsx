"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { IconoBandera, IconoCamara, IconoOk, IconoPersona } from "@/components/ui/Iconos";
import { accionDe, esReclamo, etiquetaFicha, quePide, rutaFicha, textoDejar, textoHecho, type Decision, type Pendiente } from "@/lib/panel";
import { cambiarVisibilidad, decidirPendiente } from "./acciones";
import Reintentar from "./Reintentar";
import styles from "./admin.module.css";

export type PendienteConCuando = Pendiente & { cuando: string };

/**
 * Pendiente (decisiones 1 a 3): el rótulo con cuántos quedan y una tarjeta por reclamo o reporte, del más viejo al más
 * nuevo. Al decidir, la tarjeta se vuelve la línea de lo hecho y se queda hasta salir del panel, aunque el servidor
 * ya la haya quitado de la lista (la lista se toma al entrar).
 */
export default function Pendientes({ iniciales, error }: { iniciales: PendienteConCuando[]; error: boolean }) {
  const [lista] = useState(iniciales);
  const [decididos, setDecididos] = useState<string[]>([]);
  const quedan = lista.length - decididos.length;
  return (
    <>
      <h2 className={styles.grupo}>
        Pendiente{quedan > 0 && <b>{quedan}</b>}
      </h2>
      {error ? (
        <Reintentar texto="No pudimos leer lo pendiente." />
      ) : lista.length === 0 ? (
        <p className={styles.nada}>
          <IconoOk width={20} height={20} />
          <b>Nada pendiente</b>
          <small>Sin reportes ni reclamos</small>
        </p>
      ) : (
        <ul className={styles.pendientes}>
          {lista.map((p) => (
            <TarjetaPendiente key={p.id} p={p} alDecidir={() => setDecididos((d) => [...d, p.id])} />
          ))}
        </ul>
      )}
    </>
  );
}

type Hecho = { texto: string; mostrar: boolean };

function TarjetaPendiente({ p, alDecidir }: { p: PendienteConCuando; alDecidir: () => void }) {
  const [hecho, setHecho] = useState<Hecho | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camino, setCamino] = useState<Decision | "mostrar" | null>(null);
  const [enCamino, iniciar] = useTransition();
  const accion = accionDe(p);
  const reclamo = esReclamo(p);
  // Pedir cupo no es un reporte (bandera) ni un reclamo de ficha (persona): va con el icono de lo que pide.
  const pideLecturas = p.motivo === "mas_lecturas";

  function decidir(decision: Decision) {
    setError(null);
    setCamino(decision);
    iniciar(async () => {
      const r = await decidirPendiente(p.id, decision);
      if (!r.ok) return setError(r.error);
      setHecho({ texto: textoHecho(p, decision), mostrar: decision === "ocultar" });
      alDecidir();
    });
  }
  function mostrar() {
    if (p.tipo === "perfil") return;
    setError(null);
    setCamino("mostrar");
    iniciar(async () => {
      const r = await cambiarVisibilidad(p.tipo as "lugar" | "evento" | "artista", p.objeto_id, true);
      if (!r.ok) return setError(r.error);
      setHecho({ texto: `${p.objeto} se ve otra vez`, mostrar: false });
    });
  }

  if (hecho) {
    return (
      <li className={styles.hecho} role="status">
        <IconoOk width={20} height={20} />
        <span>
          {hecho.texto}
          {error && <em role="alert"> · {error}</em>}
        </span>
        {hecho.mostrar && (
          <button type="button" className={styles.enlace} disabled={enCamino} onClick={mostrar}>
            {enCamino && camino === "mostrar" ? "Mostrando…" : "Mostrar"}
          </button>
        )}
      </li>
    );
  }
  return (
    <li className={`${styles.pendiente} ${reclamo ? styles.reclamo : ""}`}>
      {pideLecturas ? <IconoCamara width={20} height={20} /> : reclamo ? <IconoPersona width={20} height={20} /> : <IconoBandera width={20} height={20} />}
      <b>{quePide(p)}</b>
      {pideLecturas ? null : p.objeto ? (
        <Link href={rutaFicha(p.tipo, p.objeto_id)} className={styles.ficha}>
          {p.objeto} <span>· {etiquetaFicha(p.tipo)}</span>
        </Link>
      ) : (
        <span className={styles.ficha}>
          La ficha ya no existe <span>· {etiquetaFicha(p.tipo)}</span>
        </span>
      )}
      {p.detalle && <q>{p.detalle}</q>}
      {p.lecturas !== null && (
        <span className={styles.numeros}>
          Leyó <b>{p.lecturas}</b> y publicó <b>{p.publicados ?? 0}</b> este mes
        </span>
      )}
      <small>
        {p.creado_por ? <Link href={`/admin/personas/${p.creado_por}`}>{p.autor || "Sin nombre"}</Link> : "Una cuenta borrada"} · {p.cuando}
      </small>
      {error && <p role="alert">{error}</p>}
      <button type="button" className={styles.dejar} disabled={enCamino} onClick={() => decidir("dejar")}>
        {enCamino && camino === "dejar" ? "Cerrando…" : textoDejar(p)}
      </button>
      {accion && (
        <button type="button" className={`${styles.actuar} ${accion.decision === "ocultar" ? styles.peligro : styles.principal}`} disabled={enCamino || !!accion.apagada} onClick={() => decidir(accion.decision)}>
          {enCamino && camino === accion.decision ? (accion.decision === "ocultar" ? "Ocultando…" : accion.decision === "pasar" ? "Pasando…" : "Dando…") : accion.texto}
        </button>
      )}
      {accion?.apagada && <small className={styles.apagada}>{accion.apagada}</small>}
    </li>
  );
}
