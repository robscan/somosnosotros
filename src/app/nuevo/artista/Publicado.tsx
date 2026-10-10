"use client";

import BotonCompartir from "@/components/BotonCompartir";
import { PiePaso } from "@/components/PorPasos";
import RenglonArtista from "@/components/RenglonArtista";
import Boton, { claseBoton } from "@/components/ui/Boton";
import { IconoCamara, IconoOk } from "@/components/ui/Iconos";
import canon from "@/components/ui/FormularioCanon.module.css";
import { claseSubiendoDentro } from "@/components/ui/FotoSubida";
import { compartirArtista, hrefArtista, type ArtistaResumen } from "@/lib/artistas";
import { enlaceAltaEvento } from "@/lib/armazon";
import publicado from "../evento/Publicado.module.css";
import styles from "./AltaArtista.module.css";

type Props = {
  /** El artista como quedó, armado con lo publicado: lo que pinta la tarjeta es lo que verá la gente en Artistas. */
  artista: Pick<ArtistaResumen, "id" | "slug" | "nombre" | "disciplina" | "detalle" | "tipo" | "foto">;
  /** Mientras la foto nueva se sube y se guarda en la ficha: la foto elegida, del teléfono (`useSubidaDeFoto`). */
  vista: string | null;
  /** Si no se pudo subir o guardar la foto. */
  errorFoto: string | null;
  /** La foto elegida en el teléfono (cámara o carrete): se sube y se guarda en la ficha sin salir de aquí. */
  onFoto: (archivo: File) => void;
};

/**
 * «Publicado» del alta de artista (prototipo firmado, bitácora 342; el final del canon, como el del evento y el del lugar): el sello, «Artista
 * publicado», el artista como quedó en el renglón de las listas (toca y abre su ficha) y una sola sugerencia en punteado. Sin foto, «Agrega
 * una foto» (las fichas sin foto no salen en destacados): el botón abre la cámara o el carrete del teléfono y la foto se guarda en la ficha
 * aquí mismo; con foto, «Publicar una fecha», que abre el alta de evento con el artista ya puesto. En el pie, las dos salidas del final del
 * evento (OL-365): «Ver el artista», que abre su ficha reemplazando «Publicado», y «Compartir» (el mismo texto que la ficha). «Publicar otro»
 * se quitó.
 */
export default function Publicado({ artista, vista, errorFoto, onFoto }: Props) {
  const { url, texto } = compartirArtista(artista);
  const subiendo = !!vista;
  return (
    <>
      <div className={publicado.final}>
        <span className={publicado.sello} aria-hidden="true">
          <IconoOk />
        </span>
        <h2 tabIndex={-1}>Artista publicado</h2>
        <p>Ya está en el directorio. Así lo ve la gente:</p>
      </div>
      {/* Mientras sube, la foto elegida ya en el renglón, con la espera de toda la app (OL-353): así se verá en Artistas. */}
      <ul className={[publicado.tarjeta, subiendo && claseSubiendoDentro].filter(Boolean).join(" ")} aria-busy={subiendo || undefined}>
        <RenglonArtista artista={vista ? { ...artista, foto: vista } : artista} />
      </ul>
      {artista.foto ? (
        <section className={publicado.sugerencia} aria-labelledby="sugerencia-artista">
          <h3 id="sugerencia-artista">¿Tiene una fecha próxima?</h3>
          <p>Publícala con {artista.nombre} ya puesto.</p>
          <Boton href={enlaceAltaEvento({ artista: artista.id })} prefetch={false}>
            Publicar una fecha
          </Boton>
        </section>
      ) : (
        <section className={publicado.sugerencia} aria-labelledby="sugerencia-artista">
          <h3 id="sugerencia-artista">Agrega una foto</h3>
          <p>Las fichas sin foto no salen en destacados.</p>
          <label className={`${claseBoton()} ${canon.salida} ${styles.agregarFoto}`} aria-disabled={subiendo || undefined} aria-busy={subiendo || undefined}>
            <IconoCamara width={20} height={20} />
            {subiendo ? "Subiendo la foto…" : "Agregar foto"}
            <input
              type="file"
              accept="image/*"
              disabled={subiendo}
              aria-label="Agregar foto"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                e.target.value = "";
                if (archivo) onFoto(archivo);
              }}
            />
          </label>
          {errorFoto && (
            <p className={canon.error} role="alert">
              {errorFoto}
            </p>
          )}
        </section>
      )}
      <PiePaso>
        <Boton href={hrefArtista(artista)} replace prefetch={false} variante="secundario">
          Ver el artista
        </Boton>
        <BotonCompartir titulo={artista.nombre} texto={texto} url={url} className={claseBoton({ variante: "secundario" })}>
          Compartir
        </BotonCompartir>
      </PiePaso>
    </>
  );
}
