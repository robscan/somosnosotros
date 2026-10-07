"use client";

import Boton, { claseBoton } from "@/components/ui/Boton";
import canon from "@/components/ui/FormularioCanon.module.css";
import { IconoCamara } from "@/components/ui/Iconos";
import styles from "./CreadorCartel.module.css";

type Props = {
  /** La foto propia puesta (dirección del Storage), o null. */
  foto: string | null;
  /** El evento ya tiene alguna imagen (suya, de un artista o del lugar): la acción dice «Usar otra foto»; si no, «Poner una foto». */
  conImagen: boolean;
  subiendo: boolean;
  error: string | null;
  onElegir: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuitar: () => void;
};

/**
 * La foto propia en «¿Cuál te gusta?» (OL-337), arriba de las cuatro opciones porque las cambia a todas: primero la causa y luego el efecto, y
 * se ve sin bajar. Con el patrón de las acciones secundarias del paso (el enlace quieto). Sin foto propia, «Usar otra foto» (o «Poner una
 * foto»): la etiqueta es el control y lleva escondido el campo de archivo (en el iPhone ofrece cámara o carrete, como «Sube el cartel» del
 * alta). Con foto propia, su miniatura, «Tu foto» y «Quitar la foto». Si no se pudo usar, un aviso corto debajo y todo sigue igual.
 */
export default function FotoDelCartel({ foto, conImagen, subiendo, error, onElegir, onQuitar }: Props) {
  return (
    <>
      {foto ? (
        <div className={styles.fotoPuesta}>
          {/* eslint-disable-next-line @next/next/no-img-element -- la foto recién subida, del Storage, en miniatura */}
          <img src={foto} alt="" width={44} height={44} />
          <span>Tu foto</span>
          <Boton type="button" variante="quieto" ancho="contenido" onClick={onQuitar}>
            Quitar la foto
          </Boton>
        </div>
      ) : (
        <label className={`${claseBoton({ variante: "quieto", ancho: "contenido" })} ${canon.salida} ${styles.ponerFoto}`} aria-busy={subiendo || undefined}>
          <IconoCamara width={20} height={20} />
          {subiendo ? "Subiendo la foto…" : conImagen ? "Usar otra foto" : "Poner una foto"}
          <input type="file" accept="image/*" onChange={onElegir} disabled={subiendo} aria-label={conImagen ? "Usar otra foto" : "Poner una foto"} />
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
