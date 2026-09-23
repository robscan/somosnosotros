import RenglonArtista from "@/components/RenglonArtista";
import type { ArtistaResumen } from "@/lib/artistas";
import styles from "./MisArtistas.module.css";

/**
 * «Mis artistas» en Mi perfil (OL-154, doc 40b; corregido en OL-159): los artistas que controla la cuenta, uno o
 * varios, listados igual y sin "principal". Corrección del founder (2026-09-23): en móvil el texto se partía en
 * cuatro líneas junto a un botón enorme y otro de compartir. Ahora es el mismo renglón que ya usa el resto de la
 * app para un artista (`RenglonArtista`, la lista de /artistas): un solo destino (toda la fila abre la ficha), sin
 * botones dentro y sin compartir aquí (ese vive en la ficha, junto al avatar). Quien llama decide si se muestra:
 * sin artistas ligados, el bloque entero no aparece.
 */
export default function MisArtistas({ artistas }: { artistas: ArtistaResumen[] }) {
  return (
    <div className={styles.seccion}>
      <h2>Mis artistas</h2>
      <ul className={styles.lista}>
        {artistas.map((a) => (
          <RenglonArtista key={a.id} artista={a} />
        ))}
      </ul>
    </div>
  );
}
