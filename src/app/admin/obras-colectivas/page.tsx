import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import ficha from "@/components/ui/Ficha.module.css";
import { IconoChevronDerecha, IconoPincel } from "@/components/ui/Iconos";
import { formatearCuando } from "@/lib/fechas";
import { usuarioActual } from "@/lib/supabase/servidor";
import styles from "../admin.module.css";
import CrearObraAqui from "./CrearObraAqui";
import InterruptorPincel from "./InterruptorPincel";
import { cargarAjustePincel, cargarEstadoGlobalPincel, cargarLugaresParaObra, cargarObras, TOPE_OBRAS_ABIERTAS } from "./consultas";
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
  const [{ obras, error }, lugares, estadoGlobal, ajustePincel] = await Promise.all([
    cargarObras(),
    cargarLugaresParaObra(),
    cargarEstadoGlobalPincel(),
    cargarAjustePincel(),
  ]);
  // Tope global (OL-121): si no se pudo leer el estado, no se bloquea aquí — la base lo exige igual, esta
  // pantalla solo explica el freno antes de que llegue el error crudo.
  const puedeCrear = estadoGlobal ? estadoGlobal.abiertas < TOPE_OBRAS_ABIERTAS : true;

  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/admin", texto: "Administración" }} />
      <h1 className={styles.titulo}>Obras colectivas</h1>

      <h2 className={styles.grupo}>Pincel</h2>
      {ajustePincel ? (
        <InterruptorPincel activo={ajustePincel.activo} cambiadoPorNombre={ajustePincel.cambiadoPorNombre} cambiadoEn={ajustePincel.cambiadoEn} />
      ) : (
        <Reintentar texto="No pudimos leer el interruptor de Pincel." />
      )}

      <h2 className={styles.grupo}>Crear obra aquí</h2>
      <CrearObraAqui lugares={lugares} puedeCrear={puedeCrear} />

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
                {/* Un lugar puede tener varias obras con el tiempo (founder, 2026-09-21): la fecha y hora en que se
                    creó cada una es lo que las distingue en la lista, no solo el nombre. */}
                <small>
                  {o.lugarNombre} · {o.estado === "abierta" ? "Abierta" : "Cerrada"} · {formatearCuando(o.creadoEn, null, new Date(), o.zona)}
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
