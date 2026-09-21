import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import ficha from "@/components/ui/Ficha.module.css";
import { IconoChevronDerecha, IconoPincel } from "@/components/ui/Iconos";
import { usuarioActual } from "@/lib/supabase/servidor";
import styles from "../admin.module.css";
import CrearObraAqui from "./CrearObraAqui";
import { cargarLugaresParaObra, cargarObras } from "./consultas";
import Reintentar from "../Reintentar";

export const metadata = { title: "Obras colectivas · Administración · Somos Nosotros", robots: { index: false, follow: false } };

/**
 * Pincel (OL-088, bitácora 123): la gente pinta junta con su celular sobre una pared proyectada. Se activa desde la
 * ficha de un evento («Activar Pincel») o aquí, sin evento, con la ubicación actual. Una sola obra a la vez por
 * lugar y por evento — lo exige la base, no solo esta pantalla.
 */
export default async function ObrasColectivas() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/obras-colectivas");
  if (actual.perfil.rol !== "admin") redirect("/");
  const [{ obras, error }, lugares] = await Promise.all([cargarObras(), cargarLugaresParaObra()]);

  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/admin", texto: "Administración" }} />
      <h1 className={styles.titulo}>Obras colectivas</h1>

      <h2 className={styles.grupo}>Crear obra aquí</h2>
      <CrearObraAqui lugares={lugares} />

      <h2 className={styles.grupo}>Todas</h2>
      {error ? (
        <Reintentar texto="No pudimos leer las obras colectivas." />
      ) : obras.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay ninguna obra colectiva. Actívala desde un evento o aquí arriba.</p>
      ) : (
        <ul className={styles.tarjeta}>
          {obras.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/obras-colectivas/${o.id}`} className={styles.fila}>
                <IconoPincel width={20} height={20} />
                <b>{o.nombre}</b>
                <small>
                  {o.lugarNombre} · {o.estado === "abierta" ? "Abierta" : "Cerrada"}
                </small>
                <span className={styles.total}>
                  <IconoChevronDerecha />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
