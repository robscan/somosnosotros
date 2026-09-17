import styles from "./admin.module.css";

/** Foto redonda o la inicial sobre gris, como en la barra y en las fichas de persona. */
export default function Avatar({ foto, nombre }: { foto: string | null; nombre: string }) {
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
    <img src={foto} alt="" className={styles.avatar} loading="lazy" decoding="async" />
  ) : (
    <span className={styles.avatar} aria-hidden="true">
      {(nombre || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}
