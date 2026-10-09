"use client";

import Boton, { claseBoton } from "@/components/ui/Boton";
import canon from "@/components/ui/FormularioCanon.module.css";
import FotoSubida from "@/components/ui/FotoSubida";
import { IconoCamara } from "@/components/ui/Iconos";
import styles from "./CreadorCartel.module.css";

type Props = {
  /** La foto propia puesta (dirección del Storage), o null. */
  foto: string | null;
  /** El evento ya tiene alguna imagen (suya, de un artista o del lugar): la acción dice «Usar otra foto»; si no, «Poner una foto». */
  conImagen: boolean;
  /** Mientras sube: la foto elegida, del teléfono (`useSubidaDeFoto`). */
  vista: string | null;
  error: string | null;
  onElegir: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuitar: () => void;
};

/**
 * La foto propia en «¿Cuál te gusta?» (OL-337), arriba de las cuatro opciones porque las cambia a todas: primero la causa y luego el efecto, y
 * se ve sin bajar. Con el patrón de las acciones secundarias del paso (el enlace quieto). Sin foto propia, «Usar otra foto» (o «Poner una
 * foto»): la etiqueta es el control y lleva escondido el campo de archivo (en el iPhone ofrece cámara o carrete, como «Sube el cartel» del
 * alta). Con foto propia, su miniatura, «Tu foto» y «Quitar la foto». Mientras sube (OL-353), el mismo renglón con la foto elegida en la
 * espera de subida (`FotoSubida`) y «Subiendo la foto…», sin acción: lo que se toque no hace nada hasta que termine. Si no se pudo usar, un
 * aviso corto debajo y todo sigue igual.
 */
export default function FotoDelCartel({ foto, vista, conImagen, error, onElegir, onQuitar }: Props) {
  return (
    <>
      {foto || vista ? (
        <div className={styles.fotoPuesta} aria-busy={vista ? true : undefined}>
          <FotoSubida src={foto} vista={vista} width={44} height={44} />
          <span>{vista ? "Subiendo la foto…" : "Tu foto"}</span>
          {!vista && (
            <Boton type="button" variante="quieto" ancho="contenido" onClick={onQuitar}>
              Quitar la foto
            </Boton>
          )}
        </div>
      ) : (
        <label className={`${claseBoton({ variante: "quieto", ancho: "contenido" })} ${canon.salida} ${styles.ponerFoto}`}>
          <IconoCamara width={20} height={20} />
          {conImagen ? "Usar otra foto" : "Poner una foto"}
          <input type="file" accept="image/*" onChange={onElegir} aria-label={conImagen ? "Usar otra foto" : "Poner una foto"} />
        </label>
      )}
      {error && (
        <p className={styles.avisoFoto} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
