"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import CampoLargo from "@/components/ui/CampoLargo";
import { Chip, Chips } from "@/components/ui/Chip";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoOk, IconoPin } from "@/components/ui/Iconos";
import admin from "@/app/admin/admin.module.css";
import { prepararInstagram, publicarEnInstagram, type Preparado, type Publicado } from "@/app/admin/instagram/acciones";
import { armarTexto, CUENTA_INSTAGRAM, etiquetasDeLaFoto, TOPE_CARACTERES } from "@/lib/instagram/texto";
import styles from "./HojaInstagram.module.css";

type Formato = "4x5" | "9x16";

/**
 * La hoja «Publicar en Instagram» (OL-458, prototipo firmado `admin-instagram.html`, pantallas C y D; bitácora 490). La abren la lista de
 * Administración › Instagram y el «···» de la ficha de un evento. Arriba, Publicación 4:5 o Historia 9:16 (los chips de «Así queda» de Crear
 * cartel); la imagen tal cual saldrá; lo que se hizo con el cartel (completo con margen, o «Recortar»; sin cartel, un diseño de Crear cartel y
 * «Otro diseño»); a quién se etiqueta (chips con ✕); la ubicación; el texto ya armado (`ui/CampoLargo`, contador siempre a la vista); y un solo
 * botón. Publicando, el botón espera y la hoja no se cierra; publicado, la imagen y lo hecho con «Ver en Instagram»; un error, en una frase.
 * Las historias no llevan texto ni ubicación (Instagram no los publica en historias).
 */
