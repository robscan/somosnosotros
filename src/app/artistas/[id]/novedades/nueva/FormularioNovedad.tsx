"use client";

import { useActionState, useEffect, useState } from "react";
import { useTerminar } from "@/components/ui/Atras";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { IconoCampana, IconoOk } from "@/components/ui/Iconos";
import VideoEmbed from "@/components/ui/VideoEmbed";
import { LIMITES_NOVEDAD_ARTISTA, reconocerNovedadEnlace } from "@/lib/novedadesArtista";
import type { ResultadoNovedadArtista } from "../acciones";
import canon from "@/components/ui/FormularioCanon.module.css";
import estilos from "./FormularioNovedad.module.css";

type Props = {
  accion: (previo: ResultadoNovedadArtista | null, formData: FormData) => Promise<ResultadoNovedadArtista>;
  /** Para el `title` del iframe ("Video de <artista> en YouTube", como en la ficha). */
  artistaNombre: string;
};

const NO_RECONOCIDO = "No se reconoce este enlace. Por ahora solo funciona con YouTube.";

/**
 * "Publicar novedad", fase 1 (docs/rediseno/44-novedades-artista.md, OL-175, código de OL-171): un enlace de
 * YouTube (`reconocerNovedadEnlace`, mismo reconocimiento y `VideoEmbed` que ya usa "Redes", OL-154) con título y
 * texto opcionales. Sin push todavía (fase 3 del doc): la nota lo dice tal cual. Terminar vuelve a la ficha sin
 * dejar el formulario en el historial (mismo patrón que Editar artista y Editar perfil).
 */
export default function FormularioNovedad({ accion, artistaNombre }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoNovedadArtista | null, FormData>(accion, null);
  const terminar = useTerminar();
  const terminado = resultado?.ok === true;
  useEffect(() => {
    if (resultado?.ok) terminar(resultado.volver);
  }, [resultado, terminar]);
  const errores = resultado && !resultado.ok ? resultado.errores : {};

  const [url, setUrl] = useState("");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");

  const urlLimpia = url.trim();
  const reconocido = urlLimpia ? reconocerNovedadEnlace(urlLimpia) : null;
  const noReconocido = urlLimpia.length > 0 && !reconocido;
  const errorUrl = errores.url ?? (noReconocido ? NO_RECONOCIDO : undefined);
  const listo = !!reconocido && titulo.length <= LIMITES_NOVEDAD_ARTISTA.titulo && texto.length <= LIMITES_NOVEDAD_ARTISTA.texto;

  return (
    <form action={enviar} noValidate>
      <Campo
        etiqueta="Enlace"
        name="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enlace de YouTube"
        aria-label="Enlace de la novedad"
        error={errorUrl}
        autoComplete="off"
        autoFocus
      />
      {!errorUrl && reconocido && (
        <p className={canon.existe} role="status">
          <IconoOk width={20} height={20} />
          <span>Reconocido: YouTube.</span>
        </p>
      )}
      {reconocido && (
        <div className={estilos.previa}>
          <VideoEmbed video={reconocido.video} titulo={artistaNombre} />
        </div>
      )}
      {!errorUrl && !reconocido && !urlLimpia && (
        <p className={canon.cuerpoNota}>Funciona con enlaces de YouTube; por ahora, solo ese proveedor.</p>
      )}

      <Campo
        etiqueta="Título (opcional)"
        name="titulo"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        maxLength={LIMITES_NOVEDAD_ARTISTA.titulo}
        placeholder="Un título corto"
        error={errores.titulo}
        mostrarContador
      />
      <Campo
        etiqueta="Texto (opcional)"
        name="texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={LIMITES_NOVEDAD_ARTISTA.texto}
        multilinea
        placeholder="Cuéntales de qué se trata"
        error={errores.texto}
        mostrarContador
      />

      <p className={canon.existe} role="status">
        <IconoCampana width={20} height={20} />
        <span>Pronto avisaremos a quienes te siguen.</span>
      </p>

      {resultado && !resultado.ok && resultado.general && (
        <p className="aviso-error" role="alert">
          {resultado.general}
        </p>
      )}

      <Boton type="submit" disabled={enviando || terminado || !listo}>
        {enviando || terminado ? "Publicando…" : "Publicar"}
      </Boton>
    </form>
  );
}
