"use client";

import Link from "next/link";
import { Fragment, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import hojaCss from "@/components/ui/Hoja.module.css";
import { IconoChevronDerecha, IconoOk } from "@/components/ui/Iconos";
import Imagen from "@/components/ui/Imagen";
import renglon from "@/components/ui/Renglon.module.css";
import { SIN_FOTO_REDONDA } from "@/lib/imagen";
import { anclaArtista, etiquetaTipo, SENALES, sumaValores, type Evidencia, type EvidenciaBreve, type Valores } from "@/lib/showcase";
import {
  detalleArtista,
  efectoAlAceptar,
  etiquetaMotivo,
  lineaPorAprobar,
  MOTIVOS_RECHAZO,
  ordenarHallazgos,
  totalConTodo,
  valoresSiAcepta,
  type MotivoRechazo,
} from "@/lib/showcasePorAprobar";
import { aceptarVarias, decidir, rechazarConMotivo } from "./accionesPorAprobar";
import { IconoTipo } from "./Piezas";
import admin from "../admin.module.css";
import s from "./showcase.module.css";

/** Un hallazgo como lo pinta la pantalla: la evidencia propuesta con su fuente en palabras y cuándo la leyó la rutina. */
export type HallazgoVista = Evidencia & { fuenteTexto: string; detalle: string };
/** Un artista con lo suyo por aprobar: lo que vale hoy su rúbrica y la obra que ya tiene aceptada (para decir qué cambia al aceptar). */
export type GrupoHallazgos = {
  artista: { id: string; slug: string; nombre: string; foto: string | null; href: string; disciplina: string; estado: string };
  valores: Valores;
  obraAceptada: EvidenciaBreve[];
  hallazgos: HallazgoVista[];
};
type Decision = { como: "aceptada" | "rechazada"; corto: string | null; motivo?: MotivoRechazo };

const comoAceptada = (e: EvidenciaBreve): EvidenciaBreve => ({ senal: e.senal, tipo: e.tipo, titulo: e.titulo, fecha: e.fecha, estado: "aceptada" });

/**
 * Los hallazgos por aprobar (OL-446; lo firmado en OL-443, bitácora 475). Dos usos con el mismo componente:
 *   · `pantalla` («Por aprobar»): la línea de cuántas quedan y, por artista, su renglón (foto, disciplina, estado, «7 de 8 · con todo, 8», cuántas
 *     le quedan y el chevron a su ficha), sus hallazgos y «Aceptar las N de <artista>» si le quedan dos o más;
 *   · `ficha` («Por revisar» de su ficha): el título con cuántas quedan, sus hallazgos y «Aceptar las N».
 * Cada hallazgo dice qué cambia si se acepta («Si la aceptas: Obra 1 → 2 · total 7 → 8», en verde) o por qué no cambia; primero los que suben el
 * puntaje. Aceptar y Rechazar ahí mismo (Rechazar pide su motivo en una hoja) y, hecho, la línea de lo hecho con «Deshacer».
 *
 * Lo que se ve sale de lo que había al abrir la pantalla más lo que se decide aquí (no de lo que vuelve a mandar el servidor tras cada acción): así
 * los grupos no cambian de sitio ni desaparecen mientras se trabaja, y la cuenta de cada uno se rehace en el teléfono con la misma regla.
 */
export default function Hallazgos({ grupos, hoy, modo, cuando = null }: { grupos: GrupoHallazgos[]; hoy: string; modo: "pantalla" | "ficha"; cuando?: string | null }) {
  // El orden de cada grupo se toma al abrir: primero lo que sube el puntaje.
  const [inicial] = useState(() => grupos.map((g) => ({ ...g, hallazgos: ordenarHallazgos(g.hallazgos, g.valores, g.obraAceptada, hoy) })));
  const [hechas, setHechas] = useState<Record<string, Decision>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [rechazando, setRechazando] = useState<{ h: HallazgoVista; slug: string } | null>(null);
  const [enCamino, iniciar] = useTransition();

  /** Lo que vale la rúbrica del artista con lo aceptado aquí, y su obra aceptada. */
  function ahora(g: GrupoHallazgos) {
    const aceptadas = g.hallazgos.filter((h) => hechas[h.id]?.como === "aceptada");
    return { valores: valoresSiAcepta(g.valores, g.obraAceptada, aceptadas, hoy), obra: [...g.obraAceptada, ...aceptadas.filter((h) => h.senal === "obra").map(comoAceptada)] };
  }
  const pendientesDe = (g: GrupoHallazgos) => g.hallazgos.filter((h) => !hechas[h.id]);

  function aceptar(g: GrupoHallazgos, h: HallazgoVista) {
    const a = ahora(g);
    const ef = efectoAlAceptar(a.valores, a.obra, h, hoy);
    setErrores((e) => ({ ...e, [h.id]: "" }));
    iniciar(async () => {
      const r = await decidir(h.id, "aceptada", g.artista.slug);
      if (!r.ok) return setErrores((e) => ({ ...e, [h.id]: r.error }));
      setHechas((x) => ({ ...x, [h.id]: { como: "aceptada", corto: ef.sube ? ef.corto : null } }));
    });
  }
  function rechazar(h: HallazgoVista, slug: string, motivo: MotivoRechazo) {
    setRechazando(null);
    setErrores((e) => ({ ...e, [h.id]: "" }));
    iniciar(async () => {
      const r = await rechazarConMotivo(h.id, motivo, slug);
      // Si el rechazo quedó y solo faltó el motivo, la línea de lo hecho lo dice; si no quedó, el error va en su tarjeta.
      if (!r.ok && !r.error.startsWith("Se rechazó")) return setErrores((e) => ({ ...e, [h.id]: r.error }));
      setHechas((x) => ({ ...x, [h.id]: { como: "rechazada", corto: null, motivo: r.ok ? motivo : undefined } }));
    });
  }
  function deshacer(h: HallazgoVista, slug: string) {
    iniciar(async () => {
      const r = await decidir(h.id, "propuesta", slug);
      if (!r.ok) return setErrores((e) => ({ ...e, [h.id]: r.error }));
      setHechas((x) => Object.fromEntries(Object.entries(x).filter(([id]) => id !== h.id)));
    });
  }
  function aceptarTodas(g: GrupoHallazgos) {
    const quedan = pendientesDe(g);
    // Lo que cambia cada una, en orden: cada aceptada cuenta para la siguiente.
    const cortos: Record<string, string | null> = {};
    let a = ahora(g);
    for (const h of quedan) {
      const ef = efectoAlAceptar(a.valores, a.obra, h, hoy);
      cortos[h.id] = ef.sube ? ef.corto : null;
      const obra = h.senal === "obra" ? [...a.obra, comoAceptada(h)] : a.obra;
      a = { valores: valoresSiAcepta(a.valores, a.obra, [h], hoy), obra };
    }
    setErrores((e) => ({ ...e, [g.artista.id]: "" }));
    iniciar(async () => {
      const r = await aceptarVarias(
        quedan.map((h) => h.id),
        g.artista.slug,
      );
      if (r.aceptadas.length) setHechas((x) => ({ ...x, ...Object.fromEntries(r.aceptadas.map((id) => [id, { como: "aceptada" as const, corto: cortos[id] ?? null }])) }));
      if (!r.ok) setErrores((e) => ({ ...e, [g.artista.id]: r.error }));
    });
  }

  const total = inicial.reduce((t, g) => t + pendientesDe(g).length, 0);
  const conPendientes = inicial.filter((g) => pendientesDe(g).length > 0).length;

  function lista(g: GrupoHallazgos) {
    const a = ahora(g);
    return (
      <ul className={modo === "pantalla" ? `${admin.pendientes} ${s.hallazgos}` : admin.pendientes}>
        {g.hallazgos.map((h) => {
          const hecha = hechas[h.id];
          if (hecha)
            return (
              <li key={h.id}>
                <p className={admin.hecho} role="status">
                  <IconoOk width={20} height={20} />
                  <span>
                    {hecha.como === "aceptada" ? "Aceptaste" : "Rechazaste"} <b>{h.titulo}</b>
                    {hecha.corto && (
                      <>
                        {" · "}
                        <span className={s.sube}>{hecha.corto}</span>
                      </>
                    )}
                    {hecha.motivo && ` · ${etiquetaMotivo(hecha.motivo).toLowerCase()}`}
                  </span>
                  <button type="button" className={admin.enlace} disabled={enCamino} onClick={() => deshacer(h, g.artista.slug)}>
                    Deshacer
                  </button>
                </p>
              </li>
            );
          const ef = efectoAlAceptar(a.valores, a.obra, h, hoy);
          const senal = SENALES.find((x) => x.clave === h.senal)!.etiqueta;
          const tipo = etiquetaTipo(h.tipo);
          return (
            <li key={h.id} className={admin.pendiente}>
              <IconoTipo tipo={h.tipo} width={20} height={20} />
              <b>{tipo === senal ? tipo : `${tipo} · ${senal}`}</b>
              <a className={admin.ficha} href={h.url} target="_blank" rel="noopener noreferrer">
                {h.titulo}
              </a>
              <small>
                Fuente: {h.fuenteTexto} · {h.detalle}
              </small>
              {errores[h.id] ? (
                <p role="alert">{errores[h.id]}</p>
              ) : (
                <p className={s.efecto} data-sube={ef.sube || undefined}>
                  {ef.texto}
                </p>
              )}
              <button type="button" className={admin.dejar} disabled={enCamino} aria-haspopup="dialog" onClick={() => setRechazando({ h, slug: g.artista.slug })}>
                Rechazar
              </button>
              <button type="button" className={`${admin.actuar} ${admin.principal}`} disabled={enCamino} onClick={() => aceptar(g, h)}>
                Aceptar
              </button>
            </li>
          );
        })}
      </ul>
    );
  }
  function todas(g: GrupoHallazgos, conNombre: boolean) {
    const n = pendientesDe(g).length;
    return (
      <>
        {errores[g.artista.id] && (
          <p className="aviso-error" role="alert">
            {errores[g.artista.id]}
          </p>
        )}
        {n >= 2 && (
          <Boton variante="secundario" ancho="contenido" className={s.todas} disabled={enCamino} onClick={() => aceptarTodas(g)}>
            {conNombre ? `Aceptar las ${n} de ${g.artista.nombre}` : `Aceptar las ${n}`}
          </Boton>
        )}
      </>
    );
  }

  const hoja = rechazando && (
    <Hoja etiqueta={`Rechazar «${rechazando.h.titulo}»`} titulo="¿Por qué la rechazas?" onCerrar={() => setRechazando(null)}>
      <p className={hojaCss.nota}>El motivo queda con la evidencia para que la rutina aprenda. Se puede deshacer.</p>
      <ul className={`${admin.menu} ${s.menu}`}>
        {MOTIVOS_RECHAZO.map((m) => (
          <li key={m.valor}>
            <button type="button" className={`${admin.menuItem} ${admin.menuConDetalle} ${s.opcion}`} onClick={() => rechazar(rechazando.h, rechazando.slug, m.valor)}>
              <IconoOk width={20} height={20} className={s.hueco} />
              {m.etiqueta}
              <small>{m.detalle}</small>
            </button>
          </li>
        ))}
      </ul>
    </Hoja>
  );

  if (modo === "ficha") {
    const g = inicial[0];
    if (!g?.hallazgos.length) return null;
    const n = pendientesDe(g).length;
    return (
      <>
        <h2 id="por-revisar" tabIndex={-1} className={`${admin.grupo} ${admin.conNota} ${s.porRevisar}`}>
          Por revisar {n > 0 && <b>{n}</b>}
        </h2>
        <p className={admin.nota}>Lo que trajo la rutina. Solo cuenta lo que aceptas.</p>
        {lista(g)}
        {todas(g, false)}
        {hoja}
      </>
    );
  }

  return (
    <>
      <p className={admin.nota} role="status">
        {lineaPorAprobar(total, conPendientes, cuando)}
      </p>
      {inicial.map((g) => {
        const a = ahora(g);
        const quedan = pendientesDe(g);
        const suma = sumaValores(a.valores);
        return (
          <Fragment key={g.artista.id}>
            <ul className={`${renglon.tarjeta} ${s.quien}`} id={anclaArtista(g.artista.id)} aria-label={g.artista.nombre}>
              <li>
                <Link href={g.artista.href} className={`${admin.fila} ${s.filaArtista}`}>
                  <Imagen src={g.artista.foto ?? SIN_FOTO_REDONDA} alt="" className={s.fotoChica} width={40} height={40} sizes="40px" />
                  <b>{g.artista.nombre}</b>
                  <small>{detalleArtista(g.artista.disciplina, g.artista.estado, suma, totalConTodo(a.valores, a.obra, quedan, hoy))}</small>
                  <span className={admin.total}>
                    {quedan.length > 0 && <b className={s.cuenta}>{quedan.length}</b>}
                    <IconoChevronDerecha />
                  </span>
                </Link>
              </li>
            </ul>
            {lista(g)}
            {todas(g, true)}
          </Fragment>
        );
      })}
      {hoja}
    </>
  );
}
