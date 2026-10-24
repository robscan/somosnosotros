import styles from "./ContadorCaracteres.module.css";

/**
 * Mostrador discreto del uso de caracteres: activo cuando está al 75% o más, invisible si hay error. `siempre` (OL-458, el texto de una
 * publicación de Instagram, que corta en 2 200): a la vista desde el primer carácter.
 */
export default function ContadorCaracteres({
  valor,
  tope,
  error,
  siempre = false,
}: {
  valor: string | undefined;
  tope: number;
  error?: string;
  siempre?: boolean;
}) {
  const len = valor?.length ?? 0;
  const umbral = siempre ? 0 : tope * 0.75;

  if (error || len < umbral) return null;

  return (
    <span className={styles.contador} aria-live="polite">
      {len}/{tope}
    </span>
  );
}
