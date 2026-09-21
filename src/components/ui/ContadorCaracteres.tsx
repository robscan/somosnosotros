import styles from "./ContadorCaracteres.module.css";

/** Mostrador discreto del uso de caracteres: activo cuando está al 75% o más, invisible si hay error. */
export default function ContadorCaracteres({
  valor,
  tope,
  error,
}: {
  valor: string | undefined;
  tope: number;
  error?: string;
}) {
  const len = valor?.length ?? 0;
  const umbral = tope * 0.75;

  if (error || len < umbral) return null;

  return (
    <span className={styles.contador} aria-live="polite">
      {len}/{tope}
    </span>
  );
}
