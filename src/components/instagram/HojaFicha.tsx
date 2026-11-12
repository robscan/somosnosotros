"use client";

import { useEffect, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import admin from "@/app/admin/admin.module.css";
import { prepararFicha, publicarFicha, type PreparadaFicha } from "@/app/admin/instagram/accionesFicha";
import { textoDeDestacado } from "@/lib/instagram/destacado";
import { CUENTA_INSTAGRAM } from "@/lib/instagram/texto";
import MandosPublicacion, { ChipsFormato } from "./MandosPublicacion";
import propia from "./HojaInstagram.module.css";

const NO_SE_PUDO = "No se pudo publicar. Revisa tu conexión e inténtalo otra vez.";

/**
 * La hoja de «Publicar en Instagram» de la ficha de un artista o de un lugar (OL-515; founder: «así como ya pasa con el evento»). No es una pantalla
 * nueva: la vista previa y los mandos de la hoja de un día de la semana (`MandosPublicacion`: a quién se etiqueta, la ubicación, el texto editable
 * con su contador, «También en Facebook»), sin lo que es de la semana (el día, «Cambiar», el aviso previo, «Quitar»). La tarjeta es la que saldrá:
 * sin «de la semana» (`?rotulo=0`). «Publicar ahora» la manda a la cola; si ya salió antes, «Publicar otra vez» pide confirmar. Si la semana ya la
 * tiene programada, lo dice; si ya va en camino, lo dice y no hay botón.
 */
export default function HojaFicha({ tipo, id, onCerrar, onPublicado }: { tipo: "artista" | "lugar"; id: string; onCerrar: () => void; onPublicado?: () => void }) {
  const [prep, setPrep] = useState<PreparadaFicha | null>(null);
  const [formato, setFormato] = useState<"4x5" | "9x16">("4x5");
  const [quitadas, setQuitadas] = useState<string[]>([]);
  const [propio, setPropio] = useState<string | null>(null);
  const [fb, setFb] = useState(true);
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
  const c = listo?.contenido;
  const cuenta = c?.cuenta ?? null;
  // El texto que arma el sistema (el mismo código que el trabajador), sin la cuenta si se quitó; lo escrito a mano manda.
  const armado = c && listo ? textoDeDestacado(c, new Date(listo.ahora), quitadas) : "";
  const texto = propio ?? armado;
  const etiquetas = cuenta && !quitadas.includes(cuenta) ? [cuenta] : [];
  const pedido = () => ({ texto: texto === armado ? null : texto, quitadas, facebook: fb });

  const cerrar = () => {
    if (!enviando) onCerrar();
  };
  const publicar = (repetir: boolean) =>
    enviar(async () => {
      setError(null);
      const r = await publicarFicha(tipo, id, pedido(), repetir).catch(() => ({ ok: false as const, mensaje: NO_SE_PUDO }));
      if (r.ok) {
        onPublicado?.();
        onCerrar();
      } else if ("repetido" in r) setConfirmar(r.repetido);
      else setError(r.mensaje);
    });

  const aviso = error && (
    <p className="aviso-error" role="alert">
      {error}
    </p>
  );

  // ----- «¿Publicar otra vez…?»: dentro de la misma hoja (filtrar no es navegar).
  if (listo && confirmar) {
    const t = `¿Publicar otra vez a ${listo.nombre}?`;
    return (
      <Hoja
        etiqueta={t}
        titulo={t}
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
        {aviso}
      </Hoja>
    );
  }

  const titulo = "Publicar en Instagram";
  const yaSalio = listo?.en.salio ?? null;
  const enCamino = !!listo?.en.publicando;
  return (
    <Hoja
      etiqueta={titulo}
      titulo={titulo}
      onCerrar={cerrar}
      pie={
        listo && !enCamino ? (
          <Boton type="button" onClick={() => (yaSalio ? setConfirmar(yaSalio) : publicar(false))} disabled={enviando} aria-busy={enviando || undefined}>
            {enviando ? "Publicando…" : yaSalio ? "Publicar otra vez" : "Publicar ahora"}
          </Boton>
        ) : undefined
      }
    >
      {!prep ? (
        <span className={propia.vista} data-formato="4x5" aria-label="Preparando la vista previa" role="img" />
      ) : !listo || !c ? (
        <p className="aviso-error" role="alert">
          {prep.ok ? null : prep.mensaje}
        </p>
      ) : (
        <>
          {!enCamino && <ChipsFormato formato={formato} onFormato={setFormato} />}
          {/* eslint-disable-next-line @next/next/no-img-element -- la imagen la dibuja el servidor a 720 de ancho, ya JPEG */}
          <img key={formato} className={propia.vista} data-formato={formato} src={`/api/instagram/ficha/${id}?tipo=${tipo}&formato=${formato}&rotulo=0`} alt={`${formato === "4x5" ? "Tarjeta" : "Historia"}: ${listo.nombre}`} width={720} height={formato === "4x5" ? 900 : 1280} />
          {enCamino ? (
            <p className={hoja.nota} role="status">
              Ya se está publicando. Te avisamos en el teléfono cuando salga.
            </p>
          ) : (
            <>
              <p className={`${hoja.nota} ${propia.linea}`}>
                {yaSalio ? `${yaSalio}. ` : ""}Sale ahora en @{CUENTA_INSTAGRAM}, con su historia.
              </p>
              {listo.en.programada && (
                <p className={`${hoja.nota} ${propia.linea}`}>
                  La semana de Instagram ya la tiene programada para {listo.en.programada}: si la publicas ahora, saldrá también ese día (se cambia en Administración › Instagram › Semana).
                </p>
              )}
              <MandosPublicacion
                historia={formato === "9x16"}
                etiquetas={etiquetas}
                todas={cuenta ? [cuenta] : []}
                hayQuitadas={quitadas.length > 0}
                onQuitar={(u) => setQuitadas([...quitadas, u])}
                onVolverAEtiquetar={() => setQuitadas([])}
                leyenda={listo.tipo === "artista" ? "Se etiqueta en la foto, se menciona en el texto y se invita a su cuenta como coautora:" : "Se etiqueta en la foto y se menciona en el texto:"}
                sinEtiquetas={listo.tipo === "lugar" ? "Este lugar no tiene Instagram en su ficha: sale sin etiqueta y sin crédito." : null}
                ubicacion={listo.ubicacion ? `Ubicación: ${listo.ubicacion.nombre}` : `Sin ubicación: falta la de ${listo.ciudad.nombre} en Ciudades.`}
                idCampo="campo-texto-ficha"
                texto={texto}
                onTexto={setPropio}
                cambiado={propio !== null && texto !== armado}
                onTextoDelSistema={() => setPropio(null)}
                facebook={{ marcada: fb, onCambio: setFb, disabled: enviando }}
              />
            </>
          )}
        </>
      )}
      {aviso}
    </Hoja>
  );
}