export default function HojaInstagram({ eventoId, onCerrar, onPublicado }: { eventoId: string; onCerrar: () => void; onPublicado?: () => void }) {
  const [prep, setPrep] = useState<Preparado | null>(null);
  const [formato, setFormato] = useState<Formato>("4x5");
  const [recorte, setRecorte] = useState(false);
  const [diseno, setDiseno] = useState(0);
  const [quitadas, setQuitadas] = useState<string[]>([]);
  const [propio, setPropio] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Publicado | null>(null);
  const [publicando, empezar] = useTransition();

  useEffect(() => {
    let vivo = true;
    prepararInstagram(eventoId).then((p) => vivo && setPrep(p), () => vivo && setPrep({ ok: false, mensaje: "No se pudo preparar. Intenta de nuevo." }));
    return () => {
      vivo = false;
    };
  }, [eventoId]);

  const listo = prep?.ok ? prep : null;
  // El texto que arma el sistema (el mismo código que el servidor), con lo que se quitó; lo escrito a mano manda.
  const armado = useMemo(() => (listo ? armarTexto(listo.evento, new Date(listo.ahora), quitadas) : ""), [listo, quitadas]);
  const texto = propio ?? armado;
  const etiquetas = listo ? etiquetasDeLaFoto(listo.evento, quitadas) : [];
  const publicado = resultado?.ok ? resultado : null;
  const error = resultado && !resultado.ok ? resultado : null;
  const empezo = !!listo && (!listo.sePuede || error?.error === "empezo");
  const cerrar = () => {
    if (!publicando) onCerrar();
  };

  const publicar = () =>
    empezar(async () => {
      if (!listo) return;
      const r = await publicarEnInstagram({ eventoId: listo.id, formato, recorte, diseno, texto: formato === "4x5" ? texto : null, quitadas }).catch((): Publicado => ({ ok: false, error: "otro", mensaje: "No se pudo publicar. Vuelve a intentar en un momento; no se publicó nada." }));
      setResultado(r);
      if (r.ok) onPublicado?.();
    });

  const src = listo ? `/api/instagram/${listo.id}?formato=${formato}&recorte=${recorte && formato === "4x5" ? 1 : 0}&diseno=${diseno % 2}` : null;
  const linea = !listo
    ? null
    : formato === "9x16"
      ? { texto: "Las historias no llevan texto y duran 24 horas.", opcion: listo.conCartel ? null : "Otro diseño" }
      : listo.conCartel
        ? listo.recortar
          ? recorte
            ? { texto: "Recortado a 4:5: se pierde un poco arriba y abajo.", opcion: "Usar el cartel completo" }
            : { texto: "Va completo, con margen de su color.", opcion: "Recortar" }
          : null
        : { texto: "Sin cartel: un diseño de Crear cartel.", opcion: "Otro diseño" };
  const alOpcion = () => (listo?.conCartel ? setRecorte((r) => !r) : setDiseno((d) => d + 1));

  let pie;
  if (publicado) {
    pie = (
      <Boton type="button" variante="secundario" onClick={onCerrar}>
        Listo
      </Boton>
    );
  } else if (listo) {
    const quieto = empezo || publicando || error?.error === "cupo";
    pie = (
      <Boton type="button" onClick={publicar} disabled={quieto} aria-busy={publicando || undefined}>
        {empezo ? "Ya empezó" : publicando ? "Publicando…" : error?.error === "cupo" ? "Se puede otra vez mañana" : listo.publicado ? "Publicar otra vez" : "Publicar en Instagram"}
      </Boton>
    );
  }

  return (
    <Hoja etiqueta="Publicar en Instagram" titulo="Publicar en Instagram" pie={pie} onCerrar={cerrar}>
      {!prep ? (
        <span className={styles.vista} data-formato="4x5" aria-label="Preparando la vista previa" role="img" />
      ) : !listo ? (
        <p className="aviso-error" role="alert">
          {prep.ok ? null : prep.mensaje}
        </p>
      ) : (
        <>
          {!publicado && (
            <Chips ariaLabel="Formato">
              <Chip activo={formato === "4x5"} onClick={() => !publicando && setFormato("4x5")}>
                Publicación 4:5
              </Chip>
              <Chip activo={formato === "9x16"} onClick={() => !publicando && setFormato("9x16")}>
                Historia 9:16
              </Chip>
            </Chips>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- la imagen la dibuja el servidor a 720 de ancho, ya JPEG */}
          <img key={src} className={styles.vista} data-formato={formato} src={src!} alt={`Vista previa de la ${formato === "4x5" ? "publicación" : "historia"}: ${listo.titulo}`} width={720} height={formato === "4x5" ? 900 : 1280} />
          {!publicado && linea && (
            <p className={`${hoja.nota} ${styles.linea}`}>
              {linea.texto}
              {linea.opcion && !publicando && (
                <>
                  {" "}
                  <button type="button" className={admin.enlace} onClick={alOpcion}>
                    {linea.opcion}
                  </button>
                </>
              )}
            </p>
          )}
          {!publicado && !empezo && (
            <>
              <p className={`${hoja.nota} ${styles.linea}`}>
                {listo.etiquetas.length === 0 ? "Ni el lugar ni sus artistas tienen Instagram en su ficha: sin etiquetas." : etiquetas.length ? (formato === "4x5" ? "Se etiqueta en la foto y se menciona en el texto:" : "Se etiqueta en la historia:") : "Sin etiquetas."}
                {quitadas.length > 0 && (
                  <>
                    {" "}
                    <button type="button" className={admin.enlace} onClick={() => setQuitadas([])}>
                      Volver a etiquetar
                    </button>
                  </>
                )}
              </p>
              {etiquetas.length > 0 && (
                <Chips ariaLabel="Etiquetas en la foto" envuelve>
                  {etiquetas.map((u) => (
                    <Chip key={u} variante="quitar" onClick={() => setQuitadas((q) => [...q, u])}>
                      {`@${u}`}
                    </Chip>
                  ))}
                </Chips>
              )}
              {formato === "4x5" && (
                <p className={`${hoja.nota} ${styles.ubicacion}`}>
                  <IconoPin width={16} height={16} />
                  <span>{listo.ubicacion ? `Ubicación: ${listo.ubicacion.nombre}` : `Sin ubicación: falta la de ${listo.ciudad.nombre} en Ciudades.`}</span>
                  {!listo.ubicacion && listo.ciudad.slug && (
                    <a className={admin.enlace} href={`/admin/ciudades/${listo.ciudad.slug}`}>
                      Ponerla
                    </a>
                  )}
                </p>
              )}
              {formato === "4x5" && (
                <CampoLargo id="campo-texto-instagram" name="texto" etiqueta="Texto de la publicación" value={texto} onChange={(e) => setPropio(e.target.value)} maxLength={TOPE_CARACTERES} mostrarContador contadorSiempre />
              )}
            </>
          )}
          {empezo && (
            <p className="aviso-error" role="alert">
              {listo.titulo} ya empezó mientras lo preparabas: ya no se publica. Aquí solo se publica lo que está por venir.
            </p>
          )}
          {error && error.error !== "empezo" && (
            <p className="aviso-error" role="alert">
              {error.mensaje}
            </p>
          )}
          {publicado ? (
            <p className={admin.hecho} role="status">
              <IconoOk />
              <span>
                {formato === "4x5" ? "Publicado" : "Historia publicada"} en @{CUENTA_INSTAGRAM}
                {publicado.sinEtiquetas ? ". Instagram no dejó etiquetar o poner la ubicación: salió sin ellas." : ""}
              </span>
              {publicado.permalink && (
                <a className={admin.enlace} href={publicado.permalink} target="_blank" rel="noopener noreferrer">
                  Ver en Instagram
                </a>
              )}
            </p>
          ) : (
            <>
              {listo.publicado && !empezo && <p className={hoja.nota}>Ya se publicó: {listo.publicado.formato === "4x5" ? "publicación" : "historia"}, {listo.publicado.cuando}.</p>}
              {!empezo && <p className={hoja.nota}>Se publica en @{CUENTA_INSTAGRAM}.</p>}
            </>
          )}
        </>
      )}
    </Hoja>
  );
}
