import { IconoPersona } from "./ui/Iconos";
import { usuarioDeLaBarra } from "./usuarioDeLaBarra";
import styles from "./NavInferior.module.css";

/**
 * Lo que va dentro de la píldora del quinto destino de la navegación: la foto de la persona (o su inicial), y sin
 * sesión la figura humana. El destino lleva a `/perfil`, que sin sesión manda a Entrar. Antes esta foto vivía en la
 * barra de arriba.
 */
export default async function PerfilEnNav() {
  const actual = await usuarioDeLaBarra();
  if (!actual) return <IconoPersona width={26} height={26} />;
  const { foto, nombre } = actual.perfil;
  // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
  if (foto) return <img src={foto} alt="" className={styles.avatar} />;
  return <span className={styles.avatar}>{(nombre || "?").slice(0, 1).toUpperCase()}</span>;
}
