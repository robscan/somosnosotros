"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import Campo from "@/components/ui/Campo";
import Hoja from "@/components/ui/Hoja";
import { IconoBasura, IconoDestello, IconoLapiz, IconoOjo, IconoOjoTachado, IconoPuntos } from "@/components/ui/Iconos";
import { opcionDestacar, TIPO_DE, type Decidido, type Destacado } from "@/lib/destacados";
import { rutaEditar, textoOcultar } from "@/lib/panel";
import { borrarLugarExcepcional, cambiarDestacado, cambiarVisibilidad, consultarImpactoBorradoLugar, type ImpactoBorradoLugar } from "../acciones";
import styles from "../admin.module.css";

/**
 * Los tres puntos de cada renglón (decisión 10): el mismo menú de las fichas, con ocultar al final y aparte. Ocultar no
 * pregunta: el menú es la capa y la etiqueta "Oculto" del renglón, que llega de nuevo del servidor, es la evidencia.
 * «Destacar» o «Quitar de destacados» sale de lo decidido, como en la ficha, no de la tira de 8.
 */
export default function MenuFicha({ seccion, id, nombre, visible, destacable, decidido, enTira }: { seccion: "lugares" | "eventos" | "artistas"; id: string; nombre: string; visible: boolean; destacable: boolean; decidido: Decidido; enTira: Destacado | null }) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const [destacando, iniciarDestacado] = useTransition();
  const [eliminar, setEliminar] = useState(false);
  const opcion = opcionDestacar(TIPO_DE[seccion], decidido, enTira);

  function alternar() {
    setError(null);
    iniciar(async () => {
      const r = await cambiarVisibilidad(TIPO_DE[seccion], id, !visible);
      if (r.ok) setAbierto(false);
      else setError(r.error);
    });
  }

  // Destacar o quitar no pregunta: el menú es la capa y la etiqueta del renglón, la evidencia (como Ocultar).
  function destacar() {
    setError(null);
    iniciarDestacado(async () => {
      const r = await cambiarDestacado(TIPO_DE[seccion], id, opcion.quitar ? "quitado" : "elegido");
      if (r.ok) setAbierto(false);
      else setError(r.error);
    });
  }

  return (
    <>
      <BotonIcono onClick={() => setAbierto(true)} aria-label={`Más acciones de ${nombre}`} aria-haspopup="dialog">
        <IconoPuntos width={22} height={22} />
      </BotonIcono>
      {abierto && (
        <Hoja etiqueta={`Acciones de ${nombre}`} onCerrar={() => setAbierto(false)}>
          <h3>{nombre}</h3>
          <ul className={styles.menu}>
            <li>
              <Link href={`/${seccion}/${id}`} className={styles.menuItem}>
                <IconoOjo width={20} height={20} />
                Ver la ficha
              </Link>
            </li>
            <li>
              <Link href={rutaEditar(seccion, id)} className={styles.menuItem}>
                <IconoLapiz width={20} height={20} />
                Editar
              </Link>
            </li>
            {destacable && (
              <li>
                <button type="button" className={`${styles.menuItem} ${styles.menuDestacar}`} disabled={enCamino || destacando} onClick={destacar}>
                  <IconoDestello width={20} height={20} />
                  {opcion.quitar ? "Quitar de destacados" : "Destacar"}
                  <small>{opcion.detalle}</small>
                </button>
              </li>
            )}
            <li>
              <button type="button" className={styles.menuItem} disabled={enCamino || destacando} onClick={alternar}>
                {visible ? <IconoOjoTachado width={20} height={20} /> : <IconoOjo width={20} height={20} />}
                {enCamino ? (visible ? "Ocultando…" : "Mostrando…") : textoOcultar(seccion, visible)}
              </button>
            </li>
            {seccion === "lugares" && (
              <li>
                <button type="button" className={styles.menuItem} disabled={enCamino || destacando} onClick={() => { setAbierto(false); setEliminar(true); }}>
                  <IconoBasura width={20} height={20} />
                  Eliminar lugar…
                </button>
              </li>
            )}
          </ul>
          {error && (
            <p className="aviso-error" role="alert">
              {error}
            </p>
          )}
        </Hoja>
      )}
      {eliminar && <EliminarLugar id={id} nombre={nombre} onCerrar={() => setEliminar(false)} />}
    </>
  );
}

