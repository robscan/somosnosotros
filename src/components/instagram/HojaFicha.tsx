"use client";

import { useEffect, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import admin from "@/app/admin/admin.module.css";
import { prepararFicha, publicarFicha, type PreparadaFicha } from "@/app/admin/instagram/accionesFicha";
import { CUENTA_INSTAGRAM } from "@/lib/instagram/texto";
import propia from "./HojaInstagram.module.css";
import styles from "./HojaDia.module.css";

const NO_SE_PUDO = "No se pudo publicar. Revisa tu conexión e inténtalo otra vez.";

/**
 * La hoja de «Publicar en Instagram» de la ficha de un artista o de un lugar (OL-515): la tarjeta y el texto como saldrían ahora (los mismos de
 * la semana de Instagram: su cuenta etiquetada, la historia y el espejo en Facebook van con la publicación) y «Publicar ahora». Si ya salió
 * antes, lo dice y pide confirmar («Sí, publicar otra vez»). Al guardarse el trabajo, la hoja se cierra: el aviso llega al teléfono al terminar.
 */
export default function HojaFicha({ tipo, id, onCerrar, onPublicado }: { tipo: "artista" | "lugar"; id: string; onCerrar: () => void; onPublicado?: () => void }) {
  const [prep, setPrep] = useState<PreparadaFicha | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, enviar] = useTransition();

  useEffect(() => {
    let vivo = true;
    prepararFicha(tipo, id).then(
      (p) => vivo && setPrep(p),
      () => vivo && setPrep({ ok: false, mensaje: "No se pudo preparar. Intenta de nuevo." }),
    );
    return () => {
      vivo = false;
    };
  }, [tipo, id]);

  const listo = prep?.ok ? prep : null;
  const cerrar = () => {
    if (!enviando) onCerrar();
  };
  const publicar = (repetir: boolean) =>
    enviar(async () => {
      setError(null);
      const r = await publicarFicha(tipo, id, repetir).catch(() => ({ ok: false as const, mensaje: NO_SE_PUDO }));
      if (r.ok) {
        onPublicado?.();
        onCerrar();
      } else if ("repetido" in r) setConfirmar(r.repetido);
      else setError(r.mensaje);
    });

  if (listo && confirmar) {
    return (
      <Hoja
        etiqueta={`¿Publicar otra vez a ${listo.nombre}?`}
        titulo={`¿Publicar otra vez a ${listo.nombre}?`}
        onCerrar={cerrar}
        pie={
          <Boton type="button" onClick={() => publicar(true)} disabled={enviando} aria-busy={enviando || undefined}>
            {enviando ? "Publicando…" : "Sí, publicar otra vez"}
          </Boton>
        }
      >
        <p className={hoja.nota}>{confirmar}. Sale ahora, con lo que su ficha dice hoy. La publicación anterior sigue en Instagram: si ya no la quieres, se borra desde la cuenta.</p>
        <p className={hoja.nota}>
          ¿Te equivocaste?{" "}
          <button type="button" className={admin.enlace} onClick={() => setConfirmar(null)} disabled={enviando}>
            Mejor no
          </button>
        </p>
        {error && (
          <p className="aviso-error" role="alert">
            {error}
          </p>
        )}
      </Hoja>
    );
  }

  const titulo = "Publicar en Instagram";
  const yaSalio = listo?.en.salio ?? null;
  return (
    <Hoja
      etiqueta={titulo}
      titulo={titulo}
      onCerrar={cerrar}
      pie={
        listo && !listo.en.publicando ? (
          <Boton type="button" onClick={() => (yaSalio ? setConfirmar(yaSalio) : publicar(false))} disabled={enviando} aria-busy={enviando || undefined}>
            {enviando ? "Publicando…" : yaSalio ? "Publicar otra vez" : "Publicar ahora"}
          </Boton>
        ) : undefined
      }
    >
      {!prep ? (
        <span className={propia.vista} data-formato="4x5" aria-label="Preparando la vista previa" role="img" />
      ) : !listo ? (
        <p className="aviso-error" role="alert">
          {prep.ok ? null : prep.mensaje}
        </p>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- la imagen la dibuja el servidor a 720 de ancho, ya JPEG */}
          <img className={propia.vista} data-formato="4x5" src={`/api/instagram/ficha/${id}?tipo=${tipo}&formato=4x5`} alt={`Tarjeta: ${listo.nombre}`} width={720} height={900} />
          {listo.en.publicando ? (
            <p className={hoja.nota} role="status">
              Ya se está publicando. Te avisamos en el teléfono cuando salga.
            </p>
          ) : (
            <p className={hoja.nota}>
              Sale ahora en @{CUENTA_INSTAGRAM}, con su historia y en Facebook{listo.cuenta ? `, y etiqueta a @${listo.cuenta}` : ". Su ficha no tiene Instagram: sale sin etiqueta"}.{listo.ubicacion ? ` Ubicación: ${listo.ubicacion}.` : ""}
            </p>
          )}
          {yaSalio && !listo.en.publicando && <p className={hoja.nota}>{yaSalio}.</p>}
          {listo.en.programada && <p className={hoja.nota}>La semana de Instagram ya la tiene programada para {listo.en.programada}: si la publicas ahora, saldrá también ese día (se puede cambiar en Administración › Instagram › Semana).</p>}
          <pre className={styles.texto}>{listo.texto}</pre>
        </>
      )}
      {error && (
        <p className="aviso-error" role="alert">
          {error}
        </p>
      )}
    </Hoja>
  );
}
