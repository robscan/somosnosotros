import styles from "./ContadorCaracteres.module.css";

/** Mostrador discreto del uso de caracteres: activo cuando está al 75% o más, invisible si hay error. */
export default function ContadorCaracteres({ valor, tope, error }: { valor: string; tope: number; error?: string }) {
  if (error || valor.length < tope * 0.75) return null;

  return (
    <span className={styles.contador} aria-live="polite">
      {valor.length}/{tope}
    </span>
  );
}
