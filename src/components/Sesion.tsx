import { contarPendientes } from "@/app/admin/consultas";
import { cargarNovedades } from "@/app/novedades/consultas";
import Boton from "./ui/Boton";
import BotonIcono from "./ui/BotonIcono";
import { IconoCampana, IconoHerramientas } from "./ui/Iconos";
import { usuarioDeLaBarra } from "./usuarioDeLaBarra";
import VistoHoy from "./VistoHoy";
import styles from "./Sesion.module.css";

/**
 * La sesión en la barra de la app (`BarraApp`): sin sesión, "Entrar" como acción primaria (lo único con color de
 * acción); con sesión, la campana de Novedades (con punto si hay algo no visto; decisión 2 de docs/rediseno/13) y el
 * acceso a Administración solo para administradores (L40, OL-115; con punto si hay algo por revisar, mismo dato que
 * `contarPendientes()` ya usa en Ajustes). La foto de perfil ya no vive aquí: es el quinto destino de la navegación
 * (`PerfilEnNav`). Hijos directos de la barra, sin envoltorio, cada uno en su área de la rejilla (VistoHoy no pinta
 * nada: guarda que abrió la app hoy, D3 de docs/rediseno/18).
 */
export default async function Sesion() {
  const actual = await usuarioDeLaBarra();
  if (!actual) {
    return (
      <Boton href="/entrar" forma="pildora" alto="control" ancho="contenido" className={styles.sesion}>
        Entrar
      </Boton>
    );
  }
  const esAdmin = actual.perfil.rol === "admin";
  const [{ hay }, pendientes] = await Promise.all([
    cargarNovedades(actual.perfil.id, actual.perfil.novedades_vistas_en ?? null),
    esAdmin ? contarPendientes() : Promise.resolve(null),
  ]);
  return (
    <>
      <BotonIcono href="/novedades" className={`${styles.sesion} ${styles.conPunto}`} aria-label={hay ? "Novedades, hay nuevas" : "Novedades"}>
        <IconoCampana width={26} height={26} />
        {hay && <span className={styles.punto} aria-hidden="true" />}
      </BotonIcono>
      {esAdmin && (
        <BotonIcono href="/admin" className={`${styles.admin} ${styles.conPunto}`} aria-label={pendientes ? "Administración, hay algo por revisar" : "Administración"}>
          <IconoHerramientas width={26} height={26} />
          {!!pendientes && <span className={styles.punto} aria-hidden="true" />}
        </BotonIcono>
      )}
      <VistoHoy />
    </>
  );
}