function EliminarLugar({ id, nombre, onCerrar }: { id: string; nombre: string; onCerrar: () => void }) {
  const [impacto, setImpacto] = useState<ImpactoBorradoLugar | null>(null);
  const [motivo, setMotivo] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leyendo, iniciarLectura] = useTransition();
  const [primeraLectura, setPrimeraLectura] = useState(true);
  const [borrando, iniciarBorrado] = useTransition();
  const solicitud = useRef(0);

  useEffect(() => {
    let vigente = true;
    consultarImpactoBorradoLugar(id).then(r => {
      if (!vigente) return;
      if (r.ok) setImpacto(r.impacto);
      else setError(r.error);
      setPrimeraLectura(false);
    }).catch(() => {
      if (vigente) { setError("No se pudo consultar el impacto. Intenta de nuevo."); setPrimeraLectura(false); }
    });
    return () => { vigente = false; };
  }, [id]);

  function revisar() {
    const turno = ++solicitud.current;
    setConfirmado(false);
    setImpacto(null);
    setError(null);
    iniciarLectura(async () => {
      try {
        const r = await consultarImpactoBorradoLugar(id);
        if (turno !== solicitud.current) return;
        if (r.ok) setImpacto(r.impacto);
        else setError(r.error);
      } catch {
        if (turno === solicitud.current) setError("No se pudo consultar el impacto. Intenta de nuevo.");
      }
    });
  }
  function cerrar() { if (!borrando) { solicitud.current++; onCerrar(); } }
  function ejecutar() {
    if (!impacto?.permitido || !confirmado || motivo.trim().length < 10 || borrando) return;
    setError(null);
    iniciarBorrado(async () => {
      const r = await borrarLugarExcepcional(id, impacto.confirmacion, motivo);
      setError(r.error);
      if (r.revisar) { setImpacto(null); setConfirmado(false); }
    });
  }
  return (
    <Hoja etiqueta={`Eliminar ${nombre}`} titulo="Eliminar lugar" onCerrar={cerrar} pie={
      <>
        <Boton variante="secundario" disabled={borrando} onClick={cerrar}>Cancelar</Boton>
        <Boton variante="peligro" disabled={!impacto?.permitido || !confirmado || motivo.trim().length < 10 || borrando} aria-busy={borrando} onClick={ejecutar}>
          {borrando ? "Eliminando…" : "Eliminar lugar"}
        </Boton>
      </>
    }>
      <p className={styles.nota}><b>{impacto?.nombre ?? nombre}</b></p>
      <p className={styles.nota}>La eliminación es definitiva. Sus eventos se conservan, sin vínculo con este lugar.</p>
      {!impacto && <Boton variante="secundario" disabled={leyendo || primeraLectura} aria-busy={leyendo || primeraLectura} onClick={revisar}>{leyendo || primeraLectura ? "Consultando…" : "Revisar impacto"}</Boton>}
      {impacto && (
        <>
          <p className={styles.nota}>Eventos que se conservan: {impacto.eventos}. Ajenos o sin autor: {impacto.ajenos}.</p>
          <p className={styles.nota}>Relaciones que se eliminan: seguimientos ({impacto.seguimientos}), cuentas vinculadas ({impacto.cuentas}) y destacados del lugar ({impacto.destacados}).</p>
          {impacto.por_ocultar > 0 && <p className={styles.nota}>{impacto.por_ocultar} eventos quedarán ocultos para conservar su privacidad. Su sitio dirá «Lugar retirado», sin copiar nombre, dirección ni coordenadas del lugar.</p>}
          {!impacto.permitido ? (
            <p className="aviso-error" role="alert">No se puede eliminar todavía. Obras colectivas: {impacto.obras}; contactos importados: {impacto.contactos}; invitaciones: {impacto.invitaciones}. Resuelve esos vínculos antes para preservar su historial.</p>
          ) : (
            <>
              <Campo etiqueta="Motivo" name="motivo-borrado" value={motivo} onChange={e => setMotivo(e.target.value)} minLength={10} maxLength={500} disabled={borrando} ayuda="De 10 a 500 caracteres, sin datos personales. Quedará en la auditoría." />
              <label className={styles.menuItem}>
                <input type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} disabled={borrando} />
                Revisé el impacto y quiero eliminar este lugar.
              </label>
            </>
          )}
        </>
      )}
      {error && <p className="aviso-error" role="alert">{error}</p>}
    </Hoja>
  );
}
